# Estimation OS — Architecture

**Status:** Canonical target (fresh rebuild) · **Owner:** Holagundi Consulting Works
· **Builds on:** [CONSTRUCTION-KNOWLEDGE-BANK](CONSTRUCTION-KNOWLEDGE-BANK.md)

> **Clean-slate note.** The previous Estimation OS (component master / RuleSet engine /
> `autoBoq` / IFC component mapping) and the Construction Cost spine were **torn down**
> on 2026-06-28 (see [ROADMAP](ROADMAP.md)). This document describes the **ground-up
> rebuild** on the cleaner Knowledge Bank model — it is not a refactor of the old system,
> and all prior estimation docs (`ESTIMATION-OS-ARCHITECTURE`, `IFC-COMPONENT-MAPPING`,
> `CONSTRUCTION-COST-MANAGEMENT-OS`) are retired.

---

## 1. Purpose

The Estimation OS turns **Knowledge Bank intelligence into project estimates**. The
operating principle is one line:

> **Enter the measurement once → the system derives quantity, materials, labour, and
> cost.**

Most estimation software is a glorified spreadsheet where every number is re-keyed. AORMS
behaves like a knowledge-driven execution engine: an estimator picks *what* is being built
and *how much*, and the system computes *everything else* deterministically from the
Knowledge Bank.

---

## 2. Position in AORMS

The Estimation OS is the **first consumer** of the Construction Knowledge Bank. It holds
**project instances**; the Knowledge Bank holds **firm-wide reference data**.

```
  Construction Knowledge Bank  (reference: items · specs · recipes · rates · formulas)
                │  read-only derivation inputs
                ▼
        Estimation OS  (project instances: estimates → lines → derived BOQ)
                │
                ▼
   BOQ  →  Procurement · Tendering · Construction Cost · AI quantity prediction
```

Knowledge is **reference**; estimates are **instances**. The Estimation OS never edits the
Knowledge Bank, and it **snapshots** what it used so a frozen estimate never silently
changes when the bank is later edited.

---

## 3. The estimation flow

```
Select Item
   → Select Specification        (the default for the item, or an explicit one)
      → Enter Measurements        (the item's measurement fields — once)
         → Derive primary qty     (evaluate the item's stored formula)
            → Expand recipe        (spec → materials × wastage, spec → labour)
               → Resolve rates     (vendor rate → material default; labour default)
                  → Line amounts   (qty × rate, in paise)
                     → Roll up      → BOQ → project estimate total
```

Every arrow is deterministic and computed by the **derivation engine** (§5). The estimator
only supplies the boxed inputs: *item, specification, measurements*.

---

## 4. Data model (project instances — `esti_est_*`)

| Table | Purpose |
| --- | --- |
| `esti_est_estimate` | One estimate per project (or per stage): `project_id`, `title`, `status` (DRAFT / FINALIZED), `version`, `created_at` |
| `esti_est_line` | A measured line: `estimate_id`, `kb_item_id`, `kb_specification_id`, `measurements jsonb`, derived `quantity` + `unit`, `amount_paise`, `sort_order` |
| `esti_est_line_resource` | The derived per-line breakdown (material + labour rows) with `quantity`, resolved `rate_paise`, `amount_paise`, and a `kind` (MATERIAL / LABOUR) |
| *(snapshot)* | On **finalize**, each line stores a `snapshot jsonb` of the recipe + rates used, so the frozen estimate is reproducible regardless of later Knowledge Bank edits |

Money is integer **paise** everywhere. Quantities/wastage/productivity are doubles.
Re-estimation creates a **new estimate version**; finalized versions are immutable.

---

## 5. Derivation engine (deterministic core)

A pure, headless, idempotent function — the heart of the OS, fully unit-testable without a
UI.

**Input:** an item + chosen specification + measurement values, plus the Knowledge Bank
(the item's formula, the spec's material/labour recipe, and current rates).

**Steps:**
1. **Quantity** — evaluate the item's stored formula against the measurements (safe
   sandboxed expression engine — `+ - * / ()`, whitelisted functions, **no `eval`**) → the
   primary quantity (4 dp).
2. **Materials** — for each `spec_material`: `quantity_per_unit × primary × (1 + wastage)`.
3. **Labour** — for each `spec_labor`: `quantity_per_unit × primary`.
4. **Rates** — resolve each material's rate (preferred brand → latest in-window vendor rate
   for the location → material default rate) and each labour's default rate.
5. **Amounts** — `quantity × rate` in paise; sum per line; sum the estimate.

**Output:** a fully costed breakdown — primary quantity, material lines, labour lines,
amounts, and totals — with **no hardcoded numbers**. Re-running on the same inputs yields
the same result (idempotent recompute).

This is the exact API the BOQ / Procurement / Tendering layers call later.

---

## 6. UI — Excel / command-driven (operator layer)

Estimation and BOQ are **table-based, multi-level, keyboard-first** — not modal wizards
(contrast the Knowledge Bank's schema-mapper tables, which are the *authoring* layer).

- **Estimate grid:** rows are estimate lines. The estimator types/selects the **item**,
  the **specification**, and the **measurements** inline; Tab/Enter/arrow navigation like a
  spreadsheet.
- **Expandable derivation:** each line expands to show the auto-generated **material** and
  **labour** child rows (quantities + rates + amounts). The operator never hand-creates
  children — the engine does.
- **Formulas are hidden here.** They live in the Knowledge Bank (the expert/authoring
  layer); the estimator sees only measurements in, quantities + cost out.
- **Live totals:** per-line and estimate totals recompute as measurements change.

---

## 7. Rate resolution

Per the Knowledge Bank's rate intelligence layer:

- **Material:** preferred brand → most recent vendor rate whose `[effective_from,
  effective_to]` window covers today for the chosen location → the material's `default_rate`.
- **Labour:** the labour's `default_rate` (rate-type aware).
- The resolved rate + its source are stored on the derived resource row, so an issued BOQ
  remains explainable.

---

## 8. Versioning & freeze

- An estimate carries a **version**. Editing measurements in a DRAFT recomputes live.
- **Finalizing** snapshots the derivation (recipe + rates) onto each line and locks the
  version. Later Knowledge Bank edits do **not** alter a finalized estimate.
- A re-estimate is a **new version** off the previous one — history is never overwritten.

---

## 9. BOQ

The estimate's lines and their derived materials roll up into a **Bill of Quantities**,
grouped by item / cost head. The BOQ is the hand-off boundary to Procurement, Tendering,
and Construction Cost. It exports to **CSV and PDF**, and every line keeps its source
provenance (item, spec, measurements, rate source).

---

## 10. Build plan (sequential, after the Knowledge Bank foundation)

Each phase is a full slice per `CLAUDE.md` (schema + migration → `@esti/contracts` →
backend tRPC → Pure Carbon / Excel-like UI → verify → commit).

| Phase | Scope | Deliverable |
| --- | --- | --- |
| **E1 — Engine** | `esti_est_*` schema + the deterministic derivation engine (contracts, vitest) | Headless item + spec + measurements → costed breakdown |
| **E2 — Estimate grid** | Excel-like estimation grid (inline item/spec/measurements, expandable derived rows) | Operators estimate by typing measurements once |
| **E3 — Rates & cost** | Rate resolution wired to the KB vendor/default rates; per-line + estimate totals | Live cost, explainable to source |
| **E4 — BOQ** | BOQ rollup view + CSV / PDF export | The hand-off artifact |
| **E5 — Versioning** | Estimate versions + finalize/freeze with derivation snapshot | Reproducible, immutable issued estimates |
| **E6 — Downstream** | Expose the derivation/BOQ API to Procurement / Tendering / Cost | Future — separate OS docs |

**Prerequisite from the Knowledge Bank:** the formula engine (item formulas) and the
vendor-rate layer (Phase 4 of the KB plan) must exist for E1/E3 to resolve quantities and
rates end-to-end.

---

## 11. Conventions & guarantees

- **Determinism:** same inputs → same outputs; recompute is idempotent.
- **Money:** integer paise; format with `formatINR`.
- **Plan tier:** Core+ (a `PlanFeature` gate), consistent with the Knowledge Bank.
- **No re-keying:** measurements are entered once; everything downstream derives.
- **Explainability:** every derived number traces to an item, specification, recipe row,
  and rate source.

---

## 12. Out of scope (future, separate docs)

AI quantity prediction (natural-language → measured estimate), IFC / model-based takeoff
import, and the full Construction Cost lifecycle (tender → award → measurement book →
running bills → deviations → final accounts) are **not** part of this rebuild's initial
scope. They consume the Estimation OS's BOQ output and will be documented separately when
revived.

---

*Designed and developed by Holagundi Consulting Works.*
