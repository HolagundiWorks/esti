# ESTI System Architecture

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-07

> _Part of the [ESTI documentation set](README.md). Canonical source for the
> system architecture, technology stack, and architecture decision records
> (ADRs). Product scope is in [PRODUCT-VISION](PRODUCT-VISION.md); modules in
> [ARCHITECT-PROFILE](ARCHITECT-PROFILE.md); fixed India rules in
> [INDIA-PROFILE](INDIA-PROFILE.md)._

## Overview

ESTI is **greenfield, single-firm** software for one Indian architecture
practice. ESTI owns its entire schema and logic.

The system is a **hybrid**: a TypeScript core for the application and UI (where
end-to-end type safety matters most), and a focused **Python worker** for the
document- and data-heavy work where Python's libraries are strongest.

```
                 ┌────────────────────────────────────────────┐
   Browser  ───▶ │  ESTI Web SPA  (React + TypeScript + Carbon)│
                 └──────────────┬─────────────────────────────┘
                   tRPC (typed) │  + REST for uploads / exports
                                ▼
                 ┌────────────────────────────────────────────┐
                 │  ESTI Backend  (TypeScript / Fastify)        │  ◀── system of record
                 │  auth · authz (row-level) · domain · state   │
                 │  machines · numbering · money/tax · audit    │
                 └───┬───────────────┬───────────────┬─────────┘
                     │ Drizzle ORM   │ Redis Streams │ object store
                     ▼               ▼ (job bus)     ▼
              ┌───────────┐   ┌──────────────┐  ┌──────────────┐
              │ PostgreSQL│   │ Python worker│  │ Object store │
              │ (system   │   │ ezdxf · Weasy│  │ (MinIO / S3) │
              │ of record)│   │ Print·pandas │  │ drawings·PDF │
              └───────────┘   └──────┬───────┘  └──────────────┘
              ┌───────────┐          │ reads job, writes artefact + status
              │   Redis   │◀─────────┘
              │ queue ·   │
              │ sessions ·│
              │ cache     │
              └───────────┘
```

## Architecture Decision Records

### ADR-01 — Greenfield, original software

ESTI is original software owned by HCW. The TypeScript/Fastify service owns the
entire PostgreSQL schema — clients, users, documents, invoices, and the
architect domain. DSR/SOR reference data is loaded into ESTI tables. A single
datastore means no anti-corruption adapter and no cross-store transactions.

### ADR-02 — Hybrid stack: TypeScript core + Python worker

- **TypeScript / Fastify** backend is the system of record and owns all domain
  logic, auth, money/tax, numbering, and state machines.
- **React + TypeScript** SPA is the only UI, type-unified with the backend via
  **tRPC** (shared Zod schemas; no hand-maintained API types).
- A **Python worker** handles DXF takeoff (`ezdxf`), PDF generation
  (`WeasyPrint`/`ReportLab`), and reconciliation imports (`pandas`/`openpyxl`).
  The language boundary is a clean service seam — see ADR-10.

### ADR-03 — Single firm, single tenant

One firm only. No tenant column, no multi-company paths. India profile constants
are hardcoded — see [INDIA-PROFILE](INDIA-PROFILE.md).

### ADR-04 — ESTI owns authentication and authorization (four tiers)

Argon2id password hashing → HttpOnly, Secure, SameSite=Strict session cookie.
Four access tiers, all enforced centrally in the backend:

- **Owner** — full office access; the first registered user bootstraps as owner.
- **Internal staff** — `CONSULTANT` role **without** a linked consultant record;
  full office access.
- **Collaborating consultant** — `CONSULTANT` role **linked to a consultant
  record** (`users.consultant_id`); a project-scoped read-only portal limited to
  engaged projects.
- **Client** — `CLIENT` role linked to a client record (`users.client_id`); a
  read-only portal for their own projects.

`protectedProcedure` is staff-only (rejects both portal types); `clientProcedure`
and `collaboratorProcedure` gate the two portals. Owner-provisioned logins
(email + password) replace the earlier magic-link idea. Optional TOTP MFA and
per-partner/team logins land with Phase 8. Partner and team-member profiles tie
to user accounts.

### ADR-12 — Configurable firm profile + feature toggles

Earlier builds hardcoded a `FIRM_PROFILE` constant; the firm profile is now an
**editable single-firm record** (`esti_firm` + `esti_partner`): name, address,
logo, Solo|Partnership type, partners, and the **GST type (NA | Composition |
Regular) + GSTIN**, which is the single source that drives invoice GST behaviour
(supersedes the hardcoded active-system constant). Optional capabilities are
gated by flags in `esti_orgsettings` (e.g. the Team & HR module); write paths for
a disabled module are rejected server-side, not merely hidden. India profile
**tax rules and rates** remain fixed in code per ADR-07 — only the firm's
*selection* among them is configurable.

### ADR-05 — Money and rounding

Money is computed in integer paise (fixed-scale decimal), never floating point.
A single module owns arithmetic, Indian-format display (lakh/crore), and **GST
rounding to the nearest rupee per invoice, half-up**.

### ADR-06 — Concurrency-safe numbering

Fee proposals, invoices, bills of supply, and drawing revisions get **gap-free,
per-financial-year sequences** via a Postgres sequence / `SELECT … FOR UPDATE`,
never `MAX(id)+1`. Financial year is 1 Apr–31 Mar.

### ADR-07 — Fixed, code-level tax configuration

The three GST systems and the SAC table from [INDIA-PROFILE](INDIA-PROFILE.md)
are encoded as fixed enums/constants, selected by the firm's single active
system. Rates are not user-editable. Tax computation is server-side and
deterministic; the COA fee scale is data-driven and effective-dated.

### ADR-08 — Transactional integrity in one database

All domain writes are single PostgreSQL transactions. With no second datastore,
there is no distributed-transaction or outbox problem; cross-table operations
(takeoff → fee line, phase → invoice) commit atomically.

### ADR-09 — Append-only audit and explicit state machines

Every status transition, drawing issue, approval, and invoice finalization
writes an **append-only audit record** (actor, timestamp, before/after). Phase,
fee-proposal, permit, and invoice lifecycles are **explicit transition tables**
with a single guard; illegal transitions are rejected centrally.

### ADR-10 — Cross-language job bus; sandboxed Python worker

The TS backend enqueues jobs on **Redis Streams** with a language-neutral JSON
contract; the Python worker consumes (consumer group), processes, writes the
artefact to object storage and a status row to Postgres, and the SPA
polls/subscribes for completion. The worker runs **resource-limited and
sandboxed** (untrusted DXF/PDF parsing) with file size/type/time limits.
Drawings are **content-addressed, write-once** in object storage; the file hash
is the storage and cache key.

### ADR-11 — Observability, backups, CI, licensing

Request-ID propagation SPA→backend→worker; health/readiness per service;
structured logs. **Postgres + object-store backups with tested restore** are
release-blocking. CI: typecheck, lint, unit tests for money/tax/numbering/state
machines (TS) and the worker (Python). ESTI is original software; **HCW chooses
its license** — see [LICENSE-NOTICE](LICENSE-NOTICE.md).

## Backend (TypeScript / Fastify)

```
Fastify 4 + TypeScript      HTTP + tRPC server
tRPC                        typed SPA↔backend contract (data)
REST                        uploads (multipart) + exports (CSV/PDF)
Drizzle ORM                 PostgreSQL schema (esti_* tables)
ioredis + Redis Streams     job bus to the Python worker; sessions; cache
Argon2 + jose               auth (password hash, session/JWT)
Zod                         validation shared with the SPA
```

Layering: `routes (tRPC/REST) → application services → domain (entities, state
machines, money/tax) → repositories (Drizzle)`. Cross-cutting: auth, row-level
authz, audit, request-id, error envelope.

Data ownership: a single **PostgreSQL** database holds all ESTI tables —
clients, consultants, users + sessions, projects, phases, fee proposals,
invoices/bills, permits, bylaws, drawings/revisions, approvals, collaborators,
takeoff, reconcile, DSR/SOR reference, audit, and numbering sequences. Document
binaries live in object storage; the DB holds their metadata + content hash.

## Frontend (React + TypeScript SPA)

```
React 18 + TypeScript + Vite
@carbon/react · @carbon/icons-react · @carbon/charts-react
@tanstack/react-query        server state
tRPC client                  typed calls to the backend
zustand                      local UI state
react-router-dom             routing
react-hook-form + zod        forms (Zod shared with backend)
dayjs · pdfjs-dist           dates · in-browser PDF for takeoff
```

- **Code-split by route**; load viewer/takeoff and charts only on their routes.
- **Client portal is a separate, lightweight bundle** (no DXF engine).
- All currency via the shared Indian-format money module; no ad-hoc formatting.
- Light theme (`g10`) first; dark (`g90`) later. See
  [CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md).

## Python Worker

```
Python 3.12
ezdxf            DXF parse → SVG + bounds/layers (best-in-class)
WeasyPrint /     GST invoice & bill-of-supply PDFs (HTML→PDF), drawing watermarks
  ReportLab
pandas/openpyxl  26AS / AIS / bank-statement / GSTR import + matching
redis            consume the job bus (consumer group)
psycopg          write job status / reconciliation results to Postgres
boto3/minio      read/write artefacts in object storage
```

Stateless, horizontally scalable, sandboxed. Owns nothing authoritative beyond
the artefacts and reconciliation rows it produces; the TS backend remains the
system of record.

## Podman Pod (target)

| Container | Image | Purpose |
|---|---|---|
| `esti-db` | `postgres:16` | system of record |
| `esti-redis` | `redis:7` | job bus · sessions · cache |
| `esti-backend` | Node 20 (TS, custom) | Fastify + tRPC |
| `esti-worker` | Python 3.12 (custom) | DXF / PDF / reconciliation |
| `esti-frontend` | Node 20 (Vite, custom) | Carbon React SPA (dev) |
| `esti-minio` | MinIO (S3 in prod) | document object storage |

The reverse proxy exposes only the backend (and the SPA in dev). The pod is
defined in `compose.yaml` (run instructions in `DEVELOPMENT.md`).

## Repository Layout

```
esti/
  backend/            TypeScript service (Fastify, tRPC, Drizzle, auth, money, tax)
  frontend/           Carbon React + TypeScript SPA (Vite)
  worker/             Python worker (ezdxf, WeasyPrint, pandas)
  packages/contracts/ shared tRPC router types + Zod schemas
  compose.yaml        Podman pod (postgres, redis, backend, worker, frontend, minio)
  docs/esti/          this documentation set
```
