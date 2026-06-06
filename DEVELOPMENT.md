# ESTI AORMS — Development

Greenfield monorepo for ESTI, the **Architectural Office Resource Management
System** by Holagundi Consulting Works. No Dolibarr, no PHP. See
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
- The legacy `htdocs/` Dolibarr tree is retired and not part of the build.
