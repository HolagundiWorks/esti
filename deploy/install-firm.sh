#!/usr/bin/env bash
# ESTI AORMS — first-time install of the FIRM PRODUCT build (firm-prod).
#
# No public marketing site and no demo data: unauthenticated visitors go straight to
# /login. This is the variant a practice runs as their private workspace.
#
# Run on a fresh Ubuntu 22.04 / 24.04 VPS as root, AFTER pointing your domain's DNS
# A record at this server:
#
#   sudo bash deploy/install-firm.sh
#   sudo GIT_BRANCH=main bash deploy/install-firm.sh     # pin a branch
#
# Thin wrapper over setup-vps.sh (VARIANT=firm) — all logic lives there.
# It writes VITE_PUBLIC_SITE=false and SEED_DEMO=false to .env so updates stay firm.
# See deploy/README.md.
set -euo pipefail
exec env VARIANT=firm bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/setup-vps.sh" "$@"
