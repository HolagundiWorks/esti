# ESTI Implementation Roadmap

**Status:** Active · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-19

Authoritative delivery plan for [PRD](PRD.md). Canonical docs index: [README](README.md).

---

## How to read this document

| Priority | Meaning |
|----------|---------|
| **P0** | Security, data integrity, production gates |
| **P1** | Operational core — firm runs on this daily |
| **P2** | Expansion — tenders, search, commercial depth |
| **P3** | Optimization and optional polish |

**Status markers:** ✅ Complete · 🔄 Partial · ⬜ Planned

- **Delivered** items describe the current repository.
- **Gates** are acceptance criteria — a phase is not closed until its gate is met.
- Presentation-only dashboard polish (demo tiles, landing layout) is **not** tracked here unless it affects delivery scope.

---

## Status at a glance

| Phase | Focus | Pri. | Status |
|-------|--------|------|--------|
| [0](#phase-0---documentation-baseline-p0) | Documentation baseline | P0 | ✅ |
| [1](#phase-1---security-authorization-and-retention-p0) | Security & retention | P0 | ✅ |
| [2](#phase-2---pure-carbon-and-responsive-shell-p0) | Pure Carbon shell | P0 | ✅ |
| [2B](#phase-2b---data-visualisation-spacing-and-colour-semantics-p0) | Charts & spacing | P0 | ✅ |
| [2C](#phase-2c---dashboard-chart-refresh-and-work-module-p1) | Dashboard charts & Work module | P1 | ✅ |
| [2D](#phase-2d---personal-workspace-and-dashboard-polish-p1) | Personal workspace | P1 | ✅ |
| [2E](#phase-2e---steelflow-ai-steel-arranger--automated-bbs-p1) | SteelFlow AI | P1 | ✅ |
| [2F](#phase-2f---ui-audit-page-hierarchy-and-policy-alignment-p0) | UI audit & PageHeader | P0 | ✅ |
| [2G](#phase-2g---workflow-ia--architecture-remediation-p0p3) | Workflow & IA remediation | P0–P3 | ✅ |
| [3](#phase-3---domain-activity-foundation-p1) | Activity foundation | P1 | ✅ |
| [4](#phase-4---project-memory-change-control-and-revision-intelligence-p1) | Project memory & CRIF | P1 | ✅ |
| [4A](#phase-4a---standalone-compliance-intelligence--rie-p1) | RIE / compliance | P1 | ✅ |
| [4B](#phase-4b---dashboard-intelligence-and-billing-action-p1) | Dashboard intelligence | P1 | ✅ |
| [4C](#phase-4c---revision-intelligence-and-crif-enhancements-p1) | Revision intelligence | P1 | ✅ |
| [4D](#phase-4d---knowledge-bank-foundations-p1) | Knowledge Bank catalogues | P1 | ✅ |
| [5](#phase-5---tasks-availability-escalations-and-performance-p1) | Tasks, ASPRF, escalations | P1 | ✅ |
| [6](#phase-6---client-and-consultant-collaboration-p1) | Client & consultant portals | P1 | ✅ |
| [7](#phase-7---contractor-and-tender-coordination-p2) | Contractors & tenders | P2 | ✅ |
| [8](#phase-8---documents-and-numbering-p1) | Documents & numbering | P1 | ✅ |
| [9](#phase-9---search-knowledge-and-lessons-p2) | Search & lessons | P2 | ✅ |
| [10](#phase-10---commercial-and-estimation-expansion-p2) | Commercial expansion | P2 | ✅ |
| [11](#phase-11---ai-studio-p2) | AI Studio | P2 | ✅ |
| [12](#phase-12---production-readiness-p0) | Production readiness | P0 | ✅ |
| [13](#phase-13---esticad-companion-integration-p2) | ESTICAD companion | P2 | 🔄 |

---

## Product snapshot

ESTI (AORMS) is **production-engineered through Phase 12** and deployed at [aorms.in](https://aorms.in). Declaring a **live firm instance** production-ready still requires operator sign-off on backup/restore ([PRODUCTION-OPS](PRODUCTION-OPS.md#staging-sign-off-record)).

**Live today**

- Staff auth ladder, firm/team/HR, clients, projects, tasks & Work module (Kanban, workload heatmap, attendance, activity)
- Fee proposals, invoices, reconciliation, filing abstracts, dashboard boards & intelligence tiles
- Project memory: CRIF decision ledger, revision source, scope drift, archive/retention
- Knowledge Bank: Master DSR, compliance/RIE, specification catalogue, SteelFlow workshop
- Client & consultant portals with threaded submissions and activity feeds
- ASPRF performance scoring, escalations, leave-impact alerts
- Contractor register, tender packages, token-scoped contractor bid portal, sealed bids, tender documents/addenda, site coordination (RFI/NCR/submittals)
- **Document register** — unified office/project documents, MOM, templates, configurable numbering, XLSX exports
- **Universal search** — permission-aware office + Knowledge Bank search, lessons learned register
- **AI Studio** — Ollama on-server drafts (billing, CRIF, MOM, proposals) with provenance; AORMS Agent command bar

**Before declaring a live firm instance production-ready**

- **Operator only** — run `deploy/restore-drill.sh` on a staging VPS clone and record sign-off in [PRODUCTION-OPS](PRODUCTION-OPS.md#staging-sign-off-record)
- **Phase 13D** — CAD AI gateway (`ai.generateCad`) — deferred; 13B/C/E complete

**Post–Phase 12 engineering (active delivery)**

- Phase 13D — ESTICAD CAD AI gateway — see [ESTICAD-COMPANION](ESTICAD-COMPANION.md)

---

## Remaining work (priority order)

1. **Staging ops (operator)** — restore drill sign-off on VPS clone ([PRODUCTION-OPS](PRODUCTION-OPS.md#staging-sign-off-record))
2. **P2 — ESTICAD 13D** — CAD AI gateway (`ai.generateCad`) — see [ESTICAD-COMPANION](ESTICAD-COMPANION.md)

---

# Completed & active phases

## Phase 0 - Documentation Baseline [P0] — ✅ Complete

- [x] Align vision, PRD, module profile, architecture, Carbon policy, roadmap.
- [x] Remove stale audit documents after moving findings into this roadmap.
- [x] Resolve product boundary: selective contractor coordination, no contractor ERP.
- [x] Canonical index ([README](README.md)), ops checklist ([PRODUCTION-OPS](PRODUCTION-OPS.md)), and Phase 0–12 status aligned with code (2026-06-19).

**Gate met:** no canonical documents contradict product scope or delivery status.

**Standing rule:** every material feature PR updates PRD + roadmap in the same change set ([STABILITY-CHARTER](STABILITY-CHARTER.md)).

---

## Phase 1 - Security, Authorization, And Retention [P0] — Complete 2026-06-11

- [x] Apply the same role/capability checks to REST uploads as tRPC procedures.
- [x] Prevent client, consultant, contractor, viewer, and demo accounts from unauthorized uploads or project references.
- [x] Reject drawing revision roots that do not exist or belong to another project.
- [x] Verify project ownership/scope for every object upload and mutation.
  - [x] Reject cross-project drawing transmittals, approval supersession, and invoice phase/client references.
- [x] Add configurable Origin validation for cookie-authenticated writes.
- [x] Add audit entries for binary uploads, drawing revisions, task lifecycle, PDF requests, mood-board changes.
- [x] Audit drawing/measurement, estimation, assignments, bylaws, client-log, and purchase-order writes.
- [x] Complete audit coverage for every remaining privileged state transition.
- [x] Replace destructive project deletion with reversible archive/restore.
- [x] Add an owner-only, paginated audit review API and Carbon screen.
- [x] Add API integration tests for staff tiers, portal scope, demo restrictions, capability procedures, retention, and every upload route.

**Gate met:** negative authorization tests cover every role and upload route; archive preserves child records; append-only audit survives archive/restore and operational-data reset.

---

## Phase 2 - Pure Carbon And Responsive Shell [P0] — Complete 2026-06-11

- [x] Remove decorative inline styles, raw hex colours, hand-rolled cards/bars, and non-permitted visual CSS.
- [x] Convert layouts to `Grid`, `Column`, `Stack`, Carbon tiles and tables.
- [x] Standardize loading, empty, error, validation, and destructive states.
- [x] Fix heading hierarchy, portal keyboard access, focus flow, and mobile tables.
- [x] Apply Carbon productive type scale to all semantic headings via SCSS `type-style()` mixin.
- [x] Add automated checks for hard-coded colours and browser smoke tests at desktop, tablet, and mobile breakpoints.

**Gate met:** frontend typecheck/lint/build pass; representative routes pass keyboard, dark-theme, and responsive review. 2026-06-13 audit resolved nine inline decorative violations (see Phase 2F).

---

## Phase 2B - Data Visualisation, Spacing Audit, And Colour Semantics [P0] — Complete 2026-06-12

- [x] Replace hand-rolled `ProgressBar` distribution boards with Carbon `SimpleBarChart`.
- [x] Add `DonutChart` to Financial Health (revenue breakdown).
- [x] Restructure dashboard per brief hierarchy: Action Center first, Activity Feed last.
- [x] Normalise `Stack gap` values against Carbon 2× spacing scale.
- [x] Switch KPI bar from `Grid condensed` to `Grid narrow`.
- [x] Establish Carbon colour anatomy rules in `CARBON-UI-DIRECTION.md`.
- [x] Add chart sizing helpers (`esti-chart-sm/md/lg`) and document data-viz rules.

**Gate met:** dashboard uses only `@carbon/charts-react`; spacing follows 2× grid tokens.

---

## Phase 2C - Dashboard Chart Refresh And Work Module [P1] — Complete 2026-06-12

- [x] Replace project-type board with `TreemapChart`; add phase `DonutChart`.
- [x] Replace workload band with `HeatmapChart` (weekly/daily toggle).
- [x] Add `GaugeChart` per person for daily task load.
- [x] Fix Carbon Charts theme isolation via `ThemeContext` + `useAppTheme()`.
- [x] Consolidate Tasks, Workload, Activity into `/tasks` Work module with URL tabs.
- [x] Workload heatmap uses Carbon tag token pairs; `/activity` and `/workload` redirect.

**Gate met:** all chart instances receive explicit `theme`; Work tabs persist through URL reload.

---

## Phase 2D - Personal Workspace And Dashboard Polish [P1] — Complete 2026-06-12

- [x] Personal Workspace panel (`PersonalPanel.tsx`) — Pomodoro, calculator, tasks, leave, theme toggle.
- [x] Pomodoro context + floating overlay; calculator state survives tab switches.
- [x] Global header clock; dashboard resource-card guidelines (Tag, pictogram, h3/h2, ghost actions).
- [x] Pomodoro and theme toggle removed from header top bar.

**Gate met:** panel fits without outer scroll; Pomodoro survives panel open/close.

---

## Phase 2E - SteelFlow AI: Steel Arranger + Automated BBS [P1] — Complete 2026-06-12

End-to-end interactive reinforcement arrangement and BBS generation per IS:456 / IS:2502.

- [x] Contracts layer (`steel-arranger.ts`): enums, Zod schemas, IS:456/IS:2502 pure functions.
- [x] Database migration `0022_steel_arranger.sql`; Drizzle schema; `steelflow` tRPC router.
- [x] BBS engine, Zustand store, `SteelArranger` route with SVG canvas, Excel export, AI review.
- [x] `dnd-kit` drag-and-drop bar placement; shape codes B/C/D/E; SLAB strip and FOOTING plan views.
- [x] SteelFlow nav link; migration applied.
- [x] PDF export of BBS via worker — delivered in [Phase 10](#phase-10---commercial-and-estimation-expansion-p2).

**Gate met:** user can define geometry, drag bars, export BBS to Excel, run IS:456 review — persisted via tRPC.

See also [STEELFLOW-BOUNDED-CONTEXT.md](STEELFLOW-BOUNDED-CONTEXT.md).

---

## Phase 2F - UI Audit, Page Hierarchy, And Policy Alignment [P0] — Complete 2026-06-15

Full frontend UI audit — align every screen to Dashboard reference pattern; close gap between `CARBON-UI-DIRECTION.md` and code via explicit exception list.

- [x] Document UI exceptions in `CARBON-UI-DIRECTION.md` (`.esti-lp`, glass panels, KPI tracks, etc.).
- [x] Shared `PageHeader` on all staff list routes; Login Carbon alignment; `PortalHeader` on external portals.
- [x] Landing USP previews — CRIF modal, ASPRF block, `QualityIntelligenceTiles.tsx`.
- [x] Revision source meter via `MeterChart` + `meter.proportional` (not `ProportionalMeterChart`).
- [x] Performance ASPRF bars → `MeterChart`; `carbon-policy-rules.mjs` aligned with CI.
- [x] Landing mobile nav; client portal Minor/Major/Critical revision categories (`0032_portal_revision_category.sql`).
- [x] Remove deprecated orphan route files (`Tasks.tsx`, `Workload.tsx`, etc.).

**Gate met:** every staff list route has a single page-level `h1`; login and portals share one Carbon shell; CI exceptions match documented list.

---

## Phase 2G - Workflow, IA & Architecture Remediation [P0–P3] — Complete 2026-06-15

Findings from [WORKFLOW-ARCHITECTURE-AUDIT.md](WORKFLOW-ARCHITECTURE-AUDIT.md).

### P0 — Data integrity & broken navigation

- [x] Migration journal `0031_tender_bids`; `/compliance` → `/knowledge-bank?tab=compliance`.
- [x] ProjectOverview deep links; Knowledge Bank `?project=` sync.

### P1 — Workflow & information architecture

- [x] Side nav prefix match; Alerts in side nav; portal deep links `/projects/:projectId`.
- [x] Settings IA; `/work` → `/tasks` alias.

### P2 — Code hygiene & structure

- [x] Remove deprecated route files; wire orphan project components.
- [x] KB embed extraction; Work module split; `writeActivity` on invoice, PO, drawing mutations.

### P3 — Architecture evolution

- [x] Slice `schema.ts` by domain file; extract dashboard/project read models.
- [x] Document `sf_*` SteelFlow naming.
- [x] Optional ASPRF / notification snapshot tables — **deferred post–Phase 12** (live scores from domain tables; see [Deferred ideas](#deferred-ideas-p3)).

**Gate met:** fresh migration creates tender bids; bookmarks land on correct tabs; schema split without drift.

---

## Phase 3 - Domain Activity Foundation [P1] — Complete

- [x] Immutable `esti_activity` records with visibility, metadata, timestamp.
- [x] Reusable contextual comments linked to domain objects.
- [x] Emit activity transactionally from significant domain operations.
- [x] Project timeline and office-wide Activity Center with cursor pagination and role filtering.
- [x] Backfill activity from existing audit and domain records where reliable.

**Gate met:** every core mutation produces one authorized, queryable timeline event.

---

## Phase 4 - Project Memory, Change Control, And Revision Intelligence [P1] — Complete

- [x] Project overview with tasks, notes, revisions, approvals, decisions, health summary.
- [x] Critical notes; decision register; lifecycle status separate from delivery stage.
- [x] Neutral architectural delivery stages (preserving phase IDs and linked invoices).
- [x] Drawing revision feed on project overview.
- [x] **CRIF** — DRAFT → OPEN → CLIENT_REVIEW → ACCEPTED/REJECTED → LOCKED; decision ledger; cooling-off; major/critical acknowledgement.
- [x] Archive project and retention-aware purge/export workflows.

**Gate met:** project history and risks understandable without opening separate modules.

---

## Phase 4A - Standalone Compliance Intelligence / RIE [P1] — Complete

- [x] Standalone compliance module; rule authoring in Knowledge Bank; BBMP seed → versioned knowledge bank.
- [x] **RIE engines:** site input, development control, basement, sustainability, approval readiness.
- [x] PRE_DESIGN / POST_DESIGN modes; violation engine; relaxation inputs; violations tab.
- [x] RIE refinements (basement height, rainwater, trees, FAR-excluded area, plinth area).
- [x] Bylaw two-system model; BBMP modular rule engine (`0033`, `0036`); see `BYLAW-SYSTEMS.md`, `BBMP-IMPLEMENTATION.md`.
- [x] Org mode + HR archive; attendance register (replaces timesheets for ASPRF); unified demo + HR gating.
- [x] Branded compliance PDF via worker; jurisdiction fixtures, auth tests, PDF smoke coverage.

**Gate met:** user can select a verified rule set, reproduce calculations from cited inputs, and issue a project-linked PDF.

---

## Phase 4B - Dashboard Intelligence And Billing Action [P1] — Complete

- [x] Global KPI bar; Action Center; APBF phase billing statuses and billing intelligence engine.
- [x] Financial Health module; Project Health scoring; Client Intelligence; Team Intelligence.
- [x] Activity Feed structured domain tags via `activityDomain()`.

**Gate met:** principal identifies every billable phase and overdue collection from the dashboard.

---

## Phase 4C - Revision Intelligence And CRIF Enhancements [P1] — Complete

- [x] `revisionSource` on decisions (CLIENT_DRIVEN / INTERNAL_ERROR / TECHNICAL_QUERY / SCOPE_CHANGE).
- [x] Revision Intelligence and Technical Intelligence dashboard tiles.
- [x] Revision Risk KPI band (LOW/MEDIUM/HIGH); revision budget per phase; scope drift % on project overview.

**Gate met:** revision health and scope drift computed automatically from typed decision records.

---

## Phase 4D - Knowledge Bank Foundations [P1] — ✅ Complete (2026-06-15)

Formerly tracked as "Immediate Roadmap — Knowledge Bank Foundations". Consolidated here for phase order.

- [x] Rename Resources → Knowledge Bank; central route `/knowledge-bank` with DSR | Compliance | Specification | Structural Elements tabs.
- [x] Shared validation contracts; governed version lifecycle for specification and structural templates (`0021_knowledge_bank_catalogs.sql`).
- [x] `KnowledgeCatalogManagers.tsx`; `packages/contracts/src/knowledge-bank.ts`.
- [x] **Specification material catalogue** — `0038_spec_catalog.sql`; `SpecCatalogManager`; project spec sheets resolve from active catalogue.
- [x] **SteelFlow structural catalogue** — `steelflow-catalog.ts`; span rules; Apply catalogue in workshop; see [STEELFLOW-BOUNDED-CONTEXT.md](STEELFLOW-BOUNDED-CONTEXT.md).
- [x] Generate editable BBS draft lines from published structural template — SteelFlow workshop + project BBS template apply (`ProjectBbs.tsx`).
- [x] **BBS engineering fixtures** — `fixtures/bbs-engineering.ts`, `validateBbsSchedule()`; blocks PDF/XLSX export until validation passes (`bbs.validate` tRPC).
- [x] **Procurement linkage** — PO lines link to project spec rows and catalogue items (`0052_po_spec_link.sql`); spec picker on `ProjectPurchaseOrders`.

**Gate met:** published knowledge items are versioned, cited, auditable, and consumed without copying mutable text; BBS issue/export runs engineering validation; procurement traces to specification standards.

---

## Phase 5 - Tasks, Availability, Escalations, And Performance [P1] — ✅ Complete

- [x] Assignee IDs, reviewer, dependencies, CRITICAL priority, filters, ASPRF classification.
- [x] `workType`, difficulty coefficient, estimated hours.
- [x] Kanban board on Work module; Google Calendar iCal sync (`0040`); month heatmap on Workload tab.
- [x] **Task calendar grid view** in Work — month grid by due date, day detail panel, unscheduled list (`/tasks?tab=calendar`).
- [x] Daily stand-ups (`esti_daily_update`); timesheets (`esti_timesheet`) — superseded for ASPRF by attendance (Phase 4A) but tabs remain.
- [x] Escalation settings (`0039`); digest delivery; leave-impact notifications with backup contacts.
- [x] **ASPRF engine** — six KPI dimensions, performance bands, recognition awards, reward points, `/performance` route.
- [x] Reliability, Quality, Client Impact, Collaboration, Learning, Wellbeing (opt-in) KPI refinements.
- [x] Team Utilization KPI; Site & Drawing Intelligence feeding Technical Intelligence tile.

**Gate met:** ASPRF dimensions, escalations, calendar sync, and task calendar grid operational.

---

## Phase 6 - Client And Consultant Collaboration [P1] — Complete

- [x] Client approval, acknowledgement, change-request, feedback writes (`portal` mutations, `0026`).
- [x] Consultant deliverables, RFIs, notes, firm-assigned tasks (`collab`, `0027`).
- [x] Firm branding, empty states, notifications, download authorization; staff triage inboxes.
- [x] Threaded contextual responses (`esti_submission_message`, `0028`).
- [x] Portal activity feeds — `ALL` visibility only.

**Gate met:** portal writes object-scoped, audited, cannot expose internal data. Verified end-to-end (client + consultant round-trips, STAFF rows excluded).

Demo workspaces: `seedDemo.ts` (studio, `principal@demo.aorms.in`) and `seedDemoSolo.ts` (solo, `solo@demo.aorms.in`). See [DEMO-AND-HR-MODE.md](DEMO-AND-HR-MODE.md), [ORG-MODE-AND-HR-ARCHIVE.md](ORG-MODE-AND-HR-ARCHIVE.md).

---

## Phase 7 - Contractor And Tender Coordination [P2] — ✅ Complete (2026-06-15)

- [x] **Contractor register** — `esti_contractor` (`0029`); `/contractors` CRUD + ratings; linked to tender invitations.
- [x] **Tender packages** — `esti_tender` + invitations (`0030`); `/office/tenders`; controlled documents + addenda (`esti_tender_document`, migration `0050`).
- [x] **Bid comparison** — `esti_tender_bid` (`0031`); staff record bids; award from comparison; contractor-submitted sealed bids until tender close.
- [x] **Contractor bid portal** — `/bid/:token`; token-scoped; document download, addendum acknowledgement, decline; satisfies isolation gate.
- [x] **Site coordination** — RFIs, material submittals, shop drawings, inspection requests, site instructions, snags, NCRs via contractor portal + staff inbox (`esti_contractor_submission`, migration `0051`); `/office/construction`.
- [x] **Dashboard boards** — open tender and construction counts on `dashboard.boards`; Action Center lists; tender/construction alert kinds.

**Gate met:** one contractor cannot infer another's invitation or bid; tender documents and coordination items are token- or staff-scoped with audit trail.

---

## Phase 8 - Documents And Numbering [P1] — Complete 2026-06-16

- [x] **Unified document register** — `/office/documents`; filter + XLSX export.
- [x] **Configurable numbering patterns** — `numberingPatterns` on org settings (migration `0043`).
- [x] **Document issue log** — `esti_document_issue` on issue/approve/PDF.
- [x] **Revision workflow** — `documents.revise` for inspections, specs, mood boards.
- [x] **Site reports** — photos, actions, convert action to task.
- [x] **Meeting minutes** — MOM + action items to tasks.
- [x] **Office templates** — LETTER / SCOPE / COA / MOM library.
- [x] **Exports** — BOQ, BBS, tender comparison, register XLSX.

**Gate met:** issued documents record number, version, issue row, and audit entry.

---

## Phase 9 - Search, Knowledge, And Lessons [P2] — Complete 2026-06-16

- [x] **Permission-aware universal search** — `/search`; Postgres `pg_trgm` indexes; role gates for invoices/fees/archived projects.
- [x] **Knowledge Bank search** — templates, DSR, spec catalogue, structural templates, drawings, contractors, published lessons.
- [x] **Lessons learned** — project tab + Knowledge Bank; draft → publish workflow (`esti_lesson_learned`, migration `0044`).
- [x] **Deep links + type filters** — `searchResultHref()` per entity; MultiSelect type filter on search page.

**Gate met:** search queries skip unauthorized entity classes; viewers/associates never receive invoice or fee proposal hits.

---

## Phase 10 - Commercial And Estimation Expansion [P2] — ✅ Complete (2026-06-16)

- [x] GST/TDS filters by FY/assessment year, quarter, and month everywhere.
- [x] Rich accountant exports and reconciliation column mapping/remapping.
- [x] Estimate/BOQ inline grid, bulk import, approval/versioning, PDF/XLSX export.
- [x] Expanded BBS templates and validated reinforcement layouts (SteelFlow catalog → BBS bridge).
- [x] **APBF Phase 0 (Appointment)** — pre-engagement site visit, scope, letter of appointment.
- [~] Visual estimation connector — superseded by Phase 13 ESTICAD companion ([ESTICAD-COMPANION](ESTICAD-COMPANION.md)).
- [x] BBS PDF export via worker (from Phase 2E backlog).

**Gate met:** calculations remain deterministic, integer-paise where monetary, and tested (`fy.test.ts`, phase plan sum).

---

## Phase 11 - AI Studio [P2] — ✅ Complete (2026-06-16)

- [x] Ollama on-server gateway — no cloud API keys or external transmit required.
- [x] Draft kinds: proposal, scope, agreement, spec, site report, MOM, RFI response, summary.
- [x] **AI Billing Assistant** — billing-ready phases and overdue collections from Action Center data.
- [x] **CRIF AI agents** — revision summary, impact statement, and risk-flag drafts from decision ledger.
- [x] Permission-filtered context assembly, source references on each run, PII redaction toggle.
- [x] `esti_ai_run` usage/provenance table; editable drafts; explicit review/approve states — no auto-issue.
- [x] `/office/ai-studio` route; inline panels on Dashboard (billing), MOM, CRIF overview; Company AI settings.
- [x] **AORMS Agent** — horizontal command bar (logo FAB, Alt+A) for quick Ollama prompts office-wide.

**Gate met:** Ollama gateway with template fallback when offline; demo gets read-only ESTI agent (Alt+A), not AI Studio drafts; every run audited with sources, user, model, approval state.

---

## Phase 12 - Production Readiness [P0] — ✅ Complete (2026-06-19)

- [x] Backup/restore scripts — `deploy/backup.sh` (`--clean`), `deploy/restore.sh`, `deploy/restore-drill.sh`.
- [x] Object-store bucket auto-provision on backend startup and worker upload (MinIO `esti-documents`).
- [x] Prod startup hardening — `ensureBucketWithRetry`, MinIO `depends_on`, deploy `/health` gate, bootstrap bucket pre-create.
- [x] VPS deploy scaffolding — `compose.prod.yaml`, `deploy/` scripts, nginx proxy, prod seeds, TLS via Certbot ([PRODUCTION-OPS](PRODUCTION-OPS.md#tls-and-nginx)).
- [x] List caps — `clampListLimit()` on task/invoice/drawing/reconcile/users lists + project logs/archived; shared `ProjectListParams` / `OfficeListParams`.
- [x] **Cursor pagination** — keyset pages on project decisions, comments, transmittals, takeoff measurements, approvals, critical notes, engagements (`ProjectCursorListParams`).
- [x] Release metadata — `/health` returns revision + checks; owner **Company → Release & readiness** panel; `system.release` tRPC.
- [x] Worker PDF idempotency — skip re-render when `pdf_status=READY`; documented in [WORKER-LIMITS.md](WORKER-LIMITS.md).
- [x] CI smoke — backend + frontend production builds in GitHub Actions; `scripts/licenses.mjs` for dependency audit.
- [x] Production ops checklist — [PRODUCTION-OPS.md](PRODUCTION-OPS.md) (secrets, TLS, object-store, health probes, demo seeds).
- [x] API smoke tests — `backend/src/smoke/production.test.ts`; `scripts/smoke-health.sh` for live `/health` + `/readyz`; `pnpm --filter @esti/backend test:api-smoke`.
- [x] Restore drill sign-off checklist — [PRODUCTION-OPS](PRODUCTION-OPS.md#staging-sign-off-record) (operator runs `deploy/restore-drill.sh` on staging VPS).
- [x] Extended API integration smoke — `test:api-smoke` + extended `test:companion` (13B/C/E paths).
- [x] Migration journal repair — register skipped entries (`0041_wellbeing_opt_in`, `0048_ai_studio`); `0056_schema_repair.sql` belt-and-suspenders for VPS drift.
- [x] Demo seed bootstrap — `seedBootstrap.ts` runs migrations before `seed:demo:prod` / `seed:demo:solo:prod`; showcase guards on companion schema.

**Engineering gate met:** production build, smoke suite, backup/restore scripts, pagination caps, ops documentation, and migration repair delivered.

**Operator gate (declaring production):** restore drill sign-off recorded per [PRODUCTION-OPS](PRODUCTION-OPS.md#staging-sign-off-record); TLS live; secrets rotated; demo seeds only on public demo hosts.

---

## Phase 13 - ESTICAD Companion Integration [P2] — 🔄 Partial (13A–13C, 13E done; 13D pending)

Native **ESTICAD** desktop CAD connects to AORMS for cloud takeoff and proxied Ollama AI. Spec: [ESTICAD-COMPANION](ESTICAD-COMPANION.md). ESTICAD roadmap: Phase 3 (takeoff) and Phase 6 (AI) redefined on the companion model.

**Policy (approved 2026-06-17):** offline drafting OK; takeoff online-only for paying firm staff with `write`; no local measurement data; world-coordinate measurements without mandatory DXF upload; server-published takeoff catalog JSON; full ESTICAD `AI_USE_CASES` set via ESTI gateway.

### 13A — Device auth and catalog — ✅ Complete (2026-06-18)

- [x] `auth.loginDevice` / `auth.refreshDevice` — bearer tokens for non-browser clients; Windows Credential Manager contract documented.
- [x] `companion.capabilities` — `{ takeoff, ai, firmName, subscriptionActive }` gated on active paying firm.
- [x] `companion.takeoffCatalog` — published JSON mirroring `TAKEOFF_CATALOG` from `@esti/contracts`.
- [x] REST `GET /api/companion/takeoff-catalog` for ESTICAD C++ client.
- [x] Companion rate limits and audit on device login (`esti_device_session`, migration `0053`).
- [x] Smoke script — `pnpm --filter @esti/backend test:companion`.

**Gate met:** ESTICAD prototype can authenticate and fetch catalog; demo/unlicensed session returns `takeoff: false`.

### 13B — Cloud measurements (world geometry) — ✅ Complete (2026-06-18)

- [x] Migration: `esti_measurement.source`, `world_geometry`, `entity_refs`, `scale_world_units`, `created_by_client` (`0055`).
- [x] `measurements.createCompanion` — world-coordinate create; server-side `computeTakeoffBoq`; replaces removed web `measurements.create`.
- [x] `measurements.removeCompanion` — ESTICAD-only delete with audit.
- [x] `measurements.listByDrawing` — returns geometry for ESTICAD overlay and web (web ignores unknown fields).
- [x] No offline measurement queue — failed POST leaves no local record.

**Gate met:** measurement created from companion appears in project takeoff list and `takeoffPreview`; AORMS web shows read-only quantities (no browser capture).

### 13C — Drawing link and deep links — ✅ Complete (2026-06-18)

- [x] `companion.linkDrawing` — create/link `esti_drawing` without file upload (`ref`, `title`, `projectId`).
- [x] `drawings.setScale` callable from companion for `TOSCALE` calibration.
- [x] Document `esticad://project/{id}/drawing/{id}` deep-link contract — see [ESTICAD-COMPANION](ESTICAD-COMPANION.md).
- [x] AORMS UI: **Open in ESTICAD** on project drawings tab.

**Gate met:** linked drawing accepts measurements; scale persists on drawing row.

### 13D — CAD AI gateway

- [ ] Extend `AiDraftKind`: `CAD_DIMENSION_SUGGEST`, `CAD_NAMING`, `CAD_DOCUMENTATION`, `CAD_QUANTITY_EXTRACT`, `CAD_LAYER_AUDIT`, `CAD_REVISION_SUMMARY`, `CAD_PLOT_ASSIST`, `CAD_BOQ_DRAFT`.
- [ ] `ai.generateCad` — permission-filtered context bundle; `esti_ai_run` with `source: esticad`.
- [ ] PII redaction and firm `aiSettings` gate unchanged from Phase 11.

**Gate:** each CAD draft kind returns audited proposal JSON; disabled AI firm setting returns clear error.

### 13E — Operations and admin — ✅ Complete (2026-06-18)

- [x] Company panel: connected devices list + revoke (**Company → Connected devices**).
- [x] API integration tests: device auth, capability denial, companion create/list/delete — `test:companion`.
- [x] Document companion REST surface in [ESTICAD-COMPANION](ESTICAD-COMPANION.md).

**Gate met:** owner can revoke device; revoked token cannot create measurements or call AI.

---

## Deferred ideas [P3]

Optional — must not delay security, activity, project memory, collaboration, wellbeing basics, or production readiness.

**Charter default: rejected** unless a paying firm sponsors a pilot and [STABILITY-CHARTER](STABILITY-CHARTER.md) records an exception.

| Idea | Status |
|------|--------|
| CRIF Design Review Workspace (PDF canvas + annotation pins) | **Rejected** — mark up in PDF/CAD; AORMS stores decision record |
| CRIF Revision Impact Engine (effort/timeline/cost estimates) | Defer — sponsor-only pilot |
| CRIF Profit leakage analysis (rework hours × rate) | Defer — sponsor-only pilot |
| ASPRF Reward marketplace (redeem points for courses, leave) | Defer — surveillance risk |
| Pomodoro / water reminders expansion | **Rejected** — Personal Workspace sufficient |
| Recognition boards (public studio leaderboard) | **Rejected** — surveillance risk |
| Drawing snapping and title-block extraction in web | **Rejected** — primary CAD tools |
| Web takeoff / browser scale / `DrawingViewer` | **Rejected** — removed 2026-06-17; ESTICAD only |
| CAD/BIM vendor libraries in Knowledge Bank | **Rejected** — see STABILITY-CHARTER |
| Optional ASPRF / notification snapshot tables | Defer — post–Phase 12; live scores from domain tables |
| SSE/push updates | Defer until scale justifies |
| Optional DXF revision push from ESTICAD | Defer — explicit user action only; not takeoff baseline |

---

## Recent delivery log

Condensed session notes — detail lives in phase sections above.

| Date | Highlights |
|------|------------|
| 2026-06-11 | Phases 1–2 gates; security audit coverage; Pure Carbon shell |
| 2026-06-12 | Dashboard charts (Treemap, Donut, Heatmap, Gauge); Work module; SteelFlow Phase 2E; Knowledge Bank hub |
| 2026-06-13 | Carbon compliance audit; CLAUDE.md module map expansion |
| 2026-06-14 | Marketing landing (`.esti-lp`); brand assets + SEO; dashboard mosaic; Kanban; Docker prod scaffolding; demo seed expansion |
| 2026-06-15 | Landing USP + quality intelligence tiles; Phase 2F UI audit complete; workflow audit → Phase 2G |
| 2026-06-15–16 | Spec catalogue (`0038`); SteelFlow catalogue apply; prod Docker build fixes; MinIO bucket reliability; landing trim |
| 2026-06-16 | Phase 11 AI Studio — Ollama gateway, AORMS Agent bar, billing/CRIF drafts |
| 2026-06-17 | Phase 12 partial — list caps, release metadata, backup scripts, worker idempotency, CI builds |
| 2026-06-17 | Phase 12 continued — PRODUCTION-OPS checklist, restore drill script, list caps on key routers, smoke tests |
| 2026-06-17 | Phase 13 planned — ESTICAD companion integration spec ([ESTICAD-COMPANION](ESTICAD-COMPANION.md)) |
| 2026-06-17 | Web takeoff removed — `DrawingViewer` deleted; **Open in ESTICAD** on project drawings; `measurements.create`/`remove` blocked for browser |
| 2026-06-18 | Phase 12 — cursor pagination on decisions, comments, transmittals, measurements |
| 2026-06-18 | Phase 13A — device auth (`0053`), companion capabilities + takeoff catalog REST/tRPC |
| 2026-06-18 | Stability charter + doc drift alignment ([STABILITY-CHARTER](STABILITY-CHARTER.md)) |
| 2026-06-18 | Phase 12 complete — cursor pagination on approvals/critical notes/engagements; `test:api-smoke`; restore drill sign-off checklist |
| 2026-06-18 | Phase 13B/C/E — companion measurements (`0055`), linkDrawing, setScale, connected devices admin |
| 2026-06-19 | Phase 12 closed — migration journal repair (`0041`, `0048`, `0056`); demo seed bootstrap; PRODUCTION-OPS TLS + ops docs |
| 2026-06-19 | Documentation sweep — Phase 0–12 backlog reconciled; canonical index + PRD production readiness aligned |

**Marketing & deploy (2026-06-14+):** card-board landing, visit counter (`0042_site_metrics`), VPS cache-bust deploy fixes, solo/studio demo URLs. Presentation polish on dashboard KPI tiles is independent of phase gates.
