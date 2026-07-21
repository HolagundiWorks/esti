# AORMS System Architecture

**Status:** Canonical · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-07-10

> **Scope:** This describes **AORMS-Studio** — the workspace shipped from this
> monorepo. Platform north-star: [AORMS-DEVELOPMENT-SPEC.md](AORMS-DEVELOPMENT-SPEC.md).
> Naming: [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md).

## System Shape

**AORMS-Studio** is a single-firm, India-first application:

```text
Carbon React SPA
       |
       | tRPC + restricted REST uploads/downloads
       v
Fastify/TypeScript backend ---- PostgreSQL (system of record)
       |        |
       |        +---- MinIO/S3 (content-addressed binaries)
       |
       +---- Redis Streams ---- Python worker (DXF, PDF, imports)
```

Every client is a browser — there are no desktop or companion clients
(ESTICAD retired 2026-07-19).

The TypeScript backend owns domain rules, authorization, state transitions,
money/tax, numbering, audit, and activity. The Python worker owns no
authoritative business state.

The same authority boundary applies to the AORMS cognition engine:
deterministic TypeScript read models calculate office health and interventions,
Python may later recognise anomalies or predictions, and LLMs only explain
structured machine output. See [COGNITION-ENGINE](COGNITION-ENGINE.md).

## Repository

One monorepo (pnpm workspaces); surfaces are build targets, not repos.

- `packages/contracts`: shared Zod schemas, permissions, money, tax, labels, and
  the PURE estimation engine (`.aormsest` `EstimateFile` + `recostEstimate`, BBS).
  Browser-safe — the seam every surface imports.
- `backend`: Fastify, tRPC, Drizzle, PostgreSQL domain modules and REST routes.
- `frontend`: React/Vite SPA on HCW-UI-Kit (MUI), including the landing page.
- `worker`: Redis consumer for DXF, PDF, and reconciliation processing.
- `ese`: the Estimation Specification Engine — its own Fastify service that turns
  the CPWD schedule into sealed Rate Library Packs (deploys at `ese.aorms.in`).
- `docs/esti`: canonical product and engineering documentation.

> **Web-only (2026-07-19).** AORMS ships no desktop application. The former
> `desktop/` Tauri shell and the planned standalone `estimate/` app are both
> retired — see [PLANS-AND-TIERS](PLANS-AND-TIERS.md).

### Surfaces And Access Topology

Estimation is accessed **inside a project (Cost Management)** of the
workspace — same session, nav, permissions, and Carbon shell — not a subdomain.
**ESE** is the one true subdomain (`ese.aorms.in`): different users (`kbteam`),
different cadence (yearly SR), publishing into the system across a versioned,
checksummed seam. **Estimating itself runs in the browser** as part of Cost
Management (rate books + BOQ estimates) — there is no desktop estimator and no
`.aormsest` interchange file. Full topology, the
subdomain-vs-extension test, and the shared seams:
[MONOREPO-AND-SURFACES](MONOREPO-AND-SURFACES.md).

## Architecture Decisions

### Single Firm, Explicit Scope

One installation represents one firm. Portal records are scoped to the firm's
projects; there is no tenant column. A future hosted multi-tenant product would
require a separate architecture decision and migration.

### Hybrid TypeScript And Python

TypeScript is authoritative. Python is used where its document/data libraries
are stronger. Jobs use versioned JSON payloads, request IDs, idempotency keys,
retry/backoff, dead-letter handling, and resource limits.

### Authorization

Authentication uses Argon2id passwords and secure cookie sessions. Internal
roles use capability checks from `packages/contracts/src/permissions.ts`.
Client, consultant, and contractor portal procedures enforce row-level scope.
See [ACCESS-HIERARCHY](ACCESS-HIERARCHY.md) for the L1–L5 ladder and four enforcement layers.

Email is the login handle and has one canonical form: **trim + lowercase**
(`normalizeEmail`, `backend/src/lib/email.ts`). Every account-creating path
(`users.createStaff`, `consultants.createLogin`, `clients.createPortalUser`,
`auth.register`/`bootstrap`, the owner seed) normalizes before insert, and every
lookup/uniqueness check compares case-insensitively via `emailMatches`
(`lower(email) = <normalized>` — not `ilike`, so `_`/`%` in an address are never
treated as wildcards). This keeps a hand-created login from being un-loginnable
or silently duplicated by case, and still matches legacy rows stored mixed-case.

The same policy applies to tRPC, REST upload/download routes, worker artifact
access, exports, and search. “Authenticated” alone is never sufficient for an
operational write.

### Audit And Activity

- Audit is append-only and records actor, action, entity, before/after, timestamp.
- Activity is append-only, project/object scoped, visibility-filtered, and used
  by timelines and the Activity Center.
- Significant writes create audit/activity in the same database transaction as
  the domain mutation.
- State machines centrally reject illegal transitions.

### Data And Retention

PostgreSQL is authoritative. Object binaries are content-addressed and treated
as immutable; versions create new objects. User-facing deletion archives by
default. Financial, issued-document, approval, and audit retention rules
prevent casual cascade deletion. Owner purge requires reauthentication,
explicit scope, audit, and backup/export safeguards.

### Money, Tax, And Numbering

Money is integer paise. Shared code owns Indian formatting and GST/TDS
calculation. Numbering is concurrency-safe and per financial year. Rules are in
[INDIA-PROFILE](INDIA-PROFILE.md).

### One Design System — HCW-UI-Kit

The frontend has no competing second design system. It uses `@hcw/ui-kit`
(HCW-UI-Kit — MUI-based, layered: flat/neumorphic/glassmorphism) everywhere,
including the landing page. `@carbon/react` was removed (2026-07). See
[HCW-UI-KIT](HCW-UI-KIT.md).

### Contextual Collaboration

Communication is attached to domain objects through activity and comments. AORMS
does not implement an unrelated general chat service. Portal writes create
normal domain records and pass the same authorization, state, audit, and
notification rules as internal writes.

### AI Boundary

AI providers are accessed through a backend gateway. Retrieval is permission
filtered; prompts and outputs are auditable; secrets stay server-side; sensitive
data transmission is explicit; output remains a draft until a human issues it.

### Companion Clients (ESTICAD) — retired

ESTICAD, the native desktop CAD companion, was **dropped on 2026-07-19** with the
rest of the desktop apps. Removed from the codebase: the `companion` tRPC
namespace, device-token bearer auth (`esti_device_session`), the CAD AI draft
kinds and `ai.generateCad`, drawing scale calibration (`drawings.setScale`), and
the `esticad://` deep links.

Cleanup completed: the legacy `esti_measurement` table and the
`esti_device_session` table were dropped in migration `0211`.

## Operational Requirements

- Versioned Drizzle migrations applied at boot.
- Rate and body-size limits, content sniffing, Origin/CSRF protection.
- Request IDs across SPA, backend, Redis jobs, worker, and logs.
- `/health` for liveness and `/readyz` for DB/Redis/object-store readiness.
- Cursor pagination and server-enforced caps.
- Production secrets, TLS, and authenticated artifact delivery.
- PostgreSQL/object-store backups with tested restoration.
- CI: typecheck, lint, unit tests, API integration tests, worker tests, frontend
  build and browser smoke tests.

## Delivery status

Engineering delivery through [Phase 20](ROADMAP.md) is complete. Open product gaps,
if any, are tracked only in [ROADMAP](ROADMAP.md). This document describes the
stack and ADRs — not the live backlog.
