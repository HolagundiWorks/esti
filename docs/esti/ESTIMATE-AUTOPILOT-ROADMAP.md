# Estimate app — Autopilot roadmap

> **Agent queue** for the standalone **AORMS Estimate** app (`estimate/`). Each phase
> is sized for autonomous execution: clear inputs, outputs, verify commands, and
> gates. Canonical architecture: [ESTIMATION-ARCHITECTURE.md](ESTIMATION-ARCHITECTURE.md).
>
> **Human pivot (now):** UI — migrate Estimate from Carbon React to
> [`@hcw/hcw-ui-kit`](HCW-UI-KIT.md) (MUI + layered surfaces). Engine/autopilot
> work pauses on UI until Phase E1 gate is met.

**Status markers:** ✅ Done · 🔄 In progress · ⬜ Queued · 🚧 Human-led (UI pivot)

---

## How to read this

| Column | Meaning |
|--------|---------|
| **Pri** | P0 = blocks export/import loop · P1 = core estimator value · P2 = polish |
| **Owner** | `autopilot` = agent can run end-to-end · `human` = design/UX decisions needed |
| **Verify** | Command or manual check that closes the task |

**Autopilot rules**

1. Shared logic stays in `@esti/contracts` — never duplicate qty/recipe/BBS math in UI.
2. UI uses **HCW-UI-Kit only** after E1 (see [HCW-UI-KIT.md](HCW-UI-KIT.md)).
3. Every engine change needs a vitest in `packages/contracts` or `estimate/` as appropriate.
4. Update this file when a task ships (status + date in commit message body).

---

## Status at a glance

| Phase | Focus | Pri | Status | Owner |
|-------|--------|-----|--------|-------|
| [E0](#e0--rate-book--measure--export-foundation) | Rate book · measure · export foundation | P0 | ✅ | autopilot |
| [E1](#e1--ui-pivot-hcw-ui-kit--active) | **UI pivot → HCW-UI-Kit** | P0 | 🚧 | **human** |
| [E2](#e2--derivation-rules-v2) | Derivation rules v2 | P1 | ⬜ | autopilot |
| [E3](#e3--recipes--material-take-off-v2) | Recipes & material take-off v2 | P1 | ⬜ | autopilot |
| [E4](#e4--bbs--steel-polish) | BBS / steel polish | P1 | 🔄 | autopilot |
| [E5](#e5--export--desktop-native) | Export · desktop native | P1 | ⬜ | autopilot |
| [E6](#e6--aorms-import-loop) | AORMS import loop UX | P2 | ⬜ | autopilot |
| [E7](#e7--ese--pack-pipeline) | ESE pack pipeline | P2 | ⬜ | autopilot |
| [E8](#e8--glass-health-orbs-workspace-ui) | **Glass health orbs (workspace UI)** | P1 | 🔄 | human review → autopilot |

---

## E0 — Rate book · measure · export foundation

**Goal:** Estimator can load CPWD, pick items, measure, derive materials, model steel, export `.aormsest`.

| # | Task | Status |
|---|------|--------|
| E0.1 | `RateLibraryPack` seam + CPWD pack embed (`ese/packs/cpwd-2021.pack.json` → `estimate/public/packs/`) | ✅ |
| E0.2 | Workflow tabs: Rate book → Add items → Measure → BOQ & materials → BBS | ✅ |
| E0.3 | Rate item search + add from pack (code · spec · uom · rate) | ✅ |
| E0.4 | UOM-based measurement templates (`measureQtyFromTemplate`) | ✅ |
| E0.5 | Auto material take-off (`takeoffMaterials` × pack recipes) | ✅ |
| E0.6 | BOQ abstract preview (section-grouped) | ✅ |
| E0.7 | BBS members (slab/beam/column/footing) + steel schedule by Ø | ✅ |
| E0.8 | Pack enrich v1: masonry→plaster derivation, mortar/brick/plaster recipe supplements | ✅ |
| E0.9 | Sealed `.aormsest` export + AORMS `recostEstimate` compatibility | ✅ |

**Verify:** `pnpm --filter @esti/estimate typecheck` · import `docs/esti/samples/villa-demo.aormsest` or a fresh export in AORMS › Cost Management.

---

## E1 — UI pivot (HCW-UI-Kit) — **ACTIVE**

**Goal:** Estimate app matches AORMS / ESE visual system — `@hcw/hcw-ui-kit`, MUI DataGrid where needed, Rail · Stage · Footer · Dock spatial model. **Remove Carbon React** from `estimate/`.

| # | Task | Status | Notes |
|---|------|--------|-------|
| E1.1 | Add `@hcw/hcw-ui-kit` dependency to `estimate/package.json` | ⬜ | Mirror `frontend/package.json` |
| E1.2 | Replace `styles.scss` Carbon import with kit tokens + structural helpers only | ⬜ | Drop `glass.scss` Carbon overrides |
| E1.3 | Shell: `MuiRoot` + app header / meta bar using `Surface`, `BrandMark` | ⬜ | |
| E1.4 | Workflow: MUI `Tabs` or stepper (5 steps) — Rate book · Items · Measure · BOQ · BBS | ⬜ | |
| E1.5 | Rate book panel — load CPWD / import pack (`Button`, `Tag`/`StatusDot`) | ⬜ | |
| E1.6 | Rate item search — `TextField` + `DataGrid` or dense table | ⬜ | |
| E1.7 | Measurement sheets — template-aware dim inputs, derived-line read-only state | ⬜ | |
| E1.8 | BOQ + materials panels — read-only grids, procurement disclaimer | ⬜ | |
| E1.9 | BBS panel — member cards (L2 `Surface`), bar schedule accordion, steel summary | ⬜ | |
| E1.10 | Export CTA — `ActionDock` or primary glass button; preview chips in header | ⬜ | |
| E1.11 | Remove `@carbon/react` + `@carbon/icons-react` from estimate | ⬜ | |
| E1.12 | Desktop webview smoke — single-file build still works (`ESTI_SINGLEFILE=1`) | ⬜ | |

**Gate:** No Carbon imports under `estimate/src/` · `pnpm --filter @esti/estimate build` succeeds · visual parity with [HCW-UI-KIT.md](HCW-UI-KIT.md) layer rules.

**Owner:** human-led design pass; autopilot may implement from mockups once E1.1–E1.3 land.

---

## E2 — Derivation rules v2

**Goal:** “Measure once, derive everything” — linked quantities beyond plaster ×2.

| # | Task | Status |
|---|------|--------|
| E2.1 | Store derivations on `RateLibraryRateItem` in ESE pack (not runtime-only enrich) | ⬜ |
| E2.2 | Masonry m²/m³ → plaster `13.1.1` ×2 (already in `packEnrich.ts` — move to ESE build) | 🔄 |
| E2.3 | Plaster → paint (identify CPWD paint item codes in FINISHING chapter; add FACTOR rule) | ⬜ |
| E2.4 | `NET_OF_OPENINGS` UI — optional openings area per derived child | ⬜ |
| E2.5 | Derived lines: show parent link, allow detach → manual line | ⬜ |
| E2.6 | Vitest: `deriveLinked` + `syncDerivedItems` golden cases | ⬜ |

**Verify:** Add `6.3.1` brick cum → measure → plaster line appears at 2× face area · vitest green.

---

## E3 — Recipes & material take-off v2

**Goal:** Procurement take-off covers cement, sand, bricks, aggregates — sourced from CPWD DAR / coefficients, not hand-tuned constants only.

| # | Task | Status |
|---|------|--------|
| E3.1 | Parse full **COEFFICIENTS FOR CEMENT CONSUMPTION** (already) + sand columns where present | 🔄 |
| E3.2 | DAR block parser (material section per item) in `ese/src/parsers/cpwd.ts` | ⬜ |
| E3.3 | Rebuild `cpwd-2021.pack.json` with DAR recipes; regression `cpwd-pack.test.ts` | ⬜ |
| E3.4 | Move `packEnrich.ts` supplements into ESE pipeline where deterministic | ⬜ |
| E3.5 | Material master: map CPWD basic-rate codes (`1986` bricks, sand, aggregate) | ⬜ |
| E3.6 | Materials panel: rate + amount when material `ratePaise` in pack | ⬜ |

**Verify:** Concrete `4.1.2` + brick `6.3.1` + plaster `13.1.1` each show distinct material lines · pack recipe count >> 261.

---

## E4 — BBS / steel polish

**Goal:** Production-grade BBS for Indian consultancy estimates.

| # | Task | Status |
|---|------|--------|
| E4.1 | Slab/beam/column/footing engines (IS 456 / 2502) | ✅ |
| E4.2 | Per-member bar schedule drill-down | ✅ |
| E4.3 | Steel roll-up by diameter + ₹/kg rates | ✅ |
| E4.4 | Staircase / cantilever / crank bars (extend `bbs-engine.ts`) | ⬜ |
| E4.5 | Link BBS steel to RCC **rate items** (optional coeff kg/cum split by Ø) | ⬜ |
| E4.6 | Bar schedule PDF sheet (export alongside `.aormsest`) | ⬜ |
| E4.7 | C++ `esti_bbs` / `esti_recost` wired in SPA `native.ts` | ⬜ |

**Verify:** `packages/contracts` `bbs-engine.test.ts` · footing + beam fixture weights within tolerance.

---

## E5 — Export · desktop native

**Goal:** Offline-first estimator ships as Windows installer; work persists in SQLite.

| # | Task | Status |
|---|------|--------|
| E5.1 | Browser export `.aormsest` (sha256 seal) | ✅ |
| E5.2 | `SavedPanel` + SQLite CRUD via C++ bridge | ✅ (partial) |
| E5.3 | Import `.aormsest` back into editor (round-trip) | ⬜ |
| E5.4 | Export from saved without load-to-editor | ⬜ |
| E5.5 | PDF abstract (worker `render_pdf` target `estimate` or client-side) | ⬜ |
| E5.6 | Unsaved-changes guard on reset / open | ⬜ |
| E5.7 | CI: `estimate.yml` + NSIS installer on `estimate-v*` tag | ✅ |

**Verify:** Desktop save → quit → reopen → export → import in AORMS.

---

## E6 — AORMS import loop UX

**Goal:** Project › Cost Management feels like the natural home for exported estimates.

| # | Task | Status |
|---|------|--------|
| E6.1 | Import `.aormsest` + `recostEstimate` + Abstract/BOQ/Materials/BBS viewers | ✅ |
| E6.2 | Project rate book overrides | ✅ |
| E6.3 | Measurement drill-down (read-only measurement sheet from `pack`) | ⬜ |
| E6.4 | Revision compare (two `esti_estimate` snapshots) | ⬜ |
| E6.5 | Delete / manage imports UI (`estimates.remove`) | ⬜ |
| E6.6 | Reconcile CMS element spine vs `.aormsest` import (single Cost Management story) | ⬜ |
| E6.7 | Estimate PDF generation in AORMS | ⬜ |

**Verify:** End-to-end demo: Estimate export → import → change office rate → variance visible.

---

## E7 — ESE · pack pipeline

**Goal:** Yearly CPWD refresh without code changes.

| # | Task | Status |
|---|------|--------|
| E7.1 | CPWD CSV parser + `cpwd-2021.pack.json` | ✅ |
| E7.2 | `build-cpwd-pack` CLI | ✅ |
| E7.3 | ESE operator UI (`ese/src/ui.ts`) polish with HCW-UI-Kit | ⬜ |
| E7.4 | `estimates.importRateBookPack` UI in AORMS Knowledge Bank | ⬜ |
| E7.5 | Pack signing + hosted distribution (like desktop installers) | ⬜ |

**Verify:** `pnpm --filter @esti/ese test` · fresh pack imports into AORMS rate book.

---

## E8 — Glass health orbs (workspace UI)

**Goal:** All **zone / office health** indicators use the same liquid-glass orb UI
(glow only — no inner glyph, no box-shadow). Canonical implementation:
`OfficeHealthGlyph` `variant="glass"` + `.esti-zone-glass-orb` in `frontend/src/glass.scss`
(documented exception — [CARBON-UI-DIRECTION.md](CARBON-UI-DIRECTION.md) `glass.scss`).

**Spec (locked after human review on Studio Intelligence):**

| Property | Value |
|----------|--------|
| Size | 13×13px default (`.esti-zone-glass-orb`); **26×26px** in stage-head zone health row |
| Surface | Frosted glass + specular highlight |
| Glow | State colour via `--esti-orb-glow` + blurred `::before` bloom |
| Hover | Glow intensifies (orb or parent row hover) |
| States | `stable` · `watch` · `friction` · `critical` · `inactive` (`ZoneState`) |

| # | Surface | Status | Notes |
|---|---------|--------|-------|
| E8.1 | Studio Intelligence › Zone health (stage head) | ✅ | Heading left · 26px orbs · label beside dot |
| E8.2 | Studio Intelligence › Office health row | ✅ | Single orb beside state word |
| E8.3 | Taskbar footer › Office health tray | ⬜ | `AppFooterBar.tsx` — replace flat SVG |
| E8.4 | Studio Intelligence › Top risks list | ⬜ | `OfficeHealthGlyph` size 12 → `glass` |
| E8.5 | Studio Intelligence › Data grid `glyphCell` | ⬜ | Action items / project rows |
| E8.6 | `abstractShell` `StatusSymbol` (●▲■) | ⬜ | Bridge to glass or deprecate in favour of `OfficeHealthGlyph` |
| E8.7 | Optional size token — `sm` (18px) for dense tables | ⬜ | Modifier class `.esti-zone-glass-orb--sm` |
| E8.8 | HCW-UI-Kit export — `HealthGlassOrb` component | ⬜ | Move from app SCSS when stable |

**Out of scope:** `StatusDot` / `StatusTag` (CRM, invoices, tasks) — different vocabulary;
only **`ZoneState` / office health** geometry uses glass orbs.

**Verify:** Studio Intelligence rail — office + zone orbs match · hover glow on each ·
footer orb (E8.3) matches after rollout.

**Owner:** human sign-off on E8.1–E8.2, then autopilot for E8.3–E8.8.

---

## Autopilot execution order (after UI pivot)

```
E1 (human UI) ──gate──► E2 derivations ──► E3 recipes (ESE rebuild)
                              │
                              ├─► E4 BBS polish
                              └─► E5 desktop round-trip
                                        │
                                        └─► E6 AORMS UX ──► E7 ESE ops
```

**Do not start E2–E7 UI work in Carbon** — wait for E1 gate.

---

## Key files (starting points)

| Area | Path |
|------|------|
| Estimate SPA | `estimate/src/App.tsx` |
| Rate book index + search | `estimate/src/core/rateBookIndex.ts` |
| Pack enrich (derivations/recipes v1) | `estimate/src/core/packEnrich.ts` |
| Derived items sync | `estimate/src/core/deriveItems.ts` |
| BBS compute | `estimate/src/core/bbsCompute.ts` |
| Pure engines | `packages/contracts/src/estimate.ts`, `bbs-engine.ts` |
| CPWD pack | `ese/packs/cpwd-2021.pack.json` |
| AORMS viewers | `frontend/src/components/cms/estimate/` |
| UI kit | `packages/hcw-ui-kit/` |
| Health glass orb | `frontend/src/components/shell/OfficeHealthGlyph.tsx` · `frontend/src/glass.scss` (`.esti-zone-glass-orb`) |
| Zone state types | `frontend/src/components/dashboard/zoneState.ts` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-08 | Roadmap created. E0 complete (rate book workflow, BBS tab, enrich v1). E1 marked active for UI pivot to HCW-UI-Kit. |
| 2026-07-09 | E8 added: glass health orbs — zone + office health on Studio Intelligence (human review); footer + tables queued. |
| 2026-07-09 | E8.1 updated: zone health on stage head (26px orbs). Workspace rail rollout: [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md). |
