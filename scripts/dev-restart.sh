#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Stopping all services..."
bash "$SCRIPT_DIR/dev-stop.sh"

echo ""
echo "Restarting..."
sleep 1

bash "$SCRIPT_DIR/dev-local.sh"
