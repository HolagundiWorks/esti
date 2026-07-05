#!/usr/bin/env bash
# ESTI — stand up the ESE service (ese.<domain>) on an existing AORMS VPS.
# One-time: builds + starts the ese container, installs the nginx vhost, issues
# the TLS cert. Idempotent — safe to re-run. Afterwards set ESE_ENABLED=true in
# .env so deploy/update.sh rebuilds ESE on every update.
#
#   sudo bash deploy/install-ese.sh
#
# Requires: .env with DATABASE_URL, ALLOWED_ORIGINS (base domain), ADMIN_EMAIL,
# and ESE_ADMIN_PASSWORD set.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

cd "$DEPLOY_DIR"
set -a; load_dotenv "$DEPLOY_DIR/.env"; set +a

DOMAIN="$(normalize_domain "${ALLOWED_ORIGINS:-}")"
validate_domain "$DOMAIN" || error "Could not determine the base domain from ALLOWED_ORIGINS in .env."
ESE_HOST="ese.${DOMAIN}"
ADMIN_EMAIL="${ADMIN_EMAIL:-ops@${DOMAIN}}"

[[ -n "${ESE_ADMIN_PASSWORD:-}" ]] || warn "ESE_ADMIN_PASSWORD is empty in .env — the kbteam admin will NOT be seeded until you set it and restart."

section "Building + starting the ESE service"
docker compose -f compose.prod.yaml build ese
docker compose -f compose.prod.yaml up -d ese
# Give it a moment, then probe health via the localhost port binding.
for i in $(seq 1 15); do
  if curl -fsS "http://127.0.0.1:4100/health" >/dev/null 2>&1; then info "ESE healthy on :4100."; break; fi
  [[ "$i" == "15" ]] && warn "ESE /health not responding yet — check: docker logs esti-ese"
  sleep 2
done

section "Installing nginx vhost for ${ESE_HOST}"
ESE_CONF="/etc/nginx/sites-available/ese"
cp "$DEPLOY_DIR/deploy/nginx-ese.conf" "$ESE_CONF"
sed -i "s|DOMAIN_PLACEHOLDER|${DOMAIN}|g" "$ESE_CONF"
ln -sf "$ESE_CONF" /etc/nginx/sites-enabled/ese
nginx -t && systemctl reload nginx

section "Issuing TLS for https://${ESE_HOST}"
if [[ "${SELF_SIGNED_CERT:-false}" == "true" ]]; then
  warn "SELF_SIGNED_CERT=true — skipping Let's Encrypt for ${ESE_HOST}; serve HTTP or add a self-signed block manually."
elif command -v certbot >/dev/null 2>&1; then
  if [[ -n "$(dig +short "${ESE_HOST}" 2>/dev/null || true)" ]]; then
    certbot --nginx -d "${ESE_HOST}" --non-interactive --agree-tos -m "${ADMIN_EMAIL}" --redirect --keep-until-expiring \
      && nginx -t && systemctl reload nginx \
      && info "TLS issued for https://${ESE_HOST}" \
      || warn "certbot failed — run: certbot --nginx -d ${ESE_HOST} --redirect"
  else
    warn "DNS for ${ESE_HOST} does not resolve yet — add the A record, then: certbot --nginx -d ${ESE_HOST} --redirect"
  fi
else
  warn "certbot not installed — install python3-certbot-nginx, then: certbot --nginx -d ${ESE_HOST} --redirect"
fi

info "Done. Set ESE_ENABLED=true in .env so update.sh keeps ESE rebuilt on deploys."
info "Verify: curl -I https://${ESE_HOST}/health"
