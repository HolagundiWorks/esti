> **ARCHIVED (2026-07-10):** ESE back-office spec — **not shipped in this monorepo**.

# Estimation Specification Engine (ESE) — product spec

A **standalone back-office web app** that the Knowledge-Bank team uses to turn messy,
annually-changing government workbooks (state/central **Schedules of Rates**, **Analysis
of Rates**, technical **Specifications**, and **NBC / planning bylaws**) — supplied as
**PDF or Markdown** — into clean, versioned, structured **packs** that the Estimate
desktop app and AORMS consume. All the parsing/interpretation lives here; the products
stay simple.

## Deployment & access

- **URL:** `ese.aorms.in` — its **own repo/app**, deployed separately from AORMS.
  *(Repo-scope note: this repo is `holagundiworks/esti`; the ESE is designed to be a
  separate repo the org creates, or scaffolded first as a monorepo package `ese/` here
  and split out later. See "Build path".)*
- **Users:** the **KB team** only (role `kbteam`). Not a public or per-firm surface.
- **Auth:** a **default admin credential declared at deploy time** (env-seeded on first
  run, forced-rotate on first login) — same pattern as the Community first-run admin
  (`seedCommunityAdmin`): `ESE_ADMIN_USER` / `ESE_ADMIN_PASSWORD` env → seeded once.
- **Offline-friendly AI:** a **dedicated Ollama engine** (local LLM), matching the
  no-cloud-AI stance — no document leaves the ESE host.

## Inputs → Pipeline → Outputs

```
PDF / Markdown                ESE pipeline                         Published packs
────────────                  ─────────────────────────           ─────────────────
DSR / SoR                 →   1. PDF → Markdown converter      →   Rate Library Pack
Analysis of Rates (DAR)       2. Text formatter / cleaner          { source, year, checksum,
Technical Specifications      3. Ollama analysis engine              workItems[], rateItems[],
NBC 2016 / state bylaws          (structure · read · analyse)        recipes[], specs[] }
                              4. Rule / logic / mapping builder
                              5. KB-team review + approve      →   Compliance / Bylaw Rule Pack
                              6. Version + publish                  { authority, year,
                                                                      far[], setbacks[], height[],
                                                                      coverage[], parking[] }
```

**1. PDF → Markdown converter** — ingest a source PDF (DSR/DAR/spec/NBC) and produce clean
Markdown (tables preserved). Handles multi-column, tabular rate pages, headers/footers.

**2. Text formatter** — normalise the Markdown: strip page furniture, fix broken table
rows, standardise units/number formats, segment into chapters/items.

**3. Ollama analysis engine** *(the core)* — a local LLM that **structures, reads, and
analyses** the DSR/handbook to extract entities and infer connections:
- items + hierarchy, spec attributes (thickness/grade/mortar), unit, **rate** (rate is
  extracted deterministically and only *checked* by the LLM — never LLM-guessed);
- material/labour **recipes** from the Analysis of Rates;
- **rules, logic and mappings** — "what's connected": item→spec, item→recipe, item→derived
  items (brick→plaster→paint), and cross-source taxonomy mapping (CPWD 6.4 ≡ Karnataka
  brickwork item).

**4. Rule / mapping builder** — the KB team curates the derivation rules, the canonical
taxonomy mapping across states, and the measurement templates, assisted by the engine's
suggestions.

**5. Review + approve** — nothing publishes without KB-team sign-off (rates and mappings
are money-critical).

**6. Version + publish** — each `source + year` is an **immutable edition**
(`CPWD-DSR-2023`, `KAR-PWD-2024`, …); packs are signed + checksummed and hosted for the
apps to pull (same distribution as the desktop-installer resolver).

## Scope — first five sources

Central + four states, to start: **CPWD / Delhi DSR**, **Karnataka PWD**, **Tamil Nadu PWD**,
**Maharashtra PWD/DSR**, **Andhra Pradesh (APSS/APDSS)**. (Research on their structures,
coding schemes, whether Analysis of Rates is published, and formats is running now — it
drives the per-source parser design.)

## Two pack types the ESE publishes

1. **Rate Library Pack** → consumed by the **Estimate desktop app** (rate items, specs,
   recipes, measurement templates) and by **AORMS** (rate books for re-costing). See
   `ESTIMATION-ARCHITECTURE.md`.
2. **Compliance / Bylaw Rule Pack** → consumed by the AORMS **Compliance Library**
   (the existing `compliance` router: `far` / `setback` / `nbc` / `fire` / `regulation`).
   NBC 2016 + state planning-authority bylaws become structured rules (FAR/FSI, setbacks,
   height, ground coverage, parking, plot-size/road-width dependencies).

## Build path (given repo scope)

- **Now (in this repo):** scaffold the ESE as a workspace package `ese/` (Fastify + React +
  Drizzle, Ollama client, a PDF→MD stage) so it is buildable/verifiable, plus the shared
  **pack schemas** in `@esti/contracts` (reused by all three surfaces).
- **Later (org action):** move `ese/` to its own repo, wire `ese.aorms.in`, restrict to the
  KB team. The pack schema is the stable seam, so the split is mechanical.

> The ESE is where the *hard, annual, messy* work is contained. A new DSR year, a new state,
> or a new bylaw revision is a **re-ingest + review + publish** — never an app code change.
