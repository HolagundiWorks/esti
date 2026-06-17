#!/usr/bin/env bash
# ESTI AORMS — backup PostgreSQL (and optional MinIO volume).
#
# Usage (on VPS with compose.prod.yaml):
#   bash deploy/backup.sh [output_dir]
#
# Creates:
#   $OUT/esti-pg-YYYYMMDD-HHMMSS.sql.gz
#   $OUT/esti-minio-YYYYMMDD-HHMMSS.tar.gz  (when miniodata volume exists)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

COMPOSE=(docker compose -f "$ROOT/compose.prod.yaml")

echo "==> PostgreSQL dump → $OUT/esti-pg-$STAMP.sql.gz"
"${COMPOSE[@]}" exec -T esti-db pg_dump -U "${POSTGRES_USER:-esti}" "${POSTGRES_DB:-esti}" \
  --clean --if-exists \
  | gzip > "$OUT/esti-pg-$STAMP.sql.gz"

if docker volume inspect miniodata >/dev/null 2>&1; then
  echo "==> MinIO volume → $OUT/esti-minio-$STAMP.tar.gz"
  docker run --rm -v miniodata:/data:ro -v "$OUT":/backup alpine \
    tar czf "/backup/esti-minio-$STAMP.tar.gz" -C /data .
else
  echo "==> MinIO volume 'miniodata' not found — skipping object-store archive"
fi

echo "==> Backup complete in $OUT"
