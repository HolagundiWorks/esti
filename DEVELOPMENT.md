# AORMS — Development

Greenfield monorepo for AORMS, the **Architecture Office Resource Management
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

> All dev images build from the **repo root** — `@hcw/aorms-ai-kit` is vendored
> under `vendor/`, so no sibling repos are needed. On Windows:
> ```sh
> ./scripts/build-dev-images.ps1
> podman compose -f compose.yaml up -d
> ```
> Or manually (build context is the repo root — kits are vendored under `vendor/`):
> ```sh
> podman build -t localhost/esti-backend:dev  -f backend/Dockerfile .
> podman build -t localhost/esti-worker:dev   -f worker/Dockerfile.dev .
> podman build -t localhost/esti-frontend:dev -f frontend/Dockerfile.dev .
> podman compose -f compose.yaml up -d
> ```
> The backend/frontend mount `src/` from the host, so most code edits are picked
> up live (`podman restart esti-backend` if a change isn't detected) — no rebuild.

## First run (schema + owner)

```sh
# apply pending SQL migrations (preferred — matches CI/production)
podman exec esti-backend sh -c "cd /app/esti/backend && pnpm db:migrate"

# seed a known OWNER login (idempotent — safe to re-run)
podman exec esti-backend sh -c "cd /app/esti/backend && pnpm seed"
```

After adding new migration files under `backend/drizzle/`, re-run `pnpm db:migrate`
inside `esti-backend` (the dev compose file bind-mounts that folder). If the
container predates a migration, copy it in or restart compose so the mount is
active, then migrate again.

> **Dev-only escape hatch:** `drizzle-kit push --force` can sync schema without
> migration history — use only for throwaway local DBs, not shared or production
> databases.

This gives a fresh pod a known login:

| Field    | Default value   | Override env          |
| -------- | --------------- | --------------------- |
| email    | `owner@hcw.in`  | `SEED_OWNER_EMAIL`    |
| password | `ChangeMe123`   | `SEED_OWNER_PASSWORD` |
| name     | `HCW Owner`     | `SEED_OWNER_NAME`     |

```sh
# pick your own credentials:
podman exec -e SEED_OWNER_EMAIL=me@studio.in -e SEED_OWNER_PASSWORD='S3cret!' \
  esti-backend sh -c "cd /app/esti/backend && pnpm seed"
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
pnpm --filter @esti/backend test:api-smoke   # Production API smoke (Phase 12)
```

## Production VPS

Self-host deploy scripts live under `deploy/`. Operator checklist:
[docs/esti/PRODUCTION-OPS.md](docs/esti/PRODUCTION-OPS.md). Delivery status:
[docs/esti/ROADMAP.md](docs/esti/ROADMAP.md) (Phases 0–20 complete; operator gate in PRODUCTION-OPS).

## Conventions

- Money is integer **paise**; format only via `@esti/contracts` (Indian lakh/crore).
- The three GST systems, SAC table, FY (1 Apr–31 Mar), and INR are fixed in
  `@esti/contracts` — see [docs/esti/INDIA-PROFILE.md](docs/esti/INDIA-PROFILE.md).
- Numbering is gap-free per-FY via `nextRef()` — never `MAX(id)+1`.
