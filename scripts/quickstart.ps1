# ESTI AORMS - one-shot local bring-up: build, start, wait, seed.
#   ./scripts/quickstart.ps1
$ErrorActionPreference = "Stop"
$engine = if ($env:ENGINE) { $env:ENGINE } else { "podman" }
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "==> Building dev images (context = repo root; kits vendored under vendor/)..."
& $engine build -t localhost/esti-backend:dev  -f backend/Dockerfile      .
& $engine build -t localhost/esti-worker:dev   -f worker/Dockerfile.dev   .
& $engine build -t localhost/esti-frontend:dev -f frontend/Dockerfile.dev .

Write-Host "==> Starting the ESTI stack ($engine compose)..."
& $engine compose up -d

Write-Host "==> Waiting for the API to become healthy..."
$up = $false
foreach ($i in 1..60) {
  try { Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 2 | Out-Null; $up = $true; break }
  catch { Start-Sleep -Seconds 2 }
}
if (-not $up) { Write-Error "API did not come up; check '$engine logs esti-backend'"; exit 1 }

Write-Host "==> Seeding the first owner login (idempotent)..."
& $engine exec esti-backend sh -lc "cd /app/esti/backend && pnpm seed"

Write-Host ""
Write-Host "==> ESTI is ready."
Write-Host "    SPA:   http://localhost:5173"
Write-Host "    API:   http://localhost:4000"
Write-Host "    MinIO: http://localhost:9001"
Write-Host ""
Write-Host "    Sign in with the seeded owner (default owner@hcw.in / ChangeMe123),"
Write-Host "    then change the password under Settings -> My profile."
