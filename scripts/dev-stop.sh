#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$ROOT_DIR/.dev-pids"

cd "$ROOT_DIR"

echo "=============================="
echo "  Stopping local dev services"
echo "=============================="

# 1. Kill processes from PID file
if [ -f "$PID_FILE" ]; then
  while IFS= read -r pid; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && echo "  Killed PID $pid" || true
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi

# 2. Kill anything on backend port 3001
if lsof -ti:3001 > /dev/null 2>&1; then
  echo "  Killing processes on port 3001..."
  lsof -ti:3001 | xargs kill -9 2>/dev/null || true
fi

# 3. Kill anything on frontend port 3000
if lsof -ti:3000 > /dev/null 2>&1; then
  echo "  Killing processes on port 3000..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

# 4. Kill any tsx watch or next dev for this project
pkill -f "tsx watch.*team-management" 2>/dev/null || true
pkill -f "next dev.*team-management" 2>/dev/null || true
pkill -f "next-router-worker.*team-management" 2>/dev/null || true

# 5. Stop DynamoDB Local (compose + any stray containers on port 8000)
echo "  Stopping DynamoDB Local..."
docker compose down 2>/dev/null || true
docker ps -q --filter "publish=8000" 2>/dev/null | xargs -r docker stop 2>/dev/null || true
if lsof -ti:8000 > /dev/null 2>&1; then
  echo "  Killing remaining processes on port 8000..."
  lsof -ti:8000 | xargs kill -9 2>/dev/null || true
fi

echo ""
echo "  All services stopped."
echo ""
