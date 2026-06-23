# Indian City Bylaws Compliance Engine — AI Agent Implementation Spec

## 1. Product Goal

Build a reusable bylaws compliance engine for Indian cities. The engine will be called by an external Project API and will calculate building feasibility, permissible development scope, and post-construction violations based on city-specific building bylaws.

The engine must support two major workflows:

1. **Pre-Project Planning**
   - Determine what can legally be built on a plot.
   - Calculate permitted FAR/FSI, maximum built-up area, required setbacks, height limits, parking requirements, and additional/purchasable FAR where applicable.

2. **Post-Project Audit**
   - Compare approved/projected values against actual constructed values.
   - Calculate violation percentages, excess area, setback shortfall, height deviation, parking shortage, and regularizable/non-regularizable violation status.

The system should be designed as a city-wise rules engine, not as hard-coded business logic scattered across the API.

---

## 2. Core Principle

The engine must separate:

- **Rules data**: city-specific bylaw values, tables, thresholds, limits, formulas, charges.
- **Calculation logic**: generic reusable algorithms for FAR, setbacks, height, parking, violations.
- **City adapters**: mapping logic for each city where rules differ.
- **Reports**: structured output with traceability to rules and versions.

Every calculated result must include a rule reference and rule version.

Old project calculations must be stored as snapshots because bylaws change over time.

---

## 3. Recommended Repository Structure

Use one monorepo. Do not create a separate repository for every city.

```txt
urban-compliance-engine/
  README.md
  package.json
  tsconfig.json

  src/
    api/
      compliance.controller.ts
      routes.ts

    core/
      engine.ts
      types.ts
      result.ts
      errors.ts
      unit-normalizer.ts
      rule-loader.ts
      calculation-trace.ts

    workflows/
      pre-project.workflow.ts
      post-project.workflow.ts

    checks/
      far.check.ts
      setback.check.ts
      height.check.ts
      parking.check.ts
      additional-far.check.ts
      violation.check.ts

    cities/
      bangalore/
        index.ts
        rules.yaml
        sources.md
      delhi/
        index.ts
        rules.yaml
        sources.md
      mumbai/
        index.ts
        rules.yaml
        sources.md

    reports/
      compliance-report.ts
      pdf-report.ts

    tests/
      far.test.ts
      setback.test.ts
      pre-project.test.ts
      post-project.test.ts
```

---

## 4. Engine Modes

The engine must support these calculation modes:

```ts
export enum ComplianceMode {
  PRE_PROJECT_PLANNING = 'PRE_PROJECT_PLANNING',
  POST_PROJECT_AUDIT = 'POST_PROJECT_AUDIT'
}
```

### 4.1 Pre-Project Planning

Purpose:

```txt
Given a plot and project type, calculate what is legally possible.
```

The engine should calculate:

- Base FAR/FSI
- Maximum permissible built-up area
- Additional or purchasable FAR eligibility
- Total possible FAR after premium/additional FAR
- Required setbacks
- Maximum height
- Parking requirement
- Approximate project scope
- Warnings and constraints

### 4.2 Post-Project Audit

Purpose:

```txt
Given approved values and actual constructed values, calculate violation percentages.
```

The engine should calculate:

- FAR violation
- Built-up area excess
- Height violation
- Front/rear/side setback violation
- Parking shortage
- Coverage violation
- Regularizable/non-regularizable status
- Penalty/compounding estimate where rules allow

---

## 5. API Endpoints

The compliance engine should expose stateless HTTP APIs.

### 5.1 Pre-Project API

```txt
POST /compliance/pre-project
```

Request:

```json
{
  "city": "bangalore",
  "authority": "bbmp",
  "projectType": "residential",
  "plot": {
    "areaSqm": 1200,
    "roadWidthM": 12,
    "zone": "residential",
    "plotDepthM": 40,
    "plotWidthM": 30
  },
  "proposalPreferences": {
    "wantsAdditionalFar": true,
    "targetBuiltUpAreaSqm": 2600,
    "targetFloors": 4
  }
}
```

Response:

```json
{
  "mode": "PRE_PROJECT_PLANNING",
  "city": "bangalore",
  "authority": "bbmp",
  "ruleVersion": "bangalore-2026-01",
  "status": "FEASIBLE_WITH_CONSTRAINTS",
  "results": {
    "far": {
      "baseFar": 2.0,
      "additionalFarAvailable": true,
      "additionalFar": 0.25,
      "totalPermissibleFar": 2.25,
      "maxBuiltUpAreaSqm": 2700
    },
    "setbacks": {
      "frontM": 3,
      "rearM": 2,
      "sideLeftM": 1.5,
      "sideRightM": 1.5
    },
    "height": {
      "maxHeightM": 15
    },
    "parking": {
      "requiredCarSpaces": 12
    }
  },
  "warnings": [
    "Additional FAR may require payment and authority approval."
  ],
  "trace": [
    {
      "check": "FAR",
      "ruleId": "BLR_FAR_ROAD_WIDTH_RESIDENTIAL",
      "source": "cities/bangalore/sources.md",
      "message": "Road width 12m matched FAR slab 12m-18m."
    }
  ]
}
```

### 5.2 Post-Project API

```txt
POST /compliance/post-project
```

Request:

```json
{
  "city": "bangalore",
  "authority": "bbmp",
  "projectType": "residential",
  "plot": {
    "areaSqm": 1200,
    "roadWidthM": 12,
    "zone": "residential"
  },
  "approved": {
    "builtUpAreaSqm": 2400,
    "far": 2.0,
    "heightM": 14,
    "frontSetbackM": 3,
    "rearSetbackM": 2,
    "sideLeftSetbackM": 1.5,
    "sideRightSetbackM": 1.5,
    "parkingSpaces": 12
  },
  "actual": {
    "builtUpAreaSqm": 2600,
    "heightM": 15,
    "frontSetbackM": 2.4,
    "rearSetbackM": 2,
    "sideLeftSetbackM": 1.2,
    "sideRightSetbackM": 1.5,
    "parkingSpaces": 10
  }
}
```

Response:

```json
{
  "mode": "POST_PROJECT_AUDIT",
  "city": "bangalore",
  "authority": "bbmp",
  "ruleVersion": "bangalore-2026-01",
  "overallStatus": "VIOLATION_FOUND",
  "violations": {
    "far": {
      "approvedSqm": 2400,
      "actualSqm": 2600,
      "excessSqm": 200,
      "violationPercent": 8.33,
      "status": "FAILED"
    },
    "height": {
      "approvedM": 14,
      "actualM": 15,
      "excessM": 1,
      "violationPercent": 7.14,
      "status": "FAILED"
    },
    "frontSetback": {
      "requiredM": 3,
      "actualM": 2.4,
      "shortfallM": 0.6,
      "violationPercent": 20,
      "status": "FAILED"
    },
    "parking": {
      "requiredSpaces": 12,
      "actualSpaces": 10,
      "shortfallSpaces": 2,
      "violationPercent": 16.67,
      "status": "FAILED"
    }
  },
  "regularization": {
    "mayBeRegularizable": true,
    "reason": "Deviation is within configured city threshold. Final decision requires authority validation."
  },
  "trace": [
    {
      "check": "FAR_VIOLATION",
      "ruleId": "GENERIC_FAR_VIOLATION_PERCENT",
      "formula": "((actual - approved) / approved) * 100"
    }
  ]
}
```

---

## 6. Domain Types

Create these TypeScript interfaces.

```ts
export type CityCode = 'bangalore' | 'delhi' | 'mumbai' | 'hyderabad' | 'chennai';

export type ProjectType =
  | 'residential'
  | 'commercial'
  | 'mixed_use'
  | 'industrial'
  | 'institutional';

export interface PlotInput {
  areaSqm: number;
  roadWidthM: number;
  zone: string;
  plotWidthM?: number;
  plotDepthM?: number;
}

export interface ApprovedBuildingInput {
  builtUpAreaSqm?: number;
  far?: number;
  heightM?: number;
  frontSetbackM?: number;
  rearSetbackM?: number;
  sideLeftSetbackM?: number;
  sideRightSetbackM?: number;
  parkingSpaces?: number;
}

export interface ActualBuildingInput {
  builtUpAreaSqm?: number;
  heightM?: number;
  frontSetbackM?: number;
  rearSetbackM?: number;
  sideLeftSetbackM?: number;
  sideRightSetbackM?: number;
  parkingSpaces?: number;
}

export interface PreProjectInput {
  city: CityCode;
  authority: string;
  projectType: ProjectType;
  plot: PlotInput;
  proposalPreferences?: {
    wantsAdditionalFar?: boolean;
    targetBuiltUpAreaSqm?: number;
    targetFloors?: number;
  };
}

export interface PostProjectInput {
  city: CityCode;
  authority: string;
  projectType: ProjectType;
  plot: PlotInput;
  approved: ApprovedBuildingInput;
  actual: ActualBuildingInput;
}
```

---

## 7. Rule File Format

Each city should have its own `rules.yaml`.

Example:

```yaml
city: bangalore
authority: bbmp
ruleVersion: bangalore-2026-01
unitSystem: metric

far:
  residential:
    byRoadWidth:
      - id: BLR_FAR_RES_9_12
        roadMinM: 9
        roadMaxM: 12
        baseFar: 1.75
      - id: BLR_FAR_RES_12_18
        roadMinM: 12
        roadMaxM: 18
        baseFar: 2.0

additionalFar:
  residential:
    enabled: true
    maxAdditionalFar: 0.25
    conditions:
      minRoadWidthM: 12

setbacks:
  residential:
    default:
      frontM: 3
      rearM: 2
      sideLeftM: 1.5
      sideRightM: 1.5

height:
  residential:
    maxHeightM: 15

parking:
  residential:
    carSpacesPer100Sqm: 0.5

regularization:
  maxFarDeviationPercent: 10
  maxHeightDeviationPercent: 5
  maxSetbackDeviationPercent: 15
```

Important: the example values are placeholders. Replace them with official city bylaw values before production use.

---

## 8. Calculation Rules

### 8.1 FAR / FSI

Formula:

```txt
proposedFar = proposedBuiltUpAreaSqm / plotAreaSqm
```

```txt
maxBuiltUpAreaSqm = plotAreaSqm * permissibleFar
```

### 8.2 Additional FAR

Formula:

```txt
totalPermissibleFar = baseFar + eligibleAdditionalFar
```

Additional FAR must check city-specific conditions:

- Minimum road width
- Plot area threshold
- Zone eligibility
- Project type eligibility
- Payment/premium requirement
- Transit-oriented development eligibility, if applicable

### 8.3 FAR Violation

Formula:

```txt
excessBuiltUpAreaSqm = actualBuiltUpAreaSqm - approvedBuiltUpAreaSqm
```

```txt
violationPercent = (excessBuiltUpAreaSqm / approvedBuiltUpAreaSqm) * 100
```

If comparing against permissible bylaw limit instead of approval:

```txt
violationPercent = ((actualBuiltUpAreaSqm - allowedBuiltUpAreaSqm) / allowedBuiltUpAreaSqm) * 100
```

### 8.4 Setback Violation

Formula:

```txt
shortfallM = requiredSetbackM - actualSetbackM
```

```txt
violationPercent = (shortfallM / requiredSetbackM) * 100
```

If `actualSetbackM >= requiredSetbackM`, violation is zero.

### 8.5 Height Violation

Formula:

```txt
excessHeightM = actualHeightM - approvedOrAllowedHeightM
```

```txt
violationPercent = (excessHeightM / approvedOrAllowedHeightM) * 100
```

### 8.6 Parking Violation

Formula:

```txt
requiredSpaces = ceil(builtUpAreaSqm * parkingRate)
```

```txt
shortfallSpaces = requiredSpaces - actualSpaces
```

```txt
violationPercent = (shortfallSpaces / requiredSpaces) * 100
```

---

## 9. Engine Interface

```ts
export interface ComplianceEngine {
  calculatePreProject(input: PreProjectInput): PreProjectResult;
  calculatePostProject(input: PostProjectInput): PostProjectResult;
}
```

Implementation sketch:

```ts
export class DefaultComplianceEngine implements ComplianceEngine {
  constructor(private readonly ruleLoader: RuleLoader) {}

  calculatePreProject(input: PreProjectInput): PreProjectResult {
    const rules = this.ruleLoader.load(input.city, input.authority);
    const normalized = normalizePreProjectInput(input);

    const far = calculateFarCapacity(normalized, rules);
    const additionalFar = calculateAdditionalFar(normalized, rules);
    const setbacks = calculateRequiredSetbacks(normalized, rules);
    const height = calculateHeightLimit(normalized, rules);
    const parking = calculateParkingRequirement(normalized, rules, far.maxBuiltUpAreaSqm);

    return buildPreProjectResult({
      input: normalized,
      rules,
      far,
      additionalFar,
      setbacks,
      height,
      parking
    });
  }

  calculatePostProject(input: PostProjectInput): PostProjectResult {
    const rules = this.ruleLoader.load(input.city, input.authority);
    const normalized = normalizePostProjectInput(input);

    const farViolation = calculateFarViolation(normalized, rules);
    const setbackViolations = calculateSetbackViolations(normalized, rules);
    const heightViolation = calculateHeightViolation(normalized, rules);
    const parkingViolation = calculateParkingViolation(normalized, rules);
    const regularization = evaluateRegularization([
      farViolation,
      ...setbackViolations,
      heightViolation,
      parkingViolation
    ], rules);

    return buildPostProjectResult({
      input: normalized,
      rules,
      violations: [
        farViolation,
        ...setbackViolations,
        heightViolation,
        parkingViolation
      ],
      regularization
    });
  }
}
```

---

## 10. Result Statuses

Use consistent statuses.

```ts
export type CheckStatus = 'PASSED' | 'FAILED' | 'WARNING' | 'NOT_APPLICABLE' | 'INSUFFICIENT_DATA';

export type OverallStatus =
  | 'COMPLIANT'
  | 'VIOLATION_FOUND'
  | 'FEASIBLE'
  | 'FEASIBLE_WITH_CONSTRAINTS'
  | 'NOT_FEASIBLE'
  | 'INSUFFICIENT_DATA';
```

---

## 11. Calculation Trace

Every check must produce a trace.

```ts
export interface CalculationTrace {
  check: string;
  ruleId: string;
  ruleVersion: string;
  source?: string;
  formula?: string;
  inputs?: Record<string, number | string | boolean>;
  result?: Record<string, number | string | boolean>;
  message: string;
}
```

Example:

```json
{
  "check": "SETBACK_FRONT",
  "ruleId": "BLR_RES_FRONT_SETBACK_DEFAULT",
  "ruleVersion": "bangalore-2026-01",
  "formula": "((required - actual) / required) * 100",
  "inputs": {
    "required": 3,
    "actual": 2.4
  },
  "result": {
    "shortfallM": 0.6,
    "violationPercent": 20
  },
  "message": "Front setback is short by 0.6m."
}
```

---

## 12. Database Storage in Main Project System

The external Project API should store calculation snapshots.

Suggested tables:

```txt
projects
  id
  city
  authority
  project_type
  plot_area_sqm
  road_width_m
  zone

compliance_calculations
  id
  project_id
  mode
  rule_version
  input_json
  result_json
  overall_status
  created_at

compliance_reports
  id
  calculation_id
  report_url
  created_at
```

Do not store only the final numbers. Store:

- Input JSON
- Rule version
- Full result JSON
- Trace JSON
- Timestamp

This protects historical calculations when rules change.

---

## 13. Validation Rules

The engine must reject bad input clearly.

Examples:

- Plot area must be greater than zero.
- Road width must be greater than zero.
- City must be supported.
- Project type must be supported by city rules.
- Actual values are required in post-project mode.
- Approved values are required when calculating approval-based violations.

Return:

```json
{
  "status": "INSUFFICIENT_DATA",
  "errors": [
    {
      "field": "plot.areaSqm",
      "message": "Plot area is required and must be greater than zero."
    }
  ]
}
```

---

## 14. Testing Strategy

Create tests for each calculator.

### 14.1 FAR Test

```txt
Given plot area = 1200 sqm
And FAR = 2.0
Then max built-up area = 2400 sqm
```

### 14.2 FAR Violation Test

```txt
Given approved built-up area = 2400 sqm
And actual built-up area = 2600 sqm
Then excess = 200 sqm
And violation percentage = 8.33%
```

### 14.3 Setback Violation Test

```txt
Given required front setback = 3m
And actual front setback = 2.4m
Then shortfall = 0.6m
And violation percentage = 20%
```

### 14.4 Pre-Project Test

```txt
Given a valid Bengaluru residential plot
When pre-project calculation is run
Then engine returns permissible FAR, max built-up area, setbacks, height, and parking.
```

### 14.5 Post-Project Test

```txt
Given approved and actual construction data
When post-project audit is run
Then engine returns all violations and overall status.
```

---

## 15. Implementation Order for AI Agent

Build in this order:

1. Create TypeScript project structure.
2. Define domain types.
3. Implement YAML rule loader.
4. Add one city: `bangalore` with placeholder rules.
5. Implement FAR calculator.
6. Implement setback calculator.
7. Implement height calculator.
8. Implement parking calculator.
9. Implement violation calculator.
10. Implement pre-project workflow.
11. Implement post-project workflow.
12. Expose APIs.
13. Add calculation trace.
14. Add unit tests.
15. Add PDF/report generator later.

Do not start with every city. Start with one city and make the engine clean.

---

## 16. Important Engineering Decisions

### 16.1 Same Engine, Two Workflows

Do not build separate engines for pre-project and post-project.

Use one rule system and one calculation core.

```txt
Rules + Calculators
  ├── Pre-project workflow
  └── Post-project workflow
```

### 16.2 Rules Must Be Versioned

Every city rule file must have a version.

```yaml
ruleVersion: bangalore-2026-01
```

### 16.3 City Logic Must Be Isolated

If a city needs special logic, put it under:

```txt
src/cities/{city}/index.ts
```

Do not pollute the generic calculators with city-specific hacks.

### 16.4 Never Hide Assumptions

If the engine uses a placeholder, default, or estimated value, include a warning.

Example:

```json
{
  "warnings": [
    "Parking calculation used default residential rate because exact sub-category was not provided."
  ]
}
```

---

## 17. Non-Goals for Version 1

Do not build these in v1:

- Full GIS shape validation
- Auto-reading CAD drawings
- Auto-reading sanctioned plans
- Legal final certification
- All Indian cities
- Complex land-use conversion logic
- Payment gateway for purchasable FAR

Version 1 should be a deterministic calculation engine.

---

## 18. MVP Definition

MVP should support:

- One city
- One authority
- Residential project type
- Pre-project feasibility calculation
- Post-project violation calculation
- FAR
- Setbacks
- Height
- Parking
- Rule trace
- JSON API
- Unit tests

MVP success example:

```txt
Given a Bengaluru residential plot, the engine calculates:
- allowed FAR
- max built-up area
- required setbacks
- max height
- parking requirement
- actual violations after construction
- violation percentages
- rule trace
```

---

## 19. Naming Suggestions

Repository:

```txt
urban-compliance-engine
```

Package:

```txt
@your-org/urban-compliance-engine
```

Main class:

```ts
DefaultComplianceEngine
```

Main functions:

```ts
calculatePreProject(input)
calculatePostProject(input)
```

---

## 20. Final Instruction to Coding Agent

Build this as a clean, testable, deterministic TypeScript rules engine.

Prioritize correctness, traceability, and extensibility over clever abstractions.

Do not hard-code city rules into generic functions.

Every calculation must be explainable.

Every result must carry rule version and trace.

Start with one city only, then scale city by city.
