# AI Agent Guidelines — Esti Bylaw Systems

**Status:** Active · **Implementation:** [`BBMP-IMPLEMENTATION.md`](./BBMP-IMPLEMENTATION.md) · **Engine spec:** [`BYLAWS-BBMP.md`](./BYLAWS-BBMP.md) · **Generic spec:** [`../holagundi/bylaws_compliance_engine_agent_spec.md`](../holagundi/bylaws_compliance_engine_agent_spec.md)

> **Phase 7 reconciliation (2026-06-25):** The **in-product, project-level bylaw
> calculator was removed** — the `bylawCalc` tRPC router, the
> `esti_bylaw_calc` / `esti_compliance_calculation` project-storage tables, the
> `ProjectBylawData.tsx` component, and the Project Info §9 Compliance accordion
> no longer exist. What remains is the **shared rule engine** (`computeBbmpCompliance`
> + `esti_bbmp_*` rule tables, surfaced via the `bbmpRules` namespace), the
> **office-side Knowledge Bank → Compliance tab** (`ComplianceHub`) for rule-set
> administration and RIE site assessments, and the **public stateless
> `/api/compliance/*` API**. Both "systems" below are now reached only through
> that public API and the office tools — there is no per-project persistence.

Build two bylaw workflows using **one shared rule engine**.

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
Public API      → backend/src/modules/compliance/publicApi.ts (/api/compliance/*)
Reports         → compliance PDF worker / RIE site assessment output
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

**Public stateless API:** `POST /api/compliance/pre-project`. The endpoint is
stateless — results are returned to the caller, not persisted on an Esti project.

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

**Public stateless API:** `POST /api/compliance/post-project`. Pre-construction
inputs are supplied in the same request — there is no stored pre-construction row
to read from.

---

## Shared rule engine

Both workflows use the same rule tables (Esti naming):

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

## Pre-construction output fields

Allowed FAR · Permissible built-up · Allowed coverage % · Maximum footprint · Front / rear /
left / right setback · Required parking ECS · Basement allowance · RWH · Solar · Tree · Seismic
requirements.

---

## Post-construction output fields

Actual FAR · Actual built-up · Actual coverage % · Actual setbacks · Actual parking · Violation
summary · Compliance status.

Each rule shows: allowed · actual · difference · pass/fail · reason · governed-by (setbacks).

---

## Rule administration & versioning

Rule sets are authored and published from the **Knowledge Bank → Compliance tab**
(`ComplianceHub`). Published `esti_bbmp_rule_set` versions feed every calculation,
and `calculationTrace` explanation JSON is returned with each result so a
calculation remains explainable against the rule version that produced it.

Recompute when site area, plot dimensions, road width, building height, project type,
development zone, built-up, footprint, setbacks, parking, or dwelling units change.

---

## Final architecture

**Office (Knowledge Bank → Compliance tab):** author and publish jurisdiction rule sets; run optional RIE site feasibility assessments.

**External API (`/api/compliance/*`):** stateless pre-project and post-project endpoints
for integrations. MVP supports Bengaluru / BBMP / residential only; unsupported cities
or project types return `INSUFFICIENT_DATA` with explicit errors.

```text
One shared bylaw rule engine (computeBbmpCompliance + DB catalog)
Two workflows (computePreConstructionPotential / computePostConstructionAudit)
Office rule library (KB Compliance tab) → published catalog feeds calculations
Stateless public API (/api/compliance/pre-project, /post-project, /check)
Versioned rules (esti_bbmp_rule_set + esti_rule_version)
Auditable results (calculationTrace returned per call)
PDF-ready output (RIE site assessment — issued from KB)
```

Pre-construction tells the caller **what can be built**.

Post-construction tells the caller **what has been violated**.
