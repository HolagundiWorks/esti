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

# Compose prefixes volume names with the project (compose.prod.yaml → name: esti-aorms-prod),
# so the MinIO volume is "esti-aorms-prod_miniodata", not bare "miniodata". Resolve the
# prefixed name first, then fall back to an unprefixed/legacy volume if present.
MINIO_VOLUME="${MINIO_VOLUME:-esti-aorms-prod_miniodata}"
docker volume inspect "$MINIO_VOLUME" >/dev/null 2>&1 || MINIO_VOLUME="miniodata"

if docker volume inspect "$MINIO_VOLUME" >/dev/null 2>&1; then
  echo "==> MinIO volume ($MINIO_VOLUME) → $OUT/esti-minio-$STAMP.tar.gz"
  docker run --rm -v "$MINIO_VOLUME":/data:ro -v "$OUT":/backup alpine \
    tar czf "/backup/esti-minio-$STAMP.tar.gz" -C /data .
else
  echo "==> MinIO volume not found (tried esti-aorms-prod_miniodata, miniodata) — skipping object-store archive"
fi

echo "==> Backup complete in $OUT"
