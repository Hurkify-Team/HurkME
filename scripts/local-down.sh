#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pids"

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
  echo "Stopped ${name}"
}

for service in worker web api; do
  stop_pid_file "$service"
done

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    kill $pids >/dev/null 2>&1 || true
    echo "Stopped process on port ${port}"
  fi
}

kill_port 3000
kill_port 4000

if [[ "${1:-}" == "--with-infra" ]]; then
  PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"
  cd "$ROOT_DIR"
  if command -v docker >/dev/null 2>&1; then
    docker compose down
    echo "Stopped Docker infrastructure"
  else
    echo "Docker CLI not found. Skipped infrastructure shutdown."
  fi
fi
