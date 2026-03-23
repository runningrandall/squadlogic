#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$ROOT_DIR/.dev-pids"

cd "$ROOT_DIR"

# Clean up any stale processes
bash "$SCRIPT_DIR/dev-stop.sh" 2>/dev/null || true

echo "=============================="
echo "  Starting local dev environment"
echo "=============================="

# 1. Start DynamoDB Local
echo ""
echo "[1/5] Starting DynamoDB Local..."
docker compose up -d dynamodb-local

# 2. Wait for DynamoDB to be ready
echo "[2/5] Waiting for DynamoDB Local..."
MAX_RETRIES=30
RETRY=0
until curl -s http://localhost:8000 > /dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: DynamoDB Local did not start within ${MAX_RETRIES}s"
    exit 1
  fi
  sleep 1
done
echo "  DynamoDB Local is ready."

# 3. Initialize database (idempotent)
echo "[3/5] Initializing database..."
node scripts/init-local-db.js

# 4. Seed database (idempotent)
echo "[4/5] Seeding database..."
node scripts/seed-local-db.js

# 5. Start backend and frontend
echo "[5/5] Starting services..."
echo ""

# Start backend
cd "$ROOT_DIR/backend"
DYNAMODB_ENDPOINT=http://localhost:8000 \
TABLE_NAME=TeamManager-Table-dev \
EVENT_BUS_NAME=local-events \
NODE_ENV=development \
PORT=3001 \
npx tsx watch src/server.ts > /tmp/squadlogic-backend.log 2>&1 &
BACKEND_PID=$!
cd "$ROOT_DIR"

# Start frontend
cd "$ROOT_DIR/frontend"
NEXT_PUBLIC_API_URL=http://localhost:3001 \
npx next dev > /tmp/squadlogic-frontend.log 2>&1 &
FRONTEND_PID=$!
cd "$ROOT_DIR"

# Save PIDs for teardown
echo "$BACKEND_PID" > "$PID_FILE"
echo "$FRONTEND_PID" >> "$PID_FILE"

# Wait for backend to be ready
echo "  Waiting for backend..."
RETRY=0
until curl -s http://localhost:3001/health > /dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge 15 ]; then
    echo "ERROR: Backend did not start. Check /tmp/squadlogic-backend.log"
    tail -10 /tmp/squadlogic-backend.log
    bash "$SCRIPT_DIR/dev-stop.sh"
    exit 1
  fi
  sleep 1
done
echo "  Backend ready."

# Wait for frontend to be ready
echo "  Waiting for frontend..."
RETRY=0
until curl -s http://localhost:3000 > /dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge 20 ]; then
    echo "ERROR: Frontend did not start. Check /tmp/squadlogic-frontend.log"
    tail -10 /tmp/squadlogic-frontend.log
    bash "$SCRIPT_DIR/dev-stop.sh"
    exit 1
  fi
  sleep 1
done
echo "  Frontend ready."

echo ""
echo "=============================="
echo "  Local dev environment running"
echo "=============================="
echo ""
echo "  Backend:   http://localhost:3001"
echo "  Frontend:  http://localhost:3000"
echo "  DynamoDB:  http://localhost:8000"
echo ""
echo "  Logs:      tail -f /tmp/squadlogic-backend.log"
echo "             tail -f /tmp/squadlogic-frontend.log"
echo ""
echo "  Stop:      pnpm dev:stop"
echo "  Restart:   pnpm dev:restart"
echo ""
