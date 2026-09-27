#!/usr/bin/env bash
# The whole Order Hub in one place, for the public demo: the hub (web and
# worker) on an ephemeral SQLite file, the marketplace simulator and the
# console. Every start is a clean slate, for the hub and the simulator alike.
# Only the console is meant to be reachable from outside ($PORT); it talks to
# the hub and the simulator on 127.0.0.1 through its allowlisted proxy.
set -euo pipefail

HUB_DIR="${HUB_DIR:-/app/hub}"
SIMULATOR_DIR="${SIMULATOR_DIR:-/app/node/apps/marketplace}"
CONSOLE_SERVER="${CONSOLE_SERVER:-/app/console/apps/console/server.js}"
DATA_DIR="${DATA_DIR:-/tmp/order-hub}"
PUBLIC_PORT="${PORT:-3000}"
# The simulator keeps every order in memory: start over at least this often.
RESET_AFTER_HOURS="${DEMO_RESET_AFTER_HOURS:-24}"

export APP_ENV="${APP_ENV:-prod}"
export APP_DEBUG=0
export APP_SECRET="${APP_SECRET:-$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')}"
export DATABASE_URL="sqlite:///${DATA_DIR}/demo.db"
export MESSENGER_TRANSPORT_DSN='doctrine://default?auto_setup=0'
export MARKETPLACE_BASE_URL='http://127.0.0.1:8100'

log() { printf '[demo] %s\n' "$*"; }

mkdir -p "$DATA_DIR"
rm -f "$DATA_DIR"/demo.db*
(
  cd "$HUB_DIR"
  php bin/console doctrine:schema:create --quiet
  # WAL lets the web server read while the worker writes.
  php -r "(new PDO('sqlite:${DATA_DIR}/demo.db'))->exec('PRAGMA journal_mode=WAL');"
)
log "fresh SQLite database in ${DATA_DIR}"

trap 'kill 0 2>/dev/null' EXIT

(cd "$SIMULATOR_DIR" && HUB_URL=http://127.0.0.1:8000 PORT=8100 exec node --import tsx src/main.ts) &

if command -v frankenphp >/dev/null 2>&1; then
  (cd "$HUB_DIR" && SERVER_NAME=':8000' exec frankenphp run --config /etc/frankenphp/Caddyfile --adapter caddyfile) &
else
  (cd "$HUB_DIR" && PHP_CLI_SERVER_WORKERS=4 exec php -d variables_order=EGPCS -S 127.0.0.1:8000 -t public) &
fi

# The worker restarts itself every hour to keep its memory flat.
(
  cd "$HUB_DIR"
  while true; do
    php bin/console messenger:consume async scheduler_default --time-limit=3600 --memory-limit=192M --quiet || true
    sleep 1
  done
) &

HUB_URL=http://127.0.0.1:8000 SIMULATOR_URL=http://127.0.0.1:8100 PORT="$PUBLIC_PORT" HOSTNAME=0.0.0.0 \
  node "$CONSOLE_SERVER" &

log "console on port ${PUBLIC_PORT}"

if [ "$RESET_AFTER_HOURS" -gt 0 ]; then
  (sleep "$((RESET_AFTER_HOURS * 3600))" && log 'scheduled reset' && exit 0) &
fi
# If any service dies, or the reset timer fires, stop everything: the
# platform restarts a clean demo.
wait -n
log 'stopping every service'
exit 1
