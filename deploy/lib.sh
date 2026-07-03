#!/usr/bin/env bash
# Shared helpers + the parameterized installer core for ESTI AORMS deployments.
# Sourced by install.sh (the menu) — not run directly. One install flow, many
# profiles: the profile only changes a handful of env vars (see install.sh).

# ── Logging ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${GREEN}[✔]${NC} $*"; }
section() { echo -e "\n${CYAN}${BOLD}▶ $*${NC}"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✘] ERROR:${NC} $*"; exit 1; }
# `|| true`: read exits non-zero at EOF (no tty / stdin=/dev/null), which
# would kill the script under `set -e`. Falling through leaves the variable
# empty so each prompt's [auto-generate] / validation branch decides instead.
ask()     { echo -en "${BOLD}$1${NC} "; read -r "$2" || true; }
askpass() { echo -en "${BOLD}$1${NC} "; read -rs "$2" || true; echo; }

REPO_URL="${REPO_URL:-https://github.com/HolagundiWorks/esti.git}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/esti}"

# Fully non-interactive apt: DEBIAN_FRONTEND suppresses debconf prompts
# (conffile diffs, etc.); NEEDRESTART_MODE=a auto-restarts services instead of
# needrestart's whiptail "which services to restart?" dialog — on Ubuntu with
# needrestart installed, that dialog blocks apt-get forever over a non-tty SSH
# session (e.g. CI-triggered installs) even with -y, since it isn't an apt
# debconf prompt at all.
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

# ── dotenv loader (no shell execution) ───────────────────────────────────────
load_dotenv() {
  local env_file="${1:-.env}"
  [[ -f "$env_file" ]] || return 0
  local line key val
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    line="${line#export }"
    [[ "$line" == *"="* ]] || continue
    key="${line%%=*}"; val="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"; key="${key#"${key%%[![:space:]]*}"}"
    if (( ${#val} >= 2 )); then
      if [[ "${val:0:1}" == '"' && "${val: -1}" == '"' ]]; then val="${val:1:${#val}-2}";
      elif [[ "${val:0:1}" == "'" && "${val: -1}" == "'" ]]; then val="${val:1:${#val}-2}"; fi
    fi
    export "${key}=${val}"
  done < "$env_file"
}

# ── Domain / nginx / storage / health helpers ────────────────────────────────
normalize_domain() {
  local d="${1:-}"; d="${d#https://}"; d="${d#http://}"; d="${d%%/*}"; d="${d%%,*}"
  printf '%s' "$(printf '%s' "$d" | tr -d '[:space:]')"
}
validate_domain() {
  local d="$1"
  [[ -z "$d" ]] && { echo "Domain is required (hostname only, e.g. aorms.in)." >&2; return 1; }
  [[ "$d" == *"/"* || "$d" == *":"* ]] && { echo "Domain must be a hostname only — no scheme/port/path (got '$d')." >&2; return 1; }
  [[ "$d" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]] || { echo "Invalid domain '$d'." >&2; return 1; }
  return 0
}
install_nginx_site() {
  local domain="$1" deploy_dir="$2" nginx_conf="/etc/nginx/sites-available/esti"
  validate_domain "$domain" || return 1
  cp "$deploy_dir/deploy/nginx-proxy.conf" "$nginx_conf"
  sed -i "s|DOMAIN_PLACEHOLDER|${domain}|g" "$nginx_conf"
  sed -i "s|DEPLOY_DIR_PLACEHOLDER|${deploy_dir}|g" "$nginx_conf"
  ln -sf "$nginx_conf" /etc/nginx/sites-enabled/esti
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
}

# Generate a short-lived self-signed certificate for `domain` and append an
# SSL server block to the installed vhost file. Files are written to the
# conventional system paths so nginx can read them.
generate_self_signed() {
  local domain="$1" cert_days=${2:-30}
  local cert_dir_cert="/etc/ssl/certs"
  local cert_dir_priv="/etc/ssl/private"
  mkdir -p "$cert_dir_cert" "$cert_dir_priv"
  local cert_path="$cert_dir_cert/${domain}-self.crt"
  local key_path="$cert_dir_priv/${domain}-self.key"
  if [[ -f "$cert_path" && -f "$key_path" ]]; then
    info "Self-signed cert already exists for ${domain}"
  else
    info "Generating self-signed certificate for ${domain} (valid ${cert_days} days)"
    openssl req -x509 -nodes -days "$cert_days" -newkey rsa:2048 \
      -keyout "$key_path" -out "$cert_path" -subj "/CN=${domain}" >/dev/null 2>&1 || {
      warn "OpenSSL failed to create self-signed cert for ${domain}"; return 1;
    }
    chmod 640 "$key_path" && chown root:root "$key_path"
  fi

  # Append an SSL server block to the vhost file so nginx serves HTTPS.
  local nginx_vhost="/etc/nginx/sites-available/esti"
  if [[ -f "$nginx_vhost" ]]; then
    # Idempotent: remove any existing self-signed marker and append fresh block
    sed -i '/# BEGIN SELF-SIGNED CERT/,/# END SELF-SIGNED CERT/d' "$nginx_vhost" || true
    cat >> "$nginx_vhost" <<EOF

# BEGIN SELF-SIGNED CERT for ${domain}
server {
  listen 443 ssl;
  listen [::]:443 ssl;
  server_name ${domain};
  ssl_certificate     ${cert_path};
  ssl_certificate_key ${key_path};
  include             /etc/nginx/mime.types;
  # Minimal SSL settings for a temporary self-signed cert.
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  location /platform/ {
    proxy_pass         http://127.0.0.1:4000/platform/;
    proxy_http_version 1.1;
    proxy_set_header   Host              \$host;
    proxy_set_header   X-Forwarded-Proto \$scheme;
  }
  location / {
    root       ${DEPLOY_DIR}/frontend/dist;
    try_files  \$uri \$uri/ /index.html;
  }
}
# END SELF-SIGNED CERT
EOF
    nginx -t && systemctl reload nginx || warn "nginx reload failed after adding self-signed block"
  else
    warn "nginx vhost $nginx_vhost not found — cannot append self-signed block"
    return 1
  fi
}

# Ensure TLS for domain: prefer real Let's Encrypt certs unless
# SELF_SIGNED_CERT=true, in which case we generate a temporary self-signed
# certificate. Args: domain admin_email
ensure_tls() {
  local domain="$1" admin_email="$2"
  if [[ "${SELF_SIGNED_CERT:-false}" == "true" ]]; then
    generate_self_signed "$domain" 30 || warn "self-signed TLS setup failed"
    info "Using self-signed TLS for ${domain}"
    return 0
  fi

  if command -v certbot >/dev/null 2>&1; then
    certbot --nginx -d "$domain" --non-interactive --agree-tos -m "$admin_email" --redirect || {
      warn "certbot failed for ${domain} — consider setting SELF_SIGNED_CERT=true to install a temporary self-signed certificate"
      return 1
    }
    systemctl reload nginx
    info "TLS issued for https://${domain}"
    return 0
  else
    warn "certbot not installed — falling back to self-signed cert"
    generate_self_signed "$domain" 30 || warn "self-signed TLS setup failed"
  fi
}
esti_compose_network() { printf '%s' "esti-aorms-prod_esti-network"; }
ensure_minio_bucket() {
  local deploy_dir="${1:-.}" bucket="${S3_BUCKET:-esti-documents}"
  local access="${S3_ACCESS_KEY:-esti}" secret="${S3_SECRET_KEY:-}"
  [[ -n "$secret" ]] || { echo "S3_SECRET_KEY empty — cannot configure MinIO." >&2; return 1; }
  cd "$deploy_dir"
  # The minio/mc image entrypoint is `mc`, so we must override it to `sh`.
  # Wait for MinIO to accept connections — a fixed sleep races on slow (1-vCPU) boxes.
  local net; net="$(esti_compose_network)"
  for _ in $(seq 1 20); do
    docker run --rm --network "$net" --entrypoint sh minio/mc:latest -c \
      "mc alias set local http://esti-minio:9000 '${access}' '${secret}' --quiet" 2>/dev/null && break
    sleep 3
  done
  docker run --rm --network "$net" --entrypoint sh minio/mc:latest -c \
    "mc alias set local http://esti-minio:9000 '${access}' '${secret}' --quiet && mc mb --ignore-existing local/${bucket}"
}
wait_for_backend_health() {
  local attempts="${1:-30}" delay="${2:-2}" code="000"
  for _ in $(seq 1 "$attempts"); do
    code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/health 2>/dev/null || echo "000")
    [[ "$code" == "200" ]] && return 0
    sleep "$delay"
  done
  echo "Backend /health returned HTTP ${code} after ${attempts} attempts." >&2; return 1
}

# ── .env writer — one file, profile-driven ───────────────────────────────────
# Expects the caller (install.sh) to have exported: DOMAIN, PUBLIC_SITE, SEED_DEMO,
# FIRM_PLAN, OWNER_EMAIL, OWNER_PASSWORD, DEMO_PASSWORD, SESSION_SECRET,
# POSTGRES_PASSWORD, MINIO_USER, MINIO_PASSWORD, and (licensing profile)
# PLATFORM_ENABLED, PLATFORM_ADMIN_EMAILS.
write_env() {
  cat > "$DEPLOY_DIR/.env" <<EOF
# Generated by deploy/install.sh — profile: ${PROFILE} — $(date -u +"%Y-%m-%d %H:%M UTC")
DOMAIN=${DOMAIN}
NODE_ENV=production
BACKEND_PORT=4000
SESSION_SECRET=${SESSION_SECRET}
COOKIE_SECURE=true
# The standalone licensing console (admin.DOMAIN) calls this backend's
# /platform API from its own origin — allow it through CORS + the CSRF
# origin gate whenever it is configured.
ALLOWED_ORIGINS=https://${DOMAIN}${VITE_ADMIN_URL:+,${VITE_ADMIN_URL}}

POSTGRES_USER=esti
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=esti
DATABASE_URL=postgresql://esti:${POSTGRES_PASSWORD}@esti-db:5432/esti

REDIS_URL=redis://esti-redis:6379

S3_ENDPOINT=http://esti-minio:9000
S3_PUBLIC_ENDPOINT=https://${DOMAIN}/storage
S3_BUCKET=esti-documents
S3_ACCESS_KEY=${MINIO_USER}
S3_SECRET_KEY=${MINIO_PASSWORD}
S3_REGION=ap-south-1

WORKER_JOB_STREAM=esti:jobs
WORKER_GROUP=esti-workers

SEED_OWNER_EMAIL=${OWNER_EMAIL}
SEED_OWNER_NAME="Firm Owner"
SEED_OWNER_PASSWORD=${OWNER_PASSWORD}
SEED_DEMO_PASSWORD=${DEMO_PASSWORD}

# Outbound email (SMTP) — licence-key delivery, email verification links,
# password resets, company invitations, beta-form notifications. Any mail
# host works (not Google-specific). Leave SMTP_HOST empty to disable sending:
# mails are skipped gracefully (never queued, never crash), and features fall
# back (accounts stay unverified, licence keys shown in /platform-admin only).
# Edit here later + \`bash deploy/update.sh\` to enable.
SMTP_HOST=${SMTP_HOST:-}
SMTP_PORT=${SMTP_PORT:-587}
# true = implicit TLS (typical port 465); false = STARTTLS (typical port 587).
SMTP_SECURE=${SMTP_SECURE:-false}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
SMTP_FROM=${SMTP_FROM:-AORMS <no-reply@${DOMAIN}>}
# Inbox that receives every landing beta-form submission.
BETA_REQUEST_NOTIFY_TO=${BETA_REQUEST_NOTIFY_TO:-hi@${DOMAIN}}

# Profile knobs — VITE_PUBLIC_SITE drives the frontend build (marketing site),
# SEED_DEMO gates the demo workspace seed, FIRM_PLAN sets the plan tier.
DEPLOY_PROFILE=${PROFILE}
VITE_PUBLIC_SITE=${PUBLIC_SITE}
# AORMS installer download URLs (/download portal). Set each to e.g.
# /downloads/aorms-lite-setup.exe once you host the built installers under
# frontend/dist/downloads/; empty = that edition shows "Coming soon".
# Standalone licensing console origin (its own repo, deployed at admin.DOMAIN).
# Set → aorms.in/platform-admin redirects there; empty → embedded console.
VITE_ADMIN_URL=${VITE_ADMIN_URL:-}
VITE_LITE_DOWNLOAD_URL=${VITE_LITE_DOWNLOAD_URL:-}
VITE_CORE_DOWNLOAD_URL=${VITE_CORE_DOWNLOAD_URL:-}
VITE_ENTERPRISE_DOWNLOAD_URL=${VITE_ENTERPRISE_DOWNLOAD_URL:-}
  # When true, the installer will create a temporary self-signed certificate
  # and configure nginx to serve HTTPS immediately. Useful for fresh VPS
  # installs or when avoiding Let's Encrypt rate limits. Replace with Certbot
  # later to get a trusted certificate.
  SELF_SIGNED_CERT=${SELF_SIGNED_CERT:-false}
SEED_DEMO=${SEED_DEMO}
ESTI_ROLE=node
FIRM_PLAN=${FIRM_PLAN}

# Central AORMS identity + licence authority (the Holagundi platform at aorms.in).
# A firm node activates/refreshes its licence against ESTI_LICENSE_API_URL + /v1;
# needs a product API key from Holagundi to activate. Leaving the key empty keeps
# the node unmanaged (runs on FIRM_PLAN) until a licence is actually activated.
ESTI_LICENSE_API_URL=${ESTI_LICENSE_API_URL:-https://aorms.in/platform}
ESTI_PRODUCT_API_KEY=${ESTI_PRODUCT_API_KEY:-}
# Delegate firm login to the platform (opt-in; default off keeps local login).
# When true, credentials verify against the platform and fall back to the cached
# local password if it is unreachable. Set ESTI_COMPANY to this firm's AORMS-C-
# handle to enforce company membership.
ESTI_IDENTITY_DELEGATE=${ESTI_IDENTITY_DELEGATE:-false}
ESTI_COMPANY=${ESTI_COMPANY:-}
# Unified individual accounts (single-box installs where the platform runs in
# this same backend): the workspace login verifies platform credentials
# in-process and provisions a workspace user on first login. Enabled by the
# licensing profile; leave false on ordinary firm nodes.
ESTI_UNIFIED_ACCOUNTS=${ESTI_UNIFIED_ACCOUNTS:-false}

# Licensing & account platform (mounted at /platform; admin UI at /platform-admin).
# Set GOOGLE_* to enable Google sign-in — see docs/esti/AORMS-LITE-AND-GOOGLE-AUTH.md.
FRONTEND_ORIGIN=https://${DOMAIN}
# Allowlist for product "Create account" return URLs (/platform/onboard?return=…).
# Single-box deploy: the product and platform share this domain.
ONBOARD_RETURN_ORIGINS=https://${DOMAIN}
PLATFORM_ADMIN_EMAILS=${PLATFORM_ADMIN_EMAILS:-}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}
GOOGLE_REDIRECT_URI=https://${DOMAIN}/platform/auth/google/callback
EOF
  chmod 600 "$DEPLOY_DIR/.env"
  info ".env written for profile '${PROFILE}' (public site: ${PUBLIC_SITE}, demo: ${SEED_DEMO}, plan: ${FIRM_PLAN})."
}

# ── The single install flow — used by every (non-placeholder) profile ────────
install_core() {
  local ADMIN_EMAIL="$1" GIT_BRANCH="${2:-main}"

  section "System update"
  apt-get update -qq
  apt-get upgrade -y -qq -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
  apt-get install -y -qq curl git openssl ufw
  info "System packages up to date."

  section "Docker"
  if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh && systemctl enable --now docker
  fi
  docker compose version &>/dev/null || apt-get install -y docker-compose-plugin
  info "Docker + Compose ready."

  section "nginx + certbot"
  apt-get install -y -qq nginx certbot python3-certbot-nginx

  section "UFW firewall"
  ufw --force reset; ufw default deny incoming; ufw default allow outgoing
  ufw allow 22/tcp comment 'SSH'; ufw allow 80/tcp comment 'HTTP'; ufw allow 443/tcp comment 'HTTPS'
  ufw --force enable
  info "Firewall: 22, 80, 443 open."

  section "Repository"
  if [[ -d "$DEPLOY_DIR/.git" ]]; then
    git -C "$DEPLOY_DIR" fetch origin && git -C "$DEPLOY_DIR" checkout "$GIT_BRANCH" && git -C "$DEPLOY_DIR" pull origin "$GIT_BRANCH"
  else
    git clone --branch "$GIT_BRANCH" "$REPO_URL" "$DEPLOY_DIR"
  fi
  cd "$DEPLOY_DIR"

  section ".env file"
  write_env

  section "Docker build (3–5 minutes)"
  docker compose -f compose.prod.yaml build
  info "Images built."

  section "Starting database, Redis, MinIO"
  docker compose -f compose.prod.yaml up -d esti-db esti-redis esti-minio
  echo -n "  Waiting for esti-db"
  for _ in $(seq 1 24); do
    [[ "$(docker inspect --format='{{.State.Health.Status}}' esti-db 2>/dev/null || echo starting)" == "healthy" ]] && { echo ""; break; }
    echo -n "."; sleep 5
  done
  info "Database healthy."

  set -a; load_dotenv "$DEPLOY_DIR/.env"; set +a
  ensure_minio_bucket "$DEPLOY_DIR" && info "MinIO bucket ready." || warn "MinIO bucket creation skipped — backend will retry."

  section "Starting backend and worker"
  docker compose -f compose.prod.yaml up -d backend worker
  wait_for_backend_health 30 2 && info "Backend running." || warn "Backend /health failed — docker logs esti-backend --tail 80"

  section "Seeding initial data"
  docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seed.js \
    && info "Owner/base data seeded." || warn "Base seed failed — docker logs esti-backend"
  if [[ "$SEED_DEMO" == "true" ]]; then
    docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seedDemo.js \
      && info "Demo workspace seeded." || warn "Demo seed failed — docker logs esti-backend"
  else
    info "Demo workspace seed skipped (profile '${PROFILE}')."
  fi
  # Licensing platform on → seed the AORMS product + plans + 1 demo licence per
  # tier (demo.lite1/core1/enterprise1 @aorms.in, password demo1234).
  if [[ "${PLATFORM_ENABLED:-}" == "true" ]]; then
    docker compose -f compose.prod.yaml exec -T backend node backend/dist/scripts/seedDemoLicenses.js \
      && info "Demo licences seeded (Lite/Core/Enterprise · demo1234)." \
      || warn "Licence seed failed — docker logs esti-backend"
  fi

  section "Building frontend"
  docker compose -f compose.prod.yaml --profile build-only build frontend
  docker create --name esti-fe-tmp esti-frontend:prod
  mkdir -p "$DEPLOY_DIR/frontend/dist"
  docker cp esti-fe-tmp:/usr/share/nginx/html/. "$DEPLOY_DIR/frontend/dist/"
  docker rm esti-fe-tmp
  chown -R www-data:www-data "$DEPLOY_DIR/frontend/dist"
  info "Frontend built."

  section "nginx + TLS"
  install_nginx_site "$DOMAIN" "$DEPLOY_DIR" || error "nginx configuration failed."
  # TLS provisioning: use certbot by default, or generate a temporary
  # self-signed certificate when SELF_SIGNED_CERT=true (useful for fresh
  # VPS installs or when you want to avoid Let's Encrypt rate limits).
  ensure_tls "$DOMAIN" "$ADMIN_EMAIL"

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
  systemctl daemon-reload && systemctl enable esti
  info "Auto-start on reboot enabled."
}
