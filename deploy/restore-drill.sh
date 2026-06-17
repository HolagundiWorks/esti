#!/usr/bin/env bash
# ESTI AORMS — staging restore drill.
#
# Takes a backup directory (same layout as deploy/backup.sh output), restores the
# latest PostgreSQL dump, restarts backend/worker, and verifies /health + /readyz.
#
# Usage:
#   bash deploy/restore-drill.sh [backup_dir]
#
# Run only on a staging VPS clone — overwrites the current database.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/backups}"
COMPOSE=(docker compose -f "$ROOT/compose.prod.yaml")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

LATEST="$(ls -t "$OUT"/esti-pg-*.sql.gz 2>/dev/null | head -1 || true)"
if [[ -z "$LATEST" ]]; then
  echo "No esti-pg-*.sql.gz found in $OUT" >&2
  exit 1
fi

echo "==> Restore drill using $LATEST"
echo "==> Stopping backend and worker"
"${COMPOSE[@]}" stop backend worker

bash "$ROOT/deploy/restore.sh" "$LATEST"

echo "==> Starting backend and worker"
"${COMPOSE[@]}" up -d backend worker

echo "==> Waiting for /health"
if ! wait_for_backend_health 45 2; then
  echo "Restore drill FAILED — backend did not pass /health" >&2
  exit 1
fi

HEALTH="$(curl -sf http://127.0.0.1:4000/health || echo '{}')"
READY="$(curl -sf http://127.0.0.1:4000/readyz || echo '{}')"
echo "==> /health: $HEALTH"
echo "==> /readyz: $READY"

if ! echo "$HEALTH" | grep -q '"ok":true'; then
  echo "Restore drill FAILED — /health ok=false" >&2
  exit 1
fi

echo "==> Restore drill passed"
