# ESTI Product Requirements

**Status:** Approved implementation baseline · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-11

This PRD aligns the supplied ESI-AORMS requirements with ESTI's agreed product
boundary. It distinguishes existing capabilities from work still required. The
complete delivery sequence is maintained in [ROADMAP](ROADMAP.md).

## Users And Access

| User | Required access |
| --- | --- |
| Owner | Firm, users, permissions, finance, deletion, and all projects |
| Partner / principal | Full project and commercial oversight except owner-only administration |
| Senior / project manager | Project delivery, coordination, invoices, drawings, tasks |
| Associate / architect | Assigned project operations, tasks, drawings, documents |
| Viewer / accounts-limited role | Capability-scoped read access; no operational writes |
| Client | Own projects; issued documents; approvals, acknowledgements, and change requests |
| Consultant | Engaged projects; assigned deliverables, drawings, RFIs, and responses |
| Contractor | Invited tenders and awarded projects only; bids, RFIs, submittals, inspections |

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
  Cancelled. It is independent from COA phase progress and is filterable across
  project and dashboard views.

### Compliance

Compliance is a standalone module, not a project tab or a permit-status
tracker. A project supplies the site and jurisdiction context; the module owns
the knowledge and calculation workflow and links its latest issued result back
to the project overview and document register.

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
- DSR/SOR, BOQ, drawing takeoff, BBS, and exports.
- A visual estimation connector may propagate quantities through reusable
  assemblies after the core estimate model and tests are mature.

All money is integer paise and formatted through shared `formatINR` utilities.

## Resources, AI, And Administration

- Searchable knowledge base, templates, CAD/BIM resources, vendor catalogues,
  and closure lessons learned.
- AI Studio drafts proposals, scopes, agreements, specifications, reports, MOM,
  and RFI responses. Outputs are editable, source-linked, permission-aware,
  auditable, and never auto-issued.
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

## Completion Definition

A capability is complete only when schema/contracts, authorization, backend,
Pure Carbon UI, audit/activity generation, tests, migration, and documentation
are delivered together and verified in the running Podman environment.
