# AORMS Estimation OS Architecture

**Status:** Canonical · **Target architecture** for the estimation engine — the
current-state [ESTIMATION-ARCHITECTURE](ESTIMATION-ARCHITECTURE.md) note describes
what ships today and is superseded section-by-section as these phases land ·
**Reviewed:** 2026-06-25

## Document Status

**Product:** AORMS  
**Module:** Estimation OS  
**Primary Mode:** Design Stage Estimate first  
**Progression:** Execution Stage Detail added later through revisions, changes, measurements, and running bills  
**Purpose:** Developer-ready architecture specification for building a component-based estimation, BOQ, rate analysis, billing, and deviation engine.

---

# 1. Product Philosophy

Estimation OS is not a traditional BOQ tool.

Traditional workflow:

```text
BOQ item → Quantity → Rate → Amount
```

AORMS workflow:

```text
Project intent
↓
Design stage estimate
↓
Component assumptions
↓
Percentage clauses
↓
Non-modeled items
↓
Auto BOQ
↓
Execution detail added progressively
↓
Running bills
↓
Quantity/rate/scope deviations
↓
Project intelligence
```

The system must support early-stage approximation without pretending false precision.

At design stage, the architect may not know every footing, wall, beam, pipe, conduit, light, furniture item, or contractor package. The estimate must still be usable.

At execution stage, the system should allow more detail to be added component by component, without deleting or corrupting the original design-stage estimate.

Core principle:

> Estimate starts broad. Execution makes it precise.

---

# 2. Estimation Modes

## 2.1 Design Stage Estimate

Used during early project costing, concept design, client budgeting, and initial approval.

Characteristics:

- Approximate quantities
- Percentage-based clauses
- Area-based assumptions
- Ratebook-based cost projections
- Optional IFC/component references
- Provisional cost heads
- Non-modeled manual items
- Lower data-entry burden

Examples:

```text
Civil works estimated by built-up area
PEB estimated as 18% of civil cost
Electrical estimated as 12% of civil cost
Loose furniture entered manually
Project overheads entered as percentage
```

## 2.2 Execution Stage Estimate

Used after drawings, structural details, vendor inputs, and site execution become clearer.

Characteristics:

- Component-level quantities
- IFC/component tagging
- Detailed BOQ
- Rate analysis
- Contractor packages
- Running bills
- Quantity deviations
- Rate deviations
- Revision impact

Examples:

```text
SB-STR-FT-01 isolated footing created
Earthwork, PCC, RCC, steel, shuttering generated
Contractor measurement recorded against component
Running bill checks previous billed quantity
Deviation generated if quantity exceeds estimate
```

## 2.3 Mode Transition

The system must not create two separate estimates.

Instead:

```text
Design Estimate
↓
Execution Detail Layer
↓
Revised Estimate Versions
↓
Contract + Billing Layer
```

Design-stage estimate remains the baseline.

Execution detail progressively replaces assumptions.

---

# 3. Estimate Lifecycle

```text
Draft
↓
Design Estimate Created
↓
Ratebook Selected
↓
Preliminary Cost Heads Added
↓
Percentage Clauses Added
↓
Non-Modeled Items Added
↓
Design Estimate Reviewed
↓
Design Estimate Approved / Frozen
↓
Execution Details Added
↓
Component BOQ Generated
↓
Contract Packages Created
↓
Running Bills Started
↓
Deviations Recorded
↓
Estimate Revised
↓
Final Cost History Preserved
```

## 3.1 Estimate Statuses

```text
draft
design_stage
design_frozen
execution_detailing
contracted
billing_active
revised
closed
archived
```

## 3.2 Version Rules

Every major change creates a new estimate version.

Examples:

```text
V0.1 Draft estimate
V1.0 Design estimate approved
V1.1 PEB clause revised
V2.0 Execution detailed estimate added
V2.1 Quantity deviation approved
V2.2 Rate escalation approved
```

Never overwrite approved history.

---

# 4. System Architecture

```text
Frontend
  Carbon React UI
        ↓
Estimation OS API
        ↓
Estimate Orchestrator
        ↓
Core Services
  ├── Estimate Manager
  ├── Ratebook Engine
  ├── Component Engine
  ├── Parameter Form Engine
  ├── Quantity Calculation Engine
  ├── Auto BOQ Engine
  ├── Rate Analysis Engine
  ├── Percentage Clause Engine
  ├── Non-Modeled Item Engine
  ├── Work Package Engine
  ├── Running Bill Engine
  ├── Deviation Engine
  ├── Escalation Engine
  ├── Approval Engine
  └── Audit/Event Engine
        ↓
PostgreSQL
        ↓
Future Intelligence Layer / ESTI
```

---

# 5. Core Data Spine

Do not create separate identities for the same construction object.

Bad:

```text
estimate_component
execution_component
billing_component
revision_component
```

Good:

```text
component_master
```

Everything references the same component.

```text
component_master
  ↓
estimate_components
  ↓
boq_items
  ↓
work_packages
  ↓
measurement_records
  ↓
running_bills
  ↓
deviation_records
  ↓
revision_records
```

---

# 6. Component Master

## 6.1 Purpose

The `component_master` table is the permanent identity layer for AORMS construction objects.

It may represent:

- Footing
- Column
- Beam
- Wall
- Slab
- Door
- Window
- Flooring
- Painting area
- Electrical conduit
- Plumbing pipe
- Furniture item
- Genset
- PEB package
- Provisional component

## 6.2 Component Code Format

```text
[LEVEL]-[DISCIPLINE]-[COMPONENT]-[SEQUENCE]
```

Example:

```text
SB-STR-FT-01
```

Meaning:

```text
SB  = Substructure
STR = Structural
FT  = Footing
01  = Sequence
```

## 6.3 Component Master Schema

```ts
ComponentMaster {
  id: string
  projectId: string

  aormsCode: string
  humanLabel?: string

  ifcGlobalId?: string
  ifcEntityType?: string
  ifcPredefinedType?: string

  levelCode: string
  disciplineCode: string
  componentTypeCode: string
  sequenceNo: number

  parentComponentId?: string
  status: "assumed" | "estimated" | "detailed" | "issued" | "executed" | "billed" | "closed"

  source: "design_assumption" | "manual" | "ifc_import" | "execution_detail" | "revision"

  createdAt: Date
  updatedAt: Date
}
```

---

# 7. Design Stage Estimate Architecture

Design stage estimate should allow quick costing with controlled assumptions.

## 7.1 Design Estimate Cost Heads

```text
Civil Works
Structural Works
Masonry
Finishes
Interiors
Electrical
Plumbing
HVAC
PEB
Loose Furniture
External Works
Landscape
Project Overheads
Contingency
Others
```

## 7.2 Design Estimate Inputs

Design-stage inputs may include:

```text
Built-up area
Number of floors
Project type
Specification level
Approximate civil rate per sqft
Approximate finishes rate per sqft
Percentage clauses
Manual non-modeled items
```

## 7.3 Design Estimate Item Schema

```ts
DesignEstimateItem {
  id: string
  estimateId: string

  costHead: string
  name: string
  description?: string

  calculationType: "area_rate" | "percentage" | "lumpsum" | "quantity_rate" | "formula"

  baseArea?: number
  quantity?: number
  unit?: string
  rate?: number
  percentage?: number
  baseReference?: string
  formula?: string

  amount: number

  confidenceLevel: "low" | "medium" | "high"
  status: "provisional" | "confirmed" | "replaced_by_execution_detail"
}
```

## 7.4 Example

```text
Civil Works
Calculation: built-up area × rate
Area: 10,000 sqft
Rate: ₹2,200/sqft
Amount: ₹2,20,00,000
Confidence: medium
```

---

# 8. Execution Detail Layer

Execution detail does not replace the design estimate blindly.

It attaches detailed component data to a previous assumption.

Example:

```text
Design Stage:
Civil Works = ₹2,20,00,000

Execution Stage:
SB-STR-FT-01
SB-STR-FT-02
GF-STR-COL-01
GF-ARC-BRW-01
...
```

The system should show:

```text
Original design provision
Detailed execution estimate
Difference
Reason
Approval status
```

## 8.1 Execution Detail Schema

```ts
ExecutionDetailLink {
  id: string
  estimateId: string
  designEstimateItemId?: string
  componentId: string
  boqItemId?: string

  replacesDesignAmount: boolean
  replacementMode: "partial" | "full" | "additional"

  previousProvisionAmount?: number
  detailedAmount: number
  varianceAmount: number
  variancePercent: number
}
```

---

# 9. Ratebook Engine

## 9.1 Philosophy

AORMS should use firm/project-specific ratebooks instead of hard dependency on DSR.

Ratebooks can be:

```text
Firm standard ratebook
Regional ratebook
Project-specific ratebook
Contractor ratebook
Historical ratebook
Vendor ratebook
```

## 9.2 Ratebook Schema

```ts
Ratebook {
  id: string
  firmId: string
  name: string
  region?: string
  effectiveFrom: Date
  effectiveTo?: Date
  status: "draft" | "active" | "archived"
}
```

## 9.3 Ratebook Item Schema

```ts
RatebookItem {
  id: string
  ratebookId: string

  code: string
  name: string
  description?: string

  category: string
  disciplineCode: string
  unit: "cum" | "sqm" | "rmt" | "nos" | "kg" | "ton" | "sqft" | "lumpsum"

  directRate?: number
  rateAnalysisEnabled: boolean
  rateAnalysisTemplateId?: string

  allowedIfcEntityTypes: string[]
  allowedComponentTypeCodes: string[]

  fixedParameters: Record<string, number | string>
  requiredParameters: string[]

  formulaId?: string

  status: "active" | "inactive"
}
```

---

# 10. Parameter Form Engine

## 10.1 Purpose

The system should show only required fields based on selected component/specification.

Example:

For brickwork 230mm:

```text
Show:
- Length
- Height
- Opening deduction

Do not show:
- Thickness
```

Thickness is predefined as 0.23m.

## 10.2 Input Schema

```ts
ParameterDefinition {
  id: string
  ratebookItemId: string

  fieldName: string
  label: string
  dataType: "number" | "string" | "boolean" | "select"
  unit?: string

  required: boolean
  defaultValue?: string | number
  min?: number
  max?: number

  visibilityRule?: string
}
```

---

# 11. Formula Engine

## 11.1 Purpose

The formula engine calculates quantities safely.

No arbitrary JavaScript execution.

Use a controlled expression parser.

## 11.2 Formula Schema

```ts
FormulaDefinition {
  id: string
  name: string
  expression: string
  outputUnit: string

  requiredInputs: string[]
  fixedInputs?: Record<string, number>

  formulaType: "volume" | "area" | "length" | "weight" | "percentage" | "lumpsum"
}
```

## 11.3 Formula Examples

### Brickwork 230mm

```text
quantity = (length * height * thickness) - openingDeduction
```

Fixed:

```text
thickness = 0.23
```

### RCC Concrete

```text
quantity = length * breadth * depth
```

### Plaster

```text
quantity = (length * height * sides) - openingDeduction
```

### Steel

```text
quantity = barLength * unitWeight * numberOfBars
```

---

# 12. IFC Component Selector

## 12.1 Purpose

IFC helps standardize component selection.

AORMS must work without IFC but become richer with IFC.

```text
Manual project → AORMS component only
BIM project → AORMS component + IFC GlobalId
```

## 12.2 IFC Mapping Schema

```ts
IfcComponentMapping {
  id: string

  ifcEntityType: string
  ifcPredefinedType?: string

  aormsDisciplineCode: string
  aormsComponentTypeCode: string
  defaultUnit: string

  allowedRatebookItemIds: string[]
  defaultRelatedItemTemplateId?: string
}
```

## 12.3 IFC Property Set

```text
Pset_AORMS_Component
```

Properties:

```text
AORMSCode
AORMSLevel
AORMSDiscipline
AORMSComponentType
AORMSParentCode
AORMSRevision
AORMSStatus
AORMSBOQItemId
AORMSRatebookId
```

---

# 13. Auto BOQ Engine

## 13.1 Principle

User creates components.

System generates BOQ.

## 13.2 Example

Component:

```text
SB-STR-FT-01
Isolated footing
```

Auto BOQ:

```text
Earthwork excavation
Anti-termite treatment
PCC bed
RCC concrete
Reinforcement steel
Shuttering
Backfilling
Curing
```

## 13.3 BOQ Item Schema

```ts
BOQItem {
  id: string
  estimateId: string
  componentId?: string

  parentComponentCode?: string
  ratebookItemId?: string

  description: string
  unit: string
  quantity: number
  rate: number
  amount: number

  source: "auto_generated" | "manual" | "clause" | "non_modeled" | "revision"
  status: "draft" | "approved" | "superseded"
}
```

## 13.4 Related Item Template

```ts
RelatedItemTemplate {
  id: string
  componentTypeCode: string
  name: string
}
```

```ts
RelatedItemTemplateLine {
  id: string
  templateId: string
  ratebookItemId: string
  sequenceOrder: number
  required: boolean
  condition?: string
}
```

---

# 14. Rate Analysis Engine

## 14.1 Purpose

Rate analysis is optional.

If enabled, rate is calculated from:

```text
Material
+ Labour
+ Equipment
+ Related work
+ Wastage
+ Overheads
+ Profit
```

## 14.2 Rate Analysis Schema

```ts
RateAnalysisTemplate {
  id: string
  ratebookItemId: string
  name: string

  wastagePercent: number
  overheadPercent: number
  profitPercent: number
}
```

```ts
RateAnalysisLine {
  id: string
  templateId: string
  lineType: "material" | "labour" | "equipment" | "related_work"
  itemCode: string
  name: string
  quantityPerUnit: number
  unit: string
  rate: number
  amount: number
}
```

---

# 15. Material, Labour, Equipment Rate Lists

## 15.1 Material Rate

```ts
MaterialRate {
  id: string
  ratebookId: string
  materialCode: string
  name: string
  unit: string
  rate: number
  effectiveFrom: Date
  source: "manual" | "market" | "contractor_bill" | "vendor_quote"
}
```

## 15.2 Labour Rate

```ts
LabourRate {
  id: string
  ratebookId: string
  labourCode: string
  name: string
  unit: "day" | "hour" | "job"
  rate: number
}
```

## 15.3 Equipment Rate

```ts
EquipmentRate {
  id: string
  ratebookId: string
  equipmentCode: string
  name: string
  unit: "day" | "hour" | "job"
  rate: number
}
```

---

# 16. Escalation Engine

## 16.1 Purpose

Escalation is used when execution-period material rates cross contract threshold.

Example:

```text
Base cement rate: ₹400
Execution cement rate: ₹430
Increase: 7.5%
Allowed threshold: 5%
Escalation allowed: 2.5%
```

## 16.2 Escalation Clause Schema

```ts
EscalationClause {
  id: string
  contractId: string
  materialId: string

  baseRate: number
  thresholdPercent: number

  currentRate?: number
  increasePercent?: number
  eligibleEscalationPercent?: number

  status: "inactive" | "triggered" | "approved" | "rejected"
}
```

## 16.3 Rule

Never overwrite contract rate.

Store:

```text
Contract Rate
Execution Rate
Escalation Amount
Revised Rate
Approval Status
```

---

# 17. Percentage Clause Engine

## 17.1 Purpose

Used mainly during design stage.

Examples:

```text
PEB = 18% of civil cost
Electrical = 12% of civil cost
Contingency = 5% of total estimate
```

## 17.2 Schema

```ts
EstimateClause {
  id: string
  estimateId: string

  name: string
  type: "percentage" | "lumpsum" | "formula"

  baseReference?: "civil" | "structural" | "finishes" | "total" | string
  percentage?: number
  fixedAmount?: number
  formula?: string

  amount: number
  status: "provisional" | "confirmed" | "replaced_by_detailed_estimate"
}
```

---

# 18. Non-Modeled Item Engine

## 18.1 Purpose

For legitimate estimate items that are not modeled as components initially.

Examples:

```text
Loose furniture
Decorative lights
Gensets
Solar
Appliances
AV systems
Project overheads
Consultant fees
Temporary site office
Mobilization
Others
```

## 18.2 Calculation Modes

```text
Quantity × Rate
Lump Sum
Percentage
```

## 18.3 Schema

```ts
NonModeledItem {
  id: string
  estimateId: string

  category: string
  name: string
  description?: string

  calculationType: "quantity_rate" | "lumpsum" | "percentage"

  quantity?: number
  unit?: string
  rate?: number

  percentage?: number
  baseReference?: string

  amount: number

  procurementRequired: boolean
  expectedProcurementDate?: Date
  leadTimeDays?: number

  status: "provisional" | "confirmed" | "converted_to_component"
}
```

---

# 19. Work Package Engine

## 19.1 Purpose

Approved estimate items are grouped into contractor packages.

Examples:

```text
Civil Package
Electrical Package
Plumbing Package
Interior Package
Furniture Package
PEB Package
```

## 19.2 Schema

```ts
WorkPackage {
  id: string
  projectId: string
  estimateId: string

  name: string
  packageType: string
  contractorId?: string

  contractValue: number
  status: "draft" | "issued" | "awarded" | "active" | "closed"
}
```

```ts
WorkPackageItem {
  id: string
  workPackageId: string
  boqItemId: string
  componentId?: string
  quantity: number
  rate: number
  amount: number
}
```

---

# 20. Running Bill Engine

## 20.1 Golden Rule

Nothing should be billed twice.

Bills must be based on:

```text
Component
BOQ item
Previous billed quantity
Current measured quantity
Cumulative billed quantity
Balance quantity
```

## 20.2 Running Bill Schema

```ts
RunningBill {
  id: string
  projectId: string
  workPackageId: string
  contractorId: string

  billNo: string
  billDate: Date
  status: "draft" | "submitted" | "checked" | "approved" | "paid" | "locked"

  grossAmount: number
  deductions: number
  retentionAmount: number
  advanceAdjustment: number
  netPayable: number
}
```

## 20.3 Measurement Record Schema

```ts
MeasurementRecord {
  id: string
  runningBillId: string
  projectId: string
  contractorId: string

  componentId?: string
  componentCode?: string
  boqItemId: string

  estimateQty: number
  previousBilledQty: number
  currentMeasuredQty: number
  cumulativeBilledQty: number
  balanceQty: number

  contractRate: number
  revisedRate?: number
  amount: number

  measuredBy: string
  checkedBy?: string

  status: "draft" | "submitted" | "approved" | "locked"
}
```

## 20.4 Double Billing Rule

```text
Allowed Current Qty =
Approved Estimate Qty
+ Approved Variation Qty
- Previous Billed Qty
```

If current measured quantity exceeds balance:

```text
Block billing or create variation request.
```

---

# 21. Deviation Engine

## 21.1 Types

```text
Quantity deviation
Rate deviation
Scope deviation
Specification deviation
```

## 21.2 Schema

```ts
DeviationRecord {
  id: string
  projectId: string
  estimateId: string

  componentId?: string
  boqItemId?: string

  deviationType: "quantity" | "rate" | "scope" | "specification"

  estimatedValue: number
  actualValue: number

  deviationValue: number
  deviationPercent: number

  reason?: string
  linkedRevisionId?: string

  approvalStatus: "pending" | "approved" | "rejected"
}
```

## 21.3 Quantity Deviation Example

```text
Estimated quantity: 120 cum
Measured quantity: 132 cum
Deviation: +12 cum / +10%
```

## 21.4 Rate Deviation Example

```text
Contract rate: ₹7,250/cum
Revised rate: ₹7,435/cum
Deviation: ₹185/cum
Reason: Cement escalation above threshold
```

---

# 22. Revision and Change Handling

## 22.1 Change Types

```text
Design revision
Client scope change
Site condition change
Specification upgrade
Material rate escalation
Quantity variation
Contractor claim
```

## 22.2 Revision Impact Flow

```text
Revision created
↓
Affected components selected
↓
Affected BOQ items identified
↓
Quantity/rate/scope impact calculated
↓
Approval requested
↓
Estimate version updated
↓
Running bill allowance updated
```

## 22.3 Revision Schema

```ts
EstimateRevision {
  id: string
  estimateId: string
  projectId: string

  revisionType: string
  description: string

  affectedComponentIds: string[]
  affectedBOQItemIds: string[]

  costImpact: number
  timeImpactDays?: number

  status: "draft" | "submitted" | "approved" | "rejected"
}
```

---

# 23. Approval Engine

Approvals are required for:

```text
Design estimate freeze
Ratebook activation
Rate analysis change
Clause confirmation
Non-modeled item confirmation
Execution estimate replacement
Running bill approval
Quantity deviation approval
Rate escalation approval
Scope deviation approval
```

## Approval Schema

```ts
ApprovalRecord {
  id: string
  entityType: string
  entityId: string

  requestedBy: string
  approvedBy?: string

  status: "pending" | "approved" | "rejected"
  comments?: string

  createdAt: Date
  decidedAt?: Date
}
```

---

# 24. Audit and Event Architecture

Every important action emits event.

## Events

```text
estimate.created
estimate.design_frozen
component.created
quantity.calculated
boq.generated
rate_analysis.enabled
clause.added
non_modeled_item.added
work_package.created
running_bill.created
measurement.recorded
deviation.detected
escalation.triggered
revision.created
approval.completed
```

## Event Schema

```ts
DomainEvent {
  id: string
  eventType: string
  entityType: string
  entityId: string

  projectId?: string
  estimateId?: string

  payload: JSON
  createdBy: string
  createdAt: Date
}
```

---

# 25. Database Tables

## Core

```text
estimates
estimate_versions
design_estimate_items
component_master
estimate_components
execution_detail_links
```

## Ratebook

```text
ratebooks
ratebook_items
material_rates
labour_rates
equipment_rates
formula_definitions
parameter_definitions
```

## BOQ

```text
boq_items
related_item_templates
related_item_template_lines
quantity_calculations
```

## Rate Analysis

```text
rate_analysis_templates
rate_analysis_lines
escalation_clauses
rate_revision_history
```

## Clauses and Manual Items

```text
estimate_clauses
non_modeled_items
```

## Contract and Billing

```text
work_packages
work_package_items
contracts
running_bills
measurement_records
```

## Deviations and Revisions

```text
deviation_records
estimate_revisions
approval_records
audit_logs
domain_events
```

---

# 26. API Architecture

## Estimate APIs

```text
POST   /api/estimates
GET    /api/estimates/:id
PATCH  /api/estimates/:id
POST   /api/estimates/:id/freeze-design
POST   /api/estimates/:id/create-version
```

## Design Stage APIs

```text
POST   /api/estimates/:id/design-items
PATCH  /api/design-items/:id
DELETE /api/design-items/:id
```

## Component APIs

```text
POST   /api/estimates/:id/components
GET    /api/projects/:id/components
PATCH  /api/components/:id
POST   /api/components/:id/calculate
```

## BOQ APIs

```text
POST   /api/estimates/:id/generate-boq
GET    /api/estimates/:id/boq
PATCH  /api/boq-items/:id
```

## Ratebook APIs

```text
POST   /api/ratebooks
GET    /api/ratebooks/:id
POST   /api/ratebooks/:id/items
POST   /api/ratebook-items/:id/rate-analysis
```

## Clause APIs

```text
POST   /api/estimates/:id/clauses
PATCH  /api/clauses/:id
```

## Non-Modeled Item APIs

```text
POST   /api/estimates/:id/non-modeled-items
PATCH  /api/non-modeled-items/:id
```

## Running Bill APIs

```text
POST   /api/running-bills
POST   /api/running-bills/:id/measurements
POST   /api/running-bills/:id/submit
POST   /api/running-bills/:id/approve
```

## Deviation APIs

```text
GET    /api/projects/:id/deviations
POST   /api/deviations/:id/approve
POST   /api/deviations/:id/reject
```

---

# 27. UI Architecture

## 27.1 Estimate Setup

Fields:

```text
Project
Estimate name
Estimate stage
Ratebook
Currency
Tax settings
Version
```

## 27.2 Design Estimate Screen

Sections:

```text
Cost Heads
Area-based estimates
Percentage clauses
Non-modeled items
Summary
```

## 27.3 Execution Detail Screen

Sections:

```text
Category tabs
IFC/AORMS component selector
Specification selector
Parameter form
Quantity preview
BOQ preview
```

## 27.4 Auto BOQ Screen

Show:

```text
Component code
BOQ item
Quantity
Unit
Rate
Amount
Source
Status
```

## 27.5 Running Bill Screen

Show:

```text
Component
BOQ item
Estimate qty
Previous billed qty
Current measured qty
Cumulative qty
Balance qty
Rate
Amount
Deviation warning
```

---

# 28. Implementation Phases

## Phase 1 — Design Stage Estimation

Build first.

```text
Estimate creation
Ratebook selection
Design cost heads
Area-rate estimate
Percentage clauses
Non-modeled items
Estimate summary
Estimate versioning
```

## Phase 2 — Component-Based Execution Detail

```text
Component master
Component code generator
IFC/AORMS component selector
Parameter forms
Quantity calculation
Auto BOQ generation
```

## Phase 3 — Ratebook + Rate Analysis

```text
Material rates
Labour rates
Equipment rates
Rate analysis toggle
Calculated rates
Rate history
```

## Phase 4 — Work Packages + Running Bills

```text
Work package creation
Contractor assignment
Measurement records
Double billing prevention
Bill approval
```

**Status: Implemented (additive extension of the running-bill spine).**

- **Schema** (migration `0088_work_packages_bills.sql`): `esti_work_package`
  (`ref`, `estimateId`, `estimateVersionId` frozen baseline, `contractorId`,
  `packageType`, `status` DRAFT→ISSUED→AWARDED→ACTIVE→CLOSED, `contractValuePaise`)
  and `esti_work_package_item` (`boqItemId` → `esti_estimate_item`, `approvedQty`,
  `variationQty` manual allowance, `ratePaise`). `esti_running_bill` gains
  `work_package_id`; `esti_running_bill_item` gains `work_package_item_id`,
  `boq_item_id`, `component_id`, and the `previous_billed_qty` /
  `cumulative_billed_qty` / `balance_qty` ledger columns (all nullable/additive —
  free-text bills keep working).
- **Double-billing prevention (Rule 9):** `billableBalance()` in
  `packages/contracts/src/pmc.ts` computes `approved + variation − previously
  billed`; `runningBills.create` sums prior billed qty per `boqItemId` across the
  project (so the same quantity can't be billed twice, even across two packages
  sharing a BOQ line) and throws `BAD_REQUEST` on over-bill. Unit-tested in
  `pmc.test.ts`.
- **Backend:** `workPackages` namespace (`backend/src/modules/boq/workPackage.ts`)
  — `createFromEstimate` (carves measurable lines from a frozen version, optional
  cost-head filter), item CRUD, `setStatus`/`assignContractor`, `billedSummary`
  (approved/billed/balance ledger). `costing` plan feature + audit on every write.
- **Frontend (Pure Carbon):** office `WorkPackages.tsx` (a "Work packages" stage
  in the Costing & Measurement window) + package-driven running-bill creation with
  inline over-bill blocking; the contractor portal shows the approved balance per
  measured line.
- **Deferred:** full deviation/escalation engine (Phase 5 — only a manual
  `variationQty` allowance today); IFC re-sync (Phase 6); running-bill PDF (no
  worker target exists yet, so its absence is not a regression).

## Phase 5 — Deviations + Escalation

```text
Quantity deviation
Rate deviation
Escalation clause
Approval workflow
Revision link
```

## Phase 6 — IFC Sync + Intelligence

```text
IFC GlobalId mapping
IFC property tagging
Quantity anomaly detection
Cost overrun prediction
ESTI integration
```

---

# 29. Non-Negotiable Rules

1. Start with design-stage estimate.
2. Add execution detail progressively.
3. Never overwrite frozen estimate history.
4. Use one `component_master`.
5. BOQ should be generated from components wherever possible.
6. Manual items must be marked separately.
7. Percentage clauses must be clearly provisional.
8. Original rate must never be overwritten.
9. Running bills must check previous billed quantities.
10. Quantity deviation and rate deviation must be separately reported.
11. IFC GlobalId must not replace AORMS component code.
12. Every change must leave an audit trail.

---

# 30. Final Product Definition

AORMS Estimation OS is:

> A progressive construction estimation engine that starts with design-stage assumptions and evolves into execution-stage component-level cost, billing, deviation, and project intelligence.

It connects:

```text
Design Estimate
↓
Component Detail
↓
BOQ
↓
Rate Analysis
↓
Contract Package
↓
Running Bill
↓
Deviation
↓
Revision Intelligence
```

This is not just estimation.

It is cost memory for the architecture office.
