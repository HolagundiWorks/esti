# ESTI Podman Runtime

This directory contains the development runtime for ESTI ERP.

## Start

With Podman Compose:

```sh
cd containers
cp env.example .env
podman compose --env-file .env -f podman-compose.yml up --build
```

On Windows, if `podman compose` reports that no compose provider is installed,
use the raw-Podman helper:

```powershell
.\containers\start-dev.ps1
```

Use another port if `8080` is already occupied:

```powershell
.\containers\start-dev.ps1 -HttpPort 8090
```

Open:

```text
http://localhost:8080/install/
```

Installer values:

```text
Database type: mysqli
Database host: esti-db
Database port: 3306
Database name: esti
Database user: esti
Database password: esti_dev_password
Create database: No
Create database user: No
Data root: /var/www/documents
Default language: en_IN
Timezone: Asia/Kolkata
```

The development database and user are already created by the MariaDB container.
If the installer asks for a database superuser, leave database/user creation
disabled. For local troubleshooting only, the root password is
`esti_root_dev_password`.

## Optional Adminer

With Podman Compose:

```sh
podman compose --env-file .env -f podman-compose.yml --profile tools up --build
```

With the PowerShell helper:

```powershell
.\containers\start-dev.ps1 -WithAdminer
```

Adminer runs at:

```text
http://localhost:8081
```

## Notes

- This runtime is for development only.
- Development passwords are intentionally simple and must not be used in production.
- The image includes GPL source code and must preserve Dolibarr and ESTI notices
  when distributed.
- Rebuild the app image after changing source files copied into the image.

## Stop

```powershell
.\containers\stop-dev.ps1
```
