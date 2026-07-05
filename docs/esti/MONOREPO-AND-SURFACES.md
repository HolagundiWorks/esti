# Monorepo & surfaces — the estimation access topology

**Status:** Canonical · Companion to [ARCHITECTURE.md](./ARCHITECTURE.md)

How the one repo splits into deployable **surfaces**, and the decision that
estimation is accessed as a **nested `/estimation` extension** of the workspace —
not a separate subdomain — while **ESE** is the one true subdomain and the
**Estimate app** is a separate binary.

---

## 1. One monorepo, surfaces are build targets

Everything ships from `holagundiworks/esti` (pnpm workspaces). One repo, one
dependency graph, one CI. A "surface" is a **build target**, not a repo.

```
esti/                     pnpm workspace root
├─ packages/contracts/    @esti/contracts — shared zod schemas + PURE engines
│                         (money, .aormsest EstimateFile + re-cost engine, BBS,
│                         permissions). Browser-safe: no node/DB imports. THE seam.
├─ backend/               Fastify + tRPC + Drizzle (Postgres) — AORMS API
├─ frontend/              React + Vite + IBM Carbon — AORMS workspace SPA
├─ worker/                Python Redis-Streams consumer (PDF/DXF/reconcile)
├─ ese/                   @esti/ese — Estimation Specification Engine (own Fastify app)
└─ desktop/              Tauri shell (AORMS Lite/Pro/Community; Estimate app target)
```

**Invariant:** any shape crossing two surfaces (rates, `.aormsest`, permissions,
money) lives in `@esti/contracts` and nowhere else. Surfaces import it; they never
re-declare it. That single rule is what makes one repo worth more than four.

---

## 2. The subdomain-vs-extension test

Three questions decide it. *Different users? Different release cadence? A real
origin-isolation need?* All "no" → it is a **path extension** of the workspace.
Any "yes" that matters → a **subdomain** (or a binary).

| Surface | Users | Cadence | Isolation need | → Access |
|---|---|---|---|---|
| AORMS workspace | firm staff | continuous | — | `app.aorms.in` (root) |
| **Estimation** | **same staff** | **same** | **none** | **`/estimation` — extension** |
| **ESE** (pack publisher) | **`kbteam`** | **yearly SR** | **yes** | **`ese.aorms.in` — subdomain** |
| **Estimate app** | estimators, **offline** | independent | native/offline | **desktop binary** |
| Client / consultant portals | external | — | session-scoped | `/portal`, `/collab` extensions |

### Estimation → nested extension `/estimation`
It is a module *of* the workspace: same session cookie, same Carbon shell, same
`can(role, capability)` permissions, and it re-costs against the same project rate
book. A subdomain would add cross-origin auth cost for **zero** isolation benefit.
So the AORMS estimation surface (import · view · re-cost · project rate book)
mounts at **`/estimation`** as a top-level nav entry. (`/libraries/estimates`
redirects there for back-compat.)

### ESE → the one subdomain `ese.aorms.in`
Different users (`kbteam`, admin seeded from deploy env), a different job
(decipher the **CPWD** schedule → publish sealed Rate Library Packs), a different
clock (once a year). It publishes *into* the system across a versioned seam; it is
not in the request path of daily work. That earns a subdomain.

### Estimate app → a binary, not a web surface
Offline measurement is the entire point. It talks to nobody live — it exports a
sealed `.aormsest` file. Distributed as a Tauri installer alongside the AORMS
desktop builds.

```
        ┌──────────────────────── one monorepo ─────────────────────────┐
 kbteam │   ese.aorms.in            app.aorms.in                         │
   ────►│  ┌───────────┐  Rate    ┌───────────────────────────────────┐ │
        │  │  ESE      │  Library │  AORMS workspace (frontend+backend)│ │
        │  │ (Fastify) │  Pack    │   /  /projects  /tasks             │ │
        │  │ CPWD SR → │ ───────► │   /estimation ◄── nested extension │ │
        │  │  packs    │ (→ rate  │      Abstract·BOQ·Materials·Steel  │ │
        │  └───────────┘   book)  │      + project Rate Book           │ │
        │                         └───────────▲───────────────────────┘ │
        │                            .aormsest │ import (frozen qty)     │
        └────────────────────────────────────┼─────────────────────────┘
                                    ┌─────────┴──────────┐  offline
                                    │ Estimate desktop   │  (Tauri binary)
                                    │ measure → export   │
                                    └────────────────────┘
```

---

## 3. Shared seams (why the split is safe)

Two versioned, checksummed contracts + one pure engine let the surfaces evolve
independently:

1. **Rate Library Pack** (`ese-packs.ts`) — ESE → AORMS. `formatVersion` + sha256
   seal (`ese/src/pack-checksum.ts`). Imported into the office rate book via
   `estimates.importRateBookPack`.
2. **`.aormsest`** (`estimate.ts` `EstimateFile`) — Estimate app → AORMS.
   `formatVersion` + `estimateSealString` seal. Frozen quantities + measurements +
   material take-off + steel + optional per-item **lead** (carriage).
3. **`recostEstimate`** (pure, `@esti/contracts`) — `.aormsest` + rate book →
   Abstract/BOQ/Materials/Steel. Quantities frozen; **price is the one live lever**,
   precedence **project → office → as-estimated**.

### Rate vs specification (finalised)
One schedule only — **CPWD**. **Rates live only in the Rate Book** (`esti_rate_book`
office; `esti_project_rate` per-project override). The **Specification** catalogue
(`esti_spec_catalog_item`) is **rate-free**. They join by item `code`. No multiple
state DSRs.

---

## 4. Auth per surface

- **Workspace + `/estimation`** — one session cookie, tRPC `protectedProcedure`
  ladder; rate-book writes need `write`. The extension inherits everything.
- **ESE** — own `kbteam` users; never shares the AORMS session; emits signed packs.
- **Estimate app** — no server auth; trust is established at *import* via the
  `.aormsest` seal, not at edit time.

---

## 5. Deploy

- **AORMS** (backend + worker + frontend, incl. `/estimation`) → `deploy/update.sh`
  (podman compose); one deploy, no separate estimation release.
- **ESE** → its own `esti-ese` container (in `compose.prod.yaml`) behind
  `ese.aorms.in`, sharing the AORMS Postgres (self-provisions its `ese_*` tables
  on boot). One-time: `sudo bash deploy/install-ese.sh` (builds+starts the
  container, installs the nginx vhost `deploy/nginx-ese.conf`, issues TLS), then
  set `ESE_ENABLED=true` + `ESE_ADMIN_PASSWORD` in `.env` so `update.sh` keeps it
  rebuilt. `kbteam` admin seeded from env, forced to rotate on first login.
- **Estimate app** → desktop release tag; installers hosted like the AORMS builds
  (`.github/workflows/desktop.yml`, `windows-latest`).

See [ESTIMATION-ARCHITECTURE.md](./ESTIMATION-ARCHITECTURE.md) for the internals of
the three-app estimation model and the `.aormsest` schema.
