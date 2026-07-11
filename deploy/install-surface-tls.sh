#!/usr/bin/env bash
# ============================================================
#  AORMS — enable HTTPS for ALL surface hosts
#  ------------------------------------------------------------
#  Provisions Let's Encrypt TLS for every AORMS surface host that has a
#  resolving DNS A record (security-audit follow-up: only wiki. had a TLS
#  path; Secure cookies mean auth simply cannot work on the others over
#  plain HTTP):
#
#    DOMAIN  www.  studio.  consultancy.  wiki.  kbank.  external.
#    account.  admin.
#
#  Hosts without DNS yet are SKIPPED with a warning (re-run after adding
#  the record). Ubuntu, as root, after deploy/install.sh + update.sh:
#
#    sudo bash deploy/install-surface-tls.sh
#
#  Non-interactive overrides: ADMIN_EMAIL=ops@example.in SURFACE_HOSTS="studio wiki"
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

[[ $EUID -ne 0 ]] && error "Run as root: sudo bash deploy/install-surface-tls.sh"
[[ -f "$DEPLOY_DIR/.env" ]] || error "No $DEPLOY_DIR/.env — run deploy/install.sh first."

set -a; load_dotenv "$DEPLOY_DIR/.env"; set +a
[[ -n "${DOMAIN:-}" ]] || DOMAIN="$(normalize_domain "${ALLOWED_ORIGINS:-${FRONTEND_ORIGIN:-}}")"
[[ -n "${DOMAIN:-}" ]] || error "Cannot determine DOMAIN — set DOMAIN= in $DEPLOY_DIR/.env"

ADMIN_EMAIL="${ADMIN_EMAIL:-${OWNER_EMAIL:-hi@aorms.in}}"
# Subdomain labels ("" = apex). Override with SURFACE_HOSTS="studio wiki …".
DEFAULT_HOSTS=("" "www" "studio" "consultancy" "wiki" "kbank" "external" "account" "admin")
if [[ -n "${SURFACE_HOSTS:-}" ]]; then
  read -r -a DEFAULT_HOSTS <<<"$SURFACE_HOSTS"
fi

section "Preflight"
command -v certbot >/dev/null 2>&1 || error "certbot not installed."
install_nginx_site "$DOMAIN" "$DEPLOY_DIR" || error "nginx configuration failed."

RESOLVED=()
SKIPPED=()
for label in "${DEFAULT_HOSTS[@]}"; do
  host="${label:+${label}.}${DOMAIN}"
  if dig +short "$host" | grep -qE '^[0-9.]+'; then
    RESOLVED+=("$host")
  else
    SKIPPED+=("$host")
  fi
done

[[ ${#RESOLVED[@]} -gt 0 ]] || error "No surface host resolves yet — add DNS A records first."
for h in "${SKIPPED[@]:-}"; do [[ -n "$h" ]] && info "SKIP (no DNS): $h"; done
info "Provisioning TLS for: ${RESOLVED[*]}"

section "TLS (certbot --nginx)"
CERTBOT_ARGS=()
for h in "${RESOLVED[@]}"; do CERTBOT_ARGS+=(-d "$h"); done
if certbot --nginx "${CERTBOT_ARGS[@]}" \
     --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect --expand; then
  nginx -t && systemctl reload nginx
  for h in "${RESOLVED[@]}"; do info "Live: https://${h}/"; done
  [[ ${#SKIPPED[@]} -gt 0 ]] && info "Re-run after adding DNS for: ${SKIPPED[*]}"
else
  error "certbot failed. Check DNS, port 80 reachability, and certbot logs."
fi
