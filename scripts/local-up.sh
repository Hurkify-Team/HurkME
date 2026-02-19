#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pids"

MODE="stable"
SKIP_SEED="false"

for arg in "$@"; do
  case "$arg" in
    --mode=dev)
      MODE="dev"
      ;;
    --mode=stable)
      MODE="stable"
      ;;
    --skip-seed)
      SKIP_SEED="true"
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: ./scripts/local-up.sh [--mode=stable|dev] [--skip-seed]"
      exit 1
      ;;
  esac
done

prepend_path() {
  local dir="$1"
  if [[ -d "$dir" ]] && [[ ":$PATH:" != *":$dir:"* ]]; then
    PATH="$dir:$PATH"
  fi
}

prepend_path "/usr/local/bin"
prepend_path "/opt/homebrew/bin"
prepend_path "/Applications/Docker.app/Contents/Resources/bin"
prepend_path "$HOME/.local/node-v22.22.0/bin"
export PATH

require_cmd() {
  local cmd="$1"
  local hint="${2:-}"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd"
    [[ -n "$hint" ]] && echo "$hint"
    exit 1
  fi
}

require_cmd node "Install Node.js 22+ and reopen terminal."
require_cmd npm "Install npm (bundled with Node.js) and reopen terminal."
require_cmd docker "Install Docker Desktop and ensure docker CLI is available."
require_cmd curl
require_cmd lsof

cd "$ROOT_DIR"
mkdir -p "$PID_DIR"

if ! docker info >/dev/null 2>&1; then
  echo "Docker Desktop is not ready. Open Docker Desktop and wait for engine startup."
  exit 1
fi

echo "Starting local infrastructure (Postgres, Redis, Meilisearch)..."
docker compose up -d

ensure_env() {
  local target="$1"
  local source="$2"
  if [[ ! -f "$target" ]]; then
    cp "$source" "$target"
    echo "Created $target from $source"
  fi
}

ensure_env "apps/api/.env" "apps/api/.env.example"
ensure_env "apps/web/.env.local" "apps/web/.env.example"
ensure_env "apps/web/.env" "apps/web/.env.local"

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Applying DB migrations..."
npm --workspace @hurkme/api run prisma:generate
npm --workspace @hurkme/api run migrate:deploy
if [[ "$SKIP_SEED" == "false" ]]; then
  echo "Seeding data..."
  npm --workspace @hurkme/api run seed
else
  echo "Skipping seed as requested."
fi

stop_pid_file() {
  local name="$1"
  local pid_file="$PID_DIR/${name}.pid"
  if [[ ! -f "$pid_file" ]]; then
    return 0
  fi
  local pid
  pid="$(cat "$pid_file")"
  if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    sleep 1
  fi
  rm -f "$pid_file"
}

stop_port_if_owned() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    kill $pids >/dev/null 2>&1 || true
    sleep 1
  fi
}

for service in api web worker; do
  stop_pid_file "$service"
done
stop_port_if_owned 3000
stop_port_if_owned 4000

start_service() {
  local name="$1"
  local cmd="$2"
  local log_file="$3"
  nohup /bin/bash -lc "cd '$ROOT_DIR' && export PATH='$PATH' && $cmd" >"$log_file" 2>&1 &
  local pid=$!
  echo "$pid" >"$PID_DIR/${name}.pid"
  echo "Started ${name} (pid ${pid})"
}

if [[ "$MODE" == "stable" ]]; then
  start_service \
    "api" \
    "set -a; source apps/api/.env; set +a; npm --workspace @hurkme/api run build && npm --workspace @hurkme/api run start" \
    "/tmp/hurkme-api.log"
  start_service \
    "web" \
    "npm --workspace @hurkme/web run build && npm --workspace @hurkme/web run start -- --hostname 0.0.0.0 --port 3000" \
    "/tmp/hurkme-web.log"
  start_service \
    "worker" \
    "set -a; source apps/api/.env; set +a; npm --workspace @hurkme/api run worker" \
    "/tmp/hurkme-worker.log"
else
  start_service "api" "set -a; source apps/api/.env; set +a; npm --workspace @hurkme/api run start:dev" "/tmp/hurkme-api.log"
  start_service "web" "npm --workspace @hurkme/web run dev -- --hostname 0.0.0.0 --port 3000" "/tmp/hurkme-web.log"
  start_service "worker" "set -a; source apps/api/.env; set +a; npm --workspace @hurkme/api run worker:dev" "/tmp/hurkme-worker.log"
fi

wait_for_http() {
  local url="$1"
  local timeout_seconds="$2"
  local start_time="$SECONDS"
  while true; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    if ((SECONDS - start_time >= timeout_seconds)); then
      echo "Timed out waiting for ${url}"
      return 1
    fi
    sleep 1
  done
}

print_log_tail() {
  local file="$1"
  if [[ -f "$file" ]]; then
    echo "---- tail $file ----"
    tail -n 60 "$file" || true
  fi
}

echo "Waiting for API to become healthy..."
if ! wait_for_http "http://127.0.0.1:4000/health" 240; then
  print_log_tail "/tmp/hurkme-api.log"
  exit 1
fi

echo "Waiting for web app to become ready..."
if ! wait_for_http "http://127.0.0.1:3000/home" 420; then
  print_log_tail "/tmp/hurkme-web.log"
  exit 1
fi

echo
echo "HurkME is running (${MODE} mode)."
echo "Web:        http://localhost:3000/home"
echo "API docs:   http://localhost:4000/docs"
echo "API health: http://localhost:4000/health"
echo "Logs: /tmp/hurkme-api.log /tmp/hurkme-web.log /tmp/hurkme-worker.log"
