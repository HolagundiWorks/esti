# Monorepo & surfaces — the estimation access topology

**Status:** Canonical · Companion to [ARCHITECTURE.md](./ARCHITECTURE.md)

How the one repo splits into deployable **surfaces**, and the decision that
estimation is accessed **inside a project (Cost Management)** of the workspace —
not a separate subdomain — while **ESE** is the one true subdomain and the
**Estimate app** is a separate binary.

---

## 1. One monorepo, surfaces are build targets

Everything ships from `holagundiworks/esti` (pnpm workspaces). One repo, one
dependency graph, one CI. A "surface" is a **build target**, not a repo.

```
esti/                     pnpm workspace root
├─ packages/contracts/    @esti/contracts — shared zod schemas + PURE engines
│                         (money, permissions, India profile). Browser-safe.
├─ packages/hcw-ui-kit/   @hcw/ui-kit — layered design system
├─ backend/               Fastify + tRPC + Drizzle (Postgres) — AORMS API
├─ frontend/              React + Vite + MUI / @hcw/ui-kit — AORMS SPA + marketing
├─ worker/                Python Redis-Streams consumer (PDF/DXF/reconcile)
├─ vendor/hcw-aorms-ai-kit/  AI prompts + Ollama SDK
├─ docs/reference/        Zonal-regulation reference data (municipal bylaws)
```

> **Web-only (2026-07-19).** There is no `desktop/` shell and no standalone
> Estimate binary — both retired. Every surface below is browser-delivered.

**Invariant:** any shape crossing two surfaces (rates, permissions, money) lives
in `@esti/contracts` and nowhere else. Surfaces import it; they never
re-declare it. That single rule is what makes one repo worth more than four.

---

## 2. The subdomain-vs-extension test

Three questions decide it. *Different users? Different release cadence? A real
origin-isolation need?* All "no" → it is a **path extension** of the workspace.
Any "yes" that matters → a **subdomain** (or a binary).

| Surface | Users | Cadence | Isolation need | → Access |
|---|---|---|---|---|
| AORMS-Studio | firm staff | continuous | — | `studio.aorms.in` (root) |
| **Estimation** | **same staff** | **same** | **none** | **Project › Cost Management — nested** |
| **ESE** (pack publisher) | **`kbteam`** | **yearly SR** | **yes** | **`ese.aorms.in` — subdomain** |
| ~~Estimate app~~ | — | — | — | **retired 2026-07-19 — estimating is in-browser** |
| Client / consultant / contractor / site portals | external parties | continuous | session-scoped | `external.aorms.in` · `/access` |

### Estimation → nested inside a project (Cost Management)
It is a module *of* the workspace: same session cookie, same HCW shell, same
`can(role, capability)` permissions, and it re-costs against the same project rate
book. A subdomain would add cross-origin auth cost for **zero** isolation benefit.
So the AORMS estimation surface lives **inside a project → Cost Management**
(`Estimation · BOQ · BBS · …`) — measure on a calibrated plan sheet, send those
rows to an estimate, re-cost against the project rate book. (The old top-level
`/estimation` and `/libraries/estimates` paths redirect to `/projects`.)

### ESE → the one subdomain `ese.aorms.in`
Different users (`kbteam`, admin seeded from deploy env), a different job
(decipher the **CPWD** schedule → publish sealed Rate Library Packs), a different
clock (once a year). It publishes *into* the system across a versioned seam; it is
not in the request path of daily work. That earns a subdomain.

### Estimate app → cancelled
The standalone C++ desktop and its `.aormsest` interchange are retired; nothing
replaces them as a separate surface. Quantities now come from **browser takeoff**
inside Cost Management. Active cost work:
[COST-MANAGEMENT-SYSTEM.md](./COST-MANAGEMENT-SYSTEM.md).

```
        ┌──────────────────────── one monorepo ─────────────────────────┐
 kbteam │   ese.aorms.in            studio.aorms.in                      │
   ────►│  ┌───────────┐  Rate    ┌───────────────────────────────────┐ │
        │  │  ESE      │  Library │  AORMS-Studio (frontend+backend)│ │
        │  │ (Fastify) │  Pack    │   /  /projects  /tasks             │ │
        │  │ CPWD SR → │ ───────► │   /projects/:id › Cost Management  │ │
        │  │  packs    │ (→ rate  │      Abstract·BOQ·Materials·Steel  │ │
        │  └───────────┘   book)  │      + project Rate Book           │ │
        │                         └────────────────────────────────────┘ │
        └──────────────────────────────────────────────────────────────┘

  Measurement and estimating happen in the browser, inside Cost Management.
  (The former offline Estimate desktop binary and its .aormsest hand-off
   were retired 2026-07-19 — AORMS is web-only.)
```

---

## 3. Shared seams (why the split is safe)

One versioned, checksummed contract lets the surfaces evolve independently:

1. **Rate Library Pack** (`ese-packs.ts`) — ESE → AORMS. `formatVersion` + sha256
   seal (`ese/src/pack-checksum.ts`). Imported into the office rate book via
   `estimates.importRateBookPack`.

> **Retired 2026-07-19 — `.aormsest`.** The `EstimateFile` interchange existed
> only to hand work off from the Estimate **desktop** app. With the product
> web-only there is no hand-off: measurement and pricing happen in one place, in
> the browser. Nothing to delete — the format was specified in these docs but
> **never implemented in code**; `EstimateFile`/`recostEstimate` do not exist in
> `@esti/contracts`. Quantities reach an estimate via
> `estimates.importFromMeasurementBook` instead.

### Rate vs specification (finalised)
One schedule only — **CPWD**. **Rates live only in the Rate Book** (`esti_rate_book`
office; `esti_project_rate` per-project override). The **Specification** catalogue
(`esti_spec_catalog_item`) is **rate-free**. They join by item `code`. No multiple
state DSRs.

---

## 4. Auth per surface

- **Workspace (incl. Project › Cost Management)** — one session cookie, tRPC `protectedProcedure`
  ladder; rate-book writes need `write`. The extension inherits everything.
- **ESE** — own `kbteam` users; never shares the AORMS session; emits signed packs.

---

## 5. Deploy

- **AORMS** (backend + worker + frontend) → `deploy/update.sh`
  (podman compose); one deploy, no separate estimation release.
- **ESE** — **retired** (no `ese/` package in this monorepo).
- **Estimate app** — not in this monorepo; cloud-only at aorms.in.

See [COST-MANAGEMENT-SYSTEM.md](./COST-MANAGEMENT-SYSTEM.md) for the active CMS rebuild.
