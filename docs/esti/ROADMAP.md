# ESTI Implementation Roadmap

**Status:** Active · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-11

This is the authoritative delivery plan for [PRD](PRD.md). Priority meanings:
**P0** security/data integrity, **P1** operational core, **P2** expansion,
**P3** optimization. Items marked delivered describe the current repository;
all others remain required.

## Current Baseline

Delivered: authentication and staff ladder, client/consultant portals, clients,
projects and COA phases, tasks and workload, firm/team/HR, fee proposals,
invoices and filing abstracts, reconciliation, permits/bylaws, drawings and DXF
takeoff, approvals, consultants, proposals/contracts/letters, transmittals,
specification sheets, mood boards, inspections, DSR/BOQ/BBS, purchase orders,
dashboard boards, notifications, PDF worker, migrations, request IDs, rate
limits, upload content sniffing, worker retry/DLQ, and demo data.

The baseline is a prototype, not production-complete. “Delivered” does not
override the remediation work below.

## Phase 0 - Documentation Baseline [P0]

- [x] Align vision, PRD, module profile, architecture, Carbon policy, roadmap.
- [x] Remove stale audit documents after moving findings into this roadmap.
- [x] Resolve product boundary: selective contractor coordination, no contractor ERP.
- [x] Retain project-scoped consultant collaboration.
- [ ] Keep roadmap status current in every implementation pull request.

**Gate:** no canonical documents contradict product scope or delivery status.

## Phase 1 - Security, Authorization, And Retention [P0]

- [x] Apply the same role/capability checks to REST uploads as tRPC procedures.
- [x] Prevent client, consultant, contractor, viewer, and demo accounts from
  unauthorized uploads or project references.
- [x] Reject drawing revision roots that do not exist or belong to another project.
- [ ] Verify project ownership/scope for every object upload and mutation.
- [x] Add configurable Origin validation for cookie-authenticated writes.
- [x] Add audit entries for binary uploads, including drawing revisions.
- [x] Add before/after audit entries for task lifecycle writes.
- [x] Add audit entries for document PDF requests/deletion and mood-board changes.
- [x] Audit drawing/measurement, estimation, assignments, bylaws, client-log,
  and purchase-order operational writes.
- [ ] Complete audit coverage for every remaining privileged state transition.
- [ ] Replace default hard deletion with archive/retention rules.
- [ ] Add an owner-only audit review API and Carbon screen.
- [ ] Add API integration tests for permission boundaries.

**Gate:** negative authorization tests cover every role and every upload route;
audit and retained records survive archive operations.

## Phase 2 - Pure Carbon And Responsive Shell [P0]

- [ ] Remove decorative inline styles, raw hex colours, hand-rolled cards/bars,
  and non-permitted visual CSS.
- [ ] Convert layouts to `Grid`, `Column`, `Stack`, Carbon tiles and tables.
- [ ] Keep only colourless structural CSS permitted by `AGENTS.md`.
- [ ] Standardize loading, empty, error, validation, and destructive states.
- [ ] Fix heading hierarchy, portal keyboard access, focus flow, and mobile tables.
- [ ] Add automated checks for hard-coded colours and browser smoke tests at
  desktop, tablet, and mobile breakpoints.

**Gate:** frontend typecheck/lint/build pass and representative routes pass
keyboard, dark-theme, and responsive browser review.

## Phase 3 - Domain Activity Foundation [P1]

- [ ] Add immutable `esti_activity` records with project, object type/id,
  event type, actor, visibility, summary, metadata, and timestamp.
- [ ] Add reusable contextual comments linked to supported domain objects.
- [ ] Emit activity transactionally from significant domain operations.
- [ ] Build project timeline and office-wide Activity Center queries with cursor
  pagination and role/visibility filtering.
- [ ] Backfill activity from existing audit and domain records where reliable.

**Gate:** every core mutation produces one authorized, queryable timeline event.

## Phase 4 - Project Memory And Change Control [P1]

- [ ] Project overview with open tasks, critical notes, revisions, approvals,
  decisions, and health summary.
- [ ] Critical notes with category, priority, status, visibility, owner, due date.
- [ ] Decision register with rationale, approval, impact, and linked objects.
- [ ] General revision feed for drawings, specifications, mood boards, BOQs,
  agreements, and reports.
- [ ] Major/critical revision acknowledgement workflow.
- [ ] Project health engine: schedule, finance, documentation, approvals, resources.
- [ ] Archive project and retention-aware purge/export workflows.

**Gate:** a project’s history and current risks can be understood without
opening separate modules.

## Phase 5 - Tasks, Timesheets, Availability, Escalations [P1]

- [ ] Store assignee IDs rather than display names; add reviewer and dependencies.
- [ ] Critical priority, filters, “my tasks”, calendar, and Carbon board view.
- [ ] Daily updates: completed, in progress, blocked; generate activity entries.
- [ ] Timesheets and project/phase/task attribution.
- [ ] Configurable escalation rules and digest delivery.
- [ ] Leave-impact notifications and backup contacts with privacy filtering.

**Gate:** workload is derived from assignments, tasks, time, and availability.

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

**Gate:** one contractor cannot infer another contractor’s invitation, bid, or data.

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
- [ ] Visual estimation connector only after versioned estimate primitives stabilize.

**Gate:** calculations remain deterministic, integer-paise where monetary, and tested.

## Phase 11 - AI Studio [P2]

- [ ] Provider-neutral AI gateway with firm-controlled enablement and secrets.
- [ ] Draft proposals, scopes, agreements, specifications, site reports, MOM,
  RFI responses, and document summaries.
- [ ] Permission-filtered retrieval, source references, redaction, usage records.
- [ ] Editable drafts only; explicit human issue/approval.

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

- Recognition boards, Pomodoro timer, and water reminders.
- Drawing snapping and title-block extraction.
- External BPAS/AutoPlan polling.
- SSE/push updates after correctness and scale justify them.

These are optional and must not delay security, activity, project memory,
collaboration, or production readiness.
