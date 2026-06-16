#!/bin/bash
# ESTI AORMS — VPS bootstrap script for Ubuntu 22.04 / 24.04
# Run as root on a fresh server:
#   curl -fsSL https://raw.githubusercontent.com/HolagundiWorks/esti/main/deploy/bootstrap.sh | bash
# Or: git clone the repo first, then bash deploy/bootstrap.sh

set -euo pipefail

# ── CONFIGURATION — edit before running ──────────────────────────────────────
DOMAIN="${DOMAIN:-aorms.in}"           # ESTI production domain (override with DOMAIN=)
REPO_URL="${REPO_URL:-https://github.com/HolagundiWorks/esti.git}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/esti}"
GIT_BRANCH="${GIT_BRANCH:-main}"
# ─────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[esti]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
error() { echo -e "${RED}[error]${NC} $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

DOMAIN="$(normalize_domain "${DOMAIN:-aorms.in}")"
[[ -z $DOMAIN || $DOMAIN == "CHANGE_ME" ]] && error "Set a domain: DOMAIN=aorms.in bash bootstrap.sh"
validate_domain "$DOMAIN" || error "Invalid DOMAIN (use hostname only, e.g. aorms.in)."
[[ $EUID -ne 0 ]] && error "Run as root (sudo -i or sudo bash bootstrap.sh)"

info "=== ESTI AORMS bootstrap for $DOMAIN ==="

# ── 1. System update ──────────────────────────────────────────────────────────
info "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl git openssl ufw

# ── 2. Install Docker (official repo) ────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
else
  info "Docker already installed: $(docker --version)"
fi

# Ensure compose plugin is available
docker compose version &>/dev/null || apt-get install -y docker-compose-plugin

# ── 3. Install nginx + certbot ────────────────────────────────────────────────
info "Installing nginx and certbot..."
apt-get install -y -qq nginx certbot python3-certbot-nginx

# ── 4. Firewall (UFW) ─────────────────────────────────────────────────────────
info "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment 'SSH'
ufw allow 80/tcp    comment 'HTTP'
ufw allow 443/tcp   comment 'HTTPS'
ufw --force enable
ufw status

# ── 5. Clone / update the repository ─────────────────────────────────────────
if [[ -d "$DEPLOY_DIR/.git" ]]; then
  info "Repo already exists — pulling latest $GIT_BRANCH..."
  git -C "$DEPLOY_DIR" fetch origin
  git -C "$DEPLOY_DIR" checkout "$GIT_BRANCH"
  git -C "$DEPLOY_DIR" pull origin "$GIT_BRANCH"
else
  info "Cloning repo to $DEPLOY_DIR..."
  git clone --branch "$GIT_BRANCH" "$REPO_URL" "$DEPLOY_DIR"
fi

cd "$DEPLOY_DIR"

# ── 6. Environment file ───────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
  info "Creating .env from example — FILL IN ALL CHANGE_ME VALUES before continuing."
  cp deploy/.env.production.example .env
  # Patch domain and generate a session secret automatically
  sed -i "s|CHANGE_ME_DOMAIN|$DOMAIN|g" .env
  SESSION_SECRET=$(openssl rand -hex 32)
  sed -i "s|CHANGE_ME_64_char_hex|$SESSION_SECRET|" .env
  warn "=================================================="
  warn "  Edit $DEPLOY_DIR/.env and fill all CHANGE_ME values"
  warn "  then re-run: bash deploy/bootstrap.sh"
  warn "=================================================="
  exit 0
fi

# Check for unfilled placeholders — ignore comment lines (the template's own
# comments mention CHANGE_ME_* while explaining the mechanism).
if grep -vE '^[[:space:]]*#' .env | grep -q "CHANGE_ME"; then
  warn "These .env values still need filling:"
  grep -vE '^[[:space:]]*#' .env | grep -n "CHANGE_ME" || true
  error "Fill the values above in $DEPLOY_DIR/.env, then re-run."
fi

# ── 7. Build and start containers ─────────────────────────────────────────────
info "Building and starting production containers..."
docker compose -f compose.prod.yaml build
# Bring up infrastructure services first and wait for health checks.
docker compose -f compose.prod.yaml up -d esti-db esti-redis esti-minio
info "Waiting for database and Redis to be healthy (up to 60 s)..."
for i in $(seq 1 12); do
  DB_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' esti-db 2>/dev/null || echo "none")
  REDIS_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' esti-redis 2>/dev/null || echo "none")
  if [[ "$DB_HEALTH" == "healthy" && ("$REDIS_HEALTH" == "healthy" || "$REDIS_HEALTH" == "none") ]]; then
    break
  fi
  sleep 5
done

# Load S3 creds for MinIO bucket bootstrap.
set -a
# shellcheck disable=SC1091
source .env
set +a
ensure_minio_bucket "$DEPLOY_DIR" || warn "MinIO bucket setup failed — backend will retry on startup."

docker compose -f compose.prod.yaml up -d backend worker
wait_for_backend_health 30 2 || warn "Backend not healthy yet — check: docker logs esti-backend --tail 80"

# ── 8. Build frontend static files ────────────────────────────────────────────
info "Building frontend static files..."
docker compose -f compose.prod.yaml --profile build-only build frontend
# The frontend image is an nginx static server (CMD runs nginx) — do NOT `run`
# it (that would start nginx and block). Instead create a stopped container and
# copy its compiled /dist out to the host so the host nginx can serve it.
docker rm -f esti-frontend-extract 2>/dev/null || true
docker create --name esti-frontend-extract esti-frontend:prod
rm -rf "$DEPLOY_DIR/frontend/dist"
mkdir -p "$DEPLOY_DIR/frontend/dist"
docker cp esti-frontend-extract:/usr/share/nginx/html/. "$DEPLOY_DIR/frontend/dist/"
docker rm esti-frontend-extract
chown -R www-data:www-data "$DEPLOY_DIR/frontend/dist" 2>/dev/null || true

# ── 9. Configure nginx reverse proxy ─────────────────────────────────────────
info "Installing nginx site config..."
install_nginx_site "$DOMAIN" "$DEPLOY_DIR" || error "nginx configuration failed — check server_name / domain."

# ── 10. TLS via Certbot ────────────────────────────────────────────────────────
info "Obtaining Let's Encrypt certificate for $DOMAIN..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" --redirect
systemctl reload nginx

# ── 11. Systemd auto-start on reboot ─────────────────────────────────────────
info "Creating systemd service for auto-start..."
cat > /etc/systemd/system/esti.service <<EOF
[Unit]
Description=ESTI AORMS
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$DEPLOY_DIR
ExecStart=/usr/bin/docker compose -f compose.prod.yaml up -d
ExecStop=/usr/bin/docker compose -f compose.prod.yaml down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable esti

info "=================================================="
info "  ESTI AORMS is live at https://$DOMAIN"
info "  Containers: $(docker compose -f compose.prod.yaml ps --format 'table {{.Name}}\t{{.Status}}' 2>/dev/null | tail -n +2 | tr '\n' ' ')"
info "=================================================="
