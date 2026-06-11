# ESTI Implementation Roadmap

**Status:** Active · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-11

This is the authoritative delivery plan for [PRD](PRD.md). Priority meanings:
**P0** security/data integrity, **P1** operational core, **P2** expansion,
**P3** optimization. Items marked delivered describe the current repository;
all others remain required.

Temporary presentation note: the dashboard now uses presentation-focused
loading-aware metric tiles, linked recent activity, and a demo-friendly office
pulse strip. That polish is not a roadmap item and can be revised independently
of the delivery plan below.

## Current Baseline

Delivered: authentication and staff ladder, client/consultant portals, clients,
projects and general delivery stages, tasks and workload, firm/team/HR, fee proposals,
invoices and filing abstracts, reconciliation, statutory permit records, a BBMP
seed calculator, drawings and DXF takeoff, approvals, consultants,
proposals/contracts/letters, transmittals, specification sheets, mood boards,
inspections, DSR/BOQ/BBS, purchase orders, dashboard boards, notifications, PDF
worker, migrations, request IDs, rate limits, upload content sniffing, worker
retry/DLQ, demo data, Pure Carbon typography and responsive shell, Carbon
productive type scale applied to all routes.

The baseline is a prototype, not production-complete. "Delivered" does not
override the remediation work below.

## Phase 0 - Documentation Baseline [P0]

- [x] Align vision, PRD, module profile, architecture, Carbon policy, roadmap.
- [x] Remove stale audit documents after moving findings into this roadmap.
- [x] Resolve product boundary: selective contractor coordination, no contractor ERP.
- [x] Retain project-scoped consultant collaboration.
- [ ] Keep roadmap status current in every implementation pull request.

**Gate:** no canonical documents contradict product scope or delivery status.

## Phase 1 - Security, Authorization, And Retention [P0] - Complete 2026-06-11

- [x] Apply the same role/capability checks to REST uploads as tRPC procedures.
- [x] Prevent client, consultant, contractor, viewer, and demo accounts from
  unauthorized uploads or project references.
- [x] Reject drawing revision roots that do not exist or belong to another project.
- [x] Verify project ownership/scope for every object upload and mutation.
  - [x] Reject cross-project drawing transmittals, approval supersession, and
    invoice phase/client references; validate parent projects on key creates.
- [x] Add configurable Origin validation for cookie-authenticated writes.
- [x] Add audit entries for binary uploads, including drawing revisions.
- [x] Add before/after audit entries for task lifecycle writes.
- [x] Add audit entries for document PDF requests/deletion and mood-board changes.
- [x] Audit drawing/measurement, estimation, assignments, bylaws, client-log,
  and purchase-order operational writes.
- [x] Complete audit coverage for every remaining privileged state transition.
- [x] Replace destructive project deletion with reversible archive/restore;
  retain issued documents and non-draft commercial records.
- [x] Add an owner-only, paginated audit review API and Carbon screen.
- [x] Add API integration tests for staff tiers, portal scope, demo restrictions,
  capability procedures, project references, retention, and every upload route.

**Gate met:** negative authorization tests cover every role and upload route;
project archive preserves child records, and the append-only audit survives both
archive/restore and administrative operational-data reset.

## Phase 2 - Pure Carbon And Responsive Shell [P0] - Complete 2026-06-11

- [x] Remove decorative inline styles, raw hex colours, hand-rolled cards/bars,
  and non-permitted visual CSS.
- [x] Convert layouts to `Grid`, `Column`, `Stack`, Carbon tiles and tables.
- [x] Keep only colourless structural CSS permitted by `CLAUDE.md`.
- [x] Standardize loading, empty, error, validation, and destructive states.
- [x] Fix heading hierarchy, portal keyboard access, focus flow, and mobile tables.
- [x] Apply Carbon productive type scale (`productive-heading-04/03/02`) to all
  semantic headings via SCSS `type-style()` mixin scoped to `.cds--content`.
- [x] Add automated checks for hard-coded colours and browser smoke tests at
  desktop, tablet, and mobile breakpoints.

**Gate met:** frontend typecheck/lint/build pass and representative routes pass
keyboard, dark-theme, and responsive browser review.

## Phase 3 - Domain Activity Foundation [P1]

- [x] Add immutable `esti_activity` records with project, object type/id,
  event type, actor, visibility, summary, metadata, and timestamp.
- [x] Add reusable contextual comments linked to supported domain objects.
- [x] Emit activity transactionally from significant domain operations.
- [x] Build project timeline and office-wide Activity Center queries with cursor
  pagination and role/visibility filtering.
- [x] Backfill activity from existing audit and domain records where reliable.

**Gate:** every core mutation produces one authorized, queryable timeline event.

## Phase 4 - Project Memory, Change Control, And Revision Intelligence [P1]

- [x] Project overview with open tasks, critical notes, revisions, approvals,
  decisions, and health summary.
- [x] Critical notes with category, priority, status, visibility, owner, due date.
- [x] Decision register with rationale, approval, impact, and linked objects.
- [x] Correct project lifecycle status filtering and labels; keep lifecycle
  separate from project-stage status.
- [x] Replace COA-derived project phases with neutral architectural delivery
  stages while preserving existing phase IDs and linked invoices.
- [ ] General revision feed for drawings, specifications, mood boards, BOQs,
  agreements, and reports, with client revision intelligence on each item.
- [ ] **CRIF — Design Review Workspace:** PDF canvas viewer with inline
  annotation pins, changemark stamps, and a collapsible side panel for
  review items; architect and client dual views of the same canvas.
- [ ] **CRIF — Decision states machine:** DRAFT → OPEN → CLIENT_REVIEW →
  ACCEPTED / REJECTED → LOCKED; state transitions produce activity entries and
  notify affected parties.
- [ ] **CRIF — Decision Ledger:** per-project table of all design decisions with
  status, revision category (minor/major/critical), approval lag, requester,
  owner, and linked drawing/document.
- [ ] **CRIF — Revision Impact Engine:** before accepting a revision, surface
  estimated effort days, timeline delta, and cost impact based on phase
  progress and historical revision data; architect must acknowledge before
  state transition to ACCEPTED.
- [ ] **CRIF — Cooling-Off Mechanism:** auto-lock revision after configurable
  idle period (default 14 days); send reminder at midpoint; locked items
  require owner override to reopen.
- [ ] Major/critical revision acknowledgement workflow (seen, acknowledged,
  needs clarification).
- [ ] Decision and revision summaries that surface the next action, the owner,
  and why the item is blocked or awaiting approval.
- [ ] Project health engine: schedule, finance, documentation, approvals,
  resources — feeds Phase 4B signals.
- [ ] Archive project and retention-aware purge/export workflows.

**Gate:** a project's history and current risks can be understood without
opening separate modules.

## Phase 4A - Standalone Compliance Intelligence / RIE [P1]

- [x] Remove compliance from project tabs and expose a standalone Carbon module.
- [x] Link the latest calculation summary back to the project overview.
- [x] Separate statutory permit records from compliance calculations.
- [ ] Replace the BBMP-only seed assumption with a versioned knowledge bank keyed
  by state, district, authority, building use, source, and effective date.
- [ ] Build governed rule authoring, review, publication, supersession, and source
  citation workflows.
- [ ] **RIE — Site Input Engine:** capture site dimensions, plot area, ground
  cover, topography, and approach road width; validate inputs against
  jurisdiction minimums before running any rule engine.
- [ ] **RIE — Development Control Engine:** pluggable rule modules for FAR/FSI,
  ground coverage, front/side/rear setbacks, restricted building lines,
  parking requirements (car, two-wheeler, cycle), and height restrictions;
  each module cites the specific bye-law clause.
- [ ] **RIE — Basement Compliance Engine:** permitted basement depth, ventilation
  requirements, and permissible basement uses per jurisdiction rules.
- [ ] **RIE — Sustainability Compliance Engine:** rainwater harvesting, solar
  panel area, EV charging provisions, and green cover requirements.
- [ ] **RIE — Approval Readiness Engine:** checklist of documents and clearances
  required for building plan submission; auto-scored based on project
  attachments and permit records.
- [ ] **RIE — Feasibility Dashboard:** single-screen summary of all constraint
  engine outputs (FAR utilised vs permitted, setback compliance, parking
  shortfall, approval readiness score) for a given site and jurisdiction.
- [ ] Produce deterministic ground-cover, FAR-area, setback, and restricted-
  building-line outputs from the selected verified rule version.
- [ ] Generate an immutable branded compliance PDF and register it against the
  project without adding live compliance-status tracking.
- [ ] Add jurisdiction fixtures, calculation unit tests, authorization tests,
  and PDF worker/browser smoke coverage.

**Gate:** a user can select a verified district/state rule set, reproduce every
calculation from cited inputs, and issue a project-linked PDF without implying a
live authority integration.

## Phase 4B - Dashboard Intelligence And Billing Action [P1]

The dashboard must answer "What can be billed today?" and surface firm-wide
health within 10 seconds of login.

- [x] **Global KPI Bar:** Revenue Due, Ready For Billing, Outstanding Collections
  (>30d), Active Projects, Pending Approvals, Revision Risk count; each KPI
  links to the relevant module; shown as a compact strip above the Office pulse.
- [x] **Action Center:** urgency-sorted list of items requiring immediate action:
  projects with phases reaching billing milestones, client approvals pending
  beyond SLA, overdue invoice collections, and revision-risk items; surfaced
  as the first operational section of the Dashboard.
- [x] **APBF — Phase billing statuses:** extended `PhaseStatus` with
  `READY_FOR_BILLING` and `BILLED`; added `PHASE_STATUS_LABEL` map; phase
  selector in Project Settings now shows human-readable labels.
- [x] **APBF — Billing Intelligence Engine:** Action Center surfaces phases with
  status APPROVED, READY_FOR_BILLING, or COMPLETE that have no outstanding
  invoice; also exposes per-project links and billing-percent estimates.
- [x] **Financial Health module:** revenue pipeline (active + proposal), ready-
  to-bill estimated value, outstanding collections, overdue >30d, and
  collected-this-FY panels on Dashboard; gated behind `fees:manage` capability.
- [ ] **Project Health scoring:** per-project composite indicator (Green /
  Yellow / Red) derived from schedule adherence, unbilled phases, open critical
  notes, approval lag, and revision count; surfaced on project list and overview.
- [ ] **Client Intelligence signals:** per-client approval response time,
  revision request frequency, outstanding payment age, and a derived risk score
  (Low / Medium / High); visible on client record and dashboard tile.
- [ ] **Team Intelligence signals:** capacity utilisation per assignee, overdue
  task count, and a simplified wellbeing flag (Healthy / Busy / Overloaded)
  derived from workload data; feeds Phase 5 full ASPRF scoring.
- [ ] **Activity Feed structured types:** categorise activity events by domain
  (client/project/team/financial) with type-specific icons; filter Activity
  Center by category.

**Gate:** principal can identify every billable phase and every overdue collection
from the dashboard without opening individual project or invoice screens.

## Phase 5 - Tasks, Timesheets, Availability, Escalations, And Performance [P1]

- [ ] Store assignee IDs rather than display names; add reviewer and dependencies.
- [ ] Critical priority, filters, "my tasks", calendar, and Carbon board view.
- [ ] Daily updates: completed, in progress, blocked; generate activity entries.
- [ ] Timesheets and project/phase/task attribution.
- [ ] Configurable escalation rules and digest delivery.
- [ ] Leave-impact notifications and backup contacts with privacy filtering.
- [ ] **ASPRF — Performance KPI dimensions:** Reliability (30% — on-time task
  delivery), Quality (25% — revision rate, rework), Client Impact (15% —
  approval speed, satisfaction), Collaboration (15% — review participation,
  knowledge sharing), Learning (10% — training, new skills), Wellbeing (5% —
  opt-in only, user-controlled).
- [ ] **ASPRF — Task classification:** Billable / Non-billable / Training /
  Collaboration / Personal; classification feeds dimension scores.
- [ ] **ASPRF — Performance score engine:** weighted average of KPI dimensions
  produces a rolling 30-day studio score per team member; firm-wide aggregate
  on dashboard Team Intelligence tile.
- [ ] **ASPRF — Performance bands:** Bronze / Silver / Gold / Platinum thresholds
  with visual badge; bands are informational and non-punitive.
- [ ] **ASPRF — Reward points engine:** points awarded for task delivery, client
  approval, collaboration events, and learning completions.
- [ ] **ASPRF — Recognition system:** peer-to-peer shout-out, milestone badges,
  and monthly spotlight; no manager-only views; all recognition is visible to
  the whole team.
- [ ] Pomodoro focus sessions and water reminders as opt-in, user-controlled
  wellbeing helpers.

**Gate:** workload is derived from assignments, tasks, time, and availability;
performance scores are transparent, opt-in for wellbeing dimensions, and
non-coercive.

## Phase 6 - Client And Consultant Collaboration [P1]

- [ ] Client approval, acknowledgement, change-request, and feedback writes.
- [ ] Consultant deliverables, contextual responses, RFIs, and assigned tasks.
- [ ] Firm branding, empty states, notifications, and download authorization.
- [ ] Portal activity feeds exposing only explicitly visible records.

**Gate:** portal writes are object-scoped, audited, and cannot expose internal data.

## Phase 7 - Contractor And Tender Coordination [P2]

- [ ] Contractor register, contacts, GST/PAN, categories, and performance.
- [ ] Tender packages, invitations, controlled documents, addenda, and deadlines.
- [ ] Sealed bid submissions, technical/commercial scoring, comparison, award.
- [ ] Contractor portal isolated by invitation/project.
- [ ] RFIs, material submittals, shop drawings, inspection requests, site
  instructions, snags, and NCRs.
- [ ] Tender and construction boards in Dashboard/Activity Center.

**Gate:** one contractor cannot infer another contractor's invitation, bid, or data.

## Phase 8 - Documents And Numbering [P1]

- [ ] Unified document register and configurable numbering patterns.
- [ ] Revision impact/approval for specifications, mood boards, reports, BOQs,
  agreements, MOM, and letters.
- [ ] Site-report photos, actions, status, and follow-up conversion to tasks.
- [ ] Meeting minutes with action-item conversion.
- [ ] Office templates, scope templates, and COA templates.
- [ ] PDF/XLSX exports for BOQ, BBS, tender comparison, and registers.

**Gate:** every issued document has a number, version, issue record, and audit trail.

## Phase 9 - Search, Resources, And Lessons [P2]

- [ ] Permission-aware universal search with Postgres full-text/trigram indexes.
- [ ] Knowledge base, templates, CAD/BIM library, vendor catalogues.
- [ ] Project-close lessons learned and reusable recommendations.
- [ ] Search result deep links and object-type filters.

**Gate:** search never returns unauthorized titles, snippets, or counts.

## Phase 10 - Commercial And Estimation Expansion [P2]

- [ ] GST/TDS filters by FY/assessment year, quarter, and month everywhere.
- [ ] Rich accountant exports and reconciliation column mapping/remapping.
- [ ] Estimate/BOQ inline grid, bulk import, approval/versioning, PDF/XLSX export.
- [ ] Expanded BBS templates and validated reinforcement layouts.
- [ ] **APBF — Phase 0 (Appointment):** pre-engagement phase for site visit,
  scope agreement, and letter of appointment; linked to fee proposal workflow.
- [ ] Visual estimation connector only after versioned estimate primitives stabilize.

**Gate:** calculations remain deterministic, integer-paise where monetary, and tested.

## Phase 11 - AI Studio [P2]

- [ ] Provider-neutral AI gateway with firm-controlled enablement and secrets.
- [ ] Draft proposals, scopes, agreements, specifications, site reports, MOM,
  RFI responses, and document summaries.
- [ ] Permission-filtered retrieval, source references, redaction, usage records.
- [ ] Editable drafts only; explicit human issue/approval.
- [ ] **AI Billing Assistant:** natural-language query ("what should we invoice
  this month?") answered from phase billing status, collection status, and
  overdue aging data; output is a suggested action list, not an auto-generated
  invoice.
- [ ] **CRIF AI agents:** auto-summarise revision history, draft revision impact
  statements, and flag designs with high revision-risk patterns.

**Gate:** no unauthorized context or automatic external transmission; every AI
output records source objects, user, model, and approval state.

## Phase 12 - Production Readiness [P0]

- [ ] Tested PostgreSQL and object-store backup/restore.
- [ ] Production secrets, TLS, public object-store/download strategy.
- [ ] Cursor pagination/server caps across lists; remove N+1 polling hotspots.
- [ ] Worker idempotency and documented resource/sandbox limits.
- [ ] API integration, frontend component/browser, migration, and build smoke tests.
- [ ] Release metadata screen, structured operational logs, readiness dashboards.
- [ ] Dependency/license report and selected top-level license.

**Gate:** restore drill, security checklist, production build, and end-to-end
smoke suite pass before any production declaration.

## Deferred Ideas [P3]

- Recognition boards.
- Drawing snapping and title-block extraction.
- SSE/push updates after correctness and scale justify them.

These are optional and must not delay security, activity, project memory,
collaboration, wellbeing basics, or production readiness.
