#!/usr/bin/env bash
# ESTI AORMS — first-time install of the PUBLIC DEMO build (demo-prod).
#
# Ships the public marketing site (landing, blog, investors, legal, one-click /demo)
# and seeds a demo workspace. This is the variant for aorms.in.
#
# Run on a fresh Ubuntu 22.04 / 24.04 VPS as root, AFTER pointing your domain's DNS
# A record at this server:
#
#   sudo bash deploy/install-demo.sh
#   sudo GIT_BRANCH=main bash deploy/install-demo.sh     # pin a branch
#
# Thin wrapper over setup-vps.sh (VARIANT=demo) — all logic lives there.
# See deploy/README.md.
set -euo pipefail
exec env VARIANT=demo bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/setup-vps.sh" "$@"
