# BBMP Compliance Engine — Implementation Guide

**Status:** Active · **Spec:** [`BYLAWS-BBMP.md`](./BYLAWS-BBMP.md) · **Two-system guide:** [`BYLAW-SYSTEMS.md`](./BYLAW-SYSTEMS.md) · **Reviewed:** 2026-06-15

This document maps the BBMP bye-law specification to what Esti implements today, records
architectural decisions, and lists remaining work.

---

## Spec structure

`BYLAWS-BBMP.md` is two documents in one file:

| Section | Lines (approx.) | Role |
|---------|-----------------|------|
| AI agent implementation spec | 1–760 | Target architecture: isolated engines, DB-sourced rules, audit trail |
| Reference + DDL appendix | 762–1997 | Statutory formulas, example queries, full Postgres DDL |

The spec uses generic table names (`esti_bylaw_version`, `esti_far_rule`, …). Esti uses
a BBMP-scoped naming convention (`esti_bbmp_*`) aligned with the knowledge-bank model.

---

## Architectural decisions

### 1. Rule set versioning

| Spec | Implemented |
|------|-------------|
| `esti_bylaw_version` | `esti_bbmp_rule_set` — label, effective date, status, `active` flag |

One active published rule set is loaded at calculation time. Historical rule sets are
never deleted; new versions are seeded or published alongside old ones.

### 2. Modular rule tables

All statutory values live in normalized tables keyed by `rule_set_id`:

| Domain | Table | Engine |
|--------|-------|--------|
| FAR + coverage | `esti_bbmp_far_rule` | FAR / coverage |
| Low-rise setbacks (Table 4) | `esti_bbmp_setback_lowrise_rule` | Setback |
| High-rise setbacks (Table 5) | `esti_bbmp_setback_highrise_rule` | Setback |
| Road centreline margins | `esti_bbmp_road_rule` | RBL |
| Parking ratios | `esti_bbmp_parking_rule` | Parking |
| Solar water heating | `esti_bbmp_solar_rule` | Secondary (future LPD lookup) |
| Sustainability / safety flags | `esti_bbmp_secondary_rule` | Secondary |
| Engine thresholds | `esti_bbmp_engine_constant` | All engines |

Migration `0033` created the first four tables. Migration `0036` adds parking, solar,
secondary, and engine-constant tables.

Code defaults in `packages/contracts/src/bbmp/rules.ts` mirror the seed rows so unit
tests and offline use work without a database.

### 3. Project input and result storage (intentional simplification)

The spec defines normalized tables:

```text
esti_project_bylaw_input → esti_project_road → esti_bylaw_calc_result
```

Esti uses **JSONB on existing project tables** instead:

| Spec | Implemented | Rationale |
|------|-------------|-----------|
| `esti_project_bylaw_input` | `esti_bylaw_calc.input` | One envelope calc per project; avoids migration churn |
| `esti_project_road` | Road sides embedded in input JSON | Same shape as RIE `SiteInputs` |
| `esti_bylaw_calc_result` | `esti_bylaw_calc.result` | Typed fields + `calculationTrace` + `compliance` in JSON |

RIE site assessments use `esti_site_assessment` with the same BBMP engine and
`bbmp_rule_set_id` pointer. Violations and relaxations remain RIE-specific.

### 4. Pure calculator + DB loader

```text
loadActiveBbmpRuleCatalog(db) → BbmpRuleCatalog
computeBbmpCompliance(input, catalog) → BbmpComplianceResult
```

Business logic never embeds municipal numbers. Constants (9.5 m low-rise cutoff,
basement heights, visitor parking %) are loaded from `esti_bbmp_engine_constant`.

Parking formulas are selected by `formula_key` on `esti_bbmp_parking_rule` rows.

---

## Engine pipeline (implemented)

Evaluation order matches `BYLAWS-BBMP.md` §1:

1. Resolve governing road width (max of abutting sides)
2. FAR lookup (with road-limited band logic when site and road bands disagree)
3. Coverage from matched FAR row
4. Setbacks — Table 4 (≤ lowrise height) or Table 5 (high-rise)
5. RBL per road-facing side (`max(bylaw, RBL)`)
6. Parking ECS (residential unit bands or commercial sqm/ECS)
7. Basement height / projection check
8. Secondary compliance flags (rainwater, trees, solar, earthquake)
9. Compliance validator when actual/proposed values are supplied
10. `calculationTrace` for audit

Entry points:

| Surface | Path | Notes |
|---------|------|-------|
| Knowledge Bank calculator | `bylawCalc.save` → `esti_bylaw_calc` | `ProjectBylawCalc` UI |
| RIE feasibility | `siteAssessments.create` → `esti_site_assessment` | Uses `runDevControl` → `computeBbmpCompliance` when authority is BBMP |
| Rule inspection | `bbmpRules.activeCatalog` | Read-only; Knowledge Bank FAR table |

---

## Result shape

`BbmpComplianceResult` (stored inside `esti_bylaw_calc.result` or mapped in RIE) includes:

- **Envelope:** `farAllowed`, `coverageAllowed`, `permissibleBuiltup`, `maxFootprint`, `setbacks`, `parking`
- **Compliance flags** (when actuals provided): `compliance.isFarCompliant`, …, `isOverallCompliant`
- **Audit:** `calculationTrace` — matched rule keys, lookup basis, per-side setback breakdown
- **Notes:** human-readable strings for UI

Optional input fields for POST-design validation:

- `totalFloorAreaSqm`, `exemptAreaSqm` — FAR actual
- `proposedGroundCoverPct` — coverage actual
- `actualSetbacks` — setback actual vs required
- `providedParkingEcs` — parking actual

---

## Not yet implemented

| Item | Spec reference | Notes |
|------|----------------|-------|
| Rule-set admin UI | Version lifecycle | Seed + read API only; no publish/edit screen |
| Normalized project I/O tables | `esti_project_bylaw_input` | Deferred — JSONB documented above |
| Hospital LPD solar lookup | `esti_solar_rule` | Table seeded; engine uses site-area trigger via secondary rules |
| Compliance PDF | RIE site assessment | Delivered via worker `target="compliance"` |
| Document PDFs (invoice, spec sheet, …) | Worker `render_pdf` | Requires object-store bucket — auto-provisioned at backend startup (2026-06-16) |
| Recalculate-all on rule publish | Recalculation rules | No background job |
| Multi-jurisdiction | Knowledge bank | BBMP-only modular engine; other authorities use RIE rule JSON |

---

## File map

| Layer | Path |
|-------|------|
| Spec | `docs/esti/BYLAWS-BBMP.md` |
| This guide | `docs/esti/BBMP-IMPLEMENTATION.md` |
| Pure engine | `packages/contracts/src/bbmp/` |
| Unit tests | `packages/contracts/src/bbmp.test.ts` |
| DB schema | `backend/src/db/schema/bbmp-rules.ts` |
| Migrations | `0033_bbmp_rule_engine.sql`, `0036_bbmp_extended_rules.sql` |
| Loader | `backend/src/lib/bbmpRules.ts` |
| API | `backend/src/modules/bylaw/bbmpRules.ts`, `calc.ts` |
| UI | `frontend/src/components/ProjectBylawCalc.tsx`, `knowledge/BbmpFarRuleTable.tsx` |

---

## Changing rules safely

1. Insert a new `esti_bbmp_rule_set` row (status `DRAFT`).
2. Copy rule rows from the active set; adjust values.
3. Set `status = 'PUBLISHED'`, flip `active` on the new set (deactivate the old one).
4. Existing calculations retain their `bbmp_rule_set_id`; re-save to recompute under the new set.

Never delete historical rule rows.
