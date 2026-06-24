#!/bin/bash
# ESTI AORMS — zero-downtime redeploy script
# Run from /opt/esti after pulling new code:
#   bash deploy/deploy.sh
# Or with a branch override:
#   GIT_BRANCH=feature/xyz bash deploy/deploy.sh

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
GIT_BRANCH="${GIT_BRANCH:-main}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }

cd "$DEPLOY_DIR"

# ── 1. Pull latest code ───────────────────────────────────────────────────────
info "Pulling $GIT_BRANCH..."
git fetch origin
git checkout "$GIT_BRANCH"
git pull origin "$GIT_BRANCH"

# ── 2. Rebuild changed images ─────────────────────────────────────────────────
info "Building backend and worker images..."
docker compose -f compose.prod.yaml build backend worker

# ── 3. Rebuild frontend static files ─────────────────────────────────────────
info "Rebuilding frontend..."
export BUILD_REVISION="$(git rev-parse --short HEAD)"
info "Frontend build revision: $BUILD_REVISION"
# compose.prod.yaml reads VITE_* from .env — do not `source .env` (breaks on spaces).
docker compose -f compose.prod.yaml --profile build-only build --no-cache frontend
# Extract the compiled /dist from the nginx image (do NOT `run` it — its CMD is
# nginx and would block). Create a stopped container, docker cp out, remove it.
# Atomic swap: extract into dist.new and only replace the live dist once the new
# build is fully copied, so a failed build/extract never leaves the site empty.
docker rm -f esti-frontend-extract 2>/dev/null || true
docker create --name esti-frontend-extract esti-frontend:prod
DIST_NEW="$DEPLOY_DIR/frontend/dist.new"
rm -rf "$DIST_NEW"
mkdir -p "$DIST_NEW"
docker cp esti-frontend-extract:/usr/share/nginx/html/. "$DIST_NEW/"
docker rm esti-frontend-extract
chown -R www-data:www-data "$DIST_NEW" 2>/dev/null || true
rm -rf "$DEPLOY_DIR/frontend/dist.old"
[[ -d "$DEPLOY_DIR/frontend/dist" ]] && mv "$DEPLOY_DIR/frontend/dist" "$DEPLOY_DIR/frontend/dist.old"
mv "$DIST_NEW" "$DEPLOY_DIR/frontend/dist"
rm -rf "$DEPLOY_DIR/frontend/dist.old"

# The nginx vhost is installed once (with TLS added by certbot) and is stable across
# deploys — only the dist/ files change. We do NOT rewrite it here by default, because
# install_nginx_site lays down the HTTP-only template and would drop certbot's TLS block,
# taking the site to plain HTTP (lost cert, slow/broken HTTPS). Set REFRESH_NGINX=true to
# pull template changes; we then re-apply TLS from the existing certificate.
if [[ "${REFRESH_NGINX:-false}" == "true" && -f /etc/nginx/sites-available/esti ]]; then
  DOMAIN="$(grep -m1 'server_name' /etc/nginx/sites-available/esti | awk '{print $2}' | tr -d ';')"
  if [[ -n "$DOMAIN" && "$DOMAIN" != "DOMAIN_PLACEHOLDER" ]]; then
    info "Refreshing nginx config for ${DOMAIN} (REFRESH_NGINX=true)..."
    install_nginx_site "$DOMAIN" "$DEPLOY_DIR" || warn "nginx config refresh skipped"
    if [[ -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
      certbot --nginx -d "$DOMAIN" --non-interactive --reinstall --redirect >/dev/null 2>&1 \
        || warn "TLS re-apply failed — run: certbot --nginx -d $DOMAIN"
    fi
  fi
fi
systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || true

bash "$SCRIPT_DIR/verify-frontend.sh" "$DEPLOY_DIR" || warn "Frontend verification failed — see above"

# ── 4. Rolling restart — backend first, then worker ──────────────────────────
info "Restarting backend (migrations run on startup)..."
docker compose -f compose.prod.yaml up -d --no-deps --force-recreate backend
info "Waiting for backend /health..."
if ! wait_for_backend_health 30 2; then
  warn "Backend did not pass /health — last logs:"
  docker logs esti-backend --tail 40 2>/dev/null || true
  exit 1
fi

# ── 4b. Seed (idempotent — safe to re-run every deploy) ──────────────────────
# Applies new owner/base records and demo-workspace data shipped with this build.
# Runs the compiled seeds directly (the runtime image has node, not pnpm).
info "Seeding owner/base data (idempotent)..."
docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seed.js \
  || warn "Base seed failed — see: docker logs esti-backend"
# Demo workspace seed — skip on the firm product variant with SEED_DEMO=false.
if [[ "${SEED_DEMO:-true}" != "false" ]]; then
  info "Seeding demo workspace (idempotent)..."
  docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seedDemo.js \
    || warn "Demo seed failed — see: docker logs esti-backend"
else
  info "Demo seed skipped (SEED_DEMO=false — firm product build)."
fi

info "Restarting worker..."
docker compose -f compose.prod.yaml up -d --no-deps --force-recreate worker

# ── 5. Prune old images ────────────────────────────────────────────────────────
info "Pruning dangling images..."
docker image prune -f

# ── 6. IndexNow ping — notify Bing/Yandex (and AI engines that use them) ──────
# Best-effort; never fails the deploy. Key file is served at https://<host>/<key>.txt
INDEXNOW_KEY="5ed3f656cc6f355b03971f54022b015c"
INDEXNOW_HOST="${INDEXNOW_HOST:-aorms.in}"
if [[ -f /etc/nginx/sites-available/esti ]]; then
  _d="$(grep -m1 'server_name' /etc/nginx/sites-available/esti | awk '{print $2}' | tr -d ';')"
  [[ -n "$_d" && "$_d" != "DOMAIN_PLACEHOLDER" ]] && INDEXNOW_HOST="$_d"
fi
info "Pinging IndexNow for ${INDEXNOW_HOST}..."
curl -s -m 10 -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d "{\"host\":\"${INDEXNOW_HOST}\",\"key\":\"${INDEXNOW_KEY}\",\"keyLocation\":\"https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt\",\"urlList\":[\"https://${INDEXNOW_HOST}/\",\"https://${INDEXNOW_HOST}/blog\",\"https://${INDEXNOW_HOST}/compliance-check\"]}" \
  >/dev/null 2>&1 && info "IndexNow notified." || warn "IndexNow ping skipped."

info "Deploy complete."
docker compose -f compose.prod.yaml ps
