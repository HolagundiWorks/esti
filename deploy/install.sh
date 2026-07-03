#!/usr/bin/env bash
# ============================================================
#  ESTI AORMS — installer for the AORMS site (aorms.in)
#  Default (no PROFILE): public landing page + the main app on one box —
#  workspace, unified accounts, and the licensing platform.
#
#  Ubuntu 22.04 / 24.04, as root:
#    sudo bash deploy/install.sh
#  Non-interactive: DOMAIN=… ADMIN_EMAIL=… OWNER_EMAIL=… OWNER_PASSWORD=… \
#    sudo -E bash deploy/install.sh
#
#  Customer/self-hosted firm installs use deploy/install-enterprise.sh.
#  Legacy profiles stay reachable via PROFILE=landing|demo|core|enterprise|licensing.
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

# ── Profile ──────────────────────────────────────────────────────────────────
# Default: the AORMS site — landing page + main app (+ licensing platform +
# unified accounts) on one box. Legacy profiles stay reachable via PROFILE=…;
# each only sets a few env knobs and the install flow is identical (lib.sh).
PLATFORM_ADMIN_EMAILS="${PLATFORM_ADMIN_EMAILS:-}"
case "${PROFILE:-aorms}" in
  aorms)      PROFILE="aorms";      PUBLIC_SITE="true";  SEED_DEMO="false"; FIRM_PLAN="ENTERPRISE" ;;
  landing)    PROFILE="landing";    PUBLIC_SITE="true";  SEED_DEMO="false"; FIRM_PLAN="ENTERPRISE" ;;
  demo)       PROFILE="demo";       PUBLIC_SITE="true";  SEED_DEMO="true";  FIRM_PLAN="ENTERPRISE" ;;
  core|enterprise)
    warn "Customer/self-hosted firm installs have their own front door now:"
    warn "  sudo bash deploy/install-enterprise.sh"
    PROFILE="${PROFILE}"; PUBLIC_SITE="false"; SEED_DEMO="false"
    [[ "$PROFILE" == "core" ]] && FIRM_PLAN="CORE" || FIRM_PLAN="ENTERPRISE"
    ;;
  licensing)  PROFILE="licensing";  PUBLIC_SITE="false"; SEED_DEMO="false"; FIRM_PLAN="ENTERPRISE" ;;
  learning)
    warn "Learning & Certification Manager is in the development pipeline and not yet available."
    exit 0
    ;;
  *) error "Unknown PROFILE '${PROFILE:-}' — use aorms (default) | landing | demo | core | enterprise | licensing." ;;
esac

# Licensing & Account is an OVERLAY, not a separate base: the /platform backend is
# mounted in every deployment, so it can layer onto any profile. Enabling it just
# registers platform admins (+ Google sign-in). Auto-on for the licensing base;
# offered as a y/N add-on on demo/core/enterprise. Non-interactive: WITH_LICENSING=true.
PLATFORM_ENABLED="${WITH_LICENSING:-}"
# The AORMS-site default bundles the platform: unified accounts + licensing
# ride with the landing + main app.
[[ "$PROFILE" == "aorms" || "$PROFILE" == "licensing" ]] && PLATFORM_ENABLED="true"
# Licensing & Account is centralised on the AORMS site (its own `licensing` profile,
# optionally alongside the `demo` showcase). A customer's Core/Enterprise install
# NEVER bundles it — force it off even if WITH_LICENSING was passed by mistake.
if [[ "$PROFILE" == "core" || "$PROFILE" == "enterprise" ]]; then
  PLATFORM_ENABLED=""
elif [[ -z "$PLATFORM_ENABLED" && "$PROFILE" == "demo" ]]; then
  ask "Also enable the Licensing & Account platform (/platform-admin)? [y/N]:" _lic
  [[ "${_lic,,}" == y* ]] && PLATFORM_ENABLED="true"
fi
# Unified individual accounts ride with the platform: when the licensing
# platform is enabled on this box, the workspace login accepts platform
# accounts in-process (Phase 34). Explicit ESTI_UNIFIED_ACCOUNTS wins.
[[ -z "${ESTI_UNIFIED_ACCOUNTS:-}" && "$PLATFORM_ENABLED" == "true" ]] && ESTI_UNIFIED_ACCOUNTS="true"
export PROFILE PUBLIC_SITE SEED_DEMO FIRM_PLAN PLATFORM_ADMIN_EMAILS PLATFORM_ENABLED ESTI_UNIFIED_ACCOUNTS
# The licensing console is its own deployment (separate repo) at admin.DOMAIN:
# default the console origin whenever the platform runs on this box, so
# /platform-admin hands off there and the console's origin may call the
# /platform API. Explicit VITE_ADMIN_URL wins; VITE_ADMIN_URL="" (set-empty)
# keeps the embedded console. Resolved after DOMAIN is known (below).

info "Profile: ${BOLD}${PROFILE}${NC}  (public site: ${PUBLIC_SITE}, demo: ${SEED_DEMO}, plan: ${FIRM_PLAN}, licensing: ${PLATFORM_ENABLED:-false})"

# ── Collect inputs (env vars skip the prompt — non-interactive friendly) ──────
section "Configuration"
[[ -n "${DOMAIN:-}" ]] || ask "Domain (e.g. aorms.in) [aorms.in]:" DOMAIN
DOMAIN="$(normalize_domain "${DOMAIN:-aorms.in}")"
validate_domain "$DOMAIN" || error "Enter a valid domain (hostname only)."
# Standalone licensing console origin (see the note above the profile exports).
if [[ -z "${VITE_ADMIN_URL+x}" && "$PLATFORM_ENABLED" == "true" ]]; then
  VITE_ADMIN_URL="https://admin.${DOMAIN}"
fi
export VITE_ADMIN_URL

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

# Demo profile: password for the seeded demo logins (manual sign-in at /login —
# the old one-click /demo autologin was removed as an anonymous-access hole).
if [[ "$PROFILE" == "demo" ]]; then
  [[ -n "${DEMO_PASSWORD:-}" ]] || askpass "Demo account password [demo1234]:" DEMO_PASSWORD
  DEMO_PASSWORD="${DEMO_PASSWORD:-demo1234}"
  [[ "$OWNER_EMAIL" == "principal@demo.aorms.in" ]] && OWNER_PASSWORD="$DEMO_PASSWORD"
else
  DEMO_PASSWORD="demo1234"   # unused unless SEED_DEMO=true
fi


# Outbound email — optional but recommended: licence keys, verification links,
# password resets and invitations all send through it. Blank host = skip
# (configure later in .env + deploy/update.sh; sending degrades gracefully).
warn "Outbound email (SMTP) — optional"
[[ -n "${SMTP_HOST+x}" ]] || ask "SMTP host [blank = configure later]:" SMTP_HOST
if [[ -n "${SMTP_HOST:-}" ]]; then
  [[ -n "${SMTP_PORT:-}" ]] || ask "SMTP port [587]:" SMTP_PORT
  SMTP_PORT="${SMTP_PORT:-587}"
  [[ -n "${SMTP_USER:-}" ]] || ask "SMTP user:" SMTP_USER
  [[ -n "${SMTP_PASS:-}" ]] || askpass "SMTP password:" SMTP_PASS
  [[ -n "${SMTP_FROM:-}" ]] || ask "From header [AORMS <no-reply@${DOMAIN}>]:" SMTP_FROM
  info "Email enabled via ${SMTP_HOST}:${SMTP_PORT}."
else
  warn "Email sending disabled — accounts stay unverified and licence keys appear only in the console until SMTP is set in .env."
fi
export SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS SMTP_FROM BETA_REQUEST_NOTIFY_TO

# Licensing & Account overlay: platform-admin allowlist (email+password sign-in).
if [[ "$PLATFORM_ENABLED" == "true" ]]; then
  [[ -n "${PLATFORM_ADMIN_EMAILS:-}" ]] || ask "Platform admin emails (comma-separated):" PLATFORM_ADMIN_EMAILS
  info "Platform admin: register at /platform-admin with one of those emails (email + password)."
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
[[ "$PROFILE" == "demo" ]]        && echo -e "  Demo   : sign in at ${BOLD}https://${DOMAIN}/login${NC} → principal@demo.aorms.in / ${DEMO_PASSWORD}"
[[ "$PROFILE" == "aorms" ]]       && echo -e "  Site   : landing + main app at ${BOLD}https://${DOMAIN}${NC} · console handoff at ${BOLD}${VITE_ADMIN_URL:-'(embedded)'}${NC}"
[[ "$PROFILE" == "landing" ]]     && echo -e "  Site   : public marketing landing at ${BOLD}https://${DOMAIN}${NC}"
[[ "$PLATFORM_ENABLED" == "true" ]] && echo -e "  Admin  : ${BOLD}https://${DOMAIN}/platform-admin${NC} (register with a PLATFORM_ADMIN_EMAILS address) · demo licences: demo.lite1@aorms.in / demo1234"
echo ""
echo -e "  Update later: ${CYAN}bash ${DEPLOY_DIR}/deploy/update.sh${NC}"
echo ""
