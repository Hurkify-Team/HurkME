#!/usr/bin/env bash
set -euo pipefail

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

ok=0
fail=0

check_cmd() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then
    local resolved
    resolved="$(command -v "$name")"
    echo "[OK]   ${name}: ${resolved}"
    ok=$((ok + 1))
  else
    echo "[FAIL] ${name}: not found"
    fail=$((fail + 1))
  fi
}

echo "Checking local development requirements..."
check_cmd node
check_cmd npm
check_cmd docker
check_cmd curl
check_cmd lsof

if command -v node >/dev/null 2>&1; then
  echo "Node version: $(node -v)"
fi
if command -v npm >/dev/null 2>&1; then
  echo "NPM version: $(npm -v)"
fi

if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    echo "[OK]   Docker engine: running"
    ok=$((ok + 1))
  else
    echo "[FAIL] Docker engine: not running (open Docker Desktop)"
    fail=$((fail + 1))
  fi
fi

echo
echo "Summary: ${ok} OK, ${fail} failed"

if [[ $fail -gt 0 ]]; then
  echo "Fix failed checks, then run: npm run local:up"
  exit 1
fi

echo "Environment looks good. Run: npm run local:up"
