#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$ROOT_DIR/.dev-pids"

cd "$ROOT_DIR"

echo "=============================="
echo "  Tearing down local dev environment"
echo "=============================="

# 1. Stop backend and frontend processes
if [ -f "$PID_FILE" ]; then
  echo "[1/2] Stopping services..."
  while IFS= read -r pid; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "  Stopped process $pid"
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
else
  echo "[1/2] No PID file found, skipping process cleanup."
fi

# Also kill any tsx watch or next dev processes for this project
pkill -f "tsx watch.*team-management" 2>/dev/null || true
pkill -f "next dev.*team-management" 2>/dev/null || true

# 2. Stop DynamoDB Local
echo "[2/2] Stopping DynamoDB Local..."
docker compose down 2>/dev/null || true

echo ""
echo "  Local dev environment stopped."
echo ""
