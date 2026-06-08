# ESTI — System Architecture Audit

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-08

> Review of the as-built system against the design in [ARCHITECTURE](ARCHITECTURE.md).
> Severity: **P1** (address before production) · **P2** (should) · **P3** (nice).

### Resolved since this audit (2026-06-08)

| Item | Resolution |
| --- | --- |
| **D1** Migrations | Baseline migration committed (`backend/drizzle/`); `runMigrations()` applies pending migrations on boot. `push --force` retired. |
| **R1** Worker retry/DLQ | Failed jobs retried via XAUTOCLAIM reclaim + backoff; poison jobs routed to a dead-letter stream after `worker_max_retries`. |
| **S1** Rate limiting | `@fastify/rate-limit` global (600/min) + uploads (30/min); login throttled per-IP (10/min) and per-email (10/5min) via Redis. |
| **S3** Upload validation | Magic-byte content sniffing for DXF/images/CSV-XLSX; SVG XSS-vector rejection (`lib/filetype.ts`). |
| **O3** Request-ID propagation + `/readyz` | SPA sends `X-Request-Id` per batch; Fastify honours it (falls back to `crypto.randomUUID()`), echoes it in responses, stores it in tRPC context, and threads it into every worker job payload. Worker logs `req=<id>` on each job. `/readyz` probes DB + Redis + MinIO, returns 200/503. |

Still open (next): **D4** backups/restore · **S4** secrets management · **S5** public object-store endpoint + TLS · **A1** cursor pagination · **O2** API integration tests.

## Snapshot

- **Backend** TypeScript / Fastify 4 + tRPC v11 + Drizzle ORM (postgres-js).
- **SPA** React 18 + Vite + Carbon, type-unified with the backend via tRPC.
- **Worker** Python 3.12 — ezdxf (takeoff), WeasyPrint (PDF, 5 doc types via one
  dispatch table), pandas (reconcile); Redis Streams consumer group.
- **Data** PostgreSQL (~40 `esti_*` tables), MinIO (content-addressed artefacts),
  Redis (job bus, sessions implied via cookie+DB).
- **Pod** Podman compose: db · redis · minio · backend · worker · frontend.

## Strengths

- **End-to-end type safety** (tRPC + shared Zod contracts) — no drift between
  SPA and API.
- **Clean language seam** — TS owns the domain; Python does document/data-heavy
  work over a language-neutral Redis job contract. One `_RENDERERS` table now
  produces invoice/payslip/fee/drawing/transmittal PDFs.
- **Four-tier auth** (owner / staff / consultant-portal / client-portal) enforced
  centrally; office procedures are staff-only; portals are row-scoped.
- **Money discipline** — integer paise, Indian formatting, GST rounding; firm GST
  type drives invoices.
- **Gap-free per-FY numbering** via atomic upsert (never MAX+1).
- **Append-only audit log** for status transitions and key mutations.
- **Content-addressed, write-once** drawings/SVG in object storage.

## Findings

### Security
| # | Finding | Sev |
|---|---|---|
| S1 | **No rate limiting** on auth/login or uploads → brute-force / abuse. Add `@fastify/rate-limit`. | P1 |
| S2 | **No CSRF token.** Mitigated by `SameSite=Strict` HttpOnly cookies, but state-changing tRPC mutations over cookies still warrant a double-submit token or `Origin` check. | P2 |
| S3 | **Upload validation is shallow** — extension + size only; no content sniffing / image re-encode. Untrusted DXF parsed by ezdxf should be resource/time-limited (ADR-10 intends sandboxing; verify limits are enforced). | P1 |
| S4 | **Secrets** are compose plaintext (`SESSION_SECRET`, MinIO creds, DB). Move to env files / secrets for prod; rotate the dev defaults. | P1 |
| S5 | **Presigned URLs** are signed for `localhost:9000` (S3_PUBLIC_ENDPOINT). Correct for dev; production needs a real public endpoint + TLS, and consider proxying downloads through the API for auth. | P2 |
| S6 | Argon2id ✅, HttpOnly/Secure/SameSite cookie ✅, disabled-account enforcement ✅, **no TOTP MFA yet** (ADR-04 optional). | P3 |

### Data & integrity
| # | Finding | Sev |
|---|---|---|
| D1 | **No migration history** — dev uses `drizzle-kit push --force`. Generate and commit versioned migrations before any real data exists; `--force` is destructive. | P1 |
| D2 | **Cascade delete is manual** (project remove deletes ~15 child tables in a tx). Robust but brittle as tables are added — prefer DB `ON DELETE CASCADE` FKs (or a documented checklist + test). | P2 |
| D3 | **No soft-delete / retention** — deletes are hard. For an audit-oriented office, consider soft-delete or an archival copy for invoices/approvals/transmittals. | P2 |
| D4 | **Backups** — Postgres + object store backup/restore is release-blocking (ADR-11) and not yet wired. | P1 |
| D5 | Some FKs reference `created_by`/`actor` as bare `uuid` (no FK) — acceptable, but document the intent. | P3 |

### Reliability / worker
| # | Finding | Sev |
|---|---|---|
| R1 | **No job retry / dead-letter** — a failed `render_pdf`/`dxf` is ack'd and the row marked FAILED with no automatic retry or DLQ; pending claims aren't reclaimed via `XAUTOCLAIM`. Add retry-with-backoff + a poison queue. | P1 |
| R2 | **No idempotency key** on jobs — a duplicated enqueue re-renders; harmless for PDFs (overwrite) but worth a guard. | P3 |
| R3 | **Single worker** — fine; the consumer-group design scales horizontally. Document the scaling story + resource limits. | P3 |

### API / performance
| # | Finding | Sev |
|---|---|---|
| A1 | **List endpoints unbounded in practice** — UI fetches 50–200 with no pagination; large offices will degrade. Enforce server caps + cursor pagination. | P2 |
| A2 | **Per-row N+1** in a few cells (e.g. each PDF/issue cell runs its own `byId` poll). Acceptable at small scale; batch or push status via SSE later. | P3 |
| A3 | **No request rate/size limits** beyond multipart file cap. Add global body limits. | P2 |
| A4 | **No SSE/websocket** — worker completion is polled (1.5–2 s). Fine; an SSE channel would cut latency and load. | P3 |

### Build / ops
| # | Finding | Sev |
|---|---|---|
| O1 | **Dev image churn** — adding an npm/py dep requires an image rebuild + lockfile refresh; `vite.config`/`package.json` aren't bind-mounted so config changes need a rebuild or `podman cp`. Document this; consider mounting config in dev. | P2 |
| O2 | **CI** runs typecheck + eslint + vitest (TS) and ruff + pytest (worker) ✅. Coverage is thin (money/tax/COA + worker helpers). Add API integration tests (supertest against a test DB) and a Vite build smoke test (catches CSS/asset-resolution errors that typecheck misses). | P2 |
| O3 | **Observability** — structured logs exist; no request-ID propagation SPA→backend→worker, no metrics/health dashboards (ADR-11). Add request IDs + `/readyz`. | P2 |
| O4 | **No bundle code-splitting** — the SPA loads everything; lazy-load the drawing viewer and heavy routes. | P3 |

## Top recommendations (in order)
1. **Migrations** (D1) + **backups/restore** (D4) — the two release blockers.
2. **Worker retry + dead-letter + XAUTOCLAIM** (R1).
3. **Rate limiting** (S1) and **hardened upload validation / sandbox limits** (S3).
4. **Secrets management** for production (S4); real public object-store endpoint + TLS (S5).
5. **Cursor pagination + server caps** (A1); **request-ID propagation + /readyz** (O3).
6. **API integration tests + build smoke test in CI** (O2); convert manual cascade to FK `ON DELETE CASCADE` (D2).

None of these block the current single-architect/studio usage in the dev pod;
they are the gap list between "feature-complete prototype" and "production".
