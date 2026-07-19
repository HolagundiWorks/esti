# AORMS Product Requirements

> **⚠ Reconciliation note (2026-06-28).** The **Estimation OS**, **Construction Cost
> spine**, **Rate Books**, and **Rate Analysis** were **removed** in the teardown — the
> estimation / BOQ / BBS / rate-book requirements below are **historical**. The
> authoritative record of what exists today is
> [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) § "System state"; the active
> rebuild is [CONSTRUCTION-KNOWLEDGE-BANK.md](CONSTRUCTION-KNOWLEDGE-BANK.md) +
> [COST-MANAGEMENT-SYSTEM.md](COST-MANAGEMENT-SYSTEM.md).

**Status:** Approved implementation baseline · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-07-10

> **Nomenclature (2026-07-11):** **AORMS** = **Accelerated Operational Resources
> Management System** (platform for **AEC consulting firms**). Requirements below describe **AORMS-Studio**
> (architecture app, slug `aorms-studio`) unless noted. **AORMS-Consultancy** (engineering app) is roadmap.
> [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md).

This PRD aligns the supplied ESI-AORMS requirements with AORMS's agreed product
boundary. It distinguishes existing capabilities from work still required. The
complete delivery sequence is maintained in [ROADMAP](ROADMAP.md).

## Users And Access

Canonical level taxonomy: [ACCESS-HIERARCHY](ACCESS-HIERARCHY.md).

| User | Level | Required access |
| --- | --- | --- |
| Owner | L5 | Firm, users, permissions, finance, deletion, compliance audit log, and all projects |
| Partner / principal | L4 | Full project and commercial oversight except owner-only administration and audit log |
| Senior / project manager | L3 | Project delivery, coordination, invoices, drawings, tasks on **assigned** projects |
| Associate / architect | L2 | Assigned project operations, tasks, drawings, documents |
| Viewer / accounts-limited role | L1 | Capability-scoped read access; no operational writes |
| Client | External | Own projects; issued documents; approvals, acknowledgements, and change requests |
| Consultant | External | Engaged projects; assigned deliverables, drawings, RFIs, and responses |
| Contractor | External | Invited/awarded projects only; RFIs, submittals, inspections |

Authorization is enforced server-side for tRPC and REST/upload routes. Portal
roles cannot call office procedures or access unrelated projects.

## Global Experience

- **Material UI** styled by `@hcw/ui-kit` (Carbon React removed 2026-07).
- Desktop, tablet, and mobile layouts; full-height light/dark shell.
- Global footer: `ESTI AORMS | hi@aorms.in | Developed by Holagundi Consulting Works`.
- Firm logo and document branding; no user-defined application colour palette.
- Global search across authorized projects, tasks, drawings, clients,
  contractors, agreements, specifications, decisions, and critical notes.
- Important notifications are immediate; lower-priority changes enter a daily
  digest to avoid notification overload.

## Operational Core

### Dashboard And Activity Center

The dashboard provides configurable KPI boards for project stage/type,
tasks, workload, availability, approvals, drawing revisions, site activity,
accounting, risks, recent revisions, and project health. Personal
wellness widgets are optional and never displace operational information.

The dashboard also surfaces revision-intelligence and studio-health signals in
context: revision budget, impact previews, feedback quality, approval lag,
workload health, and recognition cues. These are attached to work objects
rather than exposed as detached management metrics.

The cognition backend ingests real office records into a normalized event
ledger, learns durable behavioral patterns for clients/team/office queues,
materializes a deterministic priority queue, and returns an AI reasoning frame
through `dashboard.home.cognitiveEngine`. The reasoning frame is evidence for
owner briefings; LLMs may explain it but must not create or alter scores,
rankings, or recommendations.

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

The in-product building-bylaw / development-control compliance engine — the
Knowledge Bank `ComplianceHub`, the RIE site-assessment rule engine
(`ruleVersions` / `siteAssessments`), the BBMP bylaw calculator (`bbmpRules`),
the per-project `bylawCalc` calculator, the public `/compliance-check` SEO tool,
and the public `/api/compliance/*` endpoints — was **removed** in the 2026-06
cleanup. AORMS no longer authors, versions, or computes ground-coverage / FAR /
setback envelopes, and no longer issues compliance PDFs. Regulatory awareness is
now limited to record-keeping plus the financial statutory obligations the office
genuinely owns:

- **Statutory permits** remain office/project records (the `permits` feature):
  permit type, authority, application/approval dates, and document links (BPAS,
  RERA, Fire/Aviation/Env NOC, OC, CC). Permit due dates and approval statuses
  are tracking aids, not a development-control engine.
- **GST / TDS statutory filing** (the `reports` filing abstracts) and **COA fee
  compliance** are unaffected — these are the statutory/financial obligations
  AORMS continues to support.
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

**ESTI Pulse (planned — spec: [ESTI-PULSE.md](ESTI-PULSE.md)):** tasks gain a
dependency graph, typed missing-parameter records, a 0–100 confidence score,
consequence-based priority bands (CRITICAL / ACTION TODAY / WATCH / NORMAL /
BACKLOG), and an auditable priority log. Scheduled standup cycles ask targeted,
role-routed questions and collect typed responses; the standup agent is
stage-gated (read-only → draft → approval-based → limited auto) and must never
emit generic update-nag notifications. Deterministic scoring is available on
every edition; agent/LLM features are Pro-gated.

## Documents And Coordination

- Drawing register, immutable versions, revision notes, issue purpose, review
  status, issue sets, watermarks, and acknowledgement.
- Specification sheets with client approval workflows.
- Site inspection reports with photos, actions, follow-ups, and status.
- Transmittals, MOM, letters, agreements, reports, and office templates.
- Contextual comments and activity on drawings, tasks, reports, RFIs,
  decisions, approvals, and submittals.
- Numbering engine for drawings and office documents using configurable firm
  patterns and concurrency-safe per-FY sequences.

## Contractor Scope

The contractor module supports architect-side coordination only:

- contractor company, GST/PAN, contacts, categories, and performance;
- RFIs, material submittals, shop drawings, inspection requests, site
  instructions, snags, and NCRs;
- *(Tendering — creation / issue / sealed bids / comparison / award — was
  **removed** in the 2026-06-29 consultancy-only teardown along with the `esti_tender*`
  spine; AORMS is consultancy-only and does not run contractor bidding.)*
- strict portal isolation between contractors.

It does not provide inventory, labour, subcontractor, GRN, or contractor
accounting systems.

## Commercial And Estimation

- COA-aware fee proposals, scope, deliverables, exclusions, versions, approval.
- Contracts, phase-linked invoices, GST/TDS, receipts, reconciliation, filing.
- Simple quantity x rate purchase orders without inventory.
- Project purchase orders and specification sheets. *(The PMC hub and its costing +
  running bills were **removed** in the 2026-06-29 consultancy-only teardown; the cost
  lifecycle is rebuilding as the CMS.)*
- ~~Rate book / SOR, BOQ, BBS, and the component-based **Estimation OS** (design-stage
  estimate, IFC→code mapping + auto-BOQ, rate analysis, frozen/versioned estimates,
  contractor work packages + running bills)~~ — **removed** 2026-06-28 and being rebuilt
  ground-up on the Construction Knowledge Bank. Spec:
  [CONSTRUCTION-KNOWLEDGE-BANK](CONSTRUCTION-KNOWLEDGE-BANK.md) +
  [COST-MANAGEMENT-SYSTEM](COST-MANAGEMENT-SYSTEM.md).
- ~~**ESTICAD companion** (Phase 13)~~ — **dropped 2026-07-19**. The native
  desktop CAD companion is retired with every other desktop app; the `companion`
  tRPC namespace, device-token auth, CAD AI draft kinds, and `esticad://` deep
  links have all been removed from the codebase.
- ~~Visual estimation connector in the web app — superseded by ESTICAD; do not
  add a second quantity pipeline in AORMS web.~~ **Ban lifted 2026-07-19.**
  Browser takeoff is now the only quantity pipeline: calibrate a sheet in
  `PlanReaderPanel`, measure, derive measurement-book rows, then push those
  quantities into an estimate (`estimate.importFromMeasurementBook`).

All money is integer paise and formatted through shared `formatINR` utilities.

## Item Library, AI, And Administration

- The former Resources area is now the **Item Library** (the former Knowledge Bank
  screen, `KnowledgeBank.tsx`) and is the governed,
  versioned source for specification and procurement standards. *(Rate Books and
  structural BBS templates were **removed**; the reference foundation is being rebuilt
  as the Construction Knowledge Bank — Material/Labour/Item libraries, item-mapped
  Specifications, and consumption Recipes. See
  [CONSTRUCTION-KNOWLEDGE-BANK](CONSTRUCTION-KNOWLEDGE-BANK.md).)*
- Specification standards carry project tags, reusable clauses,
  approved alternatives, units, and purchase-order wording.
- The Item Library expands to searchable templates; closure lessons learned live
  under LXOS (Internal Exchange). CAD/BIM vendor asset libraries remain **out of
  scope** ([STABILITY-CHARTER](STABILITY-CHARTER.md)).
- AI Studio drafts proposals, scopes, agreements, specifications, reports, MOM,
  and RFI responses. Outputs are editable, source-linked, permission-aware,
  auditable, and never auto-issued.
- **ESTI agent (Alt+A)** reads live AORMS data and suggests next steps — read-only;
  no auto-issue, upload, or mutation on behalf of the user.
- ~~**CAD AI** (ESTICAD companion): dimensioning, naming, documentation, quantity
  extraction, layer audit, revision summary, plot assist, BOQ narrative~~ —
  **removed 2026-07-19** with ESTICAD. `ai.generateCad` and the CAD draft kinds
  no longer exist; AI Studio and the ESTI agent are unaffected.
- Admin exposes application version, deployment date, pipeline status, release
  notes, users, capabilities, audit review, retention, backup, and restore state.

## Revision Intelligence And Rewards

AORMS keeps revision intelligence and studio performance separate but linked to
the same project and task context.

- CRIF-style revision intelligence reduces revision cycles, improves approval
  clarity, and keeps decision history auditable.
- ASPRF-style performance and rewards improve delivery predictability, quality,
  collaboration, learning, and wellbeing while supporting recognition.
- Reward and recognition surfaces must remain transparent and opt-in where
  wellbeing is concerned; AORMS must not become a covert surveillance tool.

## Non-Functional Requirements

- PostgreSQL is authoritative; binaries are content-addressed in object storage.
- Append-only audit and immutable activity records for significant actions.
- Explicit state-transition guards for approvals, drawings, invoices,
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
HCW-UI-Kit UI, audit/activity generation, tests, migration, and documentation
are delivered together and verified in the running Podman environment.
