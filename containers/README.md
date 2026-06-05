# ESTI Podman Runtime

This directory contains the development runtime for the ESTI Architect Platform.

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

Installer values are prefilled by `install.forced.php` in the development
container:

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

The runtime persists the generated application configuration, documents, and
database in Podman volumes:

```text
esti-conf       -> /var/www/html/conf
esti-documents  -> /var/www/documents
esti-db-data    -> /var/lib/mysql
```

## Apply ESTI Defaults

After the web installer finishes and the administrator account is created, apply
the ESTI India architect-office baseline:

```powershell
.\containers\apply-esti-defaults.ps1
```

This sets the application title, `en_IN` default language, allowed Indian
languages (`en_IN`, `hi_IN`, `bn_IN`, `kn_IN`, `ta_IN`), INR currency, India
country, Asia/Kolkata timezone, and the locked ESTI Carbon product UI.

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
