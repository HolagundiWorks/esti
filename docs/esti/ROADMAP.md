# ESTI Implementation Roadmap

**Status:** Active · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-14 (updated post-deployment + branding session: branded landing redesign, ESTI/AORMS/HCW logos + favicons + OG, Docker prod scaffolding, migration journal repair, 14-project demo seed, dashboard redesign, SteelFlow into Knowledge Bank, task board view)

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

Also delivered in the latest session: central Knowledge Bank hub (DSR +
Compliance + Specification standards + Structural element templates in one module);
dashboard chart refresh (Treemap, Donut, Heatmap, Gauge); Work module consolidating
Tasks / Workload / Activity into a single URL-tabbed route; Carbon Charts theme
isolation fix via ThemeContext.

Also delivered: Personal Workspace panel (Pomodoro focus timer with global context
so it keeps running when the panel is closed, floating 20% opacity overlay while a
session is running; calculator tab with expression state persisted across tab switches;
Tasks tab showing open personal tasks; Leave balance tab; theme toggle moved into
panel; welcome note with Ar. name + formatted date); live date/time clock in the
global header; dashboard resource-card guideline applied to all tiles (Tag category
header, pictogram, h3 title, h2 KPI values, ghost "Open module" action buttons);
Pomodoro timer and theme toggle removed from the header top bar.

Also delivered: **SteelFlow AI — Interactive Steel Arranger + Automated BBS
Generator** (Phase 2E, complete): dnd-kit drag-and-drop bar placement from
T6–T32 palette onto SVG cross-section; shape codes B/C/D/E bent-bar cutting
lengths per IS:2502 with conditional dimension fields; SLAB cross-section strip
and FOOTING plan-view canvas variants; Excel BBS export; IS:456 AI review.

Also delivered: **Phase 4C — Revision Intelligence and CRIF enhancements**:
`revisionSource` field on decisions (CLIENT_DRIVEN/INTERNAL_ERROR/TECHNICAL_QUERY/
SCOPE_CHANGE) with source Select in CRIF modal and Tag column in decision ledger;
scope drift % summary above CRIF table; revision budget integer per phase with
inline edit in Project Settings; Dashboard KPI bar "Revision risk" now shows
LOW/MEDIUM/HIGH health band; Revision Intelligence tile (client/internal/site/scope
counts + health score + scope drift %) and Technical Intelligence tile (drawing
accuracy %, site query rate) both added to Zone 3 of the dashboard.

Also delivered (4A backlogs): **RIE POST_DESIGN mode and violation engine**:
`AssessmentPhase` enum (PRE_DESIGN/POST_DESIGN); actual setback inputs in form
(POST_DESIGN only); `runViolations()` pure engine producing `ViolationItem` per
parameter (FAR, ground coverage, height, all four setbacks, basement depth) with
COMPLIANT/WITHIN_RELAXATION/VIOLATION status; `RelaxationInputs` schema stored per
assessment; `setRelaxations` mutation re-runs violations with updated relaxations;
Violations tab added to FeasibilityDashboard with inline relaxation entry and
recompute. RIE engine refinements: basement height validation (min 2.4 m, max
2.75 m, exception 3.6 m for mechanical parking); rainwater harvesting trigger
(plinth > 100 sqm AND site ≥ 200 sqm); tree planting requirement (2 trees if
site ≥ 200 sqm) in sustainability engine; ≤9.5 m setback note in dev-control engine;
FAR-excluded area field so gross BUA minus excluded = net BUA compared against FAR
limit; plinth area field for rainwater trigger. Migration `0024_rie_phase2.sql`
applied.

Also delivered: **Phase 4A compliance PDF**: `generatePdf` + `pdfUrl` mutations on
the RIE router; Python worker `render_pdf` job with `target="compliance"` renders a
full A4 branded HTML→PDF via WeasyPrint; stores to S3 and patches `esti_site_assessment`
with `pdf_key` + `pdf_status` (PENDING → PROCESSING → READY); "Generate PDF" /
"Generating…" / "Regenerate PDF" flow in `SiteAssessmentPanel`. Migration
`0025_phase5_foundation.sql` adds `pdf_status` column.

Also delivered: **Phase 5 first-wave — ASPRF engine, timesheets, stand-ups, task
work type**: `work_type`, `difficulty_coefficient` (1–5), `estimated_hours` columns
on `esti_task`; `esti_timesheet` (per-person per-day project/task attribution with
billable flag); `esti_daily_update` (stand-up text per team member per date, unique
constraint); `esti_reward_point` (audit-trailed points for on-time delivery, zero-rework,
first-pass approval, knowledge contribution, mentorship, training, team bonus).
New tRPC namespaces: `timesheets` (list/create/update/remove/summary), `dailyUpdates`
(list/upsertMine/today), `aspRf` (teamScores rolling 30-day + myScore), `rewards`
(listByMember/grant ownerProcedure). ASPRF score engine: 6 weighted KPI dimensions
(Reliability 30%, Quality 25%, Client Impact 15%, Collaboration 15%, Learning 10%,
Wellbeing 5% opt-in); performance bands Bronze/Silver/Gold/Platinum with Carbon-compatible
tag types. Work module gains Stand-up tab (daily update upsert + team view by date)
and Timesheets tab (log hours against project/task, billable toggle, summary totals).
Task create/edit form gains Work Type, Difficulty, and Est. Hours fields. `/performance`
route (HR-gated) shows member scorecard tiles with KPI bars, band tags, and a grant
reward points modal; Recognition tab shows award types and point event reference.

Also delivered (2026-06-13 convention audit): **Carbon-only compliance pass** —
full codebase audit found 9 inline decorative style violations (fontSize, border-radius,
background, fontWeight) across `BarPalette.tsx`, `ProjectOverview.tsx`,
`SteelArranger.tsx`, `Performance.tsx`, `Work.tsx`. All resolved by extracting
static visual props to new SCSS utility classes (`.esti-label`, `.esti-label--secondary`,
`.esti-label--helper`, `.esti-kpi-track`, `.esti-kpi-fill`, `.esti-cal-hdr`,
`.esti-cal-cell`, `.esti-heat-swatch`, `.esti-bar-palette`) in `styles.scss`;
only truly dynamic runtime values (computed width%, heatmap backgroundColor/color,
focus outline) remain as inline styles. No hardcoded hex colours or non-Carbon
components found. CLAUDE.md module map expanded from 9 to 57 tRPC namespaces
and all 33 frontend routes documented.

Also delivered (2026-06-14 deployment + branding session):
- **Branded marketing landing** — `Landing.tsx` rewritten as a research-oriented
  editorial page for Indian architects (solo practitioners to 50-person firms),
  scoped under `.esti-lp` (the single documented non-Carbon exception). Brand accent
  is indigo (`#3e367c` family, sampled from the AORMS logo); "Sign in" buttons removed
  (demo/contact CTAs only); the AORMS wordmark is the brand lockup in the top bar, hero,
  and footer; "Developed by Holagundi Consulting Wurkz" + HCW logo in the footer.
- **Brand assets + SEO** — real ESTI / AORMS / HCW logos and a full favicon set
  (`favicon.ico`, 16/32/48, apple-touch, android-chrome 192/512, `site.webmanifest`)
  in `frontend/public`; `index.html` carries SEO title/description/keywords, canonical,
  `theme-color`, Open Graph (`https://aorms.in/og-image.png`, 1200×630), Twitter
  summary_large_image, and SoftwareApplication + FAQPage JSON-LD. App header shows the
  white ESTI mark; Login shows a brand chip; App/landing footers credit HCW (theme-aware).
- **SteelFlow into Knowledge Bank** — Steel Arranger is now the 4th tab of the
  Knowledge Bank route (URL-driven `?tab=dsr|compliance|specification|steelflow`),
  rendering `<SteelArranger embedded />`.
- **Dashboard redesign** — condensed mosaic with minimal row gap; full-width zone-header
  tiles with an ArrowRight to the related page; 4-chip KPI strip (incl. Team utilization);
  per-card 3px health edge; Action Center split into four tiles; square-cornered coloured tags.
- **Personal panel UX** — X button removed; click-outside-to-close overlay; each tab
  wrapped in a card with proper spacing.
- **Task board (Kanban) view** — new Board tab on the Work module: To do / In progress /
  Blocked / Done columns of task cards with inline status moves and a "My tasks" filter.
- **Docker production scaffolding** — `compose.prod.yaml`, `deploy/` (`.env.production.example`,
  `bootstrap.sh`, `deploy.sh`, `nginx-proxy.conf`), `*.Dockerfile.prod`, `seed:prod` /
  `seed:demo:prod` scripts; targets a Hostinger Ubuntu + Docker VPS at **aorms.in**
  (podman stays the dev runtime).
- **Migration journal repair** — `backend/drizzle/meta/_journal.json` now registers
  migrations 0015–0025 so `runMigrations()` applies them in production (root cause of the
  prod dashboard 500s — timesheet/revision-source tables were never created).
- **Demo seed expansion** — `seedDemo.ts` now creates 14 clients/projects with aligned
  task arrays; owner is `principal@demo.aorms.in` / `demo1234` to match the demo login.

Also delivered (Phase 6 + solo demo): full client & consultant collaboration
(see Phase 6 below — all four bullets) and a **solo-firm demo** — `seedDemoSolo.ts`
(`seed:demo:solo` / `:prod`) seeds a single-architect practice with HR/teams OFF
(`Studio Aanya`, one OWNER `solo@demo.aorms.in`, 4 projects, fees/GST invoices,
a client portal login and one consultant engagement; no team members). The landing
demo login is configurable via `VITE_DEMO_EMAIL`, and `VITE_SOLO_DEMO_URL` adds a
"Solo demo" link pointing at a separate solo instance.

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
keyboard, dark-theme, and responsive browser review. 2026-06-13 audit confirmed
zero hardcoded hex colours and zero non-Carbon components; 9 inline decorative
style violations found and resolved (see Current Baseline note above).

## Phase 2B - Data Visualisation, Spacing Audit, And Colour Semantics [P0] - Complete 2026-06-12

- [x] Replace all hand-rolled `ProgressBar` distribution boards with Carbon
  `SimpleBarChart` horizontal (workload, receivables aging, project phases,
  project types); import `ScaleTypes` from `@carbon/charts` for axis typing.
- [x] Add `DonutChart` to the Financial Health module showing the full revenue
  breakdown (pipeline / ready-to-bill / outstanding / collected FY).
- [x] Remove redundant "Office Pulse" section (duplicated KPI bar content);
  replace with the full Action Center → Financial Health → Project Status flow.
- [x] Restructure dashboard layout per the brief hierarchy: Action Center first,
  Activity Feed last; intelligence tiles in 8/8 split.
- [x] Audit and normalise `Stack gap` values against the Carbon 2x spacing scale:
  `gap=3` (8 px) for label/value/tag groups; `gap=4` (12 px) for list items;
  `gap=5` (16 px) between tile sections; `gap=6` (24 px) between sub-modules.
- [x] Switch KPI bar from `Grid condensed` (2 px gutters) to `Grid narrow`
  (8/16 px gutters) for correct rhythm between KPI chips.
- [x] Activity Feed expanded to 8 events in a `Grid narrow` two-column layout.
- [x] Establish Carbon colour anatomy rules in `CARBON-UI-DIRECTION.md`:
  blue family for primary/interactive; green for success; red for error/danger;
  magenta for warning/pending (Tag palette has no gold); teal for informational;
  `InlineNotification kind="warning"` for gold alert banners.
- [x] Add chart sizing helpers to `styles.scss` (`esti-chart-sm/md/lg`).
- [x] Document all data-viz selection rules, chart option patterns, dynamic
  height formula, and "what not to do" list in `CARBON-UI-DIRECTION.md`.

**Gate met:** typecheck passes; dashboard uses only `@carbon/charts-react`
visualisations; no `ProgressBar` used as a distribution chart; all spacing
follows the 2x grid token scale; colour usage matches Carbon colour anatomy.

## Phase 2C - Dashboard Chart Refresh And Work Module [P1] - Complete 2026-06-12

- [x] Replace `SimpleBarChart` project-type board with `TreemapChart` (mono,
  projects by type; colour `pairing.option: 1`).
- [x] Add `DonutChart` for projects by architectural delivery phase.
- [x] Replace the workload band display with `HeatmapChart` (weekly:
  person × day-of-week; daily: person × ISO date) controlled by a Carbon
  `Toggle`; respects current app theme via `options.theme`.
- [x] Replace hand-rolled status counts with structured Active / On Hold /
  Closed number displays using Carbon `Tag` and semantic headings.
- [x] Add `GaugeChart` per person for daily task load (0–10 scale; arc value
  mapped from `count / 10 × 100`; raw count shown via `numberFormatter`).
- [x] Fix Carbon Charts theme isolation: `ThemeContext` created in
  `frontend/src/lib/theme-context.ts`; provided in `App.tsx` alongside
  `<Theme>`; consumed in every chart sub-component via `useAppTheme()`;
  each chart receives `options.theme: chartTheme`.
- [x] Consolidate Tasks, Workload, Activity into single `/tasks` **Work** module
  (`Work.tsx`) with three URL-persisted tabs (`?tab=tasks|workload|activity`);
  `/activity` and `/workload` redirect to the appropriate tab.
- [x] Workload calendar uses Carbon `--cds-tag-background-*` / `--cds-tag-color-*`
  token pairs for heatmap cell colouring: teal (1–2), blue (3–5), purple (6–8),
  red (9+); legend tile shows all five intensity levels.
- [x] Remove duplicate demo-account sign-in `HeaderGlobalAction` from the
  app header; single Sign out button remains.
- [x] Dashboard "Open Activity Center" button updated to `/tasks?tab=activity`.

**Gate met:** frontend typecheck passes; all six chart instances receive explicit
`theme`; Work module tabs persist through URL reload; workload heatmap renders
correct Carbon token colours in both light and dark themes.

## Phase 2D - Personal Workspace And Dashboard Polish [P1] - Complete 2026-06-12

- [x] **Personal Workspace panel** — fixed right drawer toggled by the User icon
  in the header `HeaderGlobalBar`; `width: 20rem`, `height: calc(100vh - 3rem)`,
  no outer scroll; implemented in `frontend/src/components/PersonalPanel.tsx`.
- [x] **Pomodoro Focus tab** — Work / Short break / Long break modes; countdown
  timer; pause / resume / reset; session counter; state lifted into
  `PomodoroContext` (React context with interval) so the timer runs even while
  the panel is closed.
- [x] **Floating Pomodoro overlay** — `position: fixed; opacity: 0.2` countdown
  shown bottom-right while any Pomodoro session is running; non-interactive.
- [x] **Calculator tab** — arithmetic expression evaluator with `×`, `÷`, `−`,
  `%`; expression state lifted to `PersonalPanel` so it survives tab switches;
  Enter to reuse result.
- [x] **Tasks tab** — live query of open personal tasks; shows priority and overdue
  tags; limited to 3 items + "more in Work" link.
- [x] **Leave balance tab** — pulls `dashboard.me` data; remaining / used /
  allowance metrics + progress bar.
- [x] **Theme toggle moved to panel** — Asleep/Light icon button in the panel
  header replaces the header-bar `HeaderGlobalAction`; state still stored in
  `localStorage` and propagated via `ThemeContext`.
- [x] **Welcome note** — `Welcome, Ar. {firstName}` + formatted weekday/date/year.
- [x] **Global header clock** — live `{weekday short}, {day} {month} · HH:MM`
  updated every second via `HeaderClock` component + `setInterval`.
- [x] **Dashboard resource-card guidelines** — all tiles restructured: `Tag` for
  category, `width={32}` pictogram, `<h3>` title, `<h2>` KPI values, ghost
  "Open module" action button at bottom; clock/leave widget removed from
  dashboard header.

**Gate met:** personal panel fits within panel height without any scroll on the
outer container; calculator state survives tab switches; Pomodoro timer survives
panel open/close; header clock updates every second.

## Phase 2E - SteelFlow AI: Steel Arranger + Automated BBS [P1] - Complete 2026-06-12

End-to-end interactive reinforcement arrangement and Bar Bending Schedule
generation per IS:456 / IS:2502, available at `/steel-arranger`.

- [x] **Contracts layer** (`packages/contracts/src/steel-arranger.ts`):
  - `SfBarDia`, `SfElementType`, `SfBarType`, `SfStirrupType`, `SfShapeCode` enums
    and label maps.
  - Zod input schemas: `SfSessionCreate`, `SfElementCreate`, `SfElementUpdate`,
    `SfRebarCreate`, `SfRebarUpdate`, `SfStirrupCreate`, `SfStirrupUpdate`.
  - `SfBbsRow` interface (computed, not stored).
  - `SfAiReview` interface with `warnings`, `suggestions`, and `summary`.
  - IS:456 / IS:2502 pure calculation functions:
    `sfUnitWeight(dia)` = D²/162 kg/m;
    `sfSteelWeight(dia, lengthMm, qty)`;
    `sfStirrupLength(w, d, cover, stirrupDia, hookAngle)` — inner perimeter
    + hook allowance − bend deduction;
    `sfStirrupCount(lengthMm, spacingMm)`;
    `sfDevelopmentLength(dia, fy, fck)` — IS:456 cl.26.2;
    `sfMinBarSpacing(dia, maxAggSize)` — IS:456 cl.26.3.1;
    `sfAutoPositionBars(n, widthMm, coverMm, diaMm)`.
- [x] **Database migration** (`backend/drizzle/0022_steel_arranger.sql`):
  `sf_sessions`, `sf_elements`, `sf_rebars`, `sf_stirrups` tables with cascading
  deletes; indexed on session, element, and created-by.
- [x] **Drizzle schema** — four `pgTable` definitions appended to
  `backend/src/db/schema.ts` using project-standard `id()` / `createdAt()` /
  `updatedAt()` helpers.
- [x] **Backend tRPC router** (`backend/src/modules/steelflow/router.ts`):
  - Session CRUD: `listSessions`, `createSession`, `deleteSession`.
  - Element CRUD: `listElements`, `createElement`, `updateElement`, `deleteElement`.
  - Rebar CRUD: `listRebars`, `createRebar`, `updateRebar`, `deleteRebar`.
  - Stirrup CRUD: `listStirrups`, `createStirrup`, `updateStirrup`, `deleteStirrup`.
  - `generateBbs` query — server-side BBS row computation (used for download).
  - `aiReview` query — rule-based IS:456 review engine: steel ratio validation,
    cover checks, stirrup spacing checks, development-length hints; extensible to
    OpenAI API in Phase 11.
  - Router wired at `steelflow` namespace in `backend/src/trpc/router.ts`.
- [x] **BBS Engine** (`frontend/src/engine/bbsEngine.ts`) — pure frontend
  functions: `autoPositionRebars`, `computeBbsRows`, `totalSteelKg`.
- [x] **Zustand store** (`frontend/src/store/useSteelStore.ts`) — tracks
  active session, active element, and AI panel open state.
- [x] **SteelArranger route** (`frontend/src/routes/SteelArranger.tsx`):
  - Sessions sidebar with create / delete.
  - Elements sidebar (BEAM / COLUMN / SLAB / FOOTING) with geometry form
    (length × width × depth, cover, fck, fy).
  - SVG cross-section canvas — concrete outline, cover zone dashed, stirrups
    as rect borders, rebars as circles; auto-positioned by bar type.
  - Rebar tab: add form (mark, dia, type, qty, cutting length optional);
    live list with delete.
  - Stirrup tab: add form (dia, type, spacing); live list with delete.
  - BBS tab: computed `SfBbsRow` table with totals; **Export BBS (Excel)**
    button via SheetJS/xlsx.
  - Development Length tab: IS:456 Ld table for all standard diameters.
  - IS:456 AI Review panel: warnings (steel ratio, cover, stirrup spacing) +
    suggestions (development length hint, dia standardisation).
- [x] SteelFlow nav link added to app sidebar (ChartCustom icon).
- [x] `packages/contracts/src/index.ts` exports `steel-arranger.ts`.
- [x] Migration `0022_steel_arranger.sql` applied via `podman cp` + `psql -f`;
  backend restarted; four tables and four indexes confirmed in DB.
- [x] `dnd-kit` drag-and-drop bar placement on SVG canvas: `BarPalette` with
  T6–T32 draggable pills; `CrossSectionDropZone` drop target; `handleDragEnd`
  computes SVG-mm position and opens a pre-filled rebar form modal.
- [ ] PDF export of BBS via worker (planned Phase 10).
- [x] Shape codes B/C/D/E cutting-length formulas (IS:2502): `sfLShapeCuttingLength`,
  `sfHairpinCuttingLength`, `sfCrankedBarCuttingLength`, `sfZShapeCuttingLength`,
  `sfShapeCuttingLength` dispatcher; shape selector + conditional extra-dimension
  fields (side leg / hairpin H+W / crank height) in rebar form with live preview.
- [x] Slab cross-section strip view (440×90 min, forced aspect ratio) and footing
  bird's-eye plan view (BOTTOM_MAIN as horizontal lines, SIDE_FACE as vertical
  lines) via `CrossSectionCanvas.tsx`; canvas variant selected by `elementType`.

**Gate met:** a user can define BEAM/COLUMN/SLAB/FOOTING geometry, drag bars
from the palette onto the SVG canvas, add bent bars with computed IS:2502 cutting
lengths (shape codes A–E), view the live cross-section, export a complete BBS to
Excel, and run an IS:456 AI review — all within the browser, with data persisted
to PostgreSQL via tRPC.

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
- [x] General revision feed for drawings with rev number, date, and note;
  surfaced on the project overview as "Drawing revision feed".
- [x] **CRIF — Decision states machine:** DRAFT → OPEN → CLIENT_REVIEW →
  ACCEPTED / REJECTED → LOCKED; state transitions produce activity entries;
  `DECISION_TRANSITIONS` map in contracts enforced server-side.
- [x] **CRIF — Decision Ledger:** per-project table of all design decisions with
  CRIF state tag, revision category (minor/major/critical), impact, days open,
  and inline Transition button; owner and linked object fields on create form.
- [x] **CRIF — Cooling-Off Mechanism (v1):** decisions past their review
  deadline surface a "Cooling off" tag; Transition button turns danger-red.
- [x] Major/critical revision acknowledgement: transitioning MAJOR or CRITICAL
  decision to ACCEPTED requires an explicit acknowledgement checkbox.
- [x] Decision summaries: per-decision "Next action" column computed from CRIF
  state and review deadline; owner and review-deadline fields on create form.
- [x] Archive project and retention-aware purge/export workflows: archive sets
  a 90-day purge-after date; admin can export a JSON bundle and mark the
  project for purge after the retention period; purge gate requires re-auth.

**Gate:** a project's history and current risks can be understood without
opening separate modules.

## Phase 4A - Standalone Compliance Intelligence / RIE [P1]

- [x] Remove compliance from project tabs and expose a standalone Carbon module.
- [x] Move compliance rule authoring into the unified Knowledge Bank; keep the
  Compliance module focused on assessment and evidence.
- [x] Link the latest calculation summary back to the project overview.
- [x] Separate statutory permit records from compliance calculations.
- [x] Replace the BBMP-only seed assumption with a versioned knowledge bank keyed
  by state, district, authority, building use, source, and effective date; BBMP
  Residential and Commercial seed versions seeded on first migration.
- [x] Build governed rule authoring, review, publication, supersession, and source
  citation workflows (DRAFT → REVIEW → PUBLISHED; supersession auto-demotes
  the previous published version for the same jurisdiction + building use).
- [x] **RIE — Site Input Engine:** capture site dimensions, plot area, ground
  cover, topography, approach road width, and road-abutting sides; validate
  against jurisdiction minimums before running any rule engine.
- [x] **RIE — Development Control Engine:** FAR/FSI, ground coverage, front/side/
  rear setbacks, restricted building lines, parking (car, two-wheeler, cycle),
  and height restrictions; each module cites the specific bye-law clause.
- [x] **RIE — Basement Compliance Engine:** permitted basement depth, ventilation
  requirements, and permissible basement uses per jurisdiction rules.
- [x] **RIE — Sustainability Compliance Engine:** rainwater harvesting pit volume,
  solar panel area, EV charging provisions, and green cover; scored 0–100.
- [x] **RIE — Approval Readiness Engine:** document/clearance checklist from the
  rule version; auto-scored from project attachments and permit records; NOT_READY /
  PARTIAL / READY readiness status.
- [x] **RIE — Feasibility Dashboard:** tabbed single-screen summary of all five
  engine outputs (FAR utilised vs permitted, setback compliance, parking
  requirements, sustainability score, approval readiness score) with overall score.
- [x] Produce deterministic engine outputs from the selected published rule version;
  all outputs stored in `esti_site_assessment` and reproducible from saved inputs.
- [x] **RIE — Pre-design / post-design phase modes:** `AssessmentPhase`
  enum (`PRE_DESIGN | POST_DESIGN`) added to contracts and DB; PRE_DESIGN returns
  the permissible envelope only; POST_DESIGN compares actual designed values
  against the envelope and computes per-parameter deviations.
- [x] **RIE — Violation / deviation engine:** `runViolations(devControl,
  basement, inputs, relaxations)` computes `ViolationItem` per parameter
  (FAR, ground coverage, height, front/rear/left/right setbacks, basement depth);
  each item carries `permissible`, `actual`, `deviation`, `deviationPct`,
  `relaxation` (manual), `effectiveLimit`, and `status` —
  `COMPLIANT | WITHIN_RELAXATION | VIOLATION`.
- [x] **RIE — Relaxation inputs:** `RelaxationInputs` schema stored on
  `esti_site_assessment` alongside `violations` jsonb; `setRelaxations` mutation
  re-computes violations with updated relaxation values and saves.
- [x] **RIE — Actual setback fields:** `actualFrontSetbackM`,
  `actualRearSetbackM`, `actualLeftSetbackM`, `actualRightSetbackM` in
  `SiteInputs`; shown only when phase is `POST_DESIGN`.
- [x] **RIE — FeasibilityDashboard violations tab:** POST_DESIGN assessments
  show a violations tab with per-parameter status tags (green/blue/red),
  deviation amounts, and inline relaxation entry with "Save and recompute" action.
- [x] **RIE refinements (brief-aligned):** basement height validation (min 2.4 m,
  max 2.75 m, exception 3.6 m for mechanical parking); rainwater harvesting
  trigger (plinth > 100 sqm AND site ≥ 200 sqm); tree planting requirement
  (2 trees if site ≥ 200 sqm) in sustainability engine; ≤9.5 m setback note in
  dev-control engine; `excludedAreaSqm` field so gross BUA minus excluded = net
  BUA compared against FAR limit; `plinthAreaSqm` field for rainwater trigger.
- [x] Generate an immutable branded compliance PDF and register it against the
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
- [x] **Project Health scoring:** per-project Green/Yellow/Red indicator derived
  from overdue invoices, overdue tasks, stale approvals, open critical notes,
  and revision requests; surfaced on dashboard "Project health" board with
  per-signal tags and project deep-links.
- [x] **Client Intelligence signals:** per-client approval response time
  (avg days SENT→APPROVED), revision request frequency, outstanding payment
  age, and derived risk score (Low/Medium/High); surfaced on dashboard
  "Client intelligence" tile.
- [x] **Team Intelligence signals:** per-assignee open task count, overdue
  count, high-priority count, and capacity flag (Healthy/Busy/Overloaded);
  surfaced on dashboard "Team intelligence" tile; feeds Phase 5 ASPRF.
- [x] **Activity Feed structured types:** `activityDomain()` function in
  contracts classifies event types (project/financial/client/team/system)
  by event-type prefix; Dashboard activity feed shows a domain tag alongside
  the raw event-type tag.

**Gate:** principal can identify every billable phase and every overdue collection
from the dashboard without opening individual project or invoice screens.

## Phase 4C - Revision Intelligence And CRIF Enhancements [P1]

Turns the existing decision ledger into a revision intelligence signal.

- [x] **Decision revision source:** `revisionSource` field on decisions —
  CLIENT_DRIVEN / INTERNAL_ERROR / TECHNICAL_QUERY / SCOPE_CHANGE; source Select
  in CRIF create modal; source Tag column in decision ledger table.
- [x] **Revision Intelligence module on dashboard:** per-studio tile showing
  client revision count, internal revision count, site query count, scope drift %
  (SCOPE_CHANGE decisions / total), revision health score, and risk band.
- [x] **Technical Intelligence module on dashboard:** drawing accuracy rate
  (1 − internal errors / total), site query rate, error and query counts.
- [x] **Revision Risk KPI:** replaced "revision risk count" in the Global KPI Bar
  with qualitative LOW / MEDIUM / HIGH band and health score from
  `revisionIntelligence` query.
- [x] **Revision budget per phase:** `revisionBudget` integer (0–99) on phases;
  inline editable TextInput in Project Settings phases table; auto-saves on blur.
- [x] **Scope drift display:** scope drift % computed from `allDecisions` and
  displayed above CRIF Decision Ledger on project overview.

**Gate:** a project's revision health score and scope drift % are computed
automatically from typed decision records with no manual data entry.

## Phase 5 - Tasks, Timesheets, Availability, Escalations, And Performance [P1]

- [x] Store assignee IDs rather than display names; add reviewer and dependencies;
  CRITICAL priority; "my tasks" checkbox; status/priority filters; ASPRF task
  classification (BILLABLE/NON_BILLABLE/TRAINING/COLLABORATION/PERSONAL).
- [x] **ASPRF task work type:** add `workType` field (separate from financial
  classification) — DESIGN_COMMUNICATION / DESIGN_DEVELOPMENT /
  TECHNICAL_PRODUCTION / CONSTRUCTION_SUPPORT; feeds dimension score routing.
- [x] **ASPRF — Anti-gaming:** difficulty coefficient (1–5) on each task;
  estimated hours field for delivery-predictability scoring.
- [x] Carbon board (Kanban) view for tasks — status columns (To do / In progress /
  Done) on the Work module with inline status moves; calendar view still pending.
- [x] Daily updates: completed, in progress, blocked; upsert per team member per
  day; Stand-up tab on Work module with team view.
- [x] Timesheets: per-person per-day attribution to project/task with billable
  toggle; Timesheets tab on Work module; summary query for ASPRF scoring.
- [ ] Configurable escalation rules and digest delivery.
- [ ] Leave-impact notifications and backup contacts with privacy filtering.
- [x] **ASPRF — Performance score engine:** rolling 30-day composite score per
  team member computed from tasks, timesheets, decisions, and approvals;
  weighted across 6 KPI dimensions; `teamScores` + `myScore` tRPC queries;
  Performance route (gated behind HR feature flag).
- [x] **ASPRF — Performance bands:** Bronze (70–80), Silver (81–90), Gold
  (91–95), Platinum (96+); Carbon `Tag` badge; informational and non-punitive.
- [x] **ASPRF — Recognition awards + reward points engine:** 7 award types with
  Carbon tag colours; 7 reward point event types (10–50 pts); `rewards.grant`
  ownerProcedure with audit; Recognition tab on Performance page.
- [ ] **ASPRF — Reliability KPI:** detailed delivery-predictability refinement
  (estimated vs actual duration using timesheet hours).
- [ ] **ASPRF — Quality KPI:** rework rate from internal decisions; QA score.
- [ ] **ASPRF — Client Impact KPI:** first-pass approval rate refinement.
- [ ] **ASPRF — Collaboration KPI:** reviewer participation from task reviewer field.
- [ ] **ASPRF — Learning KPI:** training task classification ratio.
- [ ] **ASPRF — Wellbeing KPI (opt-in):** workload health + burnout risk.
- [x] **Team Utilization KPI:** `dashboard.utilization` query (30-day total +
  billable timesheet hours vs ~22d×8h capacity per active member); "Team utilization"
  chip in the dashboard KPI strip.
- [ ] **Site & Drawing Intelligence:** site query rate (queries / issued
  drawings); repeat query rate; drawing clarity score (100 − query penalties);
  feeds Technical Intelligence module on dashboard.

**Gate (partial — first-wave delivered):** task work types, timesheets, daily
stand-ups, and the ASPRF rolling-score engine are operational. Full gate requires
calendar/board task views, configurable escalation rules, leave-impact notifications,
and the detailed per-dimension KPI refinements (timesheet-based delivery predictability,
rework-rate quality scoring, collaboration/learning/wellbeing depth).

**Delivered so far:** task `workType` + `difficultyCoefficient` + `estimatedHours`;
`esti_timesheet` + `esti_daily_update` + `esti_reward_point` schemas and routers;
ASPRF `teamScores` + `myScore` 30-day composite; performance bands Bronze → Platinum;
recognition awards + reward point events with `rewards.grant` (owner-only, audited);
Performance route; Work module Stand-up and Timesheets tabs.

## Phase 6 - Client And Consultant Collaboration [P1]

- [x] **Client approval, acknowledgement, change-request, and feedback writes.**
  `esti_portal_submission` table (migration 0026) + `packages/contracts/src/portal.ts`
  (submission kinds/status, approval-decision enum, Zod inputs). Client-portal
  mutations on `portal`: `respondApproval` (SENT/REVISIONS → APPROVED/REVISIONS/REJECTED
  with remarks), `acknowledge`, `submitChangeRequest`, `submitFeedback`, plus
  `mySubmissions` read-back — all scoped to `ctx.user.clientId` via `assertOwnedProject`
  and audited through `writeActivity` (`visibility: ALL`, `portal.*` event types).
  `Portal.tsx` gains approve/request-revisions/reject actions, per-drawing acknowledge,
  change-request + feedback modals, and a "My requests & feedback" table.
- [x] **Consultant deliverables, contextual responses, RFIs, and assigned tasks.**
  Consultant-originated collaborator-portal writes — `esti_consultant_submission`
  (migration 0027) + `contracts/consultant-portal.ts` (DELIVERABLE/RFI/NOTE +
  firm-assigned TASK kinds). `collab.submit` + `collab.mySubmissions`
  (engagement-scoped via `assertEngaged`, audited `consultant.*`, visibility ALL);
  staff `consultantRequests` namespace (list/openCount/setStatus + `assign`).
  **Assigned tasks:** firm assigns a TASK to an engaged consultant
  (`consultantRequests.assign`, validated against the engagement); consultant sees
  it in a "Tasks assigned to me" table and `collab.completeTask` marks it RESOLVED.
  **Contextual responses:** threaded `esti_submission_message` conversation (see below).
  CollaboratorPortal has submit-deliverable / raise-RFI / add-note modals, the
  assigned-tasks table, and a read-back table showing the firm's response.
- [x] **Firm branding, empty states, notifications, and download authorization.**
  Firm-side triage of submissions — `clientRequests` + `consultantRequests`
  (`list`, `openCount`, `setStatus` OPEN → ACKNOWLEDGED/RESOLVED/DECLINED + response
  note, audited `*.triaged`) at `/client-requests` and `/consultant-requests`
  (nav under People); the response note is read back by the originator.
  **Notifications:** `notifications.list` surfaces OPEN client/consultant submissions
  as `submission` alerts (RFIs high). **Branding:** `portal.branding` + `collab.branding`
  (firm name + presigned logo) drive each portal header. **Empty states:** Carbon
  `DataState` empty panels on every portal table. **Download authorization:** the
  portals expose no file-download endpoints (drawings are shown as ref/title only),
  so no unauthorized download path exists. **Threaded contextual responses:**
  `esti_submission_message` (migration 0028) + `lib/submissionThread.ts`;
  `submissionThread`/`replySubmission` (client + consultant) and `thread`/`reply`
  (both staff inboxes); reusable `SubmissionThread` component in all four surfaces.
- [x] **Portal activity feeds exposing only explicitly visible records.**
  `portal.activityFeed` (client) and `collab.activityFeed` (consultant) return the
  project timeline filtered to `visibility = 'ALL'`, project-scoped via
  `assertOwnedProject` / `assertEngaged`; surfaced as an "Activity" section in each
  portal. STAFF-visibility rows are never exposed.

**Gate:** portal writes are object-scoped, audited, and cannot expose internal data.
**Verified (client + consultant):** demo client and a test consultant round-trip
their submissions (read back via `mySubmissions`); writes to a non-owned/non-engaged
project and a non-existent approval return NOT_FOUND; all writes appear in
`esti_activity` with `ALL` visibility; firm triage flows back to the originator;
each portal's `activityFeed` returns only `ALL` rows — an injected STAFF "INTERNAL"
note was confirmed excluded; CLIENT/CONSULTANT roles are FORBIDDEN from the staff inboxes.
Firm-assigned tasks round-trip (assign → consultant completes → RESOLVED; TASK kind
excluded from `mySubmissions`; assigning to a non-engaged consultant → BAD_REQUEST);
threaded replies round-trip (client/consultant ↔ firm, chronological, author sides).

**Phase 6 complete.** All four bullets delivered and verified end-to-end.

## Phase 7 - Contractor And Tender Coordination [P2]

- [~] Contractor register, contacts, GST/PAN, categories, and performance.
  **Delivered:** `esti_contractor` (migration 0029) + `contracts/contractor.ts`
  (14 trade categories, GSTIN/PAN regex validation, `contractorScore` helper).
  `contractors` router (list with category filter, create/update/setRating/remove,
  audited via `writeAudit`). `Contractors.tsx` at `/contractors` (People nav) — table
  with category filter, create/edit modal, a quality/timeliness/safety rating modal
  and an averaged performance tag. **Pending:** tendering, bids, contractor portal.
- [~] Tender packages, invitations, controlled documents, addenda, and deadlines.
  **Delivered:** `esti_tender` + `esti_tender_invitation` (migration 0030; per-invitation
  `accessToken` for later portal isolation; unique tender+contractor) + `contracts/tender.ts`
  (tender + invitation status enums, create/update/invite inputs). `tenders` router
  (list with invite counts, byId with joined invitations, create/update/remove, invite
  with duplicate guard, removeInvitation, award via status+awardedContractorId), audited.
  `Tenders.tsx` at `/office/tenders` (Office nav) — tender list, create modal, and a
  detail modal with status control, invite-from-register, remove and award.
  **Pending:** controlled documents + addenda on the tender.
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

## Immediate Roadmap - Knowledge Bank Foundations [P1] - Complete 2026-06-12

- [x] Rename Resources to Knowledge Bank and consolidate Master DSR and
  compliance rule-set management in one Pure Carbon module.
- [x] Define shared validation contracts for structural element families,
  reinforcement arrangements, and specification/procurement standards.
- [x] Add governed version lifecycle and database/API/UI for specification and
  procurement standards, including project/work-package tags, reusable clauses,
  approved material alternatives, DSR links, units, PO wording, and issue checks.
- [x] Add governed version lifecycle and database/API/UI for beam, column, slab,
  and footing templates, including geometry, element types, concrete cover, bar
  roles, diameter, count/spacing, zones, laps, hooks, shape codes, and citations.
- [x] Central **Knowledge Bank** route at `/knowledge-bank` with four tabs:
  Master DSR | Compliance | Specification | Structural Elements; replaces the
  old separate Resources (DSR) and Compliance (rule-set authoring) navigation.
- [x] `esti_specification_standard` and `esti_structural_element_template` tables
  via migration `0021_knowledge_bank_catalogs.sql`; both carry the standard
  DRAFT → REVIEW → PUBLISHED → SUPERSEDED lifecycle.
- [x] `KnowledgeCatalogManagers.tsx` with `SpecificationManager` and
  `StructuralElementManager`; role-gated (`write` capability required to manage).
- [x] `packages/contracts/src/knowledge-bank.ts` with `KnowledgeItemStatus`,
  `StructuralElementTemplate`, `ReinforcementArrangement`, and
  `SpecificationProcurementStandard` Zod schemas.
- [~] Generate editable BBS draft lines from a selected published structural
  template and project dimensions; SteelFlow (Phase 2E) provides the full
  interactive BBS generator; template-to-BBS import bridge is a Phase 10 item.
- [ ] Validate BBS calculations with engineering fixtures and explicit rounding,
  lap, hook, bend-deduction, spacing-zone, and steel-weight tests before allowing
  issue/export. Templates assist quantity calculation and never replace the
  structural engineer's design or approval.
- [ ] Connect specification standards to project tagging and simple quantity ×
  rate purchase orders without introducing inventory or contractor accounting.

**Gate:** a published knowledge item is versioned, cited, auditable, and consumed
by Compliance, BBS, specification, or PO workflows without copying mutable text.

## Phase 9 - Search, Knowledge, And Lessons [P2]

- [ ] Permission-aware universal search with Postgres full-text/trigram indexes.
- [ ] Extend Knowledge Bank search to office templates, CAD/BIM libraries, and
  vendor catalogues.
- [ ] Project-close lessons learned and reusable recommendations.
- [ ] Search result deep links and object-type filters.

**Gate:** search never returns unauthorized titles, snippets, or counts.

## Phase 10 - Commercial And Estimation Expansion [P2]

- [ ] GST/TDS filters by FY/assessment year, quarter, and month everywhere.
- [ ] Rich accountant exports and reconciliation column mapping/remapping.
- [ ] Estimate/BOQ inline grid, bulk import, approval/versioning, PDF/XLSX export.
- [ ] Expanded BBS templates and validated reinforcement layouts beyond the
  immediate beam/column/slab/footing foundation.
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

- CRIF Design Review Workspace: PDF canvas viewer with annotation pins and
  changemark stamps — requires a canvas library not in the current stack.
- CRIF Revision Impact Engine: effort/timeline/cost estimates before accepting
  a revision — requires sufficient historical revision data; revisit in Phase 11.
- CRIF Profit leakage analysis: rework hours × hourly rate as margin impact per
  project — requires timesheets (Phase 5) to be complete first.
- ASPRF Reward marketplace: redeem points for courses, conference tickets,
  additional leave — requires HR integration and principal sign-off on rewards
  catalogue; build only after reward points engine is validated with users.
- Pomodoro focus sessions and water reminders — opt-in wellbeing helpers;
  out of scope for the core AORMS.
- Recognition boards (public studio leaderboard).
- Drawing snapping and title-block extraction.
- SSE/push updates after correctness and scale justify them.

These are optional and must not delay security, activity, project memory,
collaboration, wellbeing basics, or production readiness.
