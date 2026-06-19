# Build dev images for Podman compose (context = repos parent with kit siblings).
#   ./scripts/build-dev-images.ps1
$ErrorActionPreference = "Stop"
$engine = if ($env:ENGINE) { $env:ENGINE } else { "podman" }
$estiRoot = Join-Path $PSScriptRoot ".."
$reposRoot = (Resolve-Path (Join-Path $estiRoot "..")).Path

Write-Host "==> Building from $reposRoot"
Set-Location $reposRoot

& $engine build -t localhost/esti-backend:dev -f esti/backend/Dockerfile .
& $engine build -t localhost/esti-worker:dev -f esti/worker/Dockerfile.dev esti
& $engine build -t localhost/esti-frontend:dev -f esti/frontend/Dockerfile.dev .

Write-Host "==> Dev images ready."
