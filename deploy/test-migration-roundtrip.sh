#!/usr/bin/env bash
# Validate the local→cloud migration end-to-end against two LOCAL databases:
# pg_dump the source, restore into a FRESH EMPTY target, then prove the two are
# row-for-row identical (every esti_* table's count + the schema head match —
# the DB dimension of diffManifest). This is the core migration claim: because
# the firm boundary is the database boundary and the target is empty, a whole-
# instance dump→restore needs no id-remap and must be faithful.
#
# Read-only on the source (pg_dump only). Only the throwaway target DB is
# created and dropped. Run it against a seeded dev stack:
#   bash deploy/test-migration-roundtrip.sh
#
# Env overrides: COMPOSE_FILE, POSTGRES_USER, SRC_DB, TGT_DB, DB_SERVICE
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/compose.yaml}"
COMPOSE=(docker compose -f "$COMPOSE_FILE")
DB_SERVICE="${DB_SERVICE:-esti-db}"
DB_USER="${POSTGRES_USER:-esti}"
SRC_DB="${SRC_DB:-esti}"
TGT_DB="${TGT_DB:-esti_migtest}"
MANIFEST_SQL="$ROOT/deploy/migration-manifest.sql"

[ -f "$MANIFEST_SQL" ] || { echo "missing $MANIFEST_SQL" >&2; exit 2; }

# Guardrail: never let the throwaway target be a real database.
case "$TGT_DB" in
  esti|postgres|template0|template1) echo "refusing to use '$TGT_DB' as the test target" >&2; exit 2 ;;
esac

admin() { "${COMPOSE[@]}" exec -T "$DB_SERVICE" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d postgres -c "$1"; }
manifest_of() { "${COMPOSE[@]}" exec -T "$DB_SERVICE" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$1" < "$MANIFEST_SQL"; }

echo "==> Fresh empty target: $TGT_DB (drop + recreate)"
admin "drop database if exists $TGT_DB" >/dev/null
admin "create database $TGT_DB" >/dev/null

echo "==> pg_dump $SRC_DB  →  restore into $TGT_DB"
"${COMPOSE[@]}" exec -T "$DB_SERVICE" sh -lc \
  "pg_dump -U '$DB_USER' '$SRC_DB' | psql -q -v ON_ERROR_STOP=1 -U '$DB_USER' -d '$TGT_DB'" >/dev/null

echo "==> Comparing manifests (every esti_* row count + schema head)"
src="$(manifest_of "$SRC_DB")"
tgt="$(manifest_of "$TGT_DB")"

if diff <(printf '%s\n' "$src") <(printf '%s\n' "$tgt"); then
  echo "PASS ✅  source and restored target are row-for-row identical."
  admin "drop database if exists $TGT_DB" >/dev/null
  exit 0
else
  echo "FAIL ❌  manifests differ (see diff above)."
  echo "         Target '$TGT_DB' left in place for inspection."
  exit 1
fi
