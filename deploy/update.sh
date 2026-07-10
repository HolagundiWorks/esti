#!/usr/bin/env bash
# ESTI AORMS — update an existing deployment in place.
# Pulls code, rebuilds backend/worker/frontend, swaps the static dist atomically,
# rolling-restarts, runs idempotent seeds. The profile is read from .env — not repeated.
#   bash deploy/update.sh
#   GIT_BRANCH=feat/x bash deploy/update.sh    # deploy a branch
#   REFRESH_NGINX=true bash deploy/update.sh    # also re-apply nginx vhost
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

cd "$DEPLOY_DIR"
GIT_BRANCH="${GIT_BRANCH:-main}"
set -a; load_dotenv "$DEPLOY_DIR/.env"; set +a

section "Pulling ${GIT_BRANCH}"
git fetch origin && git checkout "$GIT_BRANCH" && git pull origin "$GIT_BRANCH"

section "Rebuilding backend + worker"
docker compose -f compose.prod.yaml build backend worker
docker compose -f compose.prod.yaml up -d backend worker
wait_for_backend_health 30 2 && info "Backend healthy." || warn "Backend /health failed — docker logs esti-backend"

# ESE was retired from compose.prod.yaml (2026-07 estimation teardown). Skip when
# the service is absent even if legacy .env still has ESE_ENABLED=true.
if [[ "${ESE_ENABLED:-false}" == "true" ]]; then
  if docker compose -f compose.prod.yaml config --services 2>/dev/null | grep -qx ese; then
    section "Rebuilding ESE"
    docker compose -f compose.prod.yaml build ese
    docker compose -f compose.prod.yaml up -d ese
    info "ESE rebuilt (ese.<domain>)."
  else
    warn "ESE_ENABLED=true but compose.prod.yaml has no ese service — skipping (set ESE_ENABLED=false in .env)."
  fi
fi

section "Seeds (idempotent)"
docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seed.js || warn "base seed failed"
if [[ "${SEED_DEMO:-false}" == "true" ]]; then
  docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seedDemo.js || warn "demo seed failed"
fi

section "Frontend (atomic dist swap)"
docker compose -f compose.prod.yaml --profile build-only build frontend
docker create --name esti-fe-tmp esti-frontend:prod
rm -rf "$DEPLOY_DIR/frontend/dist.new"; mkdir -p "$DEPLOY_DIR/frontend/dist.new"
docker cp esti-fe-tmp:/usr/share/nginx/html/. "$DEPLOY_DIR/frontend/dist.new/"
docker rm esti-fe-tmp
chown -R www-data:www-data "$DEPLOY_DIR/frontend/dist.new"
rm -rf "$DEPLOY_DIR/frontend/dist.old"
[[ -d "$DEPLOY_DIR/frontend/dist" ]] && mv "$DEPLOY_DIR/frontend/dist" "$DEPLOY_DIR/frontend/dist.old"
mv "$DEPLOY_DIR/frontend/dist.new" "$DEPLOY_DIR/frontend/dist"
info "Frontend swapped."

if [[ "${REFRESH_NGINX:-false}" == "true" ]]; then
  section "Refreshing nginx vhost"
  _dom="$(normalize_domain "${ALLOWED_ORIGINS:-}")"
  install_nginx_site "$_dom" "$DEPLOY_DIR" || warn "nginx refresh failed"
  # install_nginx_site re-copies the HTTP-only template, which drops the SSL
  # server block certbot had appended. Re-assert TLS so HTTPS survives a refresh.
  if [[ "${SELF_SIGNED_CERT:-false}" == "true" ]]; then
    # Re-generate / re-assert the self-signed block if requested.
    generate_self_signed "$_dom" 30 || warn "self-signed TLS re-assert failed"
  else
    if command -v certbot >/dev/null 2>&1 && [[ -n "$_dom" && -d "/etc/letsencrypt/live/$_dom" ]]; then
      certbot --nginx -d "$_dom" --redirect --non-interactive --keep-until-expiring \
        && nginx -t && systemctl reload nginx \
        || warn "certbot TLS re-assert failed — run: certbot --nginx -d $_dom --redirect"
    fi
  fi
fi
info "Update complete."
