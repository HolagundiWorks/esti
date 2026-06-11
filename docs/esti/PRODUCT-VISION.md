# ESTI Product Vision

**Status:** Canonical · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-11

ESTI is an **Architectural Office Resource Management System (AORMS)** for
Indian freelance architects and small architecture practices. It is the single
operational record for projects, communication, tasks, decisions, drawings,
documents, statutory work, fees, invoices, consultants, tenders, and office
resources.

## Product Promise

Important work should be recorded in context and remain traceable. A drawing
revision belongs to its drawing and project; an approval belongs to the item
being approved; an instruction, RFI, task, decision, or risk remains linked to
the source object that created it.

ESTI should reduce dependence on disconnected messaging groups, email chains,
spreadsheets, and isolated file stores without attempting to replace normal
email or messaging applications.

## Target Practice

- India-based solo architects and architecture studios.
- Architecture, interior, landscape, and limited PMC practices.
- Teams that coordinate clients, consultants, vendors, and contractors.
- One configurable firm per installation, INR only, FY 1 April to 31 March.

## Product Boundary

ESTI is not a general ERP or contractor execution-accounting system. It does
include the contractor-facing coordination needed by an architect:

- contractor register and project invitations;
- tender issue, queries, bid receipt, comparison, and award recommendation;
- RFIs, material submittals, shop drawings, inspections, site instructions,
  snags, and NCRs;
- architect-side BOQ, estimation, purchase-order, and payment-certificate
  support.

Inventory, warehouses, labour gangs, attendance for contractor labour, GRNs,
subcontractor ledgers, RA-bill accounting, and construction-company finance are
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
6. **Pure Carbon UI.** The application uses IBM Carbon components, layout, and
   tokens without a parallel custom design system.
7. **Human-controlled AI.** AI may draft or summarize, but output remains
   editable and no external transmission occurs without explicit user action.

## Product Areas

- Dashboard and Activity Center
- Clients, enquiries, and project conversion
- Projects, phases, timeline, decisions, health, critical notes, and revisions
- Tasks, timesheets, daily updates, workload, and leave impact
- Drawings, specifications, mood boards, site reports, transmittals, approvals
- Client revision intelligence and studio performance analytics, delivered in a
  transparent and non-surveillant way
- Consultants and project-scoped collaborator portal
- Contractor register, tender management, and construction coordination
- Fee proposals, contracts, invoices, GST/TDS, reconciliation, and filing
- BOQ, takeoff, estimation, BBS, DSR/SOR, and simple purchase orders
- Office correspondence, MOM, templates, resources, and lessons learned
- Client and contractor portals
- Universal search, notifications, audit review, administration, and AI Studio

CRIF-style revision intelligence is part of ESTI's project memory: decision
states, revision budgets, impact previews, feedback structure, and closure
signals are attached to the project instead of living in isolated comment
threads.

ASPRF-style performance and rewards are part of ESTI's studio operations:
delivery reliability, quality, client impact, collaboration, learning, and
wellbeing are used to support coaching, recognition, and team health. These
signals must not become covert surveillance or punitive monitoring.

## Naming

- Product name: **ESTI** or **ESTI AORMS**.
- Company: **Holagundi Consulting Works (HCW)**.
- The supplied ESI-AORMS document is treated as product input; repository and
  application naming remains ESTI.
- PostgreSQL tables use the `esti_*` prefix.

Detailed requirements are in [PRD](PRD.md), current/future module boundaries in
[Architect Practice Profile](ARCHITECT-PROFILE.md), technical decisions in
[Architecture](ARCHITECTURE.md), and delivery order in [Roadmap](ROADMAP.md).
