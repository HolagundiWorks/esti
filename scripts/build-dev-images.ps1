# Build dev images for Podman compose (context = repo root; @hcw/aorms-ai-kit is
# vendored under vendor/ — no sibling repos needed).
#   ./scripts/build-dev-images.ps1
$ErrorActionPreference = "Stop"
$engine = if ($env:ENGINE) { $env:ENGINE } else { "podman" }
$estiRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Write-Host "==> Building from $estiRoot"
Set-Location $estiRoot

& $engine build -t localhost/esti-backend:dev -f backend/Dockerfile .
& $engine build -t localhost/esti-worker:dev -f worker/Dockerfile.dev .
& $engine build -t localhost/esti-frontend:dev -f frontend/Dockerfile.dev .

Write-Host "==> Dev images ready."
