#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

export FRUITFLY_DATASETS="${FRUITFLY_DATASETS:-$ROOT/packages/science-datasets}"
export FRUITFLY_RUNTIME="${FRUITFLY_RUNTIME:-$ROOT/worker/science/data}"
export PYTHONPATH="$ROOT/packages/science-engine/src${PYTHONPATH:+:$PYTHONPATH}"

cleanup() {
  [[ -n "${WORKER_PID:-}" ]] && kill "$WORKER_PID" 2>/dev/null || true
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "[dev] postgres"
if command -v docker >/dev/null 2>&1; then
  (cd "$ROOT/infra" && docker compose up -d) || (cd "$ROOT/infra" && podman compose up -d)
else
  (cd "$ROOT/infra" && podman compose up -d)
fi

echo "[dev] worker :8765"
(cd "$ROOT/worker" && python3 -u server.py) &
WORKER_PID=$!
sleep 1

echo "[dev] backend :8080"
(cd "$ROOT/apps/backend" && ./mvnw -q spring-boot:run) &
API_PID=$!

echo "[dev] frontend :4200"
cd "$ROOT/apps/frontend"
npm start
