#!/usr/bin/env bash
# ============================================================
#  AORMS — Enterprise install (customer self-hosted)
#  ------------------------------------------------------------
#  For a firm hosting AORMS on ITS OWN server. Installs the firm
#  workspace only — no marketing landing, no demo data, no
#  licensing console. The node activates its licence against the
#  central Holagundi platform (aorms.in) with a product API key.
#
#  Ubuntu 22.04 / 24.04, as root:
#    sudo bash deploy/install-enterprise.sh
#  Non-interactive:
#    DOMAIN=studio.example.in OWNER_EMAIL=you@studio.in \
#      OWNER_PASSWORD='…' ESTI_PRODUCT_API_KEY='…' \
#      sudo -E bash deploy/install-enterprise.sh
#
#  Holagundi's OWN site (landing + main app + licensing platform) uses
#  the default installer, deploy/install.sh. Reuses the same tested
#  install core (deploy/lib.sh) — this is a focused, client-safe front door.
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

[[ $EUID -ne 0 ]] && error "Run as root: sudo bash deploy/install-enterprise.sh"

clear
echo -e "${CYAN}${BOLD}"
echo "  █████╗  ██████╗ ██████╗ ███╗   ███╗███████╗"
echo " ██╔══██╗██╔═══██╗██╔══██╗████╗ ████║██╔════╝"
echo " ███████║██║   ██║██████╔╝██╔████╔██║███████╗"
echo " ██╔══██║██║   ██║██╔══██╗██║╚██╔╝██║╚════██║"
echo " ██║  ██║╚██████╔╝██║  ██║██║ ╚═╝ ██║███████║"
echo " ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝"
echo -e "  AORMS — Enterprise Install (your own server)${NC}"
echo "  ============================================"

# ── Edition ──────────────────────────────────────────────────────────────────
# Enterprise by default (all editions fold to the PRO plan since the LITE/PRO
# collapse); EDITION=core is kept for legacy-labelled licences.
case "${EDITION:-enterprise}" in
  core)       PROFILE="core";       FIRM_PLAN="CORE" ;;
  enterprise) PROFILE="enterprise"; FIRM_PLAN="ENTERPRISE" ;;
  *) error "EDITION must be 'core' or 'enterprise' (got '${EDITION}')." ;;
esac

# A customer self-host is ALWAYS a firm workspace only: never a marketing site,
# never demo data, never the licensing console. Fixed here — not prompted, and
# not overridable, so a client install can't accidentally expose /platform-admin.
PUBLIC_SITE="false"; SEED_DEMO="false"; DEMO_PASSWORD="demo1234"   # demo pw unused
PLATFORM_ENABLED=""; PLATFORM_ADMIN_EMAILS=""
export PROFILE PUBLIC_SITE SEED_DEMO FIRM_PLAN PLATFORM_ADMIN_EMAILS PLATFORM_ENABLED

info "Edition: ${BOLD}${PROFILE}${NC} (plan ${FIRM_PLAN}) — firm workspace only, licensed via aorms.in."

# ── Configuration (env vars skip the matching prompt) ────────────────────────
section "Configuration"
[[ -n "${DOMAIN:-}" ]] || ask "Your domain (e.g. studio.example.in):" DOMAIN
DOMAIN="$(normalize_domain "${DOMAIN:-}")"
validate_domain "$DOMAIN" || error "Enter a valid domain (hostname only)."

[[ -n "${ADMIN_EMAIL:-}" ]] || ask "Your email (for the TLS certificate):" ADMIN_EMAIL
[[ "$ADMIN_EMAIL" == *@*.* ]] || error "A valid email is required for the TLS certificate."

GIT_BRANCH="${GIT_BRANCH:-main}"

warn "Database & session secrets"
[[ -n "${POSTGRES_PASSWORD:-}" ]] || askpass "PostgreSQL password [auto-generate]:" POSTGRES_PASSWORD
[[ -z "${POSTGRES_PASSWORD:-}" ]] && POSTGRES_PASSWORD="$(openssl rand -hex 16)" && info "PostgreSQL password auto-generated."
[[ -n "${SESSION_SECRET:-}" ]] || askpass "Session secret [auto-generate]:" SESSION_SECRET
[[ -z "${SESSION_SECRET:-}" ]] && SESSION_SECRET="$(openssl rand -hex 32)" && info "Session secret auto-generated."

warn "Built-in file storage (MinIO)"
[[ -n "${MINIO_USER:-}" ]] || ask "MinIO root user [esti-admin]:" MINIO_USER
MINIO_USER="${MINIO_USER:-esti-admin}"
[[ -n "${MINIO_PASSWORD:-}" ]] || askpass "MinIO root password (min 8) [auto-generate]:" MINIO_PASSWORD
[[ ${#MINIO_PASSWORD} -lt 8 ]] && MINIO_PASSWORD="$(openssl rand -hex 16)" && warn "MinIO password auto-generated."

warn "First owner account (your admin login)"
[[ -n "${OWNER_EMAIL:-}" ]] || ask "Owner email:" OWNER_EMAIL
[[ "$OWNER_EMAIL" == *@* ]] || error "Owner email is required — it is your admin login."
[[ -n "${OWNER_PASSWORD:-}" ]] || askpass "Owner password:" OWNER_PASSWORD
[[ -n "${OWNER_PASSWORD:-}" ]] || error "Owner password is required."

# Licence activation against the central platform. Empty key = install now and
# activate later; the node runs unmanaged on FIRM_PLAN until a licence is active
# (this can never brick a running install — see docs/esti/AORMS-IDENTITY.md §10).
warn "Licence activation"
ESTI_LICENSE_API_URL="${ESTI_LICENSE_API_URL:-https://aorms.in/platform}"
echo "  Your ${PROFILE^} licence activates against ${ESTI_LICENSE_API_URL}."
echo "  Paste the product API key Holagundi issued you. Leave blank to install now"
echo "  and activate later (the app runs on the ${FIRM_PLAN} plan until then)."
[[ -n "${ESTI_PRODUCT_API_KEY:-}" ]] || askpass "Product API key [blank = activate later]:" ESTI_PRODUCT_API_KEY
ESTI_PRODUCT_API_KEY="${ESTI_PRODUCT_API_KEY:-}"
ESTI_COMPANY="${ESTI_COMPANY:-}"   # optional AORMS-C- handle (only used if login delegation is enabled later)

export DOMAIN POSTGRES_PASSWORD SESSION_SECRET MINIO_USER MINIO_PASSWORD
export OWNER_EMAIL OWNER_PASSWORD DEMO_PASSWORD
export ESTI_LICENSE_API_URL ESTI_PRODUCT_API_KEY ESTI_COMPANY

echo ""; info "Configuration collected — installing AORMS ${PROFILE^} for ${DOMAIN}..."

# Reuse the one, shared, tested install flow (deploy/lib.sh). PLATFORM_ENABLED is
# empty, so no licensing console is seeded; SEED_DEMO=false, PUBLIC_SITE=false.
install_core "$ADMIN_EMAIL" "$GIT_BRANCH"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}============================================${NC}"
echo -e "${GREEN}${BOLD}  AORMS ${PROFILE^} — self-hosted & live!${NC}"
echo -e "${GREEN}${BOLD}============================================${NC}"
echo -e "  URL     : ${BOLD}https://${DOMAIN}${NC}"
echo -e "  Login   : ${BOLD}${OWNER_EMAIL}${NC}  →  https://${DOMAIN}/login"
echo -e "  Plan    : ${BOLD}${FIRM_PLAN}${NC}"
if [[ -n "$ESTI_PRODUCT_API_KEY" ]]; then
  echo -e "  Licence : activating against ${BOLD}${ESTI_LICENSE_API_URL}${NC}"
else
  echo -e "  Licence : ${YELLOW}not yet activated${NC} — running on ${FIRM_PLAN}. Add your key later:"
  echo -e "            edit ${DEPLOY_DIR}/.env → ESTI_PRODUCT_API_KEY=…  then  bash ${DEPLOY_DIR}/deploy/update.sh"
fi
echo ""
echo -e "  Update  : ${CYAN}bash ${DEPLOY_DIR}/deploy/update.sh${NC}"
echo -e "  Backups : ${CYAN}bash ${DEPLOY_DIR}/deploy/backup.sh /opt/esti/backups${NC}"
echo ""
