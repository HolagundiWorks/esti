# Construction Knowledge Bank — Architecture & Build Plan

**Status:** Canonical target (rebuild foundation) · **Owner:** Holagundi Consulting Works
· **Supersedes:** the removed `ESTIMATION-OS-ARCHITECTURE` and `CONSTRUCTION-COST-MANAGEMENT-OS`
target docs (Estimation OS + Construction Cost spine were torn down 2026-06-28; Rate
Books + Rate Analysis removed the same day — see [ROADMAP](ROADMAP.md)).

> **Philosophy.** Do not build estimation software. Build a Construction Operating
> System. Most construction software behaves like a spreadsheet; AORMS must behave like
> a knowledge-driven execution engine. The Knowledge Bank is where all estimation
> intelligence originates — every downstream engine reads from it, none re-keys it.

---

## 1. Purpose

The Construction Knowledge Bank is the foundational construction-intelligence layer
inside AORMS. It cleanly separates the axes that estimation software usually tangles
together:

- **Materials** — generic raw materials (Cement, Sand, Steel…)
- **Labor** — labour resources (Mason, Helper, Carpenter…)
- **Items** — construction activities (Brickwork 230mm, RCC Slab, Plastering…)
- **Specifications** — method/mix variants of an item (Brickwork 1:6, Concrete M25…)
- **Resource consumption logic** — how much material + labour a specification uses
- **Brands** — manufacturers, kept independent of the generic material
- **Vendors & rates** — live procurement rates by brand, vendor, and location
- **Formulas** — stored quantity expressions, never hardcoded

**Dependency chain (the spine of the model):**

```
Item → Specification → Material/Labor consumption → Brand → Vendor Rate → Estimate
```

---

## 2. Position in AORMS

The Knowledge Bank is **reference data** (firm-wide, not project-scoped) and lives under
the **Knowledge Bank** navigation area (today: Specification + Lessons tabs). It is the
foundation the future engines consume — and the build order reflects that dependency:

```
                ┌─────────────────────────────┐
                │  Construction Knowledge Bank │  ← this doc (reference data)
                └──────────────┬──────────────┘
                               │ exposes a deterministic derivation API
        ┌──────────┬───────────┼───────────┬──────────────┐
     BOQ Engine  Estimation  Procurement  Tendering   AI Quantity
                    OS           OS           OS        Prediction
```

None of those engines exist yet (they were removed in the teardown). They are
**out of scope** here; the Knowledge Bank ships first and exposes the derivation API
they will later call.

---

## 3. Resolved design decisions

These were settled before build so the model is stable:

1. **Table namespace.** All Knowledge Bank tables use the **`esti_kb_*`** prefix
   (`esti_kb_material`, `esti_kb_item`, …). This groups the cluster and avoids any
   collision with the removed estimation tables and the kept `esti_spec_catalog_*`.

2. **"Specification" name clash — keep them separate.** The repo already has a
   `specCatalog` (`esti_spec_catalog_*`, the current Knowledge Bank "Specification" tab):
   flat, firm-wide **material/finish selection sheets** ("Vitrified tile, Kajaria,
   600×600, matt") used to build project spec sheets. The new **Specification Library**
   here is a *different concept* — **item-scoped method/mix specs carrying resource
   recipes** (Brickwork → 1:6 → 500 bricks + 1.5 bags + 0.42 cum + 0.8 mason-day).
   They serve different audiences (finishes selection vs estimation derivation), so:
   - The new item-mapped specs live in a **Specifications** tab (table
     `esti_kb_specification`, `item_id` FK, one default per item).
   - The existing `specCatalog` becomes the **Brand Catalogue** tab — it already captures
     makes / brands + finishes. No data change — label + tab-title only.
   - A later cross-link (a brand/finish referencing a method spec) is possible but **not**
     in the initial build.

3. **Formulas are stored, evaluated safely.** Quantity formulas are persisted strings,
   evaluated by a **sandboxed expression engine** — a recursive-descent parser supporting
   `+ - * / %`, parentheses, numeric literals, named variables (the item's measurement
   fields), and a whitelist of functions (`min, max, round, ceil, floor, abs`). **No
   `eval`/`Function`, no arbitrary identifiers.** This resurrects the *pattern* of the
   removed `formula-engine.ts`, not its code.

4. **Money in integer paise.** All rates (`default_rate`, vendor `rate`) are stored as
   integer **paise**, formatted with `formatINR`. Consumption factors, density,
   productivity, and wastage are decimals.

5. **Plan tier.** The Knowledge Bank is a **Core+** feature (a new `knowledgeBank`-class
   `PlanFeature`); Lite firms don't author it. (The old `rateBooks` feature flag was
   removed; this replaces that gate.)

6. **Recipe & rate history.** Vendor rates are time-bounded (`effective_from/to`) — the
   engine resolves the *current* rate. Consumption recipes themselves are **versioned by
   the Specification** (a new spec version is a new row); estimates snapshot the spec they
   used so frozen history never silently re-computes. (Versioning lands in Phase 2.)

---

## 4. Data model

All tables `esti_kb_*`, UUID PKs, `created_at`, soft `active` flags where useful.

### Core libraries (flat reference data)

| Table | Key fields |
| --- | --- |
| `esti_kb_material` | name, unit, category, wastage_factor, density, default_rate (paise), notes |
| `esti_kb_labor` | name, unit, rate_type, productivity_factor, notes |
| `esti_kb_item` | name, category, unit, description |

### Specifications + consumption recipes

| Table | Key fields |
| --- | --- |
| `esti_kb_specification` | item_id → item, name, description, **unit** (UOM), **rate_paise** (₹/unit), is_default |
| `esti_kb_spec_material` | specification_id, material_id, quantity_per_unit, wastage_factor |
| `esti_kb_spec_labor` | specification_id, labor_id, quantity_per_unit |

> Item→Specification is modelled by `specification.item_id` + an `is_default` flag (no
> separate mapping table needed; one spec belongs to one item, an item has many specs).

### Brand layer (independent of material)

| Table | Key fields |
| --- | --- |
| `esti_kb_brand` | name, category, website, notes, active |
| `esti_kb_material_brand` | material_id, brand_id, grade_or_variant, unit, quality_level, preferred |

> **Material ≠ Brand.** Cement is a generic material; UltraTech OPC 53 is a branded
> variant. The mapping table is the only place they meet.

### Rate intelligence (vendor)

| Table | Key fields |
| --- | --- |
| `esti_kb_vendor` | name, location, contact_person, gst_number, notes |
| `esti_kb_vendor_rate` | material_id, brand_id, vendor_id, unit, rate (paise), location, effective_from, effective_to |

### Dependencies + formulas

| Table | Key fields |
| --- | --- |
| `esti_kb_item_dependency` | parent_item_id, related_item_id, dependency_type (MANDATORY / OPTIONAL / SEQUENCE) |
| `esti_kb_item_formula` | item_id, formula_expression (e.g. `length * breadth * height`) |

---

## 5. Derivation engine (the payoff)

A pure, deterministic read model. Given an **item + chosen specification +
measurements**:

1. Evaluate the item's `formula_expression` against the measurements → **primary
   quantity** (4 dp).
2. Expand `spec_material` → **material quantities** (`quantity_per_unit × primary ×
   (1 + wastage_factor)`).
3. Expand `spec_labor` → **labour days** (`quantity_per_unit × primary`).
4. Resolve each material's **vendor rate** (preferred brand → latest in-window vendor
   rate for the location) → **amounts** in paise.
5. Surface **related items** (dependencies) as suggested follow-on activities.

Output: a fully costed breakdown — quantities, labour, brand/vendor provenance, and total
— with no hardcoded numbers. This is the exact API the BOQ / Estimation / Procurement
engines will later call.

**AI target (future):** input `230mm brick wall, L 10m × H 3m` → output brick / cement /
sand quantities, labour days, and cost estimate, all derived through this engine.

---

## 6. Build plan — bottom-up vertical slices

Each phase is a full slice per `CLAUDE.md`: **schema + migration → `@esti/contracts`
schemas → backend tRPC module (registered in `router.ts`) → Pure Carbon UI (Knowledge
Bank tab) → verify (contracts build, backend tsc, frontend tsc, migration applied, Pure
Carbon check, render-200) → commit**. Built on a fresh branch off `main`.

| Phase | Scope | Deliverable |
| --- | --- | --- |
| **1 — Core Libraries** ✅ | `material`, `labor`, `item` tables + CRUD + three KB tabs | **Shipped** — migration `0109`, `kb.{materials,labor,items}.*` namespace, Materials/Labour/Items tabs in the Knowledge Bank |
| **2a — Specifications** ✅ | `specification` table mapped to item + `is_default` | **Shipped** — migration `0110`, `kb.specifications.*`, item-scoped Specifications tab (one default per item); existing specCatalog relabelled **Brand Catalogue** |
| **2b — Recipes** ✅ | `spec_material`, `spec_labor` consumption recipes | **Shipped** — migration `0111`, `kb.recipes.{materials,labor}.*`, **Recipes** data-mapper tab (pick item → spec → connect materials + labour at quantity-per-item-unit) |
| **3a — Brand library** ✅ | `brand` (manufacturers) | **Shipped** — migration `0112`, `kb.brands.*`, Brands tab (CSV import/export) |
| **3b — Material→brand mapping** ✅ | `material_brand` (grade/variant, preferred) | **Shipped** — migration `0113`, `kb.materialBrands.*`, mapper under the Brands tab (one preferred brand per material) |
| **4 — Rate Intelligence** | `vendor`, `vendor_rate` (time-bounded, by location) | Capture live procurement rates; latest-rate resolution |
| **5 — Dependencies** | `item_dependency` (mandatory / optional / sequence) | Items trigger related items |
| **6 — Formula Engine** | sandboxed evaluator in contracts (+ vitest); `item_formula` | Stored, safe quantity expressions |
| **7 — Derivation Engine** | pure read model + vitest: item + spec + measurements → costed breakdown | The deterministic API downstream engines consume |

**Tooling:** every library tab supports **CSV import + export** (field-driven; money
columns round-trip as rupees) via a shared `bulkCreate` endpoint per type.

**Out of scope (later, separate docs):** BOQ Engine, Estimation OS, Procurement OS,
Tendering OS, Construction Cost Management OS, AI Quantity Prediction. Future Rate Books
(CPWD / Karnataka DSR / private / custom office ratebook) re-enter as an optional rate
*source* feeding the same `vendor_rate`/derivation layer — not as a parallel system.

---

## 7. Acceptance gates (per phase)

- `pnpm --filter @esti/contracts build` + vitest (formula + derivation phases).
- Backend tsc in-container; migration applied via `podman cp` + `psql -f`.
- Frontend tsc + `node scripts/check-carbon.mjs` (Pure Carbon) + render-200.
- Restart `esti-backend` after backend changes. Commit per phase with the
  `Co-Authored-By: Codex Opus 4.8` trailer.

---

*Designed and developed by Holagundi Consulting Works.*
