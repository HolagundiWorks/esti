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
#  DETERMINISTIC + IDEMPOTENT: this script writes the complete final nginx
#  config itself (HTTP→HTTPS redirect + TLS server with the API proxy).
#  certbot is used only to OBTAIN the certificate (certonly) — it never
#  edits nginx config, so re-running this script always converges to the
#  same known-good state no matter what edited the vhost before.
#
#  Requires: DNS A record  admin.DOMAIN → this VPS  (certbot needs it).
#
#  Ubuntu, as root:
#    sudo bash deploy/install-admin-console.sh
#  Non-interactive overrides: ADMIN_DOMAIN=…
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

CERT_DIR="/etc/letsencrypt/live/${ADMIN_DOMAIN}"

# The shared console server body (API proxy + SPA), identical for HTTP
# bootstrap and the final TLS server. $-signs are escaped for nginx.
console_locations() {
  cat <<EOF
    server_tokens off;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Console API — same-box backend; same-origin from the browser's view.
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
EOF
}

# Bootstrap config: console over plain HTTP (also serves the ACME challenge).
write_http_vhost() {
  {
    echo "# AORMS licensing console — ${ADMIN_DOMAIN} (managed by install-admin-console.sh)"
    echo "server {"
    echo "    listen 80;"
    echo "    listen [::]:80;"
    echo "    server_name ${ADMIN_DOMAIN};"
    console_locations
    echo "}"
  } > "$NGINX_CONF"
}

# Final config: HTTP→HTTPS redirect + TLS server carrying the console body.
write_tls_vhost() {
  local ssl_includes=""
  [[ -f /etc/letsencrypt/options-ssl-nginx.conf ]] && \
    ssl_includes="    include /etc/letsencrypt/options-ssl-nginx.conf;"
  local dhparam=""
  [[ -f /etc/letsencrypt/ssl-dhparams.pem ]] && \
    dhparam="    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;"
  {
    echo "# AORMS licensing console — ${ADMIN_DOMAIN} (managed by install-admin-console.sh)"
    echo "server {"
    echo "    listen 80;"
    echo "    listen [::]:80;"
    echo "    server_name ${ADMIN_DOMAIN};"
    echo "    return 301 https://\$host\$request_uri;"
    echo "}"
    echo "server {"
    echo "    listen 443 ssl;"
    echo "    listen [::]:443 ssl;"
    echo "    server_name ${ADMIN_DOMAIN};"
    echo "    ssl_certificate     ${CERT_DIR}/fullchain.pem;"
    echo "    ssl_certificate_key ${CERT_DIR}/privkey.pem;"
    [[ -n "$ssl_includes" ]] && echo "$ssl_includes"
    [[ -n "$dhparam" ]] && echo "$dhparam"
    [[ -z "$ssl_includes" ]] && { echo "    ssl_protocols TLSv1.2 TLSv1.3;"; echo "    ssl_ciphers HIGH:!aNULL:!MD5;"; }
    console_locations
    echo "}"
  } > "$NGINX_CONF"
}

section "nginx vhost for ${ADMIN_DOMAIN} (HTTP bootstrap)"
write_http_vhost
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/esti-admin
nginx -t && systemctl reload nginx
info "vhost live: http://${ADMIN_DOMAIN}"

section "TLS certificate for ${ADMIN_DOMAIN}"
if [[ ! -f "$CERT_DIR/fullchain.pem" ]]; then
  # certonly: obtain the certificate WITHOUT letting certbot edit nginx config.
  certbot certonly --nginx --non-interactive --agree-tos \
    -m "${ADMIN_EMAIL:-admin@${DOMAIN}}" -d "$ADMIN_DOMAIN" \
    || warn "certbot could not obtain a certificate (DNS not propagated? rate limit?)"
fi

if [[ -f "$CERT_DIR/fullchain.pem" ]]; then
  write_tls_vhost
  nginx -t && systemctl reload nginx
  info "TLS active — https://${ADMIN_DOMAIN} (renewals: certbot renew reuses this cert; config never changes)"
else
  warn "No certificate yet — the console stays on http://${ADMIN_DOMAIN}. Re-run this script once DNS resolves."
fi

echo ""
echo -e "${GREEN}${BOLD}============================================${NC}"
echo -e "${GREEN}${BOLD}  Licensing console deployed${NC}"
echo -e "${GREEN}${BOLD}============================================${NC}"
echo -e "  Console : ${BOLD}https://${ADMIN_DOMAIN}${NC}"
echo -e "  Sign in : a PLATFORM_ADMIN_EMAILS address (email + password), or your workspace owner login"
echo ""
echo -e "  Verify  : ${CYAN}curl -s https://${ADMIN_DOMAIN}/platform/auth/registration-status${NC}  → JSON"
echo -e "  Rebuild : the bundle refreshes with every ${CYAN}bash deploy/update.sh${NC}; re-running THIS script is always safe (idempotent)."
echo ""
