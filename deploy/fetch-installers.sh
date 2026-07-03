#!/usr/bin/env bash
# Fetch the AORMS desktop installers from a GitHub Release and host them on the
# VPS /download page (Lite / Core / Enterprise .exe).
#
# Windows installers can't be built on a Linux VPS — GitHub Actions (windows-latest,
# .github/workflows/desktop.yml) builds all three and publishes them on a `desktop-v*`
# tag. This script pulls them down, wires the .env download URLs, rebuilds the SPA so
# the buttons go live, and serves the files under /downloads/.
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

LITE="AORMS-Lite-Setup.exe"
PRO="AORMS-Pro-Setup.exe"
# Legacy asset names (releases up to desktop-v0.1.0): the licensed edition was
# built as "Core", plus a separate "Enterprise" build. The product editions are
# now Lite/Pro — Pro falls back to the Core exe when no Pro-named asset exists.
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

# 2. Download the installers to a staging dir.
rm -rf "$STAGE"; mkdir -p "$STAGE"
gh release download "$TAG" --repo "$REPO" --pattern "AORMS-*-Setup.exe" --dir "$STAGE" --clobber \
  || error "gh release download failed — check 'gh auth status' or GH_TOKEN."
[[ -f "$STAGE/$LITE" ]] || error "Release ${TAG} is missing ${LITE} — re-run the desktop-installer workflow."
# The Pro download: a Pro-named asset when the release has one, else the
# legacy Core exe (same licensed edition, old name).
PRO_FILE=""
if [[ -f "$STAGE/$PRO" ]]; then PRO_FILE="$PRO"; elif [[ -f "$STAGE/$CORE" ]]; then PRO_FILE="$CORE"; fi
[[ -n "$PRO_FILE" ]] || error "Release ${TAG} has neither ${PRO} nor ${CORE} — re-run the desktop-installer workflow."
info "Downloaded: $(cd "$STAGE" && ls AORMS-*-Setup.exe | tr '\n' ' ')"

# 3. Point /download at /downloads/<file> in .env (idempotent).
section "Wiring .env download URLs"
set_env_kv() {  # key value
  if grep -q "^$1=" "$ENV_FILE"; then sed -i "s#^$1=.*#$1=$2#" "$ENV_FILE"; else echo "$1=$2" >> "$ENV_FILE"; fi
}
set_env_kv VITE_LITE_DOWNLOAD_URL "/downloads/$LITE"
set_env_kv VITE_PRO_DOWNLOAD_URL "/downloads/$PRO_FILE"
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
cp "$STAGE"/AORMS-*-Setup.exe "$DIST.new/downloads/"
chown -R www-data:www-data "$DIST.new" 2>/dev/null || true
rm -rf "$DIST.old"; [[ -d "$DIST" ]] && mv "$DIST" "$DIST.old"
mv "$DIST.new" "$DIST"
rm -rf "$STAGE"
nginx -t >/dev/null 2>&1 && systemctl reload nginx 2>/dev/null || true

info "Done — https://<your-domain>/download now serves Lite (${LITE}) and Pro (${PRO_FILE})."
