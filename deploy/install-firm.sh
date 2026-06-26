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
#   sudo FIRM_PLAN=CORE bash deploy/install-firm.sh      # pick the tier (default ENTERPRISE)
#
# Thin wrapper over setup-vps.sh (VARIANT=firm) — all logic lives there.
# It writes VITE_PUBLIC_SITE=false and SEED_DEMO=false to .env so updates stay firm.
# Licence-free standalone: the plan is set from FIRM_PLAN (default ENTERPRISE = all
# features) by the base seed; no licence hub is required. See deploy/README.md.
set -euo pipefail
exec env VARIANT=firm bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/setup-vps.sh" "$@"
