# AI Agent Guidelines — Esti Bylaw Systems

**Status:** Active · **Implementation:** [`BBMP-IMPLEMENTATION.md`](./BBMP-IMPLEMENTATION.md) · **Engine spec:** [`BYLAWS-BBMP.md`](./BYLAWS-BBMP.md) · **Generic spec:** [`../holagundi/bylaws_compliance_engine_agent_spec.md`](../holagundi/bylaws_compliance_engine_agent_spec.md)

Build two bylaw systems using **one shared rule engine**.

---

## Core rule

Do not duplicate bylaw rules.

Use one shared database-driven rule engine for both:

1. **Pre-Construction Development Potential**
2. **Post-Construction Compliance / Violation Checker**

Implementation: `@hcw/india-compliance-kit` via `packages/contracts/src/bbmp/` —
`computePreConstructionPotential()` and `computePostConstructionAudit()` both call
`computeBbmpCompliance()` with the same `BbmpRuleCatalog` loaded from `esti_bbmp_*`
tables.

The architecture follows the generic city-wise compliance-engine spec:

```text
Rules data      → esti_bbmp_* rule tables / published rule-set versions
Calculation     → @hcw/india-compliance-kit pure calculators
City adapter    → backend/src/modules/compliance/workflows.ts
Project storage → esti_bylaw_calc latest row + esti_compliance_calculation snapshots
Reports         → compliance PDF worker / site assessment output
```

---

## System 1: Pre-Construction Development Potential

**Purpose:** Calculate how much area is legally available to develop before design or construction.

**Inputs:** Project type, development zone, site area, plot dimensions, road widths, road-facing
sides, building height proposal, occupancy / dwelling units.

**Outputs:** Allowed FAR, permissible built-up, coverage %, max footprint, setbacks (all sides),
parking ECS, basement rules, RWH / solar / tree / seismic requirements, buildable envelope summary.

This system **does not detect violations**. It answers:

```text
How much can we legally build?
```

**API:** `bylawCalc.save` → stores `input`, `result` (+ embedded `preConstruction`), `precomputed_at`
on `esti_bylaw_calc` (latest project row) and appends an immutable
`esti_compliance_calculation` snapshot.

**Public stateless API:** `POST /api/compliance/pre-project`.

---

## System 2: Post-Construction Compliance Checker

**Purpose:** Compare actual constructed or drawing values against allowed values.

**Inputs:** Actual built-up, FAR, footprint/coverage, setbacks, parking, basement, sustainability,
height and floors.

**Outputs:** Allowed vs actual, pass/fail, violation amount, severity, overall compliance status.

It answers:

```text
What has been violated?
```

Example audit parameter shape:

```json
{
  "far": {
    "allowed": 1.75,
    "actual": 2.10,
    "status": "failed",
    "violation": 0.35,
    "severity": "critical"
  },
  "builtupArea": {
    "allowed": 1750,
    "actual": 2100,
    "status": "failed",
    "violation": 350
  }
}
```

**API:** `bylawCalc.savePostConstruction` → stores `postconstruction_input`,
`postconstruction_audit`, `postcomputed_at` on the same project row (maps to spec
`esti_postconstruction_audit`) and appends an immutable `esti_compliance_calculation`
snapshot.

**Public stateless API:** `POST /api/compliance/post-project`.

Requires pre-construction save first.

---

## Shared rule engine

Both systems use the same rule tables (Esti naming):

```text
esti_bbmp_rule_set          (spec: esti_bylaw_version)
esti_bbmp_far_rule          (spec: esti_far_rule)
esti_bbmp_setback_lowrise_rule
esti_bbmp_setback_highrise_rule
esti_bbmp_road_rule         (spec: esti_road_margin_rule)
esti_bbmp_parking_rule
esti_bbmp_solar_rule
esti_bbmp_secondary_rule    (spec: esti_secondary_compliance_rule)
esti_bbmp_engine_constant
```

Do not hardcode municipal values in application logic.

---

## Rule conflict resolution

When multiple rules apply, use the **least-permissive** result:

| Parameter | Rule |
|-----------|------|
| FAR | minimum |
| Coverage | minimum |
| Setback | maximum |
| Parking | maximum |

Implemented in `lookupFarRuleResult()` (road-limited FAR) and `governingSetbackForSide()`
(`max(bylaw, RBL)`).

---

## Project data display

Computed values appear on the **Project Info** tab (`/projects/:id?tab=info#compliance`).

```text
Project Data
  ├── Site Information
  ├── Pre-Construction Development Potential
  ├── Post-Construction Compliance / Violations
  └── Compliance PDF (via RIE site assessment when issued)
```

Component: `frontend/src/components/ProjectBylawData.tsx`

Knowledge Bank retains full calculator + RIE for rule-set administration.

---

## Pre-construction display fields

Allowed FAR · Permissible built-up · Allowed coverage % · Maximum footprint · Front / rear /
left / right setback · Required parking ECS · Basement allowance · RWH · Solar · Tree · Seismic
requirements.

---

## Post-construction display fields

Actual FAR · Actual built-up · Actual coverage % · Actual setbacks · Actual parking · Violation
summary · Compliance status.

Each rule shows: allowed · actual · difference · pass/fail · reason · governed-by (setbacks).

---

## Data storage

| Spec table | Esti implementation |
|------------|---------------------|
| `esti_project_bylaw_input` | `esti_bylaw_calc.input` (JSONB) |
| `esti_preconstruction_calc` | `esti_bylaw_calc.result` + `precomputed_at` |
| `esti_postconstruction_audit` | `esti_bylaw_calc.postconstruction_*` + `postcomputed_at` |
| `compliance_calculations` | `esti_compliance_calculation` immutable snapshots |
| `esti_bylaw_calc_result` | Embedded in `result.preConstruction` + `postconstruction_audit.calculationTrace`; copied into `esti_compliance_calculation.result_json` |

Every save stores **explanation JSON** (`calculationTrace`) for auditability.
Snapshots also store **input JSON**, **result JSON**, **mode**, **rule version**, and
timestamp so old project calculations remain explainable after rules change.

---

## Recalculation rules

Recompute when site area, plot dimensions, road width, building height, project type, development
zone, built-up, footprint, setbacks, parking, or dwelling units change.

- Pre-construction: user saves via **Project Info** §9 Compliance → `bylawCalc.save`
- Post-construction: user saves actuals → `bylawCalc.savePostConstruction` (re-runs audit against
  latest pre-construction allowed values)

No stale post-construction audit without re-save after pre-construction changes.

---

## Final architecture

**Office (Knowledge Bank → Compliance tab):** author and publish jurisdiction rule sets; run optional site feasibility assessments.

**Project (Project Info → §9 Compliance):** calculate development envelope and post-construction audit; store results on the project; statutory permits.

**External API (`/api/compliance/*`):** stateless pre-project and post-project endpoints
for integrations. MVP supports Bengaluru / BBMP / residential only; unsupported cities
or project types return `INSUFFICIENT_DATA` with explicit errors.

```text
One shared bylaw rule engine (computeBbmpCompliance + DB catalog)
Two workflows (computePreConstructionPotential / computePostConstructionAudit)
Office rule library (KB Compliance tab) → published catalog feeds project calculations
One project-level display (Project Info §9 Compliance accordion)
Versioned rules (esti_bbmp_rule_set + esti_rule_version)
Auditable results (calculationTrace + postconstruction_audit + immutable snapshots)
PDF-ready output (site assessment — issued from KB, linked from project)
```

Pre-construction tells the user **what can be built**.

Post-construction tells the user **what has been violated**.

Both results appear directly inside project data.
