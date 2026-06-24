#!/usr/bin/env bash
# ESTI AORMS — update an EXISTING deployment in place.
#
# Pulls new code, rebuilds backend/worker/frontend, swaps the static dist atomically,
# rolling-restarts, runs idempotent seeds, and pings IndexNow. Does NOT touch the nginx
# vhost or TLS cert (set REFRESH_NGINX=true only when the nginx template changed).
#
# The build variant (demo/firm) is read from .env — you do not repeat it on updates.
#
#   bash deploy/update.sh
#   GIT_BRANCH=feat/xyz bash deploy/update.sh     # deploy a specific branch
#   REFRESH_NGINX=true bash deploy/update.sh       # also re-apply the nginx template + TLS
#
# Thin wrapper over deploy.sh — all logic lives there. See deploy/README.md.
set -euo pipefail
exec bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deploy.sh" "$@"
