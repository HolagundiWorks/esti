# ESTI System Architecture

**Status:** Canonical · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-17

## System Shape

ESTI is a single-firm, India-first application:

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

ESTICAD (native Windows CAD, companion client)
       |
       | HTTPS device tokens + companion REST/tRPC adapter
       v
       (same Fastify backend — takeoff measurements, AI gateway)
```

The TypeScript backend owns domain rules, authorization, state transitions,
money/tax, numbering, audit, and activity. The Python worker owns no
authoritative business state. ESTICAD owns local geometry only; takeoff
measurements and CAD AI runs are authoritative in PostgreSQL via the companion
API ([ESTICAD-COMPANION](ESTICAD-COMPANION.md)).

The same authority boundary applies to the AORMS cognition engine:
deterministic TypeScript read models calculate office health and interventions,
Python may later recognise anomalies or predictions, and LLMs only explain
structured machine output. See [COGNITION-ENGINE](COGNITION-ENGINE.md).

## Repository

- `packages/contracts`: shared Zod schemas, permissions, money, tax, labels.
- `backend`: Fastify, tRPC, Drizzle, PostgreSQL domain modules and REST routes.
- `frontend`: React/Vite SPA using the mandatory Pure Carbon policy.
- `worker`: Redis consumer for DXF, PDF, and reconciliation processing.
- `docs/esti`: canonical product and engineering documentation.

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
See [ACCESS-MODEL](ACCESS-MODEL.md) for the L1–L5 ladder and four enforcement layers.

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
default. Financial, issued-document, approval, tender, and audit retention rules
prevent casual cascade deletion. Owner purge requires reauthentication,
explicit scope, audit, and backup/export safeguards.

### Money, Tax, And Numbering

Money is integer paise. Shared code owns Indian formatting and GST/TDS
calculation. Numbering is concurrency-safe and per financial year. Rules are in
[INDIA-PROFILE](INDIA-PROFILE.md).

### Pure Carbon Frontend

The frontend has no second design system. It uses Carbon components and 2x Grid;
only minimal colourless structural CSS is permitted. See
[CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md).

### Contextual Collaboration

Communication is attached to domain objects through activity and comments. ESTI
does not implement an unrelated general chat service. Portal writes create
normal domain records and pass the same authorization, state, audit, and
notification rules as internal writes.

### AI Boundary

AI providers are accessed through a backend gateway. Retrieval is permission
filtered; prompts and outputs are auditable; secrets stay server-side; sensitive
data transmission is explicit; output remains a draft until a human issues it.

ESTICAD uses the same gateway for all CAD AI scenarios ([ESTICAD-COMPANION](ESTICAD-COMPANION.md)); it does not call Ollama locally.

### Companion Clients (ESTICAD)

ESTICAD is a native desktop companion — not a second product database.

- Authentication uses device tokens (bearer), not browser cookies.
- Takeoff requires an active paying firm and staff `write` capability.
- Measurements are stored only in `esti_measurement` with `source: ESTICAD` and world-coordinate geometry; no local measurement persistence in `.esti` files.
- Takeoff catalog is server-published JSON aligned with `packages/contracts/src/takeoff.ts`.
- CAD AI draft kinds extend `AiDraftKind`; runs are recorded in `esti_ai_run` with companion provenance.

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
