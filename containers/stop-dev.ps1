$ErrorActionPreference = "Stop"

foreach ($containerName in @("esti-app", "esti-adminer", "esti-db")) {
	podman container exists $containerName
	if ($LASTEXITCODE -eq 0) {
		podman stop $containerName
	}
}
