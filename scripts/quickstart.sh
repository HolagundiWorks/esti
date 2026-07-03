#!/usr/bin/env bash
# ESTI AORMS — one-shot local bring-up: build, start, wait, seed.
#   ./scripts/quickstart.sh          (ENGINE=docker ./scripts/quickstart.sh for docker)
set -euo pipefail

ENGINE="${ENGINE:-podman}"
cd "$(dirname "$0")/.."

echo "==> Building dev images (context = repo root; kits vendored under vendor/)…"
"$ENGINE" build -t localhost/esti-backend:dev  -f backend/Dockerfile      .
"$ENGINE" build -t localhost/esti-worker:dev   -f worker/Dockerfile.dev   .
"$ENGINE" build -t localhost/esti-frontend:dev -f frontend/Dockerfile.dev .

echo "==> Starting the ESTI stack ($ENGINE compose)…"
"$ENGINE" compose up -d

echo "==> Waiting for the API to become healthy…"
for _ in $(seq 1 60); do
  if curl -sf http://localhost:4000/health >/dev/null 2>&1; then break; fi
  sleep 2
done
curl -sf http://localhost:4000/health >/dev/null 2>&1 || { echo "API did not come up; check '$ENGINE logs esti-backend'"; exit 1; }

echo "==> Seeding the first owner login (idempotent)…"
"$ENGINE" exec esti-backend sh -lc "cd /app/esti/backend && pnpm seed"

cat <<'DONE'

==> ESTI is ready.
    SPA:   http://localhost:5173
    API:   http://localhost:4000
    MinIO: http://localhost:9001

    Sign in with the seeded owner (default owner@hcw.in / ChangeMe123),
    then change the password under Settings -> My profile.
DONE
