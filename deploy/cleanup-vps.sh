#!/usr/bin/env bash
# ============================================================
#  AORMS — remove unwanted artifacts on a production VPS
#  ------------------------------------------------------------
#  Retired desktop installers, stale frontend dist swaps, Docker
#  build cruft, and optional log/apt cache trimming. Does NOT
#  touch Postgres, MinIO volumes, .env secrets, or live dist.
#
#  Dry-run by default (prints what would be removed):
#    bash deploy/cleanup-vps.sh
#
#  Apply deletions:
#    sudo APPLY=true bash deploy/cleanup-vps.sh
#
#  Also prune Docker build cache + dangling images:
#    sudo APPLY=true PRUNE_DOCKER=true bash deploy/cleanup-vps.sh
#
#  Trim systemd journal + apt lists (aggressive disk reclaim):
#    sudo APPLY=true PRUNE_LOGS=true PRUNE_APT=true bash deploy/cleanup-vps.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

DEPLOY_DIR="${DEPLOY_DIR:-/opt/esti}"
APPLY="${APPLY:-false}"
PRUNE_DOCKER="${PRUNE_DOCKER:-false}"
PRUNE_LOGS="${PRUNE_LOGS:-false}"
PRUNE_APT="${PRUNE_APT:-false}"

[[ "$APPLY" == "true" ]] && mode="APPLY" || mode="DRY-RUN"
section "AORMS VPS cleanup ($mode) — $DEPLOY_DIR"

bytes_human() {
  local n="${1:-0}"
  if command -v numfmt >/dev/null 2>&1; then
    numfmt --to=iec-i --suffix=B "$n" 2>/dev/null || echo "${n}B"
  else
    echo "${n} bytes"
  fi
}

dir_size_bytes() {
  local p="$1"
  [[ -d "$p" ]] || { echo 0; return; }
  du -sb "$p" 2>/dev/null | awk '{print $1}' || echo 0
}

remove_path() {
  local p="$1" label="${2:-$1}"
  [[ -e "$p" ]] || return 0
  local sz; sz="$(dir_size_bytes "$p")"
  if [[ "$APPLY" == "true" ]]; then
    rm -rf "$p"
    info "Removed $label ($(bytes_human "$sz"))"
  else
    echo "  would remove: $label ($(bytes_human "$sz"))"
  fi
}

clean_env_download_urls() {
  local env_file="$DEPLOY_DIR/.env"
  [[ -f "$env_file" ]] || return 0
  local keys=(
    VITE_LITE_DOWNLOAD_URL
    VITE_PRO_DOWNLOAD_URL
    VITE_COMMUNITY_DOWNLOAD_URL
    VITE_CORE_DOWNLOAD_URL
    VITE_ENTERPRISE_DOWNLOAD_URL
  )
  local found=0
  for k in "${keys[@]}"; do
    if grep -q "^${k}=" "$env_file" 2>/dev/null; then
      found=1
      if [[ "$APPLY" == "true" ]]; then
        sed -i "/^${k}=/d" "$env_file"
        info "Removed obsolete .env key: $k"
      else
        echo "  would remove .env key: $k"
      fi
    fi
  done
  [[ "$found" -eq 0 ]] && info "No retired VITE_*_DOWNLOAD_URL keys in .env"
}

section "Retired desktop installers (cloud-only since 2026-07)"
remove_path "$DEPLOY_DIR/frontend/dist/downloads" "frontend/dist/downloads"
remove_path "$DEPLOY_DIR/frontend/dist.old/downloads" "frontend/dist.old/downloads"
remove_path "$DEPLOY_DIR/.installers" ".installers staging dir"
clean_env_download_urls

section "Stale frontend build swap"
remove_path "$DEPLOY_DIR/frontend/dist.old" "frontend/dist.old"

section "Docker — stopped temp containers"
if command -v docker >/dev/null 2>&1; then
  mapfile -t tmp_containers < <(docker ps -aq --filter "name=esti-fe-tmp" 2>/dev/null || true)
  if ((${#tmp_containers[@]})); then
    if [[ "$APPLY" == "true" ]]; then
      docker rm -f "${tmp_containers[@]}" >/dev/null 2>&1 && info "Removed esti-fe-tmp container(s)" \
        || warn "Could not remove esti-fe-tmp container(s)"
    else
      echo "  would remove container(s): ${tmp_containers[*]}"
    fi
  else
    info "No esti-fe-tmp containers"
  fi

  if [[ "$PRUNE_DOCKER" == "true" ]]; then
    section "Docker — dangling images + build cache"
    if [[ "$APPLY" == "true" ]]; then
      docker image prune -f >/dev/null 2>&1 && info "Pruned dangling images" || warn "docker image prune failed"
      docker builder prune -f --filter 'until=168h' >/dev/null 2>&1 \
        && info "Pruned build cache older than 7 days" \
        || warn "docker builder prune failed"
    else
      echo "  would run: docker image prune -f"
      echo "  would run: docker builder prune -f --filter until=168h"
      docker system df 2>/dev/null || true
    fi
  else
    info "Skip Docker prune (set PRUNE_DOCKER=true to include)"
  fi
else
  warn "docker not found — skip container cleanup"
fi

if [[ "$PRUNE_LOGS" == "true" ]]; then
  section "Systemd journal (keep 7 days)"
  if [[ "$APPLY" == "true" ]]; then
    journalctl --vacuum-time=7d >/dev/null 2>&1 && info "Journal vacuumed (7d retention)" \
      || warn "journalctl vacuum failed"
  else
    echo "  would run: journalctl --vacuum-time=7d"
  fi
fi

if [[ "$PRUNE_APT" == "true" ]]; then
  section "APT package lists"
  if [[ "$APPLY" == "true" ]]; then
    apt-get clean -y >/dev/null 2>&1 && info "apt-get clean" || warn "apt-get clean failed"
    apt-get autoremove -y >/dev/null 2>&1 && info "apt-get autoremove" || warn "apt-get autoremove failed"
  else
    echo "  would run: apt-get clean && apt-get autoremove -y"
  fi
fi

section "Disk summary"
if command -v df >/dev/null 2>&1; then
  df -h / /opt 2>/dev/null | sed 's/^/  /' || df -h / | sed 's/^/  /'
fi
if command -v docker >/dev/null 2>&1; then
  docker system df 2>/dev/null | sed 's/^/  /' || true
fi

if [[ "$APPLY" != "true" ]]; then
  echo
  warn "Dry-run only. Re-run with: sudo APPLY=true bash deploy/cleanup-vps.sh"
  warn "For Docker cache too: sudo APPLY=true PRUNE_DOCKER=true bash deploy/cleanup-vps.sh"
else
  info "Cleanup complete. Run bash deploy/update.sh if you removed .env download keys (rebuild frontend)."
fi
