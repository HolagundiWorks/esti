#!/usr/bin/env bash
# ============================================================
#  AORMS — deploy the licensing console at admin.DOMAIN
#  ------------------------------------------------------------
#  Run on the SAME box as the main install, AFTER deploy/install.sh.
#  Serves the standalone console bundle (frontend/dist/admin.html — built
#  as its own Vite entry by the normal frontend build) on an admin.DOMAIN
#  vhost, and proxies /platform/ to the local backend so every console API
#  call is same-origin: no CORS, no cross-site cookies.
#
#  Requires: DNS A record  admin.DOMAIN → this VPS  (certbot needs it).
#
#  Ubuntu, as root:
#    sudo bash deploy/install-admin-console.sh
#  Non-interactive overrides: ADMIN_DOMAIN=… SELF_SIGNED_CERT=true
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

[[ $EUID -ne 0 ]] && error "Run as root: sudo bash deploy/install-admin-console.sh"
[[ -f "$DEPLOY_DIR/.env" ]] || error "No $DEPLOY_DIR/.env — run deploy/install.sh (the main app) first."

set -a; load_dotenv "$DEPLOY_DIR/.env"; set +a
# Older .env files don't carry a DOMAIN= line — derive it from FRONTEND_ORIGIN.
[[ -n "${DOMAIN:-}" ]] || DOMAIN="$(normalize_domain "${FRONTEND_ORIGIN:-}")"
[[ -n "${DOMAIN:-}" ]] || error "Cannot determine the domain — set DOMAIN=… in $DEPLOY_DIR/.env (or pass DOMAIN=… to this script)."
ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.${DOMAIN}}"
validate_domain "$ADMIN_DOMAIN" || error "Invalid console domain '$ADMIN_DOMAIN'."

# The console bundle ships inside the normal frontend build.
[[ -f "$DEPLOY_DIR/frontend/dist/admin.html" ]] || error \
  "frontend/dist/admin.html not found — pull latest main and run 'bash deploy/update.sh' first."

section "nginx vhost for ${ADMIN_DOMAIN}"
NGINX_CONF="/etc/nginx/sites-available/esti-admin"

# A second vhost claiming the same server_name silently wins or loses by file
# order ("conflicting server name … ignored") and certbot deploys the cert to
# whichever block it finds first — a stale vhost here means 301/500 mysteries.
for f in /etc/nginx/sites-enabled/*; do
  [[ -e "$f" && "$(basename "$f")" != "esti-admin" ]] || continue
  if grep -qE "server_name[^;]*\b${ADMIN_DOMAIN//./\\.}\b" "$f"; then
    error "Another vhost also claims ${ADMIN_DOMAIN}: $f
    Remove it first (sudo rm -f $f /etc/nginx/sites-available/$(basename "$f")), then re-run this script."
  fi
done
cat > "$NGINX_CONF" <<EOF
# AORMS licensing console — ${ADMIN_DOMAIN} (managed by install-admin-console.sh)
server {
    listen 80;
    listen [::]:80;
    server_name ${ADMIN_DOMAIN};
    server_tokens off;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Same-box backend: the console's API calls stay same-origin.
    location /platform/ {
        proxy_pass         http://127.0.0.1:4000/platform/;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    root  ${DEPLOY_DIR}/frontend/dist;
    index admin.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location / {
        try_files \$uri /admin.html;
    }
}
EOF
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/esti-admin
nginx -t && systemctl reload nginx
info "vhost live: http://${ADMIN_DOMAIN}"

section "TLS for ${ADMIN_DOMAIN}"
ensure_tls "$ADMIN_DOMAIN" "${ADMIN_EMAIL:-admin@${DOMAIN}}" || warn "TLS setup incomplete — rerun certbot when DNS resolves."

echo ""
echo -e "${GREEN}${BOLD}============================================${NC}"
echo -e "${GREEN}${BOLD}  Licensing console is live${NC}"
echo -e "${GREEN}${BOLD}============================================${NC}"
echo -e "  Console : ${BOLD}https://${ADMIN_DOMAIN}${NC}"
echo -e "  Sign in : register with a PLATFORM_ADMIN_EMAILS address (email + password)"
echo -e "  Handoff : https://${DOMAIN}/platform-admin now redirects here (VITE_ADMIN_URL)"
echo ""
echo -e "  The bundle rebuilds with every ${CYAN}bash deploy/update.sh${NC} — no separate update needed."
echo ""
