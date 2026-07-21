# EOMS — architecture & integration design

**EOMS — Emergent Object Management System.** The continuously-learning knowledge bank for
the AORMS estate: a **standalone service in its own repository** that ingests, catalogs, and
serves the codified knowledge every AEC practice depends on — standard codebooks, building
compliance, and other compliance codes — so a specific **object** (a clause, a rule, a
definition, a cost code) can be **retrieved on demand over an API**, with its provenance and
edition attached.

- **Status:** Design · **Owner:** Human Centric Works (HCW) · **Companion:** [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md)
- **Repo:** `eoms` (new, separate — *not* the `esti` monorepo)
- **Consumers:** AORMS-Studio, AORMS-Consultancy (both in `esti`), AiADT, Construction OS

---

## 1. Why EOMS is its own system

Today the estate already holds this knowledge — but **scattered, per-deployment, and
un-versioned**:

| Where it lives now | What it holds | Problem |
|---|---|---|
| `esti_compliance_far` / `_setback` / `_nbc` / `_fire` / `_regulation` | FAR, setbacks, NBC clauses, fire rules, bye-laws | Baked into each `esti` deployment; no edition/jurisdiction versioning; every firm re-enters the same public codes |
| `esti_repo_source` / `_section` (Knowledge Bank portal) | Ingested textbooks → rephrased sections | Per-firm library; ingestion (`eoms-repo.ts`) is an in-monorepo helper, not a shared service |
| AiADT `CostCodeMap` (hardcoded CSI MasterFormat) | Cost-code defaults | Compiled into the binary; can't be updated without a release |

The same **public, standard knowledge** (IS/NBC codes, development-control rules, CSI cost
codes) is duplicated across firms, apps, and languages, and none of it is pinned to an
**edition** — which matters because an engineer who relies on "NBC clause X" must be able to
prove *which* edition applied on the date they relied on it. That is the same defensibility
principle the AORMS-Consultancy reliance/sign-off engine enforces, extended to the codes
themselves.

**EOMS** consolidates that public knowledge into one **shared, versioned, continuously-learning
catalog** behind an API. Each consuming app stops storing standards locally and instead
**queries EOMS**, pinned to an edition, with provenance returned for the audit trail.

### The governing boundary — EOMS vs ESTI

> **EOMS is the outside world's catalog. ESTI is what the firm itself knows.**

| | **EOMS** | **ESTI** |
|---|---|---|
| Scope | Cross-firm, **public/standard** knowledge | Per-firm, **private** validated repositories |
| Data | Codebooks, compliance codes, standards | The firm's own engagements, drawings, decisions |
| Tenancy | Shared service, one catalog | Tenant-bound, never leaves the firm boundary |
| Nature | A **retrieval API** over cataloged objects | A **RAG agent** over the firm record |

No firm-private data ever enters EOMS. No un-versioned public standard should live inside a
firm's ESTI library once EOMS exists — ESTI *cites* EOMS objects instead.

---

## 2. Core concept — the "Emergent Object"

An **Object** is the atomic, retrievable unit of the catalog: one clause, rule, definition,
table row, or cost code, extracted from a **Source** and pinned to an **Edition** and a
**Jurisdiction**. Objects are *emergent* because the catalog is continuously learning — as new
sources and editions are ingested, objects are extracted, de-duplicated, cross-linked
(supersedes / references / amends), and refined; the object graph emerges from the corpus
rather than being hand-authored.

```
Source (a codebook / standard / regulation / textbook)
  └── Edition (2016, 2023 amendment 1, …)  — the thing you pin to
        └── Object (a clause / FAR rule / setback rule / fire rule / cost code / definition)
              ├── structured payload (typed by object kind)
              ├── text body (verbatim + a plain-language restatement)
              ├── jurisdiction (national / state / municipal authority)
              ├── provenance (source, edition, page/clause ref, effective + superseded dates)
              ├── relations (supersedes, superseded_by, references, amends)
              └── embedding (for semantic retrieval)
```

**Object kinds** (extensible; the first set maps 1:1 onto what `esti` holds today):

| Kind | Structured payload | Replaces (esti today) |
|---|---|---|
| `CODE_CLAUSE` | clause id, title, requirement, applicability | `esti_compliance_nbc` |
| `FAR_RULE` | zone, plot band, FAR, ground-coverage %, max height | `esti_compliance_far` |
| `SETBACK_RULE` | zone, frontage band, front/rear/side margins | `esti_compliance_setback` |
| `FIRE_RULE` | building type, height band, refuge, staircase width | `esti_compliance_fire` |
| `REGULATION` | authority, ref no, title, summary, link | `esti_compliance_regulation` |
| `COST_CODE` | code (CSI MasterFormat / custom), title, discipline | AiADT `CostCodeMap` |
| `REFERENCE_SECTION` | title, summary, restated body, seq | `esti_repo_section` |

Every object carries the same envelope (provenance, edition, jurisdiction, relations,
embedding) regardless of kind, so retrieval and audit are uniform.

---

## 3. Ingestion — the continuous-learning pipeline

EOMS learns by ingesting sources and re-ingesting new editions. The pipeline is the same
job-oriented shape `esti`'s worker already uses (Redis-stream jobs, retries, DLQ), but it
lives in the `eoms` repo and writes to EOMS's own store.

```
submit source ─▶ CONVERT ─▶ SEGMENT ─▶ EXTRACT ─▶ CATALOG ─▶ EMBED ─▶ REVIEW ─▶ PUBLISH
 (PDF/codebook)  to text     into       typed      de-dup +   vector   human      live to
                 + markdown  sections   objects    cross-link  index    gate       the API
```

1. **CONVERT** — PDF/DWG/codebook → text + markdown (the HCW Markdown Tool pipeline that
   `eoms-repo.ts` already drives; it becomes an EOMS-internal step).
2. **SEGMENT** — split into candidate objects by structure (clause numbering, tables, headings).
3. **EXTRACT** — a model turns each segment into a typed object payload + a verbatim body + a
   plain-language restatement. This is where today's `runEomsRepoProcessing` (rephrase +
   summarise) generalises from "textbook sections" to "typed objects."
4. **CATALOG** — insert/upsert objects; **de-duplicate** against existing objects (same
   clause across editions) and set **relations** (`supersedes`, `amends`, `references`).
5. **EMBED** — compute a vector for semantic retrieval (verbatim + restated + title).
6. **REVIEW** — a human gate (the same publish gate the Knowledge Bank portal has today):
   nothing becomes retrievable-as-truth until a reviewer approves. **Never auto-fake a code.**
7. **PUBLISH** — the object goes live to the read API at a specific edition.

"Continuous learning" = steps 4–5 improve as the corpus grows (better de-dup, richer
cross-links, re-embedding), and new editions re-run the pipeline while preserving history —
old editions stay pinnable.

---

## 4. The API surface

EOMS is consumed by **three languages** (TypeScript in `esti`, Rust in AiADT, Python in
Construction OS), so the contract is **language-neutral HTTP/JSON REST** with an OpenAPI spec.
Read-heavy, cacheable, deterministic.

### Auth & scoping
- **API keys per consuming app** (studio, consultancy, aadt, constructionos), issued by EOMS.
- Scopes: `read` (retrieve/search — every app), `ingest` (submit sources — admin/curation),
  `admin` (publish/relations).
- No tenant/firm identity crosses into EOMS — it serves public knowledge; the caller's firm
  context stays in `esti`.

### Determinism & edition pinning (the audit contract)
- Every object has a stable `id` and an `edition`. Every response echoes
  `{source, edition, jurisdiction, effectiveFrom, supersededOn, objectVersion, retrievedAt}`.
- A query may **pin** an edition (`?edition=NBC-2016`) or an **as-of date**
  (`?asOf=2026-03-01`) so the result is **reproducible** — the same query on the same date
  returns the same object. This is what lets a firm defend "we relied on this code, this
  edition, on this date."
- Retrieval is **idempotent and cacheable**; objects are immutable per (id, edition,
  objectVersion).

### Endpoints (v1 sketch)

| Method + path | Purpose |
|---|---|
| `GET /v1/sources` | List/browse codebooks & standards (filter by jurisdiction, kind) |
| `GET /v1/sources/{id}/editions` | Editions of a source (what you can pin to) |
| `GET /v1/objects/{id}` | Retrieve one object (pinnable via `?edition=` / `?asOf=`) |
| `GET /v1/objects` | Structured query — e.g. `?kind=FAR_RULE&zone=R2&plotAreaSqm=300` |
| `POST /v1/search` | Semantic + structured search ("setback for residential, 12 m frontage") → ranked objects with provenance |
| `GET /v1/cost-codes` | Cost-code catalog (CSI MasterFormat + custom), for takeoff mapping |
| `POST /v1/resolve` | Batch resolve — take a set of keys/queries, return the matching objects (used by AiADT/esti to enrich a takeoff or a compliance check in one round-trip) |
| `POST /v1/ingest/sources` | (ingest scope) Submit a source for the pipeline |
| `GET /v1/ingest/jobs/{id}` | Pipeline status |

Every retrieval response is an **envelope**: `{ object, provenance, relations }`. Search
responses are `{ results: [{ object, provenance, score }], query, asOf }`.

---

## 5. Repository & deployment topology

```
┌────────────────────────── eoms (new repo) ──────────────────────────┐
│  eoms-api        HTTP/JSON service (OpenAPI) — read + ingest         │
│  eoms-worker     ingestion pipeline (convert→extract→catalog→embed)  │
│  eoms-db         Postgres — sources, editions, objects, relations    │
│  eoms-vectors    vector index (pgvector or a sidecar) for search     │
│  packages/eoms-contract   OpenAPI + generated TS/Rust/Py clients     │
└─────────────────────────────────────────────────────────────────────┘
        ▲ HTTP (API key, edition-pinned)      ▲                    ▲
        │                                     │                    │
   ┌────┴─────┐                        ┌──────┴─────┐        ┌─────┴──────┐
   │  esti    │                        │   AiADT    │        │ Construction│
   │ (Studio+ │                        │  (offline) │        │     OS      │
   │ Consult.)│                        │            │        │ (offline)   │
   └──────────┘                        └────────────┘        └─────────────┘
```

- **`eoms` is deployed as a service** (e.g. `eoms.aorms.in` or an internal endpoint). It has
  its own DB and its own release cadence — decoupled from `esti`.
- **The API contract is a shared package** (`packages/eoms-contract`): an OpenAPI document
  plus generated clients for TypeScript, Rust, and Python, so all three consumers speak the
  same types.
- **Offline note:** AiADT and Construction OS run offline/on-prem. They do **not** call EOMS
  from their deterministic cores at runtime. Instead EOMS data is **fetched by a connected
  host and handed in as data** (see §6.2). EOMS is online; the deterministic tools stay pure.

---

## 6. Integration — how each consumer uses EOMS

### 6.1 esti (AORMS-Studio + AORMS-Consultancy) — the primary client

esti's `backend` gains a thin **EOMS client** (`backend/src/lib/eoms/client.ts`) wrapping the
generated contract, with a short-TTL cache keyed by (query, edition/asOf). Two existing
surfaces become clients:

- **Compliance module** (`modules/compliance`, `esti_compliance_*`) → stops being the
  system of record for public codes. The router reads from EOMS (`GET /v1/objects?kind=FAR_RULE…`)
  and keeps only *firm-specific overrides* locally. Migration in §7.
- **Knowledge Bank portal** (`modules/repository`, `esti_repo_*`, `eoms-repo.ts`) → the
  *ingestion of shared standards* moves into EOMS; the portal keeps only the firm's **private**
  references. `runEomsRepoProcessing` retires from `esti` (its logic lives in `eoms-worker`).
- **ESTI (the internal agent)** → its RAG answers now **cite EOMS objects** for code/compliance
  questions. The digest builder (`consultancy-intelligence.ts`) can call EOMS `POST /v1/resolve`
  to attach authoritative code text (with edition + provenance) to an answer — extending the
  "advisory, verify against the register" discipline to "…and here is the exact clause, this
  edition."

The client is a normal backend lib; no schema churn beyond dropping the migrated tables.

### 6.2 AiADT — enrich the deterministic takeoff without breaking it

AiADT's core is offline, std-only, deterministic (same DXF → byte-identical CSV). It must
**not** gain a network dependency. EOMS integrates at the **edges**, as data:

- **Cost codes:** AiADT's hardcoded `CostCodeMap` (CSI MasterFormat) is replaced by a
  **cost-code file** that EOMS emits (`GET /v1/cost-codes` → a versioned JSON/CSV). esti (or a
  build step) fetches it from EOMS and passes it to `aadt takeoff` as config, so the mapping is
  updatable without recompiling the binary — while the takeoff stays deterministic for a given
  cost-code file version.
- **Compliance overlay (later):** after a takeoff, **esti** calls EOMS `POST /v1/resolve` to
  pull the FAR/setback/fire rules relevant to the drawing's zone, and presents a compliance
  check *alongside* AiADT's quantities. AiADT stays a pure geometry/quantity engine; the code
  knowledge is joined in by the connected host.

This mirrors the AiADT↔esti integration seam (process-spawn + file I/O): EOMS data reaches
AiADT the same way — as versioned files handed to a fresh process.

### 6.3 Construction OS — offline, so a snapshot

Construction OS is a single-file offline ERP with a "refuse to fake" rule (it already declines
to invent penalty figures). It consumes EOMS as an **occasional signed snapshot**: when the
contractor is online, the app pulls a pinned edition of the relevant codes/cost-codes and
stores them locally with their provenance; offline, it uses the snapshot and shows *which
edition, fetched when*. It never fabricates a code it doesn't have — same principle, now
backed by a real catalog.

---

## 7. Migration — strangler, not big-bang

esti stays live throughout. Move the system-of-record for public knowledge to EOMS in stages,
dual-reading until cut-over.

- **Stage 0 — stand up EOMS.** New `eoms` repo: API + worker + DB + contract package. Seed the
  catalog by **importing esti's existing rows** (`esti_compliance_*`, published
  `esti_repo_section`s) as the first objects, each tagged with a best-effort edition. EOMS is
  live but nothing depends on it yet.
- **Stage 1 — read-through.** esti's compliance router reads EOMS first, falls back to the
  local tables. Feature-flagged. Compare outputs; fix extraction gaps. No user-visible change.
- **Stage 2 — cut over reads.** esti reads only EOMS for public codes; local `esti_compliance_*`
  tables become read-only firm *overrides* (or are dropped). Knowledge Bank ingestion of shared
  standards moves to EOMS; the portal keeps private firm references.
- **Stage 3 — enrich.** ESTI answers cite EOMS objects; AiADT takes its cost-code file from
  EOMS; Construction OS pulls snapshots. Turn on the compliance overlay on takeoffs.
- **Stage 4 — continuous learning.** New-edition ingestion, cross-linking, and re-embedding run
  on a cadence in `eoms-worker`; the catalog improves without touching the consumers.

Each stage is independently shippable and reversible via the feature flag.

---

## 8. Cross-cutting concerns

- **Provenance is mandatory.** No object is retrievable without source + edition + effective
  date + object version. This is the whole point — a firm must be able to cite exactly what it
  relied on. Ties directly to the AORMS-Consultancy reliance/sign-off defensibility model.
- **Human publish gate.** Extraction is model-assisted; **publishing is a human act.** Nothing
  reaches the read API as truth until reviewed — the same gate the Knowledge Bank portal has
  today. Refuse to fake a code.
- **Caching.** Read responses are immutable per (id, edition, objectVersion) → long-TTL
  cacheable at the esti client and at a CDN/edge. `asOf`/`edition`-pinned queries are the cache
  key.
- **Versioning.** API is `/v1`; objects are versioned; editions are first-class. Superseding an
  edition never mutates or deletes the old one (audit).
- **Determinism for audit.** A pinned query is reproducible. AiADT's takeoff + an EOMS
  cost-code-file version + an edition pin together give a fully reproducible, defensible
  quantity-and-code output.
- **Security.** API keys per app; read is public-knowledge (low sensitivity) but rate-limited;
  ingest/admin scopes are tightly held. EOMS holds no firm-private data, which keeps its blast
  radius small.

---

## 9. Phasing summary

| Phase | Deliverable | Depends on |
|---|---|---|
| **P0** | `eoms` repo scaffold: API + worker + DB + `packages/eoms-contract` (OpenAPI + clients) | — |
| **P1** | Object model + retrieval API (`/objects`, `/search`, `/resolve`); seed from esti rows | P0 |
| **P2** | Ingestion pipeline (convert→extract→catalog→embed→review→publish) in `eoms-worker` | P1 |
| **P3** | esti EOMS client + read-through, then cut over the compliance module | P1 |
| **P4** | Cost-code file for AiADT; ESTI answers cite EOMS objects | P1 |
| **P5** | Compliance overlay on takeoffs; Construction OS snapshots | P3, P4 |
| **P6** | Continuous-learning cadence (new editions, cross-link, re-embed) | P2 |

---

## 10. Open decisions

1. **Vector store** — pgvector inside `eoms-db` (simplest, one Postgres) vs a dedicated index.
   Recommend pgvector for P1; revisit at scale.
2. **Edition identity** — the canonical key format for `edition` (e.g. `NBC-2016`,
   `KMBR-2019-A2`). Needs a small naming standard before seeding.
3. **Jurisdiction model** — national / state / municipal hierarchy vs flat authority tags.
   Affects how FAR/setback objects are keyed.
4. **Extraction model** — the on-prem Ollama path (as ESTI uses) vs a stronger model for the
   one-time extraction step (quality of typed-object extraction matters here).
5. **Cost-code ownership** — does EOMS own the CSI catalog *and* per-firm custom codes, or only
   the standard CSI set (firm-custom staying in esti)? Recommend: standard in EOMS, custom in
   esti, merged at the client.
6. **Hosting** — public `eoms.aorms.in` vs internal-only endpoint reached by the esti backend.
   Affects auth posture and whether AiADT/Construction OS ever call it directly.

---

*This document is a design proposal for a new `eoms` repository. It touches `esti` only as a
future client (the compliance module, Knowledge Bank portal, and ESTI become consumers of the
EOMS API); no `esti` code changes are implied by adopting it until Stage 1 of §7.*
