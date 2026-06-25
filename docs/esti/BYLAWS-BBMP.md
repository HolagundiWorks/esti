# Esti Bylaw Compliance Engine — AI Agent Implementation Specification

> **Implementation status:** See [`BBMP-IMPLEMENTATION.md`](./BBMP-IMPLEMENTATION.md) for what is
> built in Esti vs this spec, architectural decisions, and remaining work.
>
> **Phase 7 reconciliation (2026-06-25):** This file is the **target spec**, retained
> as reference. The per-project persistence it describes (`esti_project_bylaw_input`,
> `esti_bylaw_calc_result`, `compliance_calculations`) was **not** kept as an
> in-product calculator — Phase 7 removed that surface. The live engine is exercised
> statelessly via the public `/api/compliance/*` API and persisted only through RIE
> site assessments. Treat the DDL/storage sections below as spec, not current schema.

You are building a **rule-driven building compliance engine** for an architecture/construction platform called **Esti**.

Your job is to compute municipal building compliance constraints based on **Bangalore Mahanagara Palike Building Bye-Laws 2003**.

This is **not a simple CRUD system**.

This is a **deterministic calculation engine** that reads statutory rules from normalized database tables and computes the legally permissible building envelope for a project.

The engine must be modular, versioned, auditable, and recomputable whenever project parameters change.

---

# Primary Goal

For every project, compute the legally permissible building envelope.

The engine should calculate:

* Maximum permissible FAR
* Maximum ground coverage
* Governing setback on all four sides
* Parking requirement (ECS)
* Basement compliance
* Sustainability compliance
* Final overall compliance status

Output should be stored and attached to the project.

---

# System Philosophy

Do NOT hardcode municipal rules in business logic.

All bylaw rules must be stored in database tables.

Reason:

Municipal regulations change over time.

Examples:

* FAR changes
* Parking ratios change
* Setback tables change
* Road restrictions change

Therefore:

```text
Business logic = Generic calculator

Database = Rule source
```

Never mix these.

---

# Architecture Overview

System architecture:

```text
Project Inputs

↓

Rule Resolution Engine

↓

FAR Engine

↓

Coverage Engine

↓

Setback Engine

↓

Road Restriction Engine (RBL)

↓

Parking Engine

↓

Secondary Compliance Engine

↓

Compliance Validator

↓

Store Final Calculation
```

Each engine works independently.

---

# Core Database Architecture

The system uses modular rule tables.

Never use one giant table.

Tables:

```text
esti_bylaw_version

esti_far_rule

esti_setback_lowrise_rule

esti_setback_highrise_rule

esti_road_margin_rule

esti_parking_rule

esti_solar_rule

esti_secondary_compliance_rule

esti_project_bylaw_input

esti_project_road

esti_bylaw_calc_result
```

---

# Rule Versioning

All rules are versioned.

Example:

```text
BMP 2003

BBMP Revised 2007

RMP 2015

BDA 2020
```

Every rule table references:

```text
version_id
```

This allows:

* historical calculations
* recalculation under new rules
* auditability

Never delete old rules.

Deactivate them.

---

# Engine 1 — FAR Engine

Purpose:

Determine maximum permissible FAR.

Formula:

```text
FAR = Total Covered Area / Plot Area
```

Logic:

Find matching FAR rule.

Lookup criteria:

```text
development_area

project_type

site_area range

road_width range
```

Example query:

```sql
SELECT *
FROM esti_far_rule
WHERE version_id = ?
AND development_area = ?
AND project_type = ?
AND site_area >= site_area_min
AND site_area <= site_area_max
AND road_width >= road_width_min
AND road_width <= road_width_max
```

Output:

```text
governing_far
```

Calculate:

```text
permissibleBuiltup = siteArea × governingFar
```

Exclude FAR exempt areas.

Excluded:

* parking
* ramps
* lift rooms
* staircases
* ducts
* balconies
* machine rooms

---

# Engine 2 — Coverage Engine

Purpose:

Determine maximum footprint.

Formula:

```text
coverage = footprint / siteArea
```

Lookup:

Use same FAR rule table.

Get:

```text
max_coverage_pct
```

Calculate:

```text
maxFootprint = siteArea × coveragePct / 100
```

Exclude:

* courtyards
* gardens
* wells
* open swimming pools
* compound walls

Output:

```text
maxFootprint
```

---

# Engine 3 — Setback Engine

Two modes.

---

## Low-rise mode

Condition:

```text
buildingHeight ≤ 9.5m
```

Use:

```text
esti_setback_lowrise_rule
```

Lookup based on:

```text
plot depth

plot width
```

Rules:

```text
front + rear → depth

left + right → width
```

Output:

```text
front setback

rear setback

left setback

right setback
```

---

## High-rise mode

Condition:

```text
buildingHeight > 9.5m
```

Use:

```text
esti_setback_highrise_rule
```

Lookup:

```text
height range
```

Output:

```text
uniform setback all sides
```

Example:

```text
15m height → 6m setback all sides
```

---

# Engine 4 — Road Restriction Engine (RBL)

Purpose:

Road-facing setbacks may become larger.

Road centerline restriction overrides normal setback.

Formula:

```text
rblFromCentre = (roadWidth / 2) + roadMargin
```

```text
rblSetback =
max(
0,
rblFromCentre - distanceCentreToBoundary
)
```

Final setback:

```text
governingSetback =
max(
tableSetback,
rblSetback
)
```

Apply independently to each side.

Sides:

```text
Front

Rear

Left

Right
```

Only road-facing sides apply RBL.

Neighbor-facing sides use normal setback.

---

# Engine 5 — Parking Engine

Purpose:

Determine required parking.

Unit:

```text
1 ECS = 18 sqm
```

Use:

```text
esti_parking_rule
```

---

## Residential Logic

Rule:

```text
50–150 sqm → 1 ECS per dwelling
```

Rule:

```text
Above 150 sqm

1 ECS + 1 ECS for every extra 100 sqm
```

Pseudo code:

```python
if unitArea <=150:

   ecs = dwellingUnits

else:

   ecs =
      dwellingUnits
      +
      floor((unitArea-150)/100)
```

---

## Commercial Logic

Rule:

```text
1 ECS per 50 sqm builtup
```

Formula:

```text
ecs = ceil(builtupArea / 50)
```

Visitor parking:

```text
10% additional
```

Output:

```text
required_ecs

visitor_ecs

total_ecs
```

---

# Engine 6 — Secondary Compliance Engine

Boolean compliance rules.

---

## Rainwater Harvesting

Condition:

```text
plinthArea >100 sqm

AND

siteArea >200 sqm
```

---

## Tree Planting

Condition:

```text
siteArea >200 sqm
```

Requirement:

```text
2 trees minimum
```

---

## Solar Water Heater

Lookup:

```text
esti_solar_rule
```

Example:

```text
Hospital → 100 liters per day per 4 beds
```

---

## Earthquake Safety

Condition:

```text
height >=15m

OR

floors >= G+4
```

Requirement:

```text
IS 1893 compliance
```

---

# Final Compliance Validator

After all engines run:

Compare actual values against permissible values.

Checks:

```text
actual FAR ≤ governing FAR

actual coverage ≤ max coverage

actual setbacks ≥ required setbacks

actual parking ≥ required ECS
```

Output:

```text
isFarCompliant

isCoverageCompliant

isSetbackCompliant

isParkingCompliant

isOverallCompliant
```

---

# Calculation Storage

Store final calculation in:

```text
esti_bylaw_calc_result
```

Store:

* governing FAR
* permissible builtup
* coverage
* setbacks
* parking
* secondary compliance
* final compliance status

Store explanation JSON.

Example:

```json
{
  "frontSetback": {
    "required": 6,
    "actual": 7,
    "governedBy": "RBL"
  }
}
```

Purpose:

Audit trail.

---

# Recalculation Rules

Whenever any project parameter changes:

* site area changes
* road width changes
* building height changes
* project type changes
* occupancy changes

System MUST recompute everything.

Never store stale calculations.

---

# Engineering Rules

Mandatory rules.

---

Do NOT hardcode values.

Bad:

```python
if roadWidth > 15:

    far = 1.75
```

Never do this.

---

Always read from database.

Good:

```python
rule = findMatchingFarRule(...)
```

---

Each engine must be isolated.

Do NOT combine calculations.

Bad:

```python
calculateEverything()
```

Good:

```text
calculateFar()

calculateCoverage()

calculateSetbacks()

calculateParking()

calculateSecondaryCompliance()
```

---

Every calculation must be explainable.

Store:

```text
which rule matched

why rule matched

formula used

intermediate values
```

System must be auditable.

Municipal compliance requires traceability.

---

Think of this system like:

```text
Tax calculation engine

Insurance underwriting engine

Government compliance engine
```

Not a spreadsheet.

Precision matters.


CREATE TYPE project_type AS ENUM (
  'Residential',
  'Commercial',
  'SemiPublic',
  'PublicBuilding'
);

CREATE TYPE development_area AS ENUM (
  'A',
  'B',
  'C'
);

CREATE TYPE road_side AS ENUM (
  'Front',
  'Rear',
  'Left',
  'Right'
);

CREATE TYPE road_class AS ENUM (
  'NH',
  'SH',
  'Arterial',
  'Collector',
  'Local'
);

CREATE TABLE esti_bylaw_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  authority TEXT NOT NULL,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_far_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  development_area development_area NOT NULL,
  project_type project_type NOT NULL,

  site_area_min NUMERIC(12,2),
  site_area_max NUMERIC(12,2),

  road_width_min NUMERIC(8,2),
  road_width_max NUMERIC(8,2),

  max_far NUMERIC(6,2) NOT NULL,
  max_coverage_pct NUMERIC(5,2) NOT NULL,

  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_setback_lowrise_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  project_type project_type NOT NULL,

  depth_min NUMERIC(8,2),
  depth_max NUMERIC(8,2),

  width_min NUMERIC(8,2),
  width_max NUMERIC(8,2),

  front_setback_m NUMERIC(6,2) NOT NULL,
  rear_setback_m NUMERIC(6,2) NOT NULL,
  left_setback_m NUMERIC(6,2) NOT NULL,
  right_setback_m NUMERIC(6,2) NOT NULL,

  max_height_m NUMERIC(6,2) DEFAULT 9.50,

  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_setback_highrise_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  project_type project_type NOT NULL,

  height_min_m NUMERIC(6,2),
  height_max_m NUMERIC(6,2),

  uniform_setback_m NUMERIC(6,2) NOT NULL,

  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_road_margin_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  road_class road_class NOT NULL,
  road_margin_m NUMERIC(6,2) NOT NULL,

  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (version_id, road_class)
);

CREATE TABLE esti_parking_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  project_type project_type NOT NULL,
  use_category TEXT NOT NULL,

  unit_area_min NUMERIC(10,2),
  unit_area_max NUMERIC(10,2),

  floor_area_min NUMERIC(12,2),
  floor_area_max NUMERIC(12,2),

  ecs_per_unit NUMERIC(8,3),
  ecs_per_sqm NUMERIC(8,5),
  sqm_per_ecs NUMERIC(8,2),

  visitor_parking_pct NUMERIC(5,2) DEFAULT 0,

  formula_key TEXT,
  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_solar_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  occupancy_type TEXT NOT NULL,
  lpd_required NUMERIC(10,2) NOT NULL,
  basis TEXT NOT NULL,

  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_secondary_compliance_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  rule_key TEXT NOT NULL,
  description TEXT NOT NULL,

  site_area_min NUMERIC(12,2),
  plinth_area_min NUMERIC(12,2),
  height_min_m NUMERIC(8,2),
  floors_min INTEGER,

  requirement_json JSONB NOT NULL,

  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_project_bylaw_input (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,

  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  project_type project_type NOT NULL,
  development_area development_area NOT NULL,

  site_area_sqm NUMERIC(12,2) NOT NULL,
  plot_length_m NUMERIC(10,2),
  plot_width_m NUMERIC(10,2),
  plot_depth_m NUMERIC(10,2),

  building_height_m NUMERIC(8,2),
  floors_count INTEGER,

  total_floor_area_sqm NUMERIC(12,2),
  exempt_far_area_sqm NUMERIC(12,2) DEFAULT 0,
  ground_footprint_sqm NUMERIC(12,2),
  plinth_area_sqm NUMERIC(12,2),

  dwelling_units INTEGER,
  average_unit_area_sqm NUMERIC(10,2),
  occupancy_load INTEGER,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_project_road (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  bylaw_input_id UUID NOT NULL
    REFERENCES esti_project_bylaw_input(id)
    ON DELETE CASCADE,

  side road_side NOT NULL,
  road_width_m NUMERIC(8,2) NOT NULL,
  road_length_m NUMERIC(10,2),
  road_class road_class NOT NULL,

  distance_centre_to_boundary_m NUMERIC(8,2),

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (bylaw_input_id, side)
);

CREATE TABLE esti_bylaw_calc_result (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  bylaw_input_id UUID NOT NULL
    REFERENCES esti_project_bylaw_input(id)
    ON DELETE CASCADE,

  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  governing_far NUMERIC(6,2),
  governing_coverage_pct NUMERIC(5,2),

  permissible_builtup_sqm NUMERIC(12,2),
  max_footprint_sqm NUMERIC(12,2),

  actual_far NUMERIC(8,3),
  actual_coverage_pct NUMERIC(8,3),

  setback_front_m NUMERIC(6,2),
  setback_rear_m NUMERIC(6,2),
  setback_left_m NUMERIC(6,2),
  setback_right_m NUMERIC(6,2),

  setback_breakdown_json JSONB,

  required_ecs NUMERIC(10,2),
  visitor_ecs NUMERIC(10,2),
  total_ecs NUMERIC(10,2),
  parking_breakdown_json JSONB,

  secondary_compliance_json JSONB,

  is_far_compliant BOOLEAN,
  is_coverage_compliant BOOLEAN,
  is_setback_compliant BOOLEAN,
  is_parking_compliant BOOLEAN,
  is_overall_compliant BOOLEAN,

  calculation_json JSONB NOT NULL,

  computed_at TIMESTAMPTZ DEFAULT now()
);

# Esti Building Compliance Engine

**Based on Bangalore Mahanagara Palike Building Bye-Laws 2003**

This document defines the compliance calculation engine for building regulation checks within **Esti**. The engine computes permissible building parameters based on municipal byelaws.

---

# Overview

The engine computes:

* Floor Area Ratio (FAR)
* Plot Coverage
* Setbacks
* Parking Requirement (ECS)
* Basement Compliance
* Sustainability Compliance
* Final Buildable Envelope

Primary outputs:

* Maximum permissible built-up area
* Maximum permissible footprint
* Governing setback on all sides
* Parking requirement
* Secondary statutory compliance checks

---

# 1. Calculation Hierarchy

Evaluation order:

```text
INPUTS

↓

Determine Development Zone (A / B / C)

↓

Determine FAR + Coverage limits

↓

Determine Setback requirements

↓

Apply Road Centreline Restriction (RBL)

↓

Calculate Buildable Footprint

↓

Calculate Maximum Built-up Area

↓

Calculate Parking Requirement

↓

Secondary Compliance Validation
```

---

# 2. Input Schema

```typescript
ProjectType
    Residential
    Commercial
    SemiPublic
    PublicBuilding

DevelopmentArea
    A
    B
    C

SiteAreaSqm

PlotDimensions
    Length
    Width
    Depth

BuildingHeight

Roads[]
    Side
    Width
    Length
    RoadClass

NeighbouringSides
    Front
    Rear
    Left
    Right

OccupancyData
    NumberOfUnits
    UnitArea
    FloorArea
    OccupancyLoad
```

---

# 3. FAR Calculation

Definition:

```text
FAR = Total Covered Area of All Floors / Plot Area
```

Formula:

```text
Allowed Built-up Area = Site Area × Allowed FAR
```

Implementation:

```typescript
allowedBuiltup = siteArea * governingFar
```

### FAR Exemptions

Excluded areas:

* Parking space
* Staircase rooms
* Lift rooms
* Ramps
* Escalators
* Machine rooms
* Open balconies
* Sanitary ducts
* Water tanks

Implementation:

```typescript
actualFar =
(totalFloorArea - exemptArea) / plotArea
```

---

# 4. FAR Rule Table

Store rules dynamically.

## Table: esti_far_rule

```sql
id
version

developmentArea

projectType

siteAreaMin
siteAreaMax

roadWidthMin
roadWidthMax

maxFar
maxCoverage
```

Example:

| Area | Plot Area | Road Width | Residential FAR | Commercial FAR |
| ---- | --------- | ---------- | --------------- | -------------- |
| A    | 0–240     | 0–6        | 0.75            | 1.00           |
| A    | 240–500   | 6–9        | 0.75            | 1.00           |

---

# 5. Plot Coverage Calculation

Definition:

```text
Coverage = Area occupied above plinth level
```

Formula:

```text
Coverage % = Ground Floor Footprint / Plot Area × 100
```

Implementation:

```typescript
maxFootprint = siteArea * coveragePct / 100
```

### Coverage Exemptions

Exclude:

* Courtyard
* Garden
* Well
* Uncovered swimming pool
* Compound wall
* Gates
* Porch without storey
* Watchman booth under 3 sqm

---

# 6. Setback Engine

Two calculation modes.

---

## Case 1 — Building Height ≤ 9.5m

Use Table 4.

Rules:

* Front + Rear → based on plot depth
* Left + Right → based on plot width

Table:

## esti_setback_lowrise_rule

```sql
id

depthMin
depthMax

widthMin
widthMax

front
rear

left
right
```

Example:

| Width | Front | Rear | Left | Right |
| ----- | ----- | ---- | ---- | ----- |
| 12–18 | 3     | 1.5  | 1.5  | 3     |

---

## Case 2 — Building Height > 9.5m

Use Table 5.

Uniform setbacks all sides.

## esti_setback_highrise_rule

```sql
id

heightMin
heightMax

uniformSetback
```

Example:

| Height | Setback |
| ------ | ------- |
| 9.5–12 | 4.5     |
| 15–18  | 6       |
| 30–35  | 11      |

---

# 7. Road Centreline Restriction (RBL)

Road-facing setbacks may override normal setbacks.

Formula:

```text
rblFromCentre = (roadWidth / 2) + roadMargin
```

```text
rblSetback = max(
      0,
      rblFromCentre - distanceCentreToBoundary
)
```

Final setback:

```text
governingSetback =
max(
      bylawSetback,
      rblSetback
)
```

Implementation:

```typescript
for each side:

if road exists:

   finalSetback =
       max(tableSetback, rblSetback)

else

   finalSetback =
       tableSetback
```

---

# 8. Road Rule Table

## esti_road_rule

```sql
id

roadClass

NH
SH
Arterial
Collector
Local

roadMargin
```

Example:

| Road Class | Margin |
| ---------- | ------ |
| NH         | 12m    |
| SH         | 9m     |
| Arterial   | 6m     |
| Local      | 3m     |

---

# 9. Parking Engine

Definition:

```text
1 ECS = 18 sqm
```

---

## Residential Parking

Rules:

50–150 sqm units

```text
1 ECS per unit
```

Above 150 sqm:

```text
1 ECS +
1 ECS per additional 100 sqm
```

Implementation:

```typescript
if unitArea <=150

ecs = dwellingUnits

else

ecs = dwellingUnits +
       floor((unitArea-150)/100)
```

---

## Commercial Parking

Rule:

```text
1 ECS per 50 sqm floor area
```

Implementation:

```typescript
ecs = ceil(builtupArea / 50)
```

---

## Visitor Parking

Additional:

```text
10%
```

Implementation:

```typescript
ecsTotal = ecs * 1.10
```

---

# 10. Basement Compliance

Allowed uses:

* Parking
* Utility services
* Mechanical systems

Checks:

```typescript
basementHeight >=2.4m

basementHeight <=2.75m
```

Mechanical parking:

```typescript
<=3.6m
```

Projection:

```typescript
projectionAboveGround <=1.0m
```

---

# 11. Sustainability Compliance

Boolean compliance checks.

---

## Rainwater Harvesting

Required when:

```text
plinth >100 sqm

AND

site >200 sqm
```

Implementation:

```typescript
requiresRWH =
(plinthArea >100 && siteArea >200)
```

---

## Tree Planting

Condition:

```text
site >200 sqm
```

Requirement:

```text
Minimum 2 trees
```

---

## Solar Water Heater

Use lookup table.

## esti_solar_rule

```sql
occupancyType
litersPerDay
basis
```

Example:

```text
Hospital

100 LPD / 4 beds
```

---

## Earthquake Safety

Mandatory when:

```text
height >=15m

OR

floors >= G+4
```

Implementation:

```typescript
requiresSeismicCompliance =
(height>=15 || floors>=5)
```

Standard:

```text
IS 1893-2002
```

---

# 12. Final Calculation Output

```json
{
  "farAllowed": 1.75,
  "coverageAllowed": 60,

  "permissibleBuiltup": 2800,

  "maxFootprint": 960,

  "setbacks": {
    "front": {
      "value": 6,
      "governedBy": "RBL"
    },

    "rear": {
      "value": 3,
      "governedBy": "Bylaw"
    },

    "left": {
      "value": 3
    },

    "right": {
      "value": 4
    }
  },

  "parking": {
    "requiredECS": 22,
    "visitorECS": 2,
    "total": 24
  },

  "basementAllowed": true,

  "secondaryCompliance": {
    "rainwaterHarvesting": true,
    "solarWaterHeating": true,
    "treePlanting": true,
    "earthquakeDesign": true
  }
}
```

---

# Recommended Database Architecture

Do NOT store everything in one giant table.

Use modular tables.

```text
esti_far_rule

esti_coverage_rule

esti_setback_lowrise_rule

esti_setback_highrise_rule

esti_road_rule

esti_parking_rule

esti_solar_rule

esti_secondary_compliance_rule

esti_calc_result
```

---

# Engineering Recommendation

Separate rules by domain.

Why:

* FAR rules change independently
* Parking regulations change independently
* Road margins change independently
* Setback tables change independently

Avoid:

```text
esti_bylaw_rule
```

Prefer:

```text
Modular rule engine
```

Municipal regulation systems should behave like:

* Tax engines
* Compliance engines
* Rule interpreters

Not spreadsheet lookups.

A monolithic table works for demos.

A modular rules engine works in production.

That distinction matters.


CREATE INDEX idx_far_rule_lookup
ON esti_far_rule (
  version_id,
  development_area,
  project_type,
  site_area_min,
  site_area_max,
  road_width_min,
  road_width_max
);

CREATE INDEX idx_lowrise_setback_lookup
ON esti_setback_lowrise_rule (
  version_id,
  project_type,
  depth_min,
  depth_max,
  width_min,
  width_max
);

CREATE INDEX idx_highrise_setback_lookup
ON esti_setback_highrise_rule (
  version_id,
  project_type,
  height_min_m,
  height_max_m
);

CREATE INDEX idx_project_bylaw_project
ON esti_project_bylaw_input (project_id);

CREATE INDEX idx_calc_result_input
ON esti_bylaw_calc_result (bylaw_input_id);

CREATE INDEX idx_calc_result_json
ON esti_bylaw_calc_result
USING GIN (calculation_json);

CREATE TYPE project_type AS ENUM (
  'Residential',
  'Commercial',
  'SemiPublic',
  'PublicBuilding'
);

CREATE TYPE development_area AS ENUM (
  'A',
  'B',
  'C'
);

CREATE TYPE road_side AS ENUM (
  'Front',
  'Rear',
  'Left',
  'Right'
);

CREATE TYPE road_class AS ENUM (
  'NH',
  'SH',
  'Arterial',
  'Collector',
  'Local'
);

CREATE TABLE esti_bylaw_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  authority TEXT NOT NULL,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_far_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  development_area development_area NOT NULL,
  project_type project_type NOT NULL,

  site_area_min NUMERIC(12,2),
  site_area_max NUMERIC(12,2),

  road_width_min NUMERIC(8,2),
  road_width_max NUMERIC(8,2),

  max_far NUMERIC(6,2) NOT NULL,
  max_coverage_pct NUMERIC(5,2) NOT NULL,

  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_setback_lowrise_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  project_type project_type NOT NULL,

  depth_min NUMERIC(8,2),
  depth_max NUMERIC(8,2),

  width_min NUMERIC(8,2),
  width_max NUMERIC(8,2),

  front_setback_m NUMERIC(6,2) NOT NULL,
  rear_setback_m NUMERIC(6,2) NOT NULL,
  left_setback_m NUMERIC(6,2) NOT NULL,
  right_setback_m NUMERIC(6,2) NOT NULL,

  max_height_m NUMERIC(6,2) DEFAULT 9.50,

  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_setback_highrise_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  project_type project_type NOT NULL,

  height_min_m NUMERIC(6,2),
  height_max_m NUMERIC(6,2),

  uniform_setback_m NUMERIC(6,2) NOT NULL,

  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_road_margin_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  road_class road_class NOT NULL,
  road_margin_m NUMERIC(6,2) NOT NULL,

  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (version_id, road_class)
);

CREATE TABLE esti_parking_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  project_type project_type NOT NULL,
  use_category TEXT NOT NULL,

  unit_area_min NUMERIC(10,2),
  unit_area_max NUMERIC(10,2),

  floor_area_min NUMERIC(12,2),
  floor_area_max NUMERIC(12,2),

  ecs_per_unit NUMERIC(8,3),
  ecs_per_sqm NUMERIC(8,5),
  sqm_per_ecs NUMERIC(8,2),

  visitor_parking_pct NUMERIC(5,2) DEFAULT 0,

  formula_key TEXT,
  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_solar_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  occupancy_type TEXT NOT NULL,
  lpd_required NUMERIC(10,2) NOT NULL,
  basis TEXT NOT NULL,

  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_secondary_compliance_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  rule_key TEXT NOT NULL,
  description TEXT NOT NULL,

  site_area_min NUMERIC(12,2),
  plinth_area_min NUMERIC(12,2),
  height_min_m NUMERIC(8,2),
  floors_min INTEGER,

  requirement_json JSONB NOT NULL,

  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_project_bylaw_input (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,

  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  project_type project_type NOT NULL,
  development_area development_area NOT NULL,

  site_area_sqm NUMERIC(12,2) NOT NULL,
  plot_length_m NUMERIC(10,2),
  plot_width_m NUMERIC(10,2),
  plot_depth_m NUMERIC(10,2),

  building_height_m NUMERIC(8,2),
  floors_count INTEGER,

  total_floor_area_sqm NUMERIC(12,2),
  exempt_far_area_sqm NUMERIC(12,2) DEFAULT 0,
  ground_footprint_sqm NUMERIC(12,2),
  plinth_area_sqm NUMERIC(12,2),

  dwelling_units INTEGER,
  average_unit_area_sqm NUMERIC(10,2),
  occupancy_load INTEGER,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE esti_project_road (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  bylaw_input_id UUID NOT NULL
    REFERENCES esti_project_bylaw_input(id)
    ON DELETE CASCADE,

  side road_side NOT NULL,
  road_width_m NUMERIC(8,2) NOT NULL,
  road_length_m NUMERIC(10,2),
  road_class road_class NOT NULL,

  distance_centre_to_boundary_m NUMERIC(8,2),

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (bylaw_input_id, side)
);

CREATE TABLE esti_bylaw_calc_result (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  bylaw_input_id UUID NOT NULL
    REFERENCES esti_project_bylaw_input(id)
    ON DELETE CASCADE,

  version_id UUID NOT NULL REFERENCES esti_bylaw_version(id),

  governing_far NUMERIC(6,2),
  governing_coverage_pct NUMERIC(5,2),

  permissible_builtup_sqm NUMERIC(12,2),
  max_footprint_sqm NUMERIC(12,2),

  actual_far NUMERIC(8,3),
  actual_coverage_pct NUMERIC(8,3),

  setback_front_m NUMERIC(6,2),
  setback_rear_m NUMERIC(6,2),
  setback_left_m NUMERIC(6,2),
  setback_right_m NUMERIC(6,2),

  setback_breakdown_json JSONB,

  required_ecs NUMERIC(10,2),
  visitor_ecs NUMERIC(10,2),
  total_ecs NUMERIC(10,2),
  parking_breakdown_json JSONB,

  secondary_compliance_json JSONB,

  is_far_compliant BOOLEAN,
  is_coverage_compliant BOOLEAN,
  is_setback_compliant BOOLEAN,
  is_parking_compliant BOOLEAN,
  is_overall_compliant BOOLEAN,

  calculation_json JSONB NOT NULL,

  computed_at TIMESTAMPTZ DEFAULT now()
);
