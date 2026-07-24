# AORMS Product Vision

> **⚠ Reconciliation note (2026-06-28).** The **Estimation OS**, **Construction Cost
> spine**, **Rate Books**, and **Rate Analysis** were **removed** in the teardown — any
> mention of them as current capability is **historical**. The authoritative record of
> what exists today is [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md)
> § "System state". Estimation ships as firm **Rate Books** pricing a project
> **Estimation** tab — see [NAVIGATION.md](NAVIGATION.md) § Estimation.

**Status:** Canonical · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-07-10

> **Nomenclature (2026-07-10):** **AORMS** = **Accelerated Operational Resources
> Management System** (platform). This document describes **AORMS-Studio**
> — the workspace shipped from this repo (slug `aorms-studio`). See
> [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md).

**AORMS-Studio** is the operational system for
Indian freelance architects and small architecture practices: the single
operational record for projects, communication, tasks, decisions, drawings,
documents, statutory work, fees, invoices, consultants, contractors, and office
resources. **ESTI** (Embedded Studio Intelligence) is the intelligence/agent
layer embedded in that workspace.

The long-term product identity is a continuous organizational cognition engine:
AORMS should not merely store office data — ESTI continuously calculates office
health, surfaces causes, recommends interventions, and teaches better managerial
instinct. The implementation boundary is defined in
[COGNITION-ENGINE](COGNITION-ENGINE.md): deterministic systems create business
truth; LLMs explain business truth.

## Product Promise

Important work should be recorded in context and remain traceable. A drawing
revision belongs to its drawing and project; an approval belongs to the item
being approved; an instruction, RFI, task, decision, or risk remains linked to
the source object that created it.

AORMS should reduce dependence on disconnected messaging groups, email chains,
spreadsheets, and isolated file stores without attempting to replace normal
email or messaging applications.

## Target Practice

- India-based solo architects and architecture studios.
- Architecture, interior, and landscape design + site-supervision practices.
- Teams that coordinate clients, consultants, vendors, and contractors.
- One configurable firm per installation, INR only, FY 1 April to 31 March.

## Product Boundary

AORMS is not a general ERP or contractor execution-accounting system. It does
include the contractor-facing coordination needed by an architect:

- contractor register and project invitations;
- RFIs, material submittals, shop drawings, inspections, site instructions,
  snags, and NCRs;
- architect-side BOQ, estimation, purchase-order, site-measurement
  verification, and payment-certificate support (rebuilding as the CMS).

*(Contractor tendering — issue / sealed bids / comparison / award — was removed in the
2026-06-29 consultancy-only teardown; AORMS does not run contractor bidding.)*

Inventory, warehouses, labour gangs, attendance for contractor labour, GRNs,
subcontractor ledgers, contractor-side RA-bill accounting, and construction-company finance are
out of scope.

## Core Principles

1. **Context-based communication.** Operational communication is attached to a
   project object rather than stored in a standalone chat product.
2. **Complete traceability.** Important mutations create activity and audit
   records with actor, timestamp, and before/after data where applicable.
3. **Visibility of change.** Dashboards and activity feeds surface revisions,
   decisions, risks, approvals, leave impact, and overdue work.
4. **Role-scoped collaboration.** Internal staff use the office workspace;
   clients, consultants, and contractors use project-scoped portals.
5. **India-first correctness.** Money is integer paise; GST, TDS, COA,
   numbering, and financial-year rules are centralized.
6. **One design system.** The application uses HCW-UI-Kit (`@hcw/ui-kit`, MUI
   components, layout and tokens) throughout; the landing page alone stays Pure
   Carbon editorial. No competing third design system.
7. **Human-controlled AI.** AI may draft or summarize, but output remains
   editable and no external transmission occurs without explicit user action.
8. **Deterministic cognition.** Office health scores and interventions come
   from auditable system rules; LLMs explain those findings but do not create
   operational truth.

## Product Areas

- Dashboard and Activity Center
- Clients, enquiries, and project conversion
- Projects, phases, timeline, decisions, health, critical notes, and revisions
- Tasks, timesheets, daily updates, workload, and leave impact
- Drawings, specifications, site reports, transmittals, approvals
- Client revision intelligence and studio performance analytics, delivered in a
  transparent and non-surveillant way
- Consultants and project-scoped **Consultant portal** (alias *collaborator portal* in internal copy)
- Contractor register and architect-side site coordination
- Fee proposals, contracts, invoices, GST/TDS, reconciliation, and filing
- BOQ, takeoff, and estimation with simple purchase orders (rebuilding as the CMS)
- Item Library and the Construction Knowledge Bank for specification/procurement
  standards and reusable material/labour/item libraries
- Office correspondence, MOM, templates, CAD/BIM resources, and lessons learned
- Client and contractor portals
- Universal search, notifications, audit review, administration, and AI Studio

The in-product bylaw/development-control compliance engine was **removed** in the
2026-06 cleanup — AORMS no longer calculates ground-coverage/FAR/setback envelopes
or issues compliance PDFs. Regulatory awareness is limited to statutory **permit**
records and **GST/TDS** filing; AORMS never implied a live BPAS/AutoPlan
connection.

CRIF-style revision intelligence is part of AORMS's project memory: decision
states, revision budgets, impact previews, feedback structure, and closure
signals are attached to the project instead of living in isolated comment
threads.

ASPRF-style performance and rewards are part of AORMS's studio operations:
delivery reliability, quality, client impact, collaboration, learning, and
wellbeing are used to support coaching, recognition, and team health. These
signals must not become covert surveillance or punitive monitoring.

## Naming

- Product name: **AORMS** (**Accelerated Operational Resources Management System**, platform for AEC consulting firms).
- Shipped app: **AORMS-Studio** (slug `aorms-studio`, architecture / Indian architecture consultancies).
- Engineering app: **AORMS-Consultancy** (slug `aorms-consultancy`) — live (P9.V ✅ · P9.M ✅).
- **EOMS** (Emergent Object Management System) — **knowledge bank** (standalone API).
- **ESTI** (Embedded Studio Intelligence) — **internal AI agent** (live in **AORMS-Studio**).
- Company: **Holagundi Consulting Works (HCW)**.
- The supplied ESI-AORMS document is treated as product input; repository and
  code naming keeps the `esti` codename.
- PostgreSQL tables use the `esti_*` prefix.

Detailed requirements are in [PRD](PRD.md), current/future module boundaries in
[Architect Practice Profile](ARCHITECT-PROFILE.md), technical decisions in
[Architecture](ARCHITECTURE.md), delivery order in [Roadmap](ROADMAP.md),
production operations in [PRODUCTION-OPS](PRODUCTION-OPS.md), and long-term
scope discipline in [Stability Charter](STABILITY-CHARTER.md).

**AORMS-Studio** phases **0–28** are engineering-complete. Active product queue and
Consultancy launch gates: [ROADMAP.md](ROADMAP.md) and
[ROADMAP.md](ROADMAP.md).
Operator restore-drill sign-off for a live firm instance remains in [PRODUCTION-OPS](PRODUCTION-OPS.md).
