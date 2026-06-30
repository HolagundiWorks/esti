#!/usr/bin/env bash
# ESTI AORMS — restore PostgreSQL from a gzipped pg_dump.
#   bash deploy/restore.sh path/to/esti-pg-YYYYMMDD-HHMMSS.sql.gz
# WARNING: overwrites the current database. Stop backend/worker first.
set -euo pipefail

[[ $# -lt 1 ]] && { echo "Usage: bash deploy/restore.sh <esti-pg-*.sql.gz>" >&2; exit 1; }
DUMP="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE=(docker compose -f "$ROOT/compose.prod.yaml")

echo "==> Restoring PostgreSQL from $DUMP (overwrites current data)"
gunzip -c "$DUMP" | "${COMPOSE[@]}" exec -T esti-db \
  psql -U "${POSTGRES_USER:-esti}" -d "${POSTGRES_DB:-esti}" -v ON_ERROR_STOP=1
echo "==> Restore complete — restart backend and worker:"
echo "    docker compose -f $ROOT/compose.prod.yaml up -d backend worker"
