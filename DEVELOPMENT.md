# ESTI AORMS — Development

Greenfield monorepo for ESTI, the **Architectural Office Resource Management
System** by Holagundi Consulting Works. See
[docs/esti/ARCHITECTURE.md](docs/esti/ARCHITECTURE.md).

## Layout

```
packages/contracts/   shared TS: money (paise/Indian format), GST systems, FY, Zod schemas
backend/              Fastify + tRPC + Drizzle (PostgreSQL) — system of record
worker/               Python: ezdxf (DXF takeoff), WeasyPrint (PDF), pandas (reconcile)
frontend/             Vite + React + TS + Carbon — the SPA (tRPC, type-safe to backend)
compose.yaml          Podman pod: postgres, redis, minio, backend, worker, frontend
.github/workflows/    ESTI-only CI (TS typecheck/lint/test + Python ruff/pytest)
```

## Quick start (containers)

```bash
cp .env.example .env
podman compose up -d --build
# SPA      → http://localhost:5173
# Backend  → http://localhost:4000/health  ·  tRPC at /trpc
# MinIO    → http://localhost:9001 (console)
```

> On Windows, `podman-compose` doesn't pass the `dockerfile:` path; build the
> images first, then `up`:
> ```sh
> podman build -t esti-backend:dev  -f backend/Dockerfile .
> podman build -t esti-worker:dev   -f worker/Dockerfile.dev .
> podman build -t esti-frontend:dev -f frontend/Dockerfile.dev .
> podman compose -f compose.yaml up -d
> ```
> The backend/frontend mount `src/` from the host, so most code edits are picked
> up live (`podman restart esti-backend` if a change isn't detected) — no rebuild.

## First run (schema + owner)

```sh
# create tables from the Drizzle schema (dev: push, no migration files)
podman exec esti-backend sh -c "cd /app/backend && pnpm exec drizzle-kit push --force"

# seed a known OWNER login (idempotent — safe to re-run)
podman exec esti-backend sh -c "cd /app/backend && pnpm seed"
```

This gives a fresh pod a known login:

| Field    | Default value   | Override env          |
| -------- | --------------- | --------------------- |
| email    | `owner@hcw.in`  | `SEED_OWNER_EMAIL`    |
| password | `ChangeMe123`   | `SEED_OWNER_PASSWORD` |
| name     | `HCW Owner`     | `SEED_OWNER_NAME`     |

```sh
# pick your own credentials:
podman exec -e SEED_OWNER_EMAIL=me@studio.in -e SEED_OWNER_PASSWORD='S3cret!' \
  esti-backend sh -c "cd /app/backend && pnpm seed"
```

> **Dev defaults only** — `ChangeMe123` is not for production. The seed creates
> the first OWNER; auth otherwise bootstraps OWNER from the first registered
> user. In the live bind-mount container (image built before this script was
> added) run it as `pnpm exec tsx src/scripts/seed.ts` instead of `pnpm seed`.

## Quick start (local)

```bash
corepack enable
pnpm install
# infra only:
podman compose up -d db redis minio
pnpm --filter @esti/backend db:generate && pnpm --filter @esti/backend db:migrate
pnpm dev          # backend (:4000) + frontend (:5173) in parallel

# worker:
cd worker && python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt && python -m esti_worker.main
```

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test     # TypeScript
cd worker && ruff check . && pytest          # Python
```

## Conventions

- Money is integer **paise**; format only via `@esti/contracts` (Indian lakh/crore).
- The three GST systems, SAC table, FY (1 Apr–31 Mar), and INR are fixed in
  `@esti/contracts` — see [docs/esti/INDIA-PROFILE.md](docs/esti/INDIA-PROFILE.md).
- Numbering is gap-free per-FY via `nextRef()` — never `MAX(id)+1`.
