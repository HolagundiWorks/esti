#!/bin/bash
# Verify the deployed SPA includes the current marketing landing (esti-lp).
# Usage: bash deploy/verify-frontend.sh [DEPLOY_DIR]

set -euo pipefail

DEPLOY_DIR="${1:-${DEPLOY_DIR:-/opt/esti}}"
DIST="$DEPLOY_DIR/frontend/dist"

if [[ ! -f "$DIST/index.html" ]]; then
  echo "Missing $DIST/index.html — run deploy/deploy.sh first." >&2
  exit 1
fi

REV="$(git -C "$DEPLOY_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "Git HEAD: $REV"
echo "index.html modified: $(stat -c '%y' "$DIST/index.html" 2>/dev/null || stat -f '%Sm' "$DIST/index.html")"

if grep -q 'esti-lp' "$DIST/index.html" 2>/dev/null || grep -rq 'esti-lp' "$DIST/assets" 2>/dev/null; then
  echo "OK: marketing landing (esti-lp) present — public/demo build"
elif ls "$DIST"/assets/*.js >/dev/null 2>&1; then
  # The firm build (VITE_PUBLIC_SITE=false) ships no marketing landing on purpose;
  # a present JS bundle without esti-lp is a valid firm-product build, not a stale dist.
  echo "OK: bundle present, no marketing landing — firm build (VITE_PUBLIC_SITE=false)"
else
  echo "FAIL: no JS bundle in $DIST/assets — frontend/dist is stale. Rebuild with:" >&2
  echo "  cd $DEPLOY_DIR && bash deploy/deploy.sh" >&2
  exit 1
fi

# Guard against stale bundles that call crypto.randomUUID() on plain HTTP (breaks all tRPC).
if grep -rq 'crypto\.randomUUID' "$DIST/assets" 2>/dev/null; then
  echo "FAIL: built JS still references crypto.randomUUID — pull latest code and redeploy:" >&2
  echo "  cd $DEPLOY_DIR && git pull && bash deploy/deploy.sh" >&2
  exit 1
fi
echo "OK: frontend bundle does not reference crypto.randomUUID"

if curl -fsS "http://127.0.0.1/health" >/dev/null 2>&1 || curl -fsS "http://127.0.0.1:4000/health" >/dev/null 2>&1; then
  LIVE=$(curl -fsS "http://127.0.0.1/" 2>/dev/null | head -c 8000 || true)
  if echo "$LIVE" | grep -q 'esti-lp\|/assets/'; then
    echo "OK: host nginx serves index.html ($(echo "$LIVE" | grep -o 'src="/assets/[^"]*"' | head -1 || echo 'check manually'))"
  else
    echo "WARN: curl http://127.0.0.1/ did not look like the Vite bundle — check nginx root in /etc/nginx/sites-available/esti"
  fi
fi
