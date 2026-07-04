#!/usr/bin/env bash
# Fetch the AORMS desktop installer from a GitHub Release and host it on the
# VPS /download page.
#
# Windows installers can't be built on a Linux VPS — GitHub Actions (windows-latest,
# .github/workflows/desktop.yml) builds the Manager installer and publishes it on a
# `desktop-v*` tag. Since the Manager model there is ONE edition-agnostic installer
# (AORMS-Setup.exe — the edition comes from the licence at runtime); both download
# buttons point at it. Legacy releases (up to desktop-v0.2.0) shipped per-edition
# Lite/Pro/Core exes — those names remain supported as a fallback. This script pulls
# the assets down, wires the .env download URLs, rebuilds the SPA so the buttons go
# live, and serves the files under /downloads/.
#
#   bash deploy/fetch-installers.sh                  # latest desktop-v* release
#   bash deploy/fetch-installers.sh desktop-v1.0.0   # a specific tag
#
# Auth (private repo): run `gh auth login` once, or `export GH_TOKEN=<token>`.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"
cd "$DEPLOY_DIR"

# Repo slug from REPO_URL (https://github.com/OWNER/REPO.git → OWNER/REPO).
REPO="${INSTALLER_REPO:-$(echo "$REPO_URL" | sed -E 's#.*github\.com[/:]##; s#\.git$##')}"
TAG="${1:-}"
ENV_FILE="$DEPLOY_DIR/.env"
DIST="$DEPLOY_DIR/frontend/dist"
STAGE="$DEPLOY_DIR/.installers"

MANAGER="AORMS-Setup.exe"
# The free, offline, LAN-only Community appliance (its own baked installer).
COMMUNITY="AORMS-Community-Setup.exe"
# Legacy asset names (releases up to desktop-v0.2.0): per-edition installers.
LITE="AORMS-Lite-Setup.exe"
PRO="AORMS-Pro-Setup.exe"
CORE="AORMS-Core-Setup.exe"
ENT="AORMS-Enterprise-Setup.exe"

command -v gh >/dev/null 2>&1 \
  || error "GitHub CLI 'gh' not found. Install it (apt-get install -y gh), then 'gh auth login' (or export GH_TOKEN)."
[[ -f "$ENV_FILE" ]] || error ".env not found at $ENV_FILE — run deploy/install.sh first."

# 1. Resolve the tag (latest desktop-v* release if not supplied).
if [[ -z "$TAG" ]]; then
  TAG="$(gh release list --repo "$REPO" --limit 30 --json tagName \
        -q '[.[].tagName] | map(select(startswith("desktop-v"))) | .[0]' 2>/dev/null || true)"
  [[ -n "$TAG" && "$TAG" != "null" ]] \
    || error "No desktop-v* release in $REPO. Build them first: GitHub → Actions → desktop-installer → Run workflow, or push a desktop-v* tag."
fi
section "Fetching installers from ${REPO} @ ${TAG}"

# 2. Download the installers to a staging dir. New releases carry one
#    edition-agnostic Manager installer; legacy releases carry per-edition exes.
rm -rf "$STAGE"; mkdir -p "$STAGE"
gh release download "$TAG" --repo "$REPO" --pattern "AORMS-*Setup.exe" --dir "$STAGE" --clobber \
  || error "gh release download failed — check 'gh auth status' or GH_TOKEN."
LITE_FILE=""; PRO_FILE=""
if [[ -f "$STAGE/$MANAGER" ]]; then
  # Single Manager installer — both buttons serve the same exe.
  LITE_FILE="$MANAGER"; PRO_FILE="$MANAGER"
else
  [[ -f "$STAGE/$LITE" ]] && LITE_FILE="$LITE"
  if [[ -f "$STAGE/$PRO" ]]; then PRO_FILE="$PRO"; elif [[ -f "$STAGE/$CORE" ]]; then PRO_FILE="$CORE"; fi
fi
[[ -n "$LITE_FILE" ]] || error "Release ${TAG} has neither ${MANAGER} nor ${LITE} — re-run the desktop-installer workflow."
[[ -n "$PRO_FILE" ]] || error "Release ${TAG} has neither ${MANAGER}, ${PRO} nor ${CORE} — re-run the desktop-installer workflow."
info "Downloaded: $(cd "$STAGE" && ls AORMS-*Setup.exe | tr '\n' ' ')"

# 3. Point /download at /downloads/<file> in .env (idempotent).
section "Wiring .env download URLs"
set_env_kv() {  # key value
  if grep -q "^$1=" "$ENV_FILE"; then sed -i "s#^$1=.*#$1=$2#" "$ENV_FILE"; else echo "$1=$2" >> "$ENV_FILE"; fi
}
set_env_kv VITE_LITE_DOWNLOAD_URL "/downloads/$LITE_FILE"
set_env_kv VITE_PRO_DOWNLOAD_URL "/downloads/$PRO_FILE"
# The Community appliance has its own baked installer; fall back to the free
# Lite/Manager exe when a release predates it so the button is never dead.
COMMUNITY_FILE="$([[ -f "$STAGE/$COMMUNITY" ]] && echo "$COMMUNITY" || echo "$LITE_FILE")"
set_env_kv VITE_COMMUNITY_DOWNLOAD_URL "/downloads/$COMMUNITY_FILE"
# Legacy vars — harmless, kept for older builds that still read them.
[[ -f "$STAGE/$CORE" ]] && set_env_kv VITE_CORE_DOWNLOAD_URL "/downloads/$CORE"
[[ -f "$STAGE/$ENT" ]] && set_env_kv VITE_ENTERPRISE_DOWNLOAD_URL "/downloads/$ENT"

# 4. Rebuild the SPA so the URLs bake in (VITE_* are build-time), then atomic-swap
#    the dist with the installers carried into it.
section "Rebuilding frontend (bakes the download URLs)"
set -a; load_dotenv "$ENV_FILE"; set +a
docker compose -f compose.prod.yaml --profile build-only build frontend
docker create --name esti-fe-tmp esti-frontend:prod >/dev/null
rm -rf "$DIST.new"; mkdir -p "$DIST.new"
docker cp esti-fe-tmp:/usr/share/nginx/html/. "$DIST.new/"
docker rm esti-fe-tmp >/dev/null

mkdir -p "$DIST.new/downloads"
cp "$STAGE"/AORMS-*Setup.exe "$DIST.new/downloads/"
chown -R www-data:www-data "$DIST.new" 2>/dev/null || true
rm -rf "$DIST.old"; [[ -d "$DIST" ]] && mv "$DIST" "$DIST.old"
mv "$DIST.new" "$DIST"
rm -rf "$STAGE"
nginx -t >/dev/null 2>&1 && systemctl reload nginx 2>/dev/null || true

info "Done — https://<your-domain>/download now serves Community (${COMMUNITY_FILE}) and Pro (${PRO_FILE})."
