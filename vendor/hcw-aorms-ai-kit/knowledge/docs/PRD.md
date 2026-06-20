# ESTI Product Requirements

**Status:** Approved implementation baseline · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-19

This PRD aligns the supplied ESI-AORMS requirements with ESTI's agreed product
boundary. It distinguishes existing capabilities from work still required. The
complete delivery sequence is maintained in [ROADMAP](ROADMAP.md).

## Users And Access

Canonical level taxonomy: [ACCESS-MODEL](ACCESS-MODEL.md).

| User | Level | Required access |
| --- | --- | --- |
| Owner | L5 | Firm, users, permissions, finance, deletion, compliance audit log, and all projects |
| Partner / principal | L4 | Full project and commercial oversight except owner-only administration and audit log |
| Senior / project manager | L3 | Project delivery, coordination, invoices, drawings, tasks on **assigned** projects |
| Associate / architect | L2 | Assigned project operations, tasks, drawings, documents |
| Viewer / accounts-limited role | L1 | Capability-scoped read access; no operational writes |
| Client | External | Own projects; issued documents; approvals, acknowledgements, and change requests |
| Consultant | External | Engaged projects; assigned deliverables, drawings, RFIs, and responses |
| Contractor | External | Invited tenders and awarded projects only; bids, RFIs, submittals, inspections |

Authorization is enforced server-side for tRPC and REST/upload routes. Portal
roles cannot call office procedures or access unrelated projects.

## Global Experience

- Carbon React only, using the Carbon 2x Grid and Carbon tokens.
- Desktop, tablet, and mobile layouts; full-height light/dark shell.
- Global footer: `ESTI AORMS | hi@aorms.in | Developed by Holagundi Consulting Works`.
- Firm logo and document branding; no user-defined application colour palette.
- Global search across authorized projects, tasks, drawings, clients,
  contractors, agreements, specifications, decisions, and critical notes.
- Important notifications are immediate; lower-priority changes enter a daily
  digest to avoid notification overload.

## Operational Core

### Dashboard And Activity Center

The dashboard provides configurable Carbon boards for project stage/type,
tasks, workload, availability, approvals, drawing revisions, site activity,
accounting, tenders, risks, recent revisions, and project health. Personal
wellness widgets are optional and never displace operational information.

The dashboard also surfaces revision-intelligence and studio-health signals in
context: revision budget, impact previews, feedback quality, approval lag,
workload health, and recognition cues. These are attached to work objects
rather than exposed as detached management metrics.

The Activity Center is the daily command surface: digest, recent revisions,
critical notes, approvals, leave impact, contractor queries, client requests,
escalations, and announcements.

### Projects

Each project provides an immediate overview plus phases, tasks, timeline,
critical notes, decisions, revisions, approvals, documents, commercial data,
team, consultants, contractors, and settings.

- Timeline is generated from immutable domain activity.
- Revision intelligence is attached to review items: decision state, revision
  budget, impact estimate, feedback quality, closure history, and approval lag.
- Decisions record title, description, reason, approver, date, and impact.
- Critical notes record category, priority, status, visibility, owner, due date.
- Health scores cover schedule, finance, documentation, approvals, and resources.
- Revision entries capture change, actor, time, impact, and affected objects.
- Major/critical revisions require acknowledgement states: seen, acknowledged,
  or needs clarification.
- Archive is the default removal path. Permanent purge is owner-only and must
  preserve legally retained financial/audit records or produce an export.
- Project lifecycle is Enquiry, Proposal, Active, On hold, Completed, or
  Cancelled. It is independent from project-stage progress and is filterable across
  project and dashboard views.

### Compliance

Office-level compliance rule sets live in the **Knowledge Bank** (`/knowledge-bank?tab=compliance`; legacy `/compliance` redirects). Per-project development-control calculations run on the **Project Info** tab (§9 Compliance): `bylawCalc` saves the envelope and links results to the project brief and document register. There is no separate “Compliance” project tab.

- Knowledge is versioned by state, district, local authority, building use,
  rule source, effective date, and supersession date.
- Deterministic calculation rules produce ground coverage, FAR area, setbacks,
  and restricted building lines, with source clauses and assumptions.
- Every issued calculation produces a branded PDF snapshot. Historical issued
  PDFs remain immutable when rules or project inputs later change.
- The module must show when no verified rule set exists for the selected
  jurisdiction and must never silently substitute another district's rules.
- Statutory permits may remain office/project records, but permit due dates and
  approval statuses are not compliance tracking.
- External BPAS, AutoPlan, or authority status polling is out of scope because
  no dependable endpoint is available for incorporation.

### Tasks And Capacity

Tasks support project/object context, assignee IDs, priority including Critical,
status, due dates, review, dependencies, comments, daily updates, timesheets,
calendar views, and workload. Escalations notify assignee, project lead, and
principal according to configurable office rules. Leave impact exposes only
availability and backup contact to portals, never HR details.

Task and capacity analytics also support studio performance and rewards:
delivery reliability, quality, client impact, collaboration, learning, and
wellbeing. These signals are for coaching, recognition, and workload balance,
not surveillance.

Pomodoro focus sessions and water reminders are required wellbeing tools. They
must be opt-in, gentle, and user-controlled, with no punitive ranking or
manager-only visibility.

## Documents And Coordination

- Drawing register, immutable versions, revision notes, issue purpose, review
  status, issue sets, watermarks, and acknowledgement.
- Specification sheets and mood boards with client approval workflows.
- Site inspection reports with photos, actions, follow-ups, and status.
- Transmittals, MOM, letters, agreements, reports, and office templates.
- Contextual comments and activity on drawings, tasks, reports, tenders, RFIs,
  decisions, approvals, and submittals.
- Numbering engine for drawings and office documents using configurable firm
  patterns and concurrency-safe per-FY sequences.

## Contractor And Tender Scope

The contractor module supports architect-side coordination only:

- contractor company, GST/PAN, contacts, categories, and performance;
- tender creation, controlled issue, invitation, queries, addenda, sealed bid
  receipt, comparison, scoring, and award recommendation;
- RFIs, material submittals, shop drawings, inspection requests, site
  instructions, snags, and NCRs;
- strict portal isolation between contractors.

It does not provide inventory, labour, subcontractor, GRN, or contractor
accounting systems.

## Commercial And Estimation

- COA-aware fee proposals, scope, deliverables, exclusions, versions, approval.
- Contracts, phase-linked invoices, GST/TDS, receipts, reconciliation, filing.
- Simple quantity x rate purchase orders without inventory.
- DSR/SOR, BOQ, drawing takeoff (capture in ESTICAD only; list and estimate in AORMS), BBS, and exports.
- **ESTICAD companion** (Phase 13, complete): native desktop CAD links to AORMS for
  cloud-only takeoff (world-coordinate measurements, server-published catalog,
  no local measurement storage) and proxied Ollama AI for the full CAD use-case
  set. Requires a paying firm account and staff write access; offline drafting
  without takeoff is supported. See [ESTICAD-COMPANION](ESTICAD-COMPANION.md).
- ~~Visual estimation connector in the web app~~ — **superseded** by the ESTICAD
  companion (Phase 13). Do not add a second quantity pipeline in AORMS web.

All money is integer paise and formatted through shared `formatINR` utilities.

## Knowledge Bank, AI, And Administration

- The former Resources area is named **Knowledge Bank** and is the governed,
  versioned source for Master DSR, compliance rule sets, specification and
  procurement standards, and structural element/reinforcement templates.
- Specification standards carry project/work-package tags, reusable clauses,
  approved alternatives, units, DSR references, and purchase-order wording.
- Structural templates cover beams, columns, slabs, and footings, their types,
  geometry, cover, bar roles, diameters, spacing/count, laps, hooks, and shape
  codes. Published templates generate reviewable BBS lines; engineers remain
  responsible for design approval and project-specific validation.
- The Knowledge Bank expands to searchable templates and closure lessons learned.
  CAD/BIM vendor asset libraries remain **out of scope** ([STABILITY-CHARTER](STABILITY-CHARTER.md)).
- AI Studio drafts proposals, scopes, agreements, specifications, reports, MOM,
  and RFI responses. Outputs are editable, source-linked, permission-aware,
  auditable, and never auto-issued.
- **ESTI agent (Alt+A)** reads live AORMS data and suggests next steps — read-only;
  no auto-issue, upload, or mutation on behalf of the user.
- **CAD AI** (ESTICAD companion, delivered): dimensioning, naming, documentation,
  quantity extraction, layer audit, revision summary, plot assist, and BOQ
  narrative — proxied through `ai.generateCad` and the Ollama gateway with
  CAD-specific draft kinds and ESTICAD-side reconciliation before commit.
- Admin exposes application version, deployment date, pipeline status, release
  notes, users, capabilities, audit review, retention, backup, and restore state.

## Revision Intelligence And Rewards

ESTI keeps revision intelligence and studio performance separate but linked to
the same project and task context.

- CRIF-style revision intelligence reduces revision cycles, improves approval
  clarity, and keeps decision history auditable.
- ASPRF-style performance and rewards improve delivery predictability, quality,
  collaboration, learning, and wellbeing while supporting recognition.
- Reward and recognition surfaces must remain transparent and opt-in where
  wellbeing is concerned; ESTI must not become a covert surveillance tool.

## Non-Functional Requirements

- PostgreSQL is authoritative; binaries are content-addressed in object storage.
- Append-only audit and immutable activity records for significant actions.
- Explicit state-transition guards for approvals, drawings, invoices, tenders,
  RFIs, submittals, and project lifecycle.
- Origin/CSRF protection, rate limits, upload authorization and content checks.
- Cursor pagination and server caps for growing lists.
- Worker retry, dead-letter handling, idempotency, and resource limits.
- Tested backup/restore, production secrets, TLS, readiness, request IDs, and
  structured logs.
- Unit, API integration, worker, and browser smoke coverage in CI.

## Production readiness

Self-hosted production engineering is complete through [ROADMAP Phase 20](ROADMAP.md) (Phase 12 delivered the ops baseline):

- Backup/restore scripts and staging restore-drill checklist ([PRODUCTION-OPS](PRODUCTION-OPS.md))
- Host nginx + Let's Encrypt TLS; secrets and `ALLOWED_ORIGINS` over HTTPS
- List caps and cursor pagination on growing project/office queries
- `/health` and `/readyz` probes; release metadata in Company settings
- CI production builds; API smoke tests; worker PDF idempotency

Declaring a **live firm instance** production-ready additionally requires operator sign-off on a staging restore drill — not automated in code.

## Completion Definition

A capability is complete only when schema/contracts, authorization, backend,
Pure Carbon UI, audit/activity generation, tests, migration, and documentation
are delivered together and verified in the running Podman environment.
