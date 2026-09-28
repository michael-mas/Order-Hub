#!/usr/bin/env bash
# The whole Order Hub in one container, for the public demo: the hub (web and
# worker) on an ephemeral SQLite file, the marketplace simulator and the
# console. Only the console listens on the public port ($PORT); the hub and
# the simulator listen on 127.0.0.1 and are reached through its allowlist.
#
# This script supervises the services: it starts them, restarts the whole set
# in place on a clean slate (every DEMO_RESET_AFTER_HOURS, or when the
# simulator reaches its order cap), stops them cleanly on SIGTERM, and exits
# non-zero if one of them dies, so the platform can restart the container.
set -euo pipefail

HUB_DIR="${HUB_DIR:-/app/hub}"
SIMULATOR_DIR="${SIMULATOR_DIR:-/app/node/apps/marketplace}"
CONSOLE_SERVER="${CONSOLE_SERVER:-/app/console/apps/console/server.js}"
DATA_DIR="${DATA_DIR:-/tmp/order-hub}"
PUBLIC_PORT="${PORT:-3000}"
RESET_AFTER_HOURS="${DEMO_RESET_AFTER_HOURS:-24}"
# Only for tests that drive the simulator from outside the container.
SIMULATOR_HOST="${SIMULATOR_HOST:-127.0.0.1}"

random() { od -An -N24 -tx1 /dev/urandom | tr -d ' \n'; }

# Fresh secrets for every container unless provided: nothing guessable, and
# nothing that outlives the demo.
export APP_ENV="${APP_ENV:-prod}"
export APP_DEBUG=0
export APP_SECRET="${APP_SECRET:-$(random)}"
export HUB_API_TOKEN="${HUB_API_TOKEN:-$(random)}"
export SIMULATOR_CONTROL_TOKEN="${SIMULATOR_CONTROL_TOKEN:-$(random)}"
export NOVA_API_KEY="${NOVA_API_KEY:-$(random)}"
export NOVA_WEBHOOK_SECRET="${NOVA_WEBHOOK_SECRET:-$(random)}"
export ATLAS_API_KEY="${ATLAS_API_KEY:-$(random)}"
export DATABASE_URL="sqlite:///${DATA_DIR}/demo.db"
export MESSENGER_TRANSPORT_DSN='doctrine://default?auto_setup=0'
export MARKETPLACE_BASE_URL='http://127.0.0.1:8100'

log() { printf '[demo] %s\n' "$*"; }

PIDS=()

fresh_database() {
  mkdir -p "$DATA_DIR"
  rm -f "$DATA_DIR"/demo.db*
  (
    cd "$HUB_DIR"
    php bin/console doctrine:schema:create --quiet
    # WAL lets the web server read while the worker writes.
    php -r "(new PDO('sqlite:${DATA_DIR}/demo.db'))->exec('PRAGMA journal_mode=WAL');"
  )
  log "fresh SQLite database in ${DATA_DIR}"
}

# Runs the Messenger worker, restarting it every hour to keep its memory flat,
# and passes SIGTERM on to it.
worker_loop() {
  local child=''
  trap '[ -n "$child" ] && kill -TERM "$child" 2>/dev/null; wait "$child" 2>/dev/null; exit 0' TERM
  while true; do
    php bin/console messenger:consume async scheduler_default --time-limit=3600 --memory-limit=192M --quiet &
    child=$!
    wait "$child" || true
    sleep 1
  done
}

start_services() {
  (cd "$SIMULATOR_DIR" && HUB_URL=http://127.0.0.1:8000 HOST="$SIMULATOR_HOST" PORT=8100 \
    CONTROL_TOKEN="$SIMULATOR_CONTROL_TOKEN" exec node --import tsx src/main.ts) &
  PIDS+=($!)

  if command -v frankenphp >/dev/null 2>&1; then
    (cd "$HUB_DIR" && SERVER_NAME=':8000' CADDY_SERVER_EXTRA_DIRECTIVES='bind 127.0.0.1' \
      exec frankenphp run --config /etc/frankenphp/Caddyfile --adapter caddyfile) &
  else
    (cd "$HUB_DIR" && PHP_CLI_SERVER_WORKERS=4 exec php -d variables_order=EGPCS -S 127.0.0.1:8000 -t public) &
  fi
  PIDS+=($!)

  (cd "$HUB_DIR" && worker_loop) &
  PIDS+=($!)

  (HUB_URL=http://127.0.0.1:8000 SIMULATOR_URL=http://127.0.0.1:8100 PUBLIC_DEMO=1 \
    PORT="$PUBLIC_PORT" HOSTNAME=0.0.0.0 exec node "$CONSOLE_SERVER") &
  PIDS+=($!)
  log "console on port ${PUBLIC_PORT}"
}

stop_services() {
  local pid
  for pid in "${PIDS[@]}"; do kill -TERM "$pid" 2>/dev/null || true; done
  for _ in $(seq 1 20); do
    local alive=0
    for pid in "${PIDS[@]}"; do kill -0 "$pid" 2>/dev/null && alive=1; done
    [ "$alive" -eq 0 ] && break
    sleep 0.5
  done
  for pid in "${PIDS[@]}"; do kill -KILL "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
  PIDS=()
}

shutdown() {
  log 'SIGTERM: stopping every service'
  stop_services
  exit 0
}
trap shutdown TERM INT

any_service_down() {
  local pid
  for pid in "${PIDS[@]}"; do kill -0 "$pid" 2>/dev/null || return 0; done
  return 1
}

order_cap_reached() {
  curl -fs -H "x-control-token: ${SIMULATOR_CONTROL_TOKEN}" \
    http://127.0.0.1:8100/control/marketplaces 2>/dev/null | grep -q '"reached":true'
}

while true; do
  fresh_database
  start_services
  deadline=$(($(date +%s) + RESET_AFTER_HOURS * 3600))
  while true; do
    # Backgrounded so that SIGTERM interrupts the wait at once.
    sleep 5 &
    wait $! || true
    if any_service_down; then
      log 'a service stopped: stopping the others'
      stop_services
      exit 1
    fi
    if [ "$RESET_AFTER_HOURS" -gt 0 ] && [ "$(date +%s)" -ge "$deadline" ]; then
      log 'scheduled reset'
      break
    fi
    if order_cap_reached; then
      log 'order cap reached: reset'
      break
    fi
  done
  stop_services
done
