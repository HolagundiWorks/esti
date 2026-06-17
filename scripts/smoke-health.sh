#!/usr/bin/env bash
# Smoke-check backend health endpoints (post-deploy or restore drill).
#
# Usage:
#   bash scripts/smoke-health.sh [base_url]
#   bash scripts/smoke-health.sh http://127.0.0.1:4000

set -euo pipefail

BASE="${1:-http://127.0.0.1:4000}"

echo "==> GET $BASE/health"
HEALTH="$(curl -sf "$BASE/health")"
echo "$HEALTH"
echo "$HEALTH" | grep -q '"ok":true' || { echo "FAIL: /health ok=false" >&2; exit 1; }

echo "==> GET $BASE/readyz"
READY_CODE="$(curl -s -o /tmp/esti-readyz.json -w "%{http_code}" "$BASE/readyz")"
cat /tmp/esti-readyz.json
echo
[[ "$READY_CODE" == "200" ]] || { echo "WARN: /readyz returned HTTP $READY_CODE (storage may be down)" >&2; exit 1; }

echo "==> Smoke health OK"
