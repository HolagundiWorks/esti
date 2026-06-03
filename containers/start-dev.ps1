param(
	[int] $HttpPort = 8080,
	[int] $AdminerPort = 8081,
	[string] $DbName = "esti",
	[string] $DbUser = "esti",
	[string] $DbPassword = "esti_dev_password",
	[string] $DbRootPassword = "esti_root_dev_password",
	[switch] $WithAdminer
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$networkName = "esti-net"
$dbVolume = "esti-db-data"
$documentsVolume = "esti-documents"

function Ensure-PodmanResource {
	param(
		[string] $InspectCommand,
		[string] $CreateCommand
	)

	Invoke-Expression $InspectCommand *> $null
	if ($LASTEXITCODE -ne 0) {
		Invoke-Expression $CreateCommand
	}
}

Ensure-PodmanResource "podman network inspect $networkName" "podman network create $networkName"
Ensure-PodmanResource "podman volume inspect $dbVolume" "podman volume create $dbVolume"
Ensure-PodmanResource "podman volume inspect $documentsVolume" "podman volume create $documentsVolume"

podman container exists esti-db
if ($LASTEXITCODE -ne 0) {
	podman run -d `
		--name esti-db `
		--network $networkName `
		-v "${dbVolume}:/var/lib/mysql" `
		-e MYSQL_DATABASE=$DbName `
		-e MYSQL_USER=$DbUser `
		-e MYSQL_PASSWORD=$DbPassword `
		-e MYSQL_ROOT_PASSWORD=$DbRootPassword `
		-e TZ=Asia/Kolkata `
		docker.io/library/mariadb:11
} else {
	podman start esti-db
}

podman build -t localhost/esti-erp-dev:latest -f (Join-Path $PSScriptRoot "Containerfile") $repoRoot

podman container exists esti-app
if ($LASTEXITCODE -eq 0) {
	podman rm -f esti-app
}

podman run -d `
	--name esti-app `
	--network $networkName `
	-p "${HttpPort}:80" `
	-v "${documentsVolume}:/var/www/documents" `
	-e TZ=Asia/Kolkata `
	-e ESTI_DB_HOST=esti-db `
	-e ESTI_DB_PORT=3306 `
	-e ESTI_DB_NAME=$DbName `
	-e ESTI_DB_USER=$DbUser `
	-e ESTI_DB_PASSWORD=$DbPassword `
	localhost/esti-erp-dev:latest

if ($WithAdminer) {
	podman container exists esti-adminer
	if ($LASTEXITCODE -eq 0) {
		podman rm -f esti-adminer
	}

	podman run -d `
		--name esti-adminer `
		--network $networkName `
		-p "${AdminerPort}:8080" `
		docker.io/library/adminer:4
}

Write-Host "ESTI ERP installer: http://localhost:$HttpPort/install/"
if ($WithAdminer) {
	Write-Host "Adminer: http://localhost:$AdminerPort"
}
