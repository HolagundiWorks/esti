# AORMS Project OS — Architecture

**Status:** Canonical · **Reviewed:** 2026-06-26 · **Owner:** Holagundi Consulting Works

This document maps the Project OS specification onto ESTI's existing architecture.
Where the spec conflicts with ESTI law (money in paise, `esti_*` tables,
**Pure Carbon only**, existing capability/plan model), **this doc wins**.

---

## 1. Philosophy

Project OS is not CRM. CRM tracks leads. Project OS models how architecture
firms **acquire** projects — the full commercial funnel from first enquiry to
the moment a team picks up the brief.

```text
A project is created only after:
  1. Client shows intent              (Lead Capture)
  2. Feasibility is accepted          (Pre-Project Assessment + Feasibility Report)
  3. Commercial agreement accepted    (Fee Proposal + Negotiation + Approval Gate)
  4. Client onboarding is complete    (Client Onboarding Engine)
  5. Advance payment is received      (Payment Validation)
```

Before step 5: `draft_project` (status = ENQUIRY | PROPOSAL).
After step 5: `active_project` (status = ACTIVE).

---

## 2. Pipeline

```text
Lead Capture  →  Project DNA  →  Pre-Project Assessment
      ↓
Feasibility Report + Risk Score  →  Client Discussion
      ↓
Draft Project Created  →  Proposal + Fee Proposal
      ↓
Negotiation  →  Client Approval Gate  →  Client Onboarding
      ↓
Advance Payment Validated  →  Project Activation  →  Task OS + Cost OS + Portal
```

---

## 3. What ESTI already ships vs what Project OS adds

| Pipeline stage | ESTI today | Gap |
|---|---|---|
| Lead capture | None — starts at `esti_client` | New `esti_lead` table |
| Project DNA | Partial — `projectBrief.designPrefs` (JSONB) | New `esti_project_dna` table (structured fields) |
| Pre-project assessment | None | New `esti_pre_project_assessment` |
| Feasibility report | None | New `esti_feasibility_report` + PDF worker target |
| Risk scoring | Manual critical notes only | Deterministic read model (no new table) |
| Client discussion | `esti_clientlog` (kind/subject/body) | Extend with `outcome` enum |
| Draft project | `esti_projectoffice` status = ENQUIRY/PROPOSAL | Add FK links to lead/DNA/assessment; state machine gates |
| Fee proposal + scope | `esti_feeproposal` + `esti_proposal` — both with PDF | Add approval workflow: APPROVED / REJECTED / ON_HOLD |
| Negotiation | None | New `esti_project_negotiation` |
| Client approval gate | None | Formal gate mutation on fee proposal |
| Client onboarding | None | New `esti_client_onboarding` |
| Advance payment | `esti_invoice` exists | Add `isAdvance` flag; activation gate checks for paid advance |
| Project activation | `projectOffice.create` (no gates) | State machine with pre-flight checks; auto-init triggers |
| Integration (Task OS, Cost OS, Portal) | All three live | Wire auto-creation on `projectOffice.activate` |

---

## 4. Module specifications

### Slice A — Lead Capture Engine

**Purpose:** Record an enquiry *before* a client or project is created.

New table `esti_lead`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `ref` | text unique | LDR-YYYY-NNN via `nextRef` |
| `clientName` | text | Free text — may not be a known client yet |
| `phone` | text | |
| `email` | text | nullable |
| `leadSource` | enum | WALK_IN / WEBSITE / WHATSAPP / REFERRAL / COLD_OUTREACH / EXISTING_CLIENT / SOCIAL_MEDIA |
| `projectType` | text | Brief description |
| `siteLocation` | text | |
| `city` | text | |
| `assignedTo` | uuid FK → users | |
| `status` | enum | NEW / CONTACTED / ASSESSMENT_STARTED / AWAITING_REVIEW / QUALIFIED / DROPPED / LOST |
| `convertedProjectId` | uuid FK → esti_projectoffice | nullable — set on conversion |
| `convertedClientId` | uuid FK → esti_client | nullable |
| `notes` | text | |
| `createdById` | uuid FK → users | |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

tRPC namespace: `leads` (create, list, byId, update, updateStatus, convert).
`convert` creates `esti_client` + draft `esti_projectoffice` (status=ENQUIRY) in a
transaction and stamps `convertedProjectId` + `convertedClientId`.

Frontend: new top-level route `/leads` (Leads hub, similar to Proposals.tsx layout).

---

### Slice B — Project DNA Engine

**Purpose:** Capture project constraints as structured fields before design starts.

New table `esti_project_dna` (1:1 with `esti_projectoffice`):

| Column | Type | Values |
|---|---|---|
| `id` | uuid PK | |
| `projectId` | uuid unique FK → esti_projectoffice | |
| `budgetMode` | enum | FLEXIBLE / MODERATE / STRICT / VERY_STRICT |
| `vastuRequirement` | enum | NONE / PARTIAL / STRONG / STRICT_TRADITIONAL |
| `designLanguage` | enum | MINIMALIST / CONTEMPORARY / TRADITIONAL / LUXURY / MODERN_TROPICAL / INDUSTRIAL / CUSTOM |
| `designFlexibility` | enum | ARCHITECT_FREEDOM / APPROVAL_EVERY_STAGE / STRICT_REQUIREMENT |
| `decisionMakers` | enum | SINGLE_OWNER / COUPLE / FAMILY / PARTNERS / CORPORATE_COMMITTEE |
| `timelineCriticality` | enum | FLEXIBLE / MODERATE / STRICT / URGENT |
| `materialExpectation` | enum | ECONOMY / MID_RANGE / PREMIUM / ULTRA_PREMIUM |
| `revisionTolerance` | enum | LOW / MODERATE / HIGH / UNLIMITED |
| `customNotes` | text | |
| `createdAt` / `updatedAt` | timestamptz | |

tRPC: `projectDna.upsert` (write-gated), `projectDna.byProject`.

DNA is captured at the draft/ENQUIRY stage and feeds directly into the Risk Scoring read model.

---

### Slice C — Pre-Project Assessment Engine

**Purpose:** Calculate build feasibility before project creation.

New table `esti_pre_project_assessment`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `projectId` | uuid unique FK → esti_projectoffice | |
| `siteLength` | numeric | metres |
| `siteWidth` | numeric | metres |
| `manualArea` | numeric | optional override |
| `siteAreaSqm` | numeric | computed: length × width (or manualArea) |
| `farFactor` | numeric | e.g. 1.75 |
| `permissibleFarArea` | numeric | computed: siteArea × farFactor |
| `frontSetback` | numeric | metres |
| `rearSetback` | numeric | metres |
| `leftSetback` | numeric | metres |
| `rightSetback` | numeric | metres |
| `setbackBuildableArea` | numeric | computed: netLength × netWidth |
| `groundCoveragePct` | numeric | percentage (e.g. 60) |
| `coverageArea` | numeric | computed: siteArea × coveragePct / 100 |
| `actualGroundCoverage` | numeric | MIN(setbackBuildableArea, coverageArea) |
| `possibleFloors` | numeric | computed: permissibleFarArea / actualGroundCoverage |
| `superBuiltupFactor` | numeric | e.g. 1.25 |
| `superBuiltupArea` | numeric | computed: permissibleFarArea × superBuiltupFactor |
| `constructionRatePaise` | bigint | per sqm in paise |
| `estimatedProjectCostPaise` | bigint | computed: superBuiltupArea × rate |
| `breakdownJson` | jsonb | optional: civil/electrical/HVAC/interiors/landscape % split |
| `createdAt` / `updatedAt` | timestamptz | |

All computed fields are calculated server-side on upsert.
tRPC: `assessment.upsert`, `assessment.byProject`.

---

### Slice D — Feasibility Report Engine

**Purpose:** Generate architect-client discussion document from assessment output.

New table `esti_feasibility_report`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `projectId` | uuid FK → esti_projectoffice | |
| `assessmentId` | uuid FK → esti_pre_project_assessment | |
| `snapshot` | jsonb | assessment data at generation time |
| `generatedAt` | timestamptz | |
| `pdfStatus` | text | NONE / PENDING / PROCESSING / READY / FAILED |
| `pdfKey` | text | S3 key |
| `shareToken` | text | unique — enables anonymous client link |
| `createdAt` / `updatedAt` | timestamptz | |

PDF renders via the existing WeasyPrint worker (`feasibility_report` target).
Content: site area, FAR area, buildable area, possible floors, builtup area,
estimated cost (with optional breakdown), estimated timeline, compliance %.

tRPC: `feasibility.generate` (write), `feasibility.byProject`, `feasibility.generatePdf`.
Client portal: `shareToken`-based anonymous read route.

---

### Slice E — Risk Scoring Engine

**Purpose:** Predict project complexity before commitment.

**Deterministic read model** — no new table. Computed from `esti_project_dna` weights:

| Factor | Weight |
|---|---|
| Budget STRICT/VERY_STRICT | +20 |
| Vastu STRONG/STRICT_TRADITIONAL | +15 |
| Timeline URGENT | +15 |
| Revision tolerance HIGH/UNLIMITED | +15 |
| Decision makers FAMILY/PARTNERS/CORPORATE_COMMITTEE | +10 |
| Design flexibility STRICT_REQUIREMENT | +10 |
| `esti_projectoffice.jurisdiction` → complex zone (lookup) | +15 |

Output: `projectComplexityScore` 0–100.

```text
0–30   → Low Risk
30–60  → Moderate Risk
60–80  → Complex Project
80–100 → High Friction Project
```

tRPC: `projectDna.riskScore` (read-only, no gate). Displayed on the draft project header.

---

### Slice F — Client Discussion Layer

**Purpose:** Record structured outcomes after feasibility presentation.

Extend `esti_clientlog` — add column `outcome` enum:
`INTERESTED / BUDGET_REVISION_NEEDED / SCOPE_CHANGE_NEEDED / FOLLOW_UP_LATER / REJECTED`

Also add `budgetObjections` text and `architectComments` text columns.

No new table — extend the existing `clientLog` module + UI.

---

### Slice G — Draft Project State Machine

**Purpose:** Enforce the ENQUIRY → PROPOSAL → ACTIVE lifecycle.

Extend `esti_projectoffice` — add FK columns:
- `leadId` uuid nullable FK → esti_lead
- `dnaId` uuid nullable FK → esti_project_dna
- `assessmentId` uuid nullable FK → esti_pre_project_assessment

State machine rules (enforced server-side on `projectOffice.updateStatus`):

| From | To | Requires |
|---|---|---|
| any | ENQUIRY | (create-time default) |
| ENQUIRY | PROPOSAL | DNA record exists |
| PROPOSAL | ACTIVE | fee proposal APPROVED + client onboarding complete + at least one advance invoice PAID |
| ACTIVE | ON_HOLD | write-gated |
| ACTIVE / ON_HOLD | COMPLETED | `finance:ops`-gated |
| any | CANCELLED | write-gated |

Rejected flow: if fee proposal set to REJECTED → project auto-moves to CANCELLED.

---

### Slice H — Negotiation Engine

**Purpose:** Track commercial negotiation rounds before approval.

New table `esti_project_negotiation`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `projectId` | uuid FK → esti_projectoffice | |
| `feeProposalId` | uuid FK → esti_feeproposal | nullable |
| `roundNo` | int | sequential |
| `feeChangePaise` | bigint | delta from previous round (negative = discount) |
| `scopeChanges` | text | |
| `timelineChanges` | text | |
| `discountRequestedPct` | numeric | |
| `architectResponse` | text | |
| `clientResponse` | text | |
| `outcome` | enum | ONGOING / AGREED / STALLED / WITHDRAWN |
| `conversionProbability` | int | 0–100, deterministic formula |
| `createdById` | uuid FK → users | |
| `createdAt` | timestamptz | |

Conversion probability formula: `max(0, 80 - (rounds × 10) - discountGiven × 2)`.

tRPC: `negotiation.addRound`, `negotiation.listByProject`, `negotiation.closeRound`.

---

### Slice I — Client Approval Gate

**Purpose:** Formal client decision on the fee proposal.

Extend `esti_feeproposal`:
- Add `clientApprovalStatus` enum: `PENDING / APPROVED / REJECTED / ON_HOLD`
- Add `clientApprovedAt` timestamptz
- Add `approvalNotes` text

tRPC: `feeProposals.setClientApproval` (write-gated). On REJECTED:
draft project status auto-moves to CANCELLED; lead status auto-moves to LOST.

Frontend: add approval action row in `FeeProposals.tsx` and in the project fee panel.

---

### Slice J — Client Onboarding Engine

**Purpose:** Formal onboarding before project activation.

New table `esti_client_onboarding` (1:1 with `esti_projectoffice`):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `projectId` | uuid unique FK → esti_projectoffice | |
| `billingAddress` | text | |
| `gstin` | text | |
| `pan` | text | |
| `authorizedReps` | jsonb | `[{name, designation, phone}]` |
| `communicationPreference` | enum | EMAIL / WHATSAPP / PHONE / PORTAL |
| `agreementDocKey` | text | S3 key — signed contract scan |
| `idDocKey` | text | S3 key |
| `status` | enum | PENDING / COMPLETE |
| `completedAt` | timestamptz | |
| `completedById` | uuid FK → users | |
| `createdAt` / `updatedAt` | timestamptz | |

tRPC: `onboarding.upsert`, `onboarding.complete` (write-gated), `onboarding.byProject`.

---

### Slice K — Advance Payment Gate + Project Activation Engine

**Purpose:** Prevent activation without advance payment; auto-init downstream modules.

Extend `esti_invoice`:
- Add `isAdvance` boolean default false

`projectOffice.activate` pre-flight checks (all must pass):

```
1. DNA record exists
2. Pre-project assessment exists
3. Fee proposal clientApprovalStatus = APPROVED
4. Onboarding status = COMPLETE
5. At least one invoice with isAdvance=true AND status=PAID
```

On activation (in a single transaction):
1. Set `projectOffice.status = ACTIVE`
2. Create initial kick-off `esti_task` (BILLABLE, DESIGN_COMMUNICATION, "Kick-off meeting")
3. Create default `esti_estimate` skeleton (Cost Management System)
4. Write audit entry `PROJECT_ACTIVATED`
5. Return `{ ok: true, projectId }`

tRPC: `projectOffice.activate` (write-gated), distinct from `updateStatus`.

---

## 5. Database relationship map

```text
esti_lead
    │
    ├── esti_project_dna ─────────────┐
    │                                  │
    ├── esti_pre_project_assessment    │
    │       └── esti_feasibility_report│
    │                                  │
    └── esti_projectoffice ←───────────┘
              │
              ├── esti_client_onboarding
              │
              ├── esti_feeproposal (clientApprovalStatus)
              │       └── esti_project_negotiation
              │
              ├── esti_invoice (isAdvance)
              │
              ├── esti_clientlog (outcome)
              │
              └── [on ACTIVE] → esti_task, esti_estimate, client portal
```

---

## 6. Integration Layer (auto-init on activation)

After `projectOffice.activate`, the following are created automatically:

| System | Auto-created record |
|---|---|
| Task OS | `esti_task` — "Kick-off meeting", BILLABLE, DESIGN_COMMUNICATION, priority 50 |
| Cost Management System | `esti_estimate` skeleton |
| Client Portal | No action needed — portal access is already scoped by `esti_projectoffice.id` |
| Revision OS | `revision_count = 0` is implicit (no table; counted from `esti_decision`) |

---

## 7. Navigation — mapped to ESTI routes

| Project OS surface | ESTI route |
|---|---|
| Leads hub | `/leads` (new) — `Leads.tsx` |
| Lead detail + DNA capture | `/leads/:id` (new) — `LeadDetail.tsx` |
| Pre-project assessment | Project drawer → "Assessment" tab |
| Feasibility report | Project drawer → "Feasibility" tab, share link |
| Risk score | Draft project header badge |
| Negotiation rounds | Project drawer → "Negotiation" tab |
| Client approval gate | Fee proposal panel — approval action row |
| Client onboarding | Project drawer → "Onboarding" tab |
| Advance invoice flag | `Invoices.tsx` — "Mark as advance" toggle |
| Project activation | Draft project header → "Activate project" button |

No new top-level OS shell. Everything lives inside the existing project workspace
plus the new `/leads` hub. Plan gate: `leads` and `assessment` features require
**Core+** (same as `costing`).

---

## 8. Delivery slices

| Slice | Module | New tables | Status |
|---|---|---|---|
| A | Lead Capture Engine | `esti_lead` | ✅ Done (2026-06-26) |
| B | Project DNA Engine | `esti_project_dna` | ✅ Done (2026-06-26) |
| C | Pre-Project Assessment Engine | `esti_pre_project_assessment` | ✅ Done (2026-06-26) |
| D | Feasibility Report + PDF | `esti_feasibility_report` | ✅ Done (2026-06-26) |
| E | Risk Scoring Engine | none (read model) | ✅ Done (2026-06-26) |
| F | Client Discussion Layer | extend `esti_clientlog` | ✅ Done (2026-06-26) |
| G | Draft Project State Machine | extend `esti_projectoffice` | ✅ Done (2026-06-26) |
| H | Negotiation Engine | `esti_project_negotiation` | ✅ Done (2026-06-26) |
| I | Client Approval Gate | extend `esti_feeproposal` | ✅ Done (2026-06-26) |
| J | Client Onboarding Engine | `esti_client_onboarding` | ✅ Done (2026-06-26) |
| K | Advance Payment Gate + Project Activation | extend `esti_invoice`; state machine | ✅ Done (2026-06-26) |

Slices A–E are the "pre-project" half (new tables, new route).
Slices F–K are the "commercial funnel" half (extending existing modules + adding gates).
**All 11 slices shipped 2026-06-26** in migration `0100_project_os.sql`. Note: the
pipeline is ungated (LITE+) rather than Core+ — lead acquisition is core to any
practice, and conversion is naturally bounded by the existing project quota.

---

## 8.1 Program Formulation (shipped 2026-06-26)

The bridge between feasibility and design. **Feasibility is the single source of
truth for the maximum built extent**; the program (architectural space schedule)
is formulated within that envelope from client requirements, and once frozen it is
the baseline that design revisions are measured against.

```text
Feasibility (assessment.superBuiltupArea = max built extent)  ← source of truth
        +  client requirements
        ↓
Program (esti_program + esti_program_space)  — spaces × floors, bounded by the envelope
        ↓  freeze → versioned baseline
Revisions reference the frozen program version (esti_decision.program_version_id)
        ↓
Feasibility stays canonical all the way to the site
```

| Piece | Detail |
|---|---|
| Tables | `esti_program` (versioned DRAFT→FROZEN, `max_built_area_sqm` snapshot, `assessment_id`), `esti_program_space` (name, category, floor level, unit area × count); migration `0101_program.sql` |
| Envelope | `summarizeProgram(spaces, maxBuiltAreaSqm)` — total programmed area, utilization %, remaining, **`overEnvelope` advisory flag** (never blocks), by-floor + by-category rollups. While DRAFT the envelope is read **live** from `esti_pre_project_assessment.super_builtup_area`; on freeze it is snapshotted |
| Namespace | `program` — `summary` / `byProject` / `getOrCreate` / `addSpace` / `updateSpace` / `removeSpace` / `freeze` / `newVersion` (clones the frozen version's spaces into the next DRAFT) |
| Revision hook | `esti_decision.program_version_id` ties a CRIF revision to the frozen program version it is measured against — **wired end-to-end (31.2)**: `program.listVersions` feeds an "Against program version" select in the decision modal (`ProjectOverview.tsx`); rows show a `Program v{n}` tag |
| UI | `ProjectProgram.tsx` — "Program" tab in the project workspace: feasibility-envelope KPIs, utilization `ProgressBar`, space table, rollups, freeze + new-version (Pure Carbon) |

Over-allocation vs the feasibility envelope is **advisory** (a warning notification +
red tag), consistent with ESTI's checker-is-advisory ethos. Ungated (LITE+).

### Feasibility-to-site reference (31.3, shipped 2026-06-26)

`program.siteReference(projectId)` is the read-only payload that carries the feasibility
envelope (assessment figures) + the latest **FROZEN** program (spaces + `summarizeProgram`)
into site delivery. Drafts are never surfaced — the site always sees the agreed baseline,
so **feasibility-to-site stays one source of truth**. `ProjectSiteReference.tsx` renders it
as a "Program & feasibility" tab in the project workspace (`ProjectDetail.tsx`) and a compact section in the
mobile Site Portal (`SitePortal.tsx`). Read-only by design — edits happen upstream in the
Pipeline + Program tabs.

---

## 9. Key design decisions

1. **Lead as independent pre-client entity** — `esti_lead` exists before `esti_client`.
   Conversion (`leads.convert`) creates both in one transaction. This cleanly handles
   cold enquiries where no client record exists yet. The alternative (tag leads to
   existing clients) loses the pre-client stage entirely.

2. **DNA as a separate table, not inside projectBrief** — `projectBrief.designPrefs`
   is JSONB design intent (room requirements, finishes, mood). DNA is pre-sales
   commercial intelligence (budget psychology, vastu, revision tolerance). Different
   authorship (sales stage vs design stage) and different consumers (risk model vs brief).

3. **Assessment formulas are deterministic, not AI** — FAR / setback / GC / super-builtup
   are pure math. Server computes all derived fields on upsert. This matches how the
   existing Cost Dashboard and Cognition Engine work — no ML, no external APIs.

4. **Risk score is a read model, not a stored field** — same pattern as `projectComplexityScore`
   vs `getConstructionCostHealth`. Computed on demand; no migration required.

5. **Feasibility PDF reuses the existing WeasyPrint worker** — new target
   `feasibility_report` in `_RENDERERS`, renders from `snapshot` stored at generation
   time. Identical pattern to `cost_report`.

6. **Activation is a distinct `activate` procedure** — not the same as `updateStatus`.
   `activate` runs pre-flight checks, creates downstream records, and writes a
   structured audit entry. `updateStatus` remains for manual ON_HOLD / COMPLETED.

7. **Negotiation conversion probability is deterministic** — not ML. Formula:
   `max(0, 80 - (rounds × 10) - totalDiscountPct × 2)`. Advisory only.
