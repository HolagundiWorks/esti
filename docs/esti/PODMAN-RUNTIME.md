# Podman Runtime Plan

## Objective

Provide a reproducible local runtime for the ESTI Architect Platform using
Podman. The first target is development and testing. Production images should be
created only after license notices, source availability, backup, and upgrade
procedures are ready.

## Planned Services

- `esti-app`: PHP and web server serving `htdocs` for the API/backend service.
- `esti-db`: MariaDB database.
- `esti-documents`: persistent Dolibarr/ESTI document storage volume.
- `esti-conf`: persistent Dolibarr/ESTI generated configuration volume.
- `esti-db-data`: persistent database volume.
- Optional `esti-adminer`: database inspection tool for local development only.
- Future `esti-frontend`: Carbon React development server.
- Future `esti-viewer`: DXF/PDF viewer and measurement service.

## Suggested Defaults

```text
App URL: http://localhost:8080
Database: MariaDB
Database name: esti
Database user: esti
Default currency: INR
Default timezone: Asia/Kolkata
Default locale: en_IN
```

## Runtime Files

The first development runtime is available in:

- `containers/Containerfile`
- `containers/podman-compose.yml`
- `containers/env.example`
- `containers/php.ini`
- `containers/apache-site.conf`
- `containers/entrypoint.sh`
- `containers/README.md`
- `containers/start-dev.ps1`
- `containers/stop-dev.ps1`

Future initialization files may be added under `containers/init/`, but only for
safe defaults that match Dolibarr install conventions.

## Podman Compose Summary

```yaml
cd containers
cp env.example .env
podman compose --env-file .env -f podman-compose.yml up --build
```

If Podman Compose is not installed, Windows users can start the same development
stack with:

```powershell
.\containers\start-dev.ps1
```

## Initialization Roadmap

- Start database and app containers.
- Open installer at `/install/`.
- Configure database using the service names above.
- Complete first admin setup.
- Apply ESTI defaults through a supported install/profile script.
- Lock installer according to Dolibarr security guidance.

## Security Notes

- Never ship development passwords in production images.
- Do not bake user data, documents, or database dumps into images.
- Add image labels for GPL license, source repository, and upstream attribution.
- Keep source code available for every distributed container image tag.
