#!/usr/bin/env bash
# ============================================================
#  AORMS — enable HTTPS for wiki.DOMAIN
#  ------------------------------------------------------------
#  Run on the SAME box as deploy/install.sh, AFTER:
#    1. DNS A record  wiki.DOMAIN → this VPS public IP
#    2. bash deploy/update.sh  (builds dist/wiki/* prerender shells)
#
#  The wiki HTTP vhost is already in deploy/nginx-proxy.conf (installed
#  by install_core). This script only provisions Let's Encrypt TLS for
#  wiki.DOMAIN via certbot --nginx.
#
#  Ubuntu, as root:
#    sudo bash deploy/install-wiki-tls.sh
#
#  Non-interactive: WIKI_DOMAIN=wiki.example.in ADMIN_EMAIL=ops@example.in
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

[[ $EUID -ne 0 ]] && error "Run as root: sudo bash deploy/install-wiki-tls.sh"
[[ -f "$DEPLOY_DIR/.env" ]] || error "No $DEPLOY_DIR/.env — run deploy/install.sh first."

set -a; load_dotenv "$DEPLOY_DIR/.env"; set +a
[[ -n "${DOMAIN:-}" ]] || DOMAIN="$(normalize_domain "${ALLOWED_ORIGINS:-${FRONTEND_ORIGIN:-}}")"
[[ -n "${DOMAIN:-}" ]] || error "Cannot determine DOMAIN — set DOMAIN= in $DEPLOY_DIR/.env"

WIKI_DOMAIN="${WIKI_DOMAIN:-wiki.${DOMAIN}}"
ADMIN_EMAIL="${ADMIN_EMAIL:-${OWNER_EMAIL:-hi@aorms.in}}"
validate_domain "$WIKI_DOMAIN" || error "Invalid wiki domain '$WIKI_DOMAIN'."

section "Preflight"
[[ -d "$DEPLOY_DIR/frontend/dist/wiki" ]] || error \
  "frontend/dist/wiki missing — run: cd $DEPLOY_DIR && bash deploy/update.sh"
command -v certbot >/dev/null 2>&1 || error "certbot not installed."

if ! dig +short "$WIKI_DOMAIN" | grep -qE '^[0-9.]+'; then
  error "DNS for ${WIKI_DOMAIN} does not resolve to an A record yet. Add DNS, wait for propagation, retry."
fi
info "${WIKI_DOMAIN} resolves — proceeding."

section "Refresh nginx vhost (wiki block from nginx-proxy.conf)"
install_nginx_site "$DOMAIN" "$DEPLOY_DIR" || error "nginx configuration failed."

section "TLS for ${WIKI_DOMAIN}"
if certbot --nginx -d "$WIKI_DOMAIN" \
     --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect; then
  nginx -t && systemctl reload nginx
  info "Wiki live at https://${WIKI_DOMAIN}/"
  info "Mirror also works at https://${DOMAIN}/wiki (same build)."
else
  error "certbot failed for ${WIKI_DOMAIN}. Check DNS, port 80 reachability, and certbot logs."
fi
