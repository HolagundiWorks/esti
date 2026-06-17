# ESTI Implementation Roadmap

**Status:** Active · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-16

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
| [0](#phase-0---documentation-baseline-p0) | Documentation baseline | P0 | 🔄 |
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
| [5](#phase-5---tasks-availability-escalations-and-performance-p1) | Tasks, ASPRF, escalations | P1 | 🔄 |
| [6](#phase-6---client-and-consultant-collaboration-p1) | Client & consultant portals | P1 | ✅ |
| [7](#phase-7---contractor-and-tender-coordination-p2) | Contractors & tenders | P2 | 🔄 |
| [8](#phase-8---documents-and-numbering-p1) | Documents & numbering | P1 | ✅ |
| [9](#phase-9---search-knowledge-and-lessons-p2) | Search & lessons | P2 | ✅ |
| [10](#phase-10---commercial-and-estimation-expansion-p2) | Commercial expansion | P2 | ⬜ |
| [11](#phase-11---ai-studio-p2) | AI Studio | P2 | ⬜ |
| [12](#phase-12---production-readiness-p0) | Production readiness | P0 | 🔄 |

---

## Product snapshot

ESTI (AORMS) is a **working prototype** deployed at [aorms.in](https://aorms.in) — not yet production-complete.

**Live today**

- Staff auth ladder, firm/team/HR, clients, projects, tasks & Work module (Kanban, workload heatmap, attendance, activity)
- Fee proposals, invoices, reconciliation, filing abstracts, dashboard boards & intelligence tiles
- Project memory: CRIF decision ledger, revision source, scope drift, archive/retention
- Knowledge Bank: Master DSR, compliance/RIE, specification catalogue, SteelFlow workshop
- Client & consultant portals with threaded submissions and activity feeds
- ASPRF performance scoring, escalations, leave-impact alerts
- Contractor register, tender packages, token-scoped contractor bid portal
- **Document register** — unified office/project documents, MOM, templates, configurable numbering, XLSX exports
- **Universal search** — permission-aware office + Knowledge Bank search, lessons learned register
- Pure Carbon UI, marketing landing, VPS Docker deploy scaffolding

**Open before production declaration**

- Phase 12 backup/restore, TLS/secrets hardening, full smoke suite
- Phase 5 task calendar grid view (ASPRF gate remainder)
- Phase 7 tender documents/addenda, contractor RFIs/NCRs, construction boards

---

## Remaining work (priority order)

1. **P0 — Production readiness (Phase 12)** — backup/restore drill, secrets/TLS, pagination caps, worker idempotency, CI smoke suite
2. **P1 — Tasks (Phase 5 gate)** — dedicated task calendar grid in Work
3. **P2 — Tenders (Phase 7)** — controlled tender documents, sealed contractor bids, RFIs/NCRs, dashboard boards
4. **P2 — Commercial & AI (Phases 10–11)** — FY filters, estimate grid, AI gateway with human approval gates

---

# Completed & active phases

## Phase 0 - Documentation Baseline [P0]

- [x] Align vision, PRD, module profile, architecture, Carbon policy, roadmap.
- [x] Remove stale audit documents after moving findings into this roadmap.
- [x] Resolve product boundary: selective contractor coordination, no contractor ERP.
- [ ] Keep roadmap status current in every implementation pull request.

**Gate:** no canonical documents contradict product scope or delivery status.

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
- [ ] PDF export of BBS via worker (planned Phase 10).

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
- [ ] Optional ASPRF / notification snapshot tables — deferred (live scores from domain tables).

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

## Phase 4D - Knowledge Bank Foundations [P1] — Complete 2026-06-12

Formerly tracked as "Immediate Roadmap — Knowledge Bank Foundations". Consolidated here for phase order.

- [x] Rename Resources → Knowledge Bank; central route `/knowledge-bank` with DSR | Compliance | Specification | Structural Elements tabs.
- [x] Shared validation contracts; governed version lifecycle for specification and structural templates (`0021_knowledge_bank_catalogs.sql`).
- [x] `KnowledgeCatalogManagers.tsx`; `packages/contracts/src/knowledge-bank.ts`.
- [x] **Specification material catalogue** — `0038_spec_catalog.sql`; `SpecCatalogManager`; project spec sheets resolve from active catalogue.
- [x] **SteelFlow structural catalogue** — `steelflow-catalog.ts`; span rules; Apply catalogue in workshop; see [STEELFLOW-BOUNDED-CONTEXT.md](STEELFLOW-BOUNDED-CONTEXT.md).
- [~] Generate editable BBS draft lines from published structural template — SteelFlow (Phase 2E) covers interactive BBS; template import bridge → Phase 10.
- [ ] Validate BBS calculations with engineering fixtures before issue/export.
- [ ] Connect specification standards to procurement POs (catalogue → spec sheets delivered; PO linkage open).

**Gate met:** published knowledge items are versioned, cited, auditable, and consumed without copying mutable text.

---

## Phase 5 - Tasks, Availability, Escalations, And Performance [P1] — 🔄 Partial

- [x] Assignee IDs, reviewer, dependencies, CRITICAL priority, filters, ASPRF classification.
- [x] `workType`, difficulty coefficient, estimated hours.
- [x] Kanban board on Work module; Google Calendar iCal sync (`0040`); month heatmap on Workload tab.
- [ ] **Task calendar grid view** in Work (gate remainder).
- [x] Daily stand-ups (`esti_daily_update`); timesheets (`esti_timesheet`) — superseded for ASPRF by attendance (Phase 4A) but tabs remain.
- [x] Escalation settings (`0039`); digest delivery; leave-impact notifications with backup contacts.
- [x] **ASPRF engine** — six KPI dimensions, performance bands, recognition awards, reward points, `/performance` route.
- [x] Reliability, Quality, Client Impact, Collaboration, Learning, Wellbeing (opt-in) KPI refinements.
- [x] Team Utilization KPI; Site & Drawing Intelligence feeding Technical Intelligence tile.

**Gate (partial):** ASPRF dimensions, escalations, and calendar sync operational. Full gate requires dedicated task calendar grid view.

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

## Phase 7 - Contractor And Tender Coordination [P2] — 🔄 Partial

- [~] **Contractor register** — `esti_contractor` (`0029`); `/contractors` CRUD + ratings. **Pending:** tendering integration, contractor portal beyond bids.
- [~] **Tender packages** — `esti_tender` + invitations (`0030`); `/office/tenders`. **Pending:** controlled documents + addenda.
- [~] **Bid comparison** — `esti_tender_bid` (`0031`); staff record bids; award from comparison. **Pending:** contractor-submitted sealed bids (staff entry today).
- [x] **Contractor bid portal** — `/bid/:token`; token-scoped; satisfies isolation gate.
- [ ] RFIs, material submittals, shop drawings, inspection requests, site instructions, snags, NCRs.
- [ ] Tender and construction boards in Dashboard / Activity Center.

**Gate (partial):** one contractor cannot infer another's invitation or bid. RFIs/NCRs and dashboard boards remain open.

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
- [~] Visual estimation connector after versioned estimate primitives stabilize — deferred to Phase 11.
- [x] BBS PDF export via worker (from Phase 2E backlog).

**Gate met:** calculations remain deterministic, integer-paise where monetary, and tested (`fy.test.ts`, phase plan sum).

---

## Phase 11 - AI Studio [P2] — ⬜ Planned

- [ ] Provider-neutral AI gateway with firm-controlled enablement and secrets.
- [ ] Draft proposals, scopes, agreements, specifications, site reports, MOM, RFI responses, summaries.
- [ ] Permission-filtered retrieval, source references, redaction, usage records.
- [ ] Editable drafts only; explicit human issue/approval.
- [ ] **AI Billing Assistant** — natural-language billing suggestions from phase/collection data.
- [ ] **CRIF AI agents** — summarise revision history, draft impact statements, flag high-risk patterns.

**Gate:** no unauthorized context or automatic external transmission; every AI output records source, user, model, approval state.

---

## Phase 12 - Production Readiness [P0] — 🔄 Partial

- [ ] Tested PostgreSQL and object-store backup/restore.
- [x] Object-store bucket auto-provision on backend startup and worker upload (MinIO `esti-documents`).
- [x] Prod startup hardening — `ensureBucketWithRetry`, MinIO `depends_on`, deploy `/health` gate, bootstrap bucket pre-create.
- [x] VPS deploy scaffolding — `compose.prod.yaml`, `deploy/` scripts, nginx proxy, prod seeds, migration journal repair.
- [ ] Production secrets, TLS, public object-store/download strategy.
- [ ] Cursor pagination/server caps across lists; remove N+1 polling hotspots.
- [ ] Worker idempotency and documented resource/sandbox limits.
- [ ] API integration, frontend component/browser, migration, and build smoke tests.
- [ ] Release metadata screen, structured operational logs, readiness dashboards.
- [ ] Dependency/license report and selected top-level license.

**Gate:** restore drill, security checklist, production build, and end-to-end smoke suite pass before production declaration.

---

## Deferred ideas [P3]

Optional — must not delay security, activity, project memory, collaboration, wellbeing basics, or production readiness.

- CRIF Design Review Workspace (PDF canvas + annotation pins)
- CRIF Revision Impact Engine (effort/timeline/cost estimates)
- CRIF Profit leakage analysis (rework hours × rate)
- ASPRF Reward marketplace (redeem points for courses, leave)
- Pomodoro focus sessions and water reminders (out of core AORMS scope)
- Recognition boards (public studio leaderboard)
- Drawing snapping and title-block extraction
- SSE/push updates after correctness and scale justify them

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
| 2026-06-16 | Phase 5 ASPRF KPI refinements; site & drawing intelligence; deploy hardening |

**Marketing & deploy (2026-06-14+):** card-board landing, visit counter (`0042_site_metrics`), VPS cache-bust deploy fixes, solo/studio demo URLs. Presentation polish on dashboard KPI tiles is independent of phase gates.
