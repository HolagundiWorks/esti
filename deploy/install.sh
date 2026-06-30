#!/usr/bin/env bash
# ============================================================
#  ESTI AORMS — installer (pick a deployment profile)
#  Ubuntu 22.04 / 24.04, as root:
#    sudo bash deploy/install.sh
#  Non-interactive: PROFILE=core DOMAIN=… OWNER_EMAIL=… … sudo -E bash deploy/install.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

[[ $EUID -ne 0 ]] && error "Run as root: sudo bash deploy/install.sh"

clear
echo -e "${CYAN}${BOLD}"
echo "  █████╗  ██████╗ ██████╗ ███╗   ███╗███████╗"
echo " ██╔══██╗██╔═══██╗██╔══██╗████╗ ████║██╔════╝"
echo " ███████║██║   ██║██████╔╝██╔████╔██║███████╗"
echo " ██╔══██║██║   ██║██╔══██╗██║╚██╔╝██║╚════██║"
echo " ██║  ██║╚██████╔╝██║  ██║██║ ╚═╝ ██║███████║"
echo " ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝"
echo -e "  AORMS — Deployment installer${NC}"
echo "  ============================================"

# ── Profile menu ─────────────────────────────────────────────────────────────
# Each profile only sets a few env knobs; the install flow is identical (lib.sh).
cat <<'MENU'

  Select what to install:

    1) Landing page only        — public marketing site, no demo data
    2) Production demo           — seeded credentials, one-click /demo login
    3) AORMS Core (production)   — firm workspace, Core plan
    4) AORMS Enterprise (prod)   — firm workspace, Enterprise plan
    5) Licensing & Account       — licensing platform + admin (/platform-admin)
    6) Learning & Certification  — (in pipeline — not yet available)

MENU

CHOICE="${PROFILE_CHOICE:-}"
[[ -z "$CHOICE" && -z "${PROFILE:-}" ]] && ask "Enter 1-6:" CHOICE

# Allow PROFILE=<name> to bypass the numeric menu (non-interactive installs).
case "${PROFILE:-}" in
  landing) CHOICE=1 ;; demo) CHOICE=2 ;; core) CHOICE=3 ;;
  enterprise) CHOICE=4 ;; licensing) CHOICE=5 ;; learning) CHOICE=6 ;;
esac

PLATFORM_ADMIN_EMAILS="${PLATFORM_ADMIN_EMAILS:-}"
case "$CHOICE" in
  1) PROFILE="landing";    PUBLIC_SITE="true";  SEED_DEMO="false"; FIRM_PLAN="ENTERPRISE" ;;
  2) PROFILE="demo";       PUBLIC_SITE="true";  SEED_DEMO="true";  FIRM_PLAN="ENTERPRISE" ;;
  3) PROFILE="core";       PUBLIC_SITE="false"; SEED_DEMO="false"; FIRM_PLAN="CORE" ;;
  4) PROFILE="enterprise"; PUBLIC_SITE="false"; SEED_DEMO="false"; FIRM_PLAN="ENTERPRISE" ;;
  5) PROFILE="licensing";  PUBLIC_SITE="false"; SEED_DEMO="false"; FIRM_PLAN="ENTERPRISE" ;;
  6)
    echo ""
    warn "Learning & Certification Manager is in the development pipeline and not yet"
    warn "available for deployment. Choose 1-5 for now."
    exit 0
    ;;
  *) error "Invalid choice '$CHOICE' — pick 1-6." ;;
esac
export PROFILE PUBLIC_SITE SEED_DEMO FIRM_PLAN PLATFORM_ADMIN_EMAILS

info "Profile: ${BOLD}${PROFILE}${NC}  (public site: ${PUBLIC_SITE}, demo: ${SEED_DEMO}, plan: ${FIRM_PLAN})"

# ── Collect inputs (env vars skip the prompt — non-interactive friendly) ──────
section "Configuration"
[[ -n "${DOMAIN:-}" ]] || ask "Domain (e.g. aorms.in) [aorms.in]:" DOMAIN
DOMAIN="$(normalize_domain "${DOMAIN:-aorms.in}")"
validate_domain "$DOMAIN" || error "Enter a valid domain (hostname only)."

[[ -n "${ADMIN_EMAIL:-}" ]] || ask "Your email (for TLS certificate):" ADMIN_EMAIL
[[ "$ADMIN_EMAIL" == *@*.* ]] || error "A valid email is required for the TLS certificate."

GIT_BRANCH="${GIT_BRANCH:-main}"

warn "Database & session secrets"
[[ -n "${POSTGRES_PASSWORD:-}" ]] || askpass "PostgreSQL password [auto-generate]:" POSTGRES_PASSWORD
[[ -z "${POSTGRES_PASSWORD:-}" ]] && POSTGRES_PASSWORD="$(openssl rand -hex 16)" && info "PostgreSQL password auto-generated."
[[ -n "${SESSION_SECRET:-}" ]] || askpass "Session secret [auto-generate]:" SESSION_SECRET
[[ -z "${SESSION_SECRET:-}" ]] && SESSION_SECRET="$(openssl rand -hex 32)" && info "Session secret auto-generated."

warn "MinIO (built-in S3 storage)"
[[ -n "${MINIO_USER:-}" ]] || ask "MinIO root user [esti-admin]:" MINIO_USER
MINIO_USER="${MINIO_USER:-esti-admin}"
[[ -n "${MINIO_PASSWORD:-}" ]] || askpass "MinIO root password (min 8) [auto-generate]:" MINIO_PASSWORD
[[ ${#MINIO_PASSWORD} -lt 8 ]] && MINIO_PASSWORD="$(openssl rand -hex 16)" && warn "MinIO password auto-generated."

warn "First owner account"
[[ -n "${OWNER_EMAIL:-}" ]] || ask "Owner email:" OWNER_EMAIL
[[ "$OWNER_EMAIL" == *@* ]] || error "Owner email is required — it is your admin login."
[[ -n "${OWNER_PASSWORD:-}" ]] || askpass "Owner password:" OWNER_PASSWORD
[[ -n "${OWNER_PASSWORD:-}" ]] || error "Owner password is required."

# Demo profile: the public one-click /demo button posts demo1234 — keep the default.
if [[ "$PROFILE" == "demo" ]]; then
  [[ -n "${DEMO_PASSWORD:-}" ]] || askpass "Demo account password [demo1234]:" DEMO_PASSWORD
  DEMO_PASSWORD="${DEMO_PASSWORD:-demo1234}"
  [[ "$DEMO_PASSWORD" != "demo1234" ]] && warn "Demo password ≠ demo1234 — the one-click /demo button will fail until the frontend constant matches."
  [[ "$OWNER_EMAIL" == "principal@demo.aorms.in" ]] && OWNER_PASSWORD="$DEMO_PASSWORD"
else
  DEMO_PASSWORD="demo1234"   # unused unless SEED_DEMO=true
fi

# Licensing profile: platform admins + Google sign-in.
if [[ "$PROFILE" == "licensing" ]]; then
  [[ -n "${PLATFORM_ADMIN_EMAILS:-}" ]] || ask "Platform admin emails (comma-separated):" PLATFORM_ADMIN_EMAILS
  warn "Google sign-in: set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env after install"
  warn "(redirect URI https://${DOMAIN}/platform/auth/google/callback) — see docs/esti/AORMS-LITE-AND-GOOGLE-AUTH.md."
fi

export DOMAIN POSTGRES_PASSWORD SESSION_SECRET MINIO_USER MINIO_PASSWORD
export OWNER_EMAIL OWNER_PASSWORD DEMO_PASSWORD PLATFORM_ADMIN_EMAILS

echo ""; info "Configuration collected — installing profile '${PROFILE}'..."

install_core "$ADMIN_EMAIL" "$GIT_BRANCH"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}============================================${NC}"
echo -e "${GREEN}${BOLD}  ESTI AORMS — '${PROFILE}' is live!${NC}"
echo -e "${GREEN}${BOLD}============================================${NC}"
echo -e "  URL    : ${BOLD}https://${DOMAIN}${NC}"
echo -e "  Login  : ${BOLD}${OWNER_EMAIL}${NC}"
[[ "$PROFILE" == "demo" ]]      && echo -e "  Demo   : ${BOLD}https://${DOMAIN}/demo${NC} → principal@demo.aorms.in / ${DEMO_PASSWORD} (no manual login)"
[[ "$PROFILE" == "landing" ]]   && echo -e "  Site   : public marketing landing at ${BOLD}https://${DOMAIN}${NC}"
[[ "$PROFILE" == "licensing" ]] && echo -e "  Admin  : ${BOLD}https://${DOMAIN}/platform-admin${NC} (Google sign-in once GOOGLE_* env set)"
echo ""
echo -e "  Update later: ${CYAN}bash ${DEPLOY_DIR}/deploy/update.sh${NC}"
echo ""
