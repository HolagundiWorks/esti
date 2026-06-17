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
  echo "OK: new marketing landing (esti-lp) found in frontend/dist"
else
  echo "FAIL: esti-lp not found — frontend/dist is stale. Rebuild with:" >&2
  echo "  cd $DEPLOY_DIR && bash deploy/deploy.sh" >&2
  exit 1
fi

if curl -fsS "http://127.0.0.1/health" >/dev/null 2>&1 || curl -fsS "http://127.0.0.1:4000/health" >/dev/null 2>&1; then
  LIVE=$(curl -fsS "http://127.0.0.1/" 2>/dev/null | head -c 8000 || true)
  if echo "$LIVE" | grep -q 'esti-lp\|/assets/'; then
    echo "OK: host nginx serves index.html ($(echo "$LIVE" | grep -o 'src="/assets/[^"]*"' | head -1 || echo 'check manually'))"
  else
    echo "WARN: curl http://127.0.0.1/ did not look like the Vite bundle — check nginx root in /etc/nginx/sites-available/esti"
  fi
fi
