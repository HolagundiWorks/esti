#!/usr/bin/env bash
# ESTI AORMS — backup PostgreSQL + the MinIO object-store volume.
#   bash deploy/backup.sh [output_dir]   (default: <repo>/backups)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
COMPOSE=(docker compose -f "$ROOT/compose.prod.yaml")

echo "==> PostgreSQL dump → $OUT/esti-pg-$STAMP.sql.gz"
"${COMPOSE[@]}" exec -T esti-db pg_dump -U "${POSTGRES_USER:-esti}" "${POSTGRES_DB:-esti}" \
  --clean --if-exists | gzip > "$OUT/esti-pg-$STAMP.sql.gz"

# Compose prefixes the volume with the project name (compose.prod.yaml → esti-aorms-prod).
MINIO_VOLUME="${MINIO_VOLUME:-esti-aorms-prod_miniodata}"
docker volume inspect "$MINIO_VOLUME" >/dev/null 2>&1 || MINIO_VOLUME="miniodata"
if docker volume inspect "$MINIO_VOLUME" >/dev/null 2>&1; then
  echo "==> MinIO volume ($MINIO_VOLUME) → $OUT/esti-minio-$STAMP.tar.gz"
  docker run --rm -v "$MINIO_VOLUME":/data:ro -v "$OUT":/backup alpine \
    tar czf "/backup/esti-minio-$STAMP.tar.gz" -C /data .
else
  echo "==> MinIO volume not found — skipping object-store archive"
fi
echo "==> Backup complete in $OUT"
