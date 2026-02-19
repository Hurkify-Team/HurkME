#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pids"
PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$HOME/.local/node-v22.22.0/bin:$PATH"

check_pid_file() {
  local name="$1"
  local pid_file="$PID_DIR/${name}.pid"

  if [[ ! -f "$pid_file" ]]; then
    echo "${name}: not started (no pid file)"
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
    echo "${name}: running (pid ${pid})"
  else
    echo "${name}: pid file exists but process is not running"
  fi
}

check_http() {
  local name="$1"
  local url="$2"

  if command -v curl >/dev/null 2>&1 && curl -m 5 -fsS "$url" >/dev/null 2>&1; then
    echo "${name}: healthy (${url})"
  else
    echo "${name}: unreachable (${url})"
  fi
}

if command -v docker >/dev/null 2>&1; then
  echo "Docker services:"
  (cd "$ROOT_DIR" && docker compose ps) || true
else
  echo "Docker services: docker CLI not found"
fi

echo
echo "App services:"
check_pid_file "api"
check_pid_file "web"
check_pid_file "worker"

echo
echo "HTTP checks:"
check_http "API health" "http://127.0.0.1:4000/health"
check_http "Web home" "http://127.0.0.1:3000/home"
echo
echo "Logs:"
echo "- /tmp/hurkme-api.log"
echo "- /tmp/hurkme-web.log"
echo "- /tmp/hurkme-worker.log"
