#!/usr/bin/env bash
# Starts the whole system natively for end-to-end tests, on a dedicated
# database: `e2e/stack.sh start` then `e2e/stack.sh stop`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$ROOT/e2e/.stack"
export DATABASE_URL="${E2E_DATABASE_URL:-postgresql://app:app@127.0.0.1:5432/app_e2e?serverVersion=16&charset=utf8}"
export MARKETPLACE_BASE_URL=http://127.0.0.1:8100
export ANTHROPIC_API_KEY=''
export APP_ENV=dev

wait_for() {
  local url=$1 name=$2
  for _ in $(seq 1 90); do
    if curl -fs -o /dev/null "$url"; then return 0; fi
    sleep 1
  done
  echo "$name did not start; see $STATE/$name.log" >&2
  exit 1
}

start() {
  mkdir -p "$STATE"
  (
    cd "$ROOT/apps/hub"
    php bin/console doctrine:database:drop --force --if-exists -q
    php bin/console doctrine:database:create -q
    php bin/console doctrine:migrations:migrate --no-interaction -q
    php bin/console cache:clear -q
  )

  HUB_URL=http://127.0.0.1:8000 PORT=8100 SIMULATOR_SEED="${SIMULATOR_SEED:-424242}" \
    nohup npm run start --workspace @order-hub/marketplace --prefix "$ROOT" >"$STATE/marketplace.log" 2>&1 &
  echo $! >"$STATE/marketplace.pid"

  # EGPCS: the built-in server must see the environment, not only .env.
  PHP_CLI_SERVER_WORKERS=8 nohup php -d variables_order=EGPCS -S 127.0.0.1:8000 -t "$ROOT/apps/hub/public" >"$STATE/hub.log" 2>&1 &
  echo $! >"$STATE/hub.pid"

  (cd "$ROOT/apps/hub" && nohup php bin/console messenger:consume async scheduler_default >"$STATE/worker.log" 2>&1 & echo $! >"$STATE/worker.pid")

  HUB_URL=http://127.0.0.1:8000 SIMULATOR_URL=http://127.0.0.1:8100 ANALYSIS_COOLDOWN_MS=0 \
    nohup npm run start --workspace @order-hub/console --prefix "$ROOT" >"$STATE/console.log" 2>&1 &
  echo $! >"$STATE/console.pid"

  wait_for http://127.0.0.1:8100/health marketplace
  wait_for http://127.0.0.1:8000/health hub
  wait_for http://127.0.0.1:3000 console
  echo "stack up"
}

# npm starts node, which starts next-server or tsx: stop the whole tree.
kill_tree() {
  local child
  for child in $(pgrep -P "$1"); do kill_tree "$child"; done
  kill -TERM "$1" 2>/dev/null || true
}

stop() {
  for pid in "$STATE"/*.pid; do
    [ -e "$pid" ] || continue
    kill_tree "$(cat "$pid")"
    rm -f "$pid"
  done
  sleep 1
  echo "stack down"
}

"${1:-start}"
