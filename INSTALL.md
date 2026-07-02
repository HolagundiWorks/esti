# AORMS — Installation

AORMS is a containerised Architecture Office Resource Management System. Every
component (PostgreSQL, Redis, MinIO, the TypeScript backend, the Python worker
and the React SPA) runs in a container — nothing is installed on the host
except a container engine.

---

## 1. Prerequisites

- **Podman** (with `podman compose`) **or Docker** (with `docker compose`)
- ~4 GB free disk for images + volumes
- Ports free on the host: `5173` (SPA), `4000` (API), `5432` (Postgres),
  `6379` (Redis), `9000`/`9001` (MinIO)

> The commands below use `podman`; substitute `docker` 1:1 if that's your engine.

---

## 2. Quickstart (local / evaluation)

```bash
git clone <repo-url> esti && cd esti

# Build images and start the whole stack
podman compose up -d --build

# Create the first owner login (idempotent)
podman exec esti-backend sh -lc "cd /app/esti/backend && pnpm seed"
```

Then open **http://localhost:5173** and sign in with the seeded credentials
(default `owner@hcw.in` / `ChangeMe123` — change the password immediately under
**Settings → My profile**).

Optional: from **Company → Data tools**, click **Import demo data** to populate
sample clients, projects and an invoice.

To stop / start / remove:

```bash
podman compose stop           # pause
podman compose start          # resume
podman compose down           # remove containers (named volumes are kept)
podman compose down -v        # remove containers AND data volumes (full wipe)
```

---

## 3. Configuration

All settings are environment variables. For local dev, `compose.yaml` ships safe
defaults and **no `.env` is required**. For anything real, create one:

```bash
cp .env.example .env
$EDITOR .env            # set strong secrets — see comments in the file
podman compose up -d    # compose auto-loads .env and recreates affected services
```

Key variables (full list in `.env.example`):

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | Signs session cookies. **Change for production.** |
| `COOKIE_SECURE` | `true` when behind HTTPS. |
| `POSTGRES_PASSWORD` / `DATABASE_URL` | Database credentials (keep them in sync). |
| `S3_SECRET_KEY` | Object-store secret. |
| `S3_PUBLIC_ENDPOINT` | Browser-reachable storage host used to sign download URLs (your TLS host in prod). |
| `SEED_OWNER_*` | First-run owner account for `pnpm seed`. |

---

## 4. Database migrations

The schema is managed with **Drizzle migrations** committed under
`backend/drizzle/`. The backend **applies any pending migrations automatically
on startup**, so a fresh database is provisioned on first boot and upgrades
apply when you deploy a newer image.

**Important:** every new `.sql` file must be registered in
`backend/drizzle/meta/_journal.json`. Missing journal entries skip migrations on
VPS while the ORM schema still expects new columns — see
[PRODUCTION-OPS](docs/esti/PRODUCTION-OPS.md#database-migrations).

On first boot the backend also **creates the MinIO documents bucket**
(`S3_BUCKET`, default `esti-documents`) if it does not exist. The Python worker
creates the bucket on first upload as a fallback. PDF generation and drawing
uploads therefore work on a fresh stack without a separate MinIO init step.

To generate a new migration after changing `backend/src/db/schema.ts`:

```bash
podman exec esti-backend sh -lc "cd /app/esti/backend && pnpm db:generate"
# commit the new files in backend/drizzle/
```

---

## 5. Production checklist

Full VPS operator checklist: **[docs/esti/PRODUCTION-OPS.md](docs/esti/PRODUCTION-OPS.md)**.

Summary before exposing a live firm instance:

- [ ] Set a strong `SESSION_SECRET`, DB and object-store passwords in `.env`.
- [ ] Enable TLS — host nginx + Certbot; `COOKIE_SECURE=true`; `ALLOWED_ORIGINS=https://your-domain`.
- [ ] Point `S3_PUBLIC_ENDPOINT` at a real, TLS-served object-store host.
- [ ] Put the API and SPA behind your domain; restrict Postgres/Redis/MinIO to internal network.
- [ ] Take a backup before go-live (`deploy/backup.sh`); rehearse `deploy/restore.sh` on a staging clone.
- [ ] Rate limiting and upload validation are built in; review limits in `backend/src/index.ts`.

VPS deploy: clone the repo to `/opt/esti`, then `sudo bash deploy/install.sh` and pick a profile (1 landing · 2 demo · 3 Core · 4 Enterprise · 5 Licensing). It sources `deploy/lib.sh` relative to its location, so clone first — it cannot be piped via `curl | bash`. Update later with `bash deploy/update.sh` (profile is remembered in `.env`).

See [ROADMAP](docs/esti/ROADMAP.md#status-at-a-glance) for delivered engineering scope (Phases 0–20).

---

## 6. Resetting data

- **Soft reset (keep firm + owner):** Company → Data tools → **Reset all data**
  (requires the owner password). Wipes all projects, clients, invoices,
  drawings, HR and non-owner logins; keeps the firm profile, owner login and
  DSR reference data.
- **Hard reset (everything, incl. owner):** `podman compose down -v` then
  `up -d --build` and re-seed.

---

## 7. Troubleshooting

- **Can't reach the SPA:** confirm `podman ps` shows `esti-frontend` up and port
  `5173` published.
- **Login/API errors right after boot:** the backend applies migrations on
  startup; give it a few seconds, then check `podman logs esti-backend`.
- **Uploads fail in the browser:** the SPA proxies `/upload`, `/trpc` and
  `/health` to the API — a 404 there usually means the dev proxy/image is stale;
  rebuild the frontend image.
- **Worker jobs stuck:** check `podman logs esti-worker`; failed jobs retry and,
  after `WORKER_MAX_RETRIES`, move to the `esti:jobs:dead` stream.
