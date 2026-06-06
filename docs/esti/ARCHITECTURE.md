# ESTI System Architecture

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-06

> _Part of the [ESTI documentation set](README.md). Canonical source for the
> system architecture, the technology stack, and the architecture decision
> records (ADRs). Product scope is in [PRODUCT-VISION](PRODUCT-VISION.md);
> modules in [ARCHITECT-PROFILE](ARCHITECT-PROFILE.md); fixed India rules in
> [INDIA-PROFILE](INDIA-PROFILE.md)._

## Overview

ESTI is a single-firm architecture-practice platform. The **system of record is
an ESTI TypeScript service**; Dolibarr is retained as a **data backbone**,
stripped to the bare minimum, for the things it does well: GST invoicing
(`facture`), third parties (`societe`), users, and document storage (`ecm`).

```
                 ┌────────────────────────────────────────────┐
   Browser  ───▶ │  ESTI Web SPA  (React + TypeScript + Carbon)│
                 └──────────────┬─────────────────────────────┘
                   tRPC (typed) │  + REST for uploads/exports
                                ▼
                 ┌────────────────────────────────────────────┐
                 │  ESTI Backend Service  (TypeScript / Fastify)│  ◀── system of record
                 │  auth · authz (row-level) · domain · state   │
                 │  machines · numbering · money/tax · audit ·  │
                 │  anti-corruption adapter · job workers       │
                 └───┬───────────────┬───────────────┬─────────┘
                     │ ORM           │ REST          │ jobs
                     ▼               ▼               ▼
              ┌───────────┐   ┌─────────────┐  ┌──────────────┐
              │ llx_esti_*│   │  Dolibarr   │  │ Viewer worker│
              │ (MariaDB) │   │  (API-only) │  │ DXF→SVG, PDF │
              └───────────┘   │ facture/    │  │ watermark    │
              ┌───────────┐   │ societe/ecm │  └──────┬───────┘
              │   Redis   │   └─────────────┘         ▼
              │ queue/    │                    ┌──────────────┐
              │ sessions/ │                    │ Object store │
              │ cache     │                    │ (MinIO/S3)   │
              └───────────┘                    └──────────────┘
```

Single MariaDB instance holds both ESTI's `llx_esti_*` tables and Dolibarr's
`llx_*` tables, so the ESTI service can transact across its own domain in one
database; Dolibarr is reached over REST for invoice/third-party/document
operations that need its business logic.

## Architecture Decision Records

### ADR-01 — ESTI TypeScript service is the system of record; Dolibarr is data-only

Domain logic (projects, phases, fee proposals, permits, drawings, takeoff,
reconcile) lives in an ESTI TypeScript/Fastify service with its own `llx_esti_*`
tables. Dolibarr is **not** an application framework here — it is retained only
for `facture` (GST invoices, numbering, PDF, accounting), `societe` (clients,
consultants, suppliers), `user`, and `ecm` (document storage). This supersedes
the earlier "ESTI PHP CommonObject modules" direction. The legacy `esti_dsrsor`
PHP module remains as a read-only reference engine until ported or fronted by
the service.

### ADR-02 — Carbon React + TypeScript SPA is the sole UI

`@carbon/react` v11 is the only component library (icons `@carbon/icons-react`,
charts `@carbon/charts-react`). The UI is a standalone Vite SPA in TypeScript.
See [CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md) for the design language.

### ADR-03 — Single firm, single tenant

One firm only. Dolibarr `entity` is fixed to `1`; no `fk_firm`, no multi-company
code paths. India profile constants are hardcoded — see
[INDIA-PROFILE](INDIA-PROFILE.md).

### ADR-04 — ESTI owns authentication and authorization

The Dolibarr API key never reaches the browser; the backend holds one Dolibarr
service credential. ESTI issues its own sessions:

- **Owner (principal architect):** username + password (Argon2id) → HttpOnly,
  Secure, SameSite=Strict session cookie, short TTL + refresh; **optional TOTP MFA**.
- **Consultants:** same login, **row-level scoped** to assigned projects.
- **Clients:** passwordless **magic-link** (or per-project expiring share token),
  read-only portal.
- **Authorization is enforced in the ESTI service** (role + row-level). Dolibarr
  permissions are never relied on for portal/consultant scoping.

### ADR-05 — Money and rounding

All money is computed in integer paise (or a fixed-scale decimal), never
floating point. A single money module owns arithmetic, Indian-format display
(lakh/crore), and **GST rounding to the nearest rupee per invoice, half-up**.

### ADR-06 — Concurrency-safe numbering

Fee proposals, invoices, bills of supply, and drawing revisions get **gap-free,
per-financial-year sequences** via DB sequence / row-lock — never `MAX(id)+1`.
Invoice series must be gap-free for GST compliance. Financial year is 1 Apr–31 Mar.

### ADR-07 — Fixed, code-level tax configuration

The three GST systems and the SAC table from [INDIA-PROFILE](INDIA-PROFILE.md)
are encoded as fixed enums/constants, selected by the firm's single active
system. Rates are not user-editable. Tax computation is server-side and
deterministic; the COA fee scale is data-driven and effective-dated.

### ADR-08 — Transactional integrity; no SPA-orchestrated dual writes

Operations that touch multiple tables (e.g. takeoff → fee-proposal line, phase →
invoice) are **one backend endpoint** wrapped in a single DB transaction over
the `llx_esti_*` tables. Crossing into Dolibarr (invoice issuance via REST) uses
an **outbox + idempotency key**, not a second write orchestrated by the SPA.

### ADR-09 — Anti-corruption layer over Dolibarr

Dolibarr field names (`tva_tx`, `localtax1/2`, `socid`) never reach the SPA. One
adapter in the backend maps Dolibarr storage ↔ ESTI domain (GST/CGST/SGST,
client, etc.). An upstream Dolibarr schema change touches this adapter only.

### ADR-10 — Drawings: async conversion, object storage, immutable revisions

DXF→SVG and PDF raster/watermark run as **async jobs** (Redis-backed queue),
returning a job id; the SPA polls/subscribes for the cached artefact. The
converter runs in a **resource-limited, sandboxed** worker with file
size/type/time limits (untrusted-file parsing surface). Drawings are stored in
**content-addressed object storage** (MinIO/S3) as **write-once revisions**;
the file hash is the storage key and the viewer cache key.

### ADR-11 — Append-only audit and explicit state machines

Every status transition, drawing issue, approval, and invoice finalization
writes an **append-only audit record** (actor, timestamp, before/after).
Phase, fee-proposal, permit, and invoice lifecycles are **explicit transition
tables** with a single guard; illegal transitions are rejected centrally.

### ADR-12 — Observability, backups, ESTI-only CI

Request-ID propagation SPA→backend→Dolibarr→worker; health/readiness per
service; structured logs. **DB + object-store backups with tested restore** are
release-blocking. CI covers **ESTI only** (no upstream Dolibarr CI): typecheck,
lint, unit tests for money/tax/numbering/state machines, and a smoke test
asserting stripped Dolibarr routes stay blocked.

## Backend Service (TypeScript / Fastify)

```
Fastify 4 + TypeScript          HTTP + tRPC server
tRPC                            typed SPA↔service contract (data)
REST endpoints                  uploads (multipart) + exports (CSV/PDF)
Drizzle ORM (or Prisma)         llx_esti_* on MariaDB
BullMQ + Redis                  job queue (viewer, watermark, reconcile imports)
Argon2 + jose                   auth (password hash, JWT/session)
Zod                             shared validation (also used by the SPA)
Dolibarr REST client            facture / societe / ecm, behind the ACL adapter
```

Layering: `routes (tRPC/REST) → application services → domain (entities, state
machines, money/tax) → repositories (ORM) / Dolibarr adapter`. Cross-cutting:
auth middleware, row-level authz, audit, request-id, error envelope.

Data ownership:
- **ESTI owns** `llx_esti_*`: projects, phases, fee proposals, permits, bylaws,
  drawings/revisions, approvals, collaborators, takeoff, reconcile, audit,
  numbering sequences, users + sessions.
- **Dolibarr owns** `facture/facturedet` (invoices), `societe` (third parties),
  `ecm` (document files), `user` (one service account for ESTI→Dolibarr calls).

## Frontend (React + TypeScript SPA)

```
React 18 + TypeScript + Vite
@carbon/react · @carbon/icons-react · @carbon/charts-react
@tanstack/react-query        server state
tRPC client                  typed calls to the backend
zustand                      local UI state (modals, selection, active tool)
react-router-dom             routing
react-hook-form + zod        forms (Zod schemas shared with backend)
dayjs · pdfjs-dist           dates · in-browser PDF for takeoff
```

- **Code-split by route** (`React.lazy`); load the viewer/takeoff and charts only
  on their routes.
- **Client portal is a separate, lightweight bundle** (no DXF/takeoff engine).
- All currency via the shared Indian-format money module; no ad-hoc formatting.
- Light theme (`g10`) first; dark (`g90`) toggle later.

## Viewer Worker

Node + TypeScript worker (can run in the backend container or its own): consumes
DXF→SVG, PDF-rasterise, and watermark jobs; parses in a sandbox with limits;
writes artefacts to object storage keyed by file hash; never blocks an HTTP
request. `dxf` (MIT) for DXF→SVG; `pdfjs-dist` (Apache-2.0) for PDF; both
isolated from the request path.

## Podman Pod (target)

| Container | Image | Purpose |
|---|---|---|
| `esti-db` | `mariadb:10.11` | ESTI + Dolibarr schemas |
| `esti-redis` | `redis:7` | queue · sessions · cache |
| `esti-dolibarr` | Dolibarr (pinned 19.x, API-only) | facture / societe / ecm |
| `esti-backend` | Node 20 (TS, custom) | Fastify + tRPC + job workers |
| `esti-frontend` | Node 20 (Vite, custom) | Carbon React SPA (dev) |
| `esti-minio` | MinIO (or S3 in prod) | document object storage |

Reverse proxy exposes only the ESTI backend (and the SPA in dev). Dolibarr is
**not** reachable from the browser — only the backend calls it, over the pod
network. Extends the current `containers/` runtime
([PODMAN-RUNTIME](PODMAN-RUNTIME.md) covers the current dev stack).

## Repository Layout (target)

```
esti/
  backend/            ESTI TypeScript service (Fastify, tRPC, ORM, workers)
    src/ { routes, services, domain, repos, dolibarr, jobs, auth, money, tax }
  frontend/           Carbon React + TypeScript SPA (Vite)
    src/ { api, layouts, modules, store, utils, constants }
  containers/         Podman pod (db, redis, dolibarr, backend, frontend, minio)
  htdocs/             Dolibarr, stripped to bare minimum (facture/societe/ecm)
  docs/esti/          this documentation set
```

## Dolibarr Strip Target

Dolibarr is reduced to: `facture`/`facturedet`, `societe`, `user`, `ecm`, the
REST API, and their hard dependencies. Everything else is removed or disabled
per [BACKEND-PROFILE](BACKEND-PROFILE.md). All Dolibarr web UI routes are blocked
at the proxy; only the ESTI backend talks to it.
