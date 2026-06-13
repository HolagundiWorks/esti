#!/bin/bash
# ESTI AORMS — zero-downtime redeploy script
# Run from /opt/esti after pulling new code:
#   bash deploy/deploy.sh
# Or with a branch override:
#   GIT_BRANCH=feature/xyz bash deploy/deploy.sh

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
GIT_BRANCH="${GIT_BRANCH:-main}"

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
docker compose -f compose.prod.yaml --profile build-only build frontend
# Extract the compiled /dist from the nginx image (do NOT `run` it — its CMD is
# nginx and would block). Create a stopped container, docker cp out, remove it.
docker rm -f esti-frontend-extract 2>/dev/null || true
docker create --name esti-frontend-extract esti-frontend:prod
rm -rf "$DEPLOY_DIR/frontend/dist"
mkdir -p "$DEPLOY_DIR/frontend/dist"
docker cp esti-frontend-extract:/usr/share/nginx/html/. "$DEPLOY_DIR/frontend/dist/"
docker rm esti-frontend-extract
chown -R www-data:www-data "$DEPLOY_DIR/frontend/dist" 2>/dev/null || true
nginx -s reload 2>/dev/null || true

# ── 4. Rolling restart — backend first, then worker ──────────────────────────
info "Restarting backend (migrations run on startup)..."
docker compose -f compose.prod.yaml up -d --no-deps --force-recreate backend
info "Waiting for backend to become healthy..."
for i in $(seq 1 20); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' esti-backend 2>/dev/null || echo "none")
  if [[ "$STATUS" == "healthy" || "$STATUS" == "none" ]]; then
    break
  fi
  sleep 3
done

info "Restarting worker..."
docker compose -f compose.prod.yaml up -d --no-deps --force-recreate worker

# ── 5. Prune old images ────────────────────────────────────────────────────────
info "Pruning dangling images..."
docker image prune -f

info "Deploy complete."
docker compose -f compose.prod.yaml ps
