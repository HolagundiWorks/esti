#!/bin/bash
# ============================================================
#  ESTI AORMS — One-shot VPS setup script
#  Run on Ubuntu 22.04 / 24.04 as root:
#    bash setup-vps.sh
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${GREEN}[✔]${NC} $*"; }
section() { echo -e "\n${CYAN}${BOLD}▶ $*${NC}"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✘] ERROR:${NC} $*"; exit 1; }
ask()     { echo -en "${BOLD}$1${NC} "; read -r "$2"; }
askpass() { echo -en "${BOLD}$1${NC} "; read -rs "$2"; echo; }

[[ $EUID -ne 0 ]] && error "Run as root: sudo bash setup-vps.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

clear
echo -e "${CYAN}${BOLD}"
echo "  ███████╗███████╗████████╗██╗"
echo "  ██╔════╝██╔════╝╚══██╔══╝██║"
echo "  █████╗  ███████╗   ██║   ██║"
echo "  ██╔══╝  ╚════██║   ██║   ██║"
echo "  ███████╗███████║   ██║   ██║"
echo "  ╚══════╝╚══════╝   ╚═╝   ╚═╝"
echo -e "  AORMS — VPS Setup${NC}"
echo "  ============================================"
echo ""

# ── Collect all inputs up front ──────────────────────────────────────────────
section "Configuration"
echo "Please enter the following details. Press Enter to use the default where shown."
echo ""

ask  "Domain name (e.g. aorms.in) [aorms.in]:"                  DOMAIN
DOMAIN="${DOMAIN:-aorms.in}"
DOMAIN="$(normalize_domain "$DOMAIN")"
validate_domain "$DOMAIN" || error "Enter a valid domain (hostname only, e.g. aorms.in)."
ask  "Your email (for TLS certificate):"                    ADMIN_EMAIL
# certbot fails non-interactively on an empty/invalid email — catch it now, before the
# ~5-minute build, instead of dying at the TLS step.
[[ "$ADMIN_EMAIL" == *@*.* ]] || error "A valid email is required for the TLS certificate (Let's Encrypt renewal notices)."
ask  "Git branch [main]:"                                   GIT_BRANCH
GIT_BRANCH="${GIT_BRANCH:-main}"

# Build variant — set by the install-demo.sh / install-firm.sh wrappers, or pass
# VARIANT=demo|firm directly. demo = public marketing site (landing/blog/investors)
# + seeded demo workspace; firm = product only (no marketing, no demo, /login at root).
VARIANT="${VARIANT:-demo}"
case "$VARIANT" in
  demo) PUBLIC_SITE="true";  SEED_DEMO="true"  ;;
  firm) PUBLIC_SITE="false"; SEED_DEMO="false" ;;
  *) error "VARIANT must be 'demo' or 'firm' (got: '$VARIANT'). Use install-demo.sh or install-firm.sh." ;;
esac
info "Build variant: ${BOLD}${VARIANT}${NC} (public site: ${PUBLIC_SITE}, demo data: ${SEED_DEMO})"

echo ""
warn "Database & session secrets"
askpass "PostgreSQL password [auto-generate]:" POSTGRES_PASSWORD
# An empty password leaves Postgres uninitialized (the container never goes healthy),
# so auto-generate a strong one when left blank.
[[ -z "$POSTGRES_PASSWORD" ]] && POSTGRES_PASSWORD=$(openssl rand -hex 16) && info "PostgreSQL password auto-generated (stored in .env)."
askpass "Session secret [auto-generate]:" SESSION_SECRET
[[ -z "$SESSION_SECRET" ]] && SESSION_SECRET=$(openssl rand -hex 32) && info "Session secret auto-generated."

echo ""
warn "MinIO (built-in S3-compatible storage)"
ask "MinIO root user   [esti-admin]:"  MINIO_USER
MINIO_USER="${MINIO_USER:-esti-admin}"
askpass "MinIO root password (min 8 chars) [auto-generate]:" MINIO_PASSWORD
# MinIO refuses to start with a password under 8 characters — auto-generate if too short.
[[ ${#MINIO_PASSWORD} -lt 8 ]] && MINIO_PASSWORD=$(openssl rand -hex 16) && warn "MinIO password missing/too short — auto-generated a strong one (stored in .env)."

echo ""
warn "First owner account for ESTI"
ask     "Owner email:"     OWNER_EMAIL
[[ "$OWNER_EMAIL" == *@* ]] || error "Owner email is required — it is your admin login."
askpass "Owner password:"  OWNER_PASSWORD
[[ -n "$OWNER_PASSWORD" ]] || error "Owner password is required."
if [[ "$VARIANT" == "demo" ]]; then
  # The public demo button sends a hardcoded "demo1234" (frontend landing-demo.ts), so
  # changing this breaks one-click demo login. Keep the default unless you know why.
  askpass "Demo account password [demo1234]:" DEMO_PASSWORD
  DEMO_PASSWORD="${DEMO_PASSWORD:-demo1234}"
  [[ "$DEMO_PASSWORD" != "demo1234" ]] && warn "Demo password ≠ demo1234 — the public one-click demo button will fail until the frontend constant matches."
  # Keep owner in sync when the owner *is* the demo principal.
  if [[ "${OWNER_EMAIL}" == "principal@demo.aorms.in" ]]; then
    OWNER_PASSWORD="$DEMO_PASSWORD"
    info "Demo principal: owner password set to match demo password."
  fi
else
  DEMO_PASSWORD="demo1234"   # unused on the firm build (no demo workspace is seeded)
fi

echo ""
info "Configuration collected. Starting setup..."

# ── Derived values ────────────────────────────────────────────────────────────
DEPLOY_DIR="/opt/esti"
REPO_URL="https://github.com/HolagundiWorks/esti.git"
DATABASE_URL="postgresql://esti:${POSTGRES_PASSWORD}@esti-db:5432/esti"
REDIS_URL="redis://esti-redis:6379"
S3_ENDPOINT="http://esti-minio:9000"
S3_PUBLIC_ENDPOINT="https://${DOMAIN}/storage"
S3_BUCKET="esti-documents"

# ── 1. System update ──────────────────────────────────────────────────────────
section "System update"
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl git openssl ufw
info "System packages up to date."

# ── 2. Docker ─────────────────────────────────────────────────────────────────
section "Docker"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  info "Docker installed: $(docker --version)"
else
  info "Docker already present: $(docker --version)"
fi
docker compose version &>/dev/null || apt-get install -y docker-compose-plugin
info "Docker Compose plugin ready."

# ── 3. nginx + certbot ────────────────────────────────────────────────────────
section "nginx + certbot"
apt-get install -y -qq nginx certbot python3-certbot-nginx
info "nginx and certbot installed."

# ── 4. Firewall ───────────────────────────────────────────────────────────────
section "UFW firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP'
ufw allow 443/tcp  comment 'HTTPS'
ufw --force enable
info "Firewall configured (22, 80, 443 open)."

# ── 5. Clone repo ─────────────────────────────────────────────────────────────
section "Repository"
if [[ -d "$DEPLOY_DIR/.git" ]]; then
  info "Repo already at $DEPLOY_DIR — pulling latest $GIT_BRANCH..."
  git -C "$DEPLOY_DIR" fetch origin
  git -C "$DEPLOY_DIR" checkout "$GIT_BRANCH"
  git -C "$DEPLOY_DIR" pull origin "$GIT_BRANCH"
else
  info "Cloning to $DEPLOY_DIR..."
  git clone --branch "$GIT_BRANCH" "$REPO_URL" "$DEPLOY_DIR"
fi
cd "$DEPLOY_DIR"

# ── 6. Write .env ─────────────────────────────────────────────────────────────
section ".env file"
cat > "$DEPLOY_DIR/.env" <<EOF
# Generated by setup-vps.sh on $(date -u +"%Y-%m-%d %H:%M UTC")
NODE_ENV=production
BACKEND_PORT=4000
SESSION_SECRET=${SESSION_SECRET}
COOKIE_SECURE=true
ALLOWED_ORIGINS=https://${DOMAIN}

POSTGRES_USER=esti
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=esti
DATABASE_URL=${DATABASE_URL}

REDIS_URL=${REDIS_URL}

S3_ENDPOINT=${S3_ENDPOINT}
S3_PUBLIC_ENDPOINT=${S3_PUBLIC_ENDPOINT}
S3_BUCKET=${S3_BUCKET}
S3_ACCESS_KEY=${MINIO_USER}
S3_SECRET_KEY=${MINIO_PASSWORD}
S3_REGION=ap-south-1

WORKER_JOB_STREAM=esti:jobs
WORKER_GROUP=esti-workers

SEED_OWNER_EMAIL=${OWNER_EMAIL}
SEED_OWNER_NAME="Firm Owner"
SEED_OWNER_PASSWORD=${OWNER_PASSWORD}
SEED_DEMO_PASSWORD=${DEMO_PASSWORD}

# Build variant (set by install-demo.sh / install-firm.sh). VITE_PUBLIC_SITE is read by
# compose for the frontend build; SEED_DEMO gates the demo workspace seed in deploy.sh.
VITE_PUBLIC_SITE=${PUBLIC_SITE}
SEED_DEMO=${SEED_DEMO}
EOF
chmod 600 "$DEPLOY_DIR/.env"
info ".env written and locked to root-only (600)."

# ── 7. Build images ───────────────────────────────────────────────────────────
section "Docker build (this takes 3–5 minutes)"
docker compose -f compose.prod.yaml build
info "All images built."

# ── 8. Start infrastructure ───────────────────────────────────────────────────
section "Starting database, Redis, MinIO"
docker compose -f compose.prod.yaml up -d esti-db esti-redis esti-minio

echo -n "  Waiting for esti-db to be healthy"
for i in $(seq 1 24); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' esti-db 2>/dev/null || echo "starting")
  [[ "$STATUS" == "healthy" ]] && echo "" && break
  echo -n "."
  sleep 5
done
info "Database healthy."

set -a
load_dotenv "$DEPLOY_DIR/.env"
set +a
info "Creating MinIO bucket '${S3_BUCKET}'..."
ensure_minio_bucket "$DEPLOY_DIR" && info "MinIO bucket ready." || warn "MinIO bucket creation skipped — backend will retry."

# ── 9. Start backend + worker ─────────────────────────────────────────────────
section "Starting backend and worker"
docker compose -f compose.prod.yaml up -d backend worker
if wait_for_backend_health 30 2; then
  info "Backend running."
else
  warn "Backend /health failed — check: docker logs esti-backend --tail 80"
fi

# ── 9b. Seed initial data (idempotent) ───────────────────────────────────────
# Creates the owner login from SEED_OWNER_* and the demo workspace. The runtime
# image has node (not pnpm), so run the compiled seeds directly. Re-running is
# safe — both seeds guard against existing records.
section "Seeding initial data"
docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seed.js \
  && info "Owner/base data seeded." || warn "Base seed failed — check: docker logs esti-backend"
if [[ "$SEED_DEMO" == "true" ]]; then
  docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seedDemo.js \
    && info "Demo workspace seeded." || warn "Demo seed failed — check: docker logs esti-backend"
else
  info "Demo workspace seed skipped (firm product build)."
fi

# ── 10. Build frontend static files ──────────────────────────────────────────
section "Building frontend"
docker compose -f compose.prod.yaml --profile build-only build frontend
docker create --name esti-fe-tmp esti-frontend:prod
mkdir -p "$DEPLOY_DIR/frontend/dist"
docker cp esti-fe-tmp:/usr/share/nginx/html/. "$DEPLOY_DIR/frontend/dist/"
docker rm esti-fe-tmp
chown -R www-data:www-data "$DEPLOY_DIR/frontend/dist"
info "Frontend built and copied to $DEPLOY_DIR/frontend/dist"

# ── 11. nginx reverse proxy ───────────────────────────────────────────────────
section "nginx configuration"
install_nginx_site "$DOMAIN" "$DEPLOY_DIR" || error "nginx configuration failed — check server_name / domain."
info "nginx configured for ${DOMAIN}."

# ── 12. TLS certificate ───────────────────────────────────────────────────────
section "Let's Encrypt TLS"
certbot --nginx -d "$DOMAIN" \
  --non-interactive --agree-tos \
  -m "$ADMIN_EMAIL" \
  --redirect
systemctl reload nginx
info "TLS certificate issued for https://${DOMAIN}"

# ── 13. Systemd service ───────────────────────────────────────────────────────
section "Systemd auto-start"
cat > /etc/systemd/system/esti.service <<EOF
[Unit]
Description=ESTI AORMS
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${DEPLOY_DIR}
ExecStart=/usr/bin/docker compose -f compose.prod.yaml up -d
ExecStop=/usr/bin/docker compose -f compose.prod.yaml down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable esti
info "ESTI will auto-start on reboot."

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}============================================${NC}"
echo -e "${GREEN}${BOLD}  ESTI AORMS is live!${NC}"
echo -e "${GREEN}${BOLD}============================================${NC}"
echo ""
echo -e "  Variant  : ${BOLD}${VARIANT}${NC} (public site: ${PUBLIC_SITE}, demo data: ${SEED_DEMO})"
echo -e "  URL      : ${BOLD}https://${DOMAIN}${NC}"
echo -e "  Login    : ${BOLD}${OWNER_EMAIL}${NC}"
[[ "$VARIANT" == "demo" ]] && echo -e "  Demo     : ${BOLD}principal@demo.aorms.in${NC} / ${BOLD}${DEMO_PASSWORD}${NC}"
echo ""
echo "  Running containers:"
docker compose -f "$DEPLOY_DIR/compose.prod.yaml" ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null
echo ""
echo -e "  To update after pulling new code: ${CYAN}bash ${DEPLOY_DIR}/deploy/update.sh${NC}"
echo ""
