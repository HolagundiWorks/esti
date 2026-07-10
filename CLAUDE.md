# AORMS (`esti`) — agent instructions

**AORMS** (Architecture Office Resource Management System) is the workspace —
the product for Indian architecture practices, by Holagundi Consulting Works.
**ESTI** (Embedded Studio Intelligence) is the intelligence/agent layer embedded
in the AORMS workspace: ESTI AI, Ask ESTI, the cognition engine, ESTI Pulse.
Code identifiers (`@esti/*` packages, `esti_*` tables, repo name) keep the
`esti` codename.

Monorepo (pnpm workspaces): `packages/contracts`, `backend` (Fastify + tRPC +
Drizzle), `frontend` (React + Vite), plus a Python `worker`. Services run via
Docker Compose (`compose.yaml`).

## UI / design system — HCW-UI-KIT

> **⚠️ CANONICAL (2026-07): `@hcw/ui-kit`** (*HCW-UI-Kit — Human Centric Works*,
> `packages/hcw-ui-kit`) is the centralised, **layered** design system deployed
> against **every** surface — app, panels, client/consultant portals, licensing
> console, and the landing page. Full spec: **[`docs/esti/HCW-UI-KIT.md`](docs/esti/HCW-UI-KIT.md)**.
> **`@carbon/react` was removed (2026-07).** The landing page (`Landing.tsx`,
> `components/landing/**`, `landing.scss`) already used MUI components; the
> Carbon *Sass* it depended on for theme colours and the type scale is now a
> static, hand-owned CSS custom-property block (`--cds-*` in `frontend/src/styles.scss`)
> — no `@carbon/react` package, no Carbon React components anywhere.
>
> **Thesis: depth encodes importance.** Three material languages stack by z-depth
> — pick a layer by the element's ROLE, never by taste:
>
> 1. **Layer 1 — FLAT (hyperminimalist):** information at rest — data tables,
>    text, headings, surfaces. Fog Gray `#F2F4F7` canvas, Pure White cards, Coal
>    Black `#141517` ink, hairline rules, **Radiant Orange `#FF4F18`** the single
>    accent (fills carry white text; links use slate, never the accent).
> 2. **Layer 2 — SOFT (neumorphic):** objects you work within — dialogs, panels,
>    widgets, highlight cards, text-entry wells (recessed). `<Surface layer="soft">`.
> 3. **Layer 3 — GLASS (glassmorphism):** the live layer — **button hover, CTAs,
>    the ActionDock, priority (error/warning) alerts**. `<Surface layer="glass">`.
>    Marketing variants: `clearGlass` (rail over atmosphere) and `headingGlass`
>    (full-width section openers). Landing sub-cards stay **flat** — no glass on
>    every tile (see HCW-UI-KIT.md § Marketing shell).
>
> **Spatial model — Rail · Stage · Taskbar footer · ActionDock:** the app shell is
> glass **rail** (20%, full viewport height, fixed) + **stage** (scrolls independently),
> with a **glass taskbar footer** (calculator LEFT · launcher cluster CENTRE · tray
> RIGHT — `AppFooterBar`; the old FloatingDock is retired) and a **global,
> context-aware ActionDock** floating bottom-centre. Studio Intelligence (`/`) is the
> canonical glass-rail reference; marketing uses the same model without a taskbar
> (dock-only CTAs). Rollout:
> [`docs/esti/AORMS-UI-AUTOPILOT-ROADMAP.md`](docs/esti/AORMS-UI-AUTOPILOT-ROADMAP.md)
> (U0–U6 ✅).
> **Login/auth forms sit in the rail, not on the stage.** Screen CTAs migrate into
> the dock via `useScreenActions` (left=destroy · center=create · right=commit);
> inline page buttons are removed as screens adopt it.
>
> **Brand font: Urbanist** (OFL) across the MUI product — self-hosted via
> `@fontsource/urbanist` (imported in `main.tsx`), mirrored in the kit theme.

**Canonical guides:** **[`docs/esti/HCW-UI-KIT.md`](docs/esti/HCW-UI-KIT.md)** — the
layer philosophy, spatial model and adoption path (single source of truth).
**[`docs/esti/HCW-UI-UX-PRINCIPLES.md`](docs/esti/HCW-UI-UX-PRINCIPLES.md)** — UX laws,
cognitive load, accessibility, and review checklist.
[`docs/esti/AORMS-UI-AUTOPILOT-ROADMAP.md`](docs/esti/AORMS-UI-AUTOPILOT-ROADMAP.md) —
glass-rail rollout + login-in-rail queue.
[`docs/esti/AORMS-BRANDING-KIT.md`](docs/esti/AORMS-BRANDING-KIT.md) — brand marks +
colour/type heritage. [`docs/esti/MATERIAL-UI-DIRECTION.md`](docs/esti/MATERIAL-UI-DIRECTION.md)
— the historical Carbon→MUI migration playbook.

### UI task order

1. Read [`docs/esti/HCW-UI-KIT.md`](docs/esti/HCW-UI-KIT.md) — layers, spatial model, dock zones.
   Read [`docs/esti/HCW-UI-UX-PRINCIPLES.md`](docs/esti/HCW-UI-UX-PRINCIPLES.md) — UX laws, a11y, review checklist.
2. Build app/portal/landing screens from `@mui/material` + `@hcw/ui-kit` (`MuiRoot`,
 `Surface`, `GlassRail`, `useScreenActions`, `HealthGlassOrb`) — never hard-coded
 hex/gradients; raw colour lives ONLY in `packages/hcw-ui-kit/src/tokens.ts`.
 `frontend/src/theme/` is a thin re-export shim of the kit — don't add styling there.
 `frontend/src/styles.scss`'s `:root` block is a static, Carbon-derived `--cds-*`
 compatibility layer for pre-HCW-UI-Kit call sites — prefer kit tokens for new code,
 don't add to it. Marketing atmosphere (contours) and editorial type stay in
 `landing.scss`; marketing glass hierarchy follows HCW-UI-KIT.md (clear rail +
 heading glass only).
3. No automated visual-policy guard runs in CI for this repo (the old Carbon
   enforcement guard was removed with `@carbon/react`); code review is the check.

**AORMS AI:** `@hcw/aorms-ai-kit` (prompts + Ollama SDK) — backend dependency; product docs stay in `docs/esti/`.

### Structural CSS helpers (`styles.scss`, `landing.scss`)

`@carbon/react` was removed (2026-07) — there is no Carbon component library in
this codebase anymore. `styles.scss`'s `--cds-*` `:root` block is a static,
hand-owned compatibility layer of colour/spacing tokens carried forward from
Carbon's old values (see the "UI / design system" section above); prefer
`@hcw/ui-kit` tokens for new code.

- **`landing.scss`** is the separate editorial design system for unauthenticated
  marketing surfaces (Landing, Blog, Investors). It lives alongside `styles.scss`
  and is imported in `main.tsx`. Do not add app-screen CSS to `landing.scss`, and
  do not add `esti-lp-*` classes to `styles.scss`.
- Prefer semantic HTML (`h1`–`h4`, `p`) over styled `div`s where markup allows.
- Custom CSS classes should stay **structural and colourless** where possible —
  visual styling (colour, shape, surfaces) belongs in the `@hcw/ui-kit` theme,
  not hand-rolled CSS.

**Hidden file inputs** (`<input type="file" style={{ display: "none" }}` triggered via
`ref.current.click()`) are a permitted structural pattern — they are not visible UI;
the MUI `Button` that triggers them is the visible element.

**StudioAbstract semantic color layer** — `ZCOLOR`, `TILE_COLOR`, `LOAD_COLOR` in
`StudioAbstract.tsx` are JS maps of `var(--cds-*)` token strings (with optional hex
fallback inside `var()`). `style={{ color: ZCOLOR[state] }}` / `style={{ background: ... }}`
applied inline from these maps is a permitted data-driven pattern — the value IS a Carbon
token string, just applied dynamically. Do not replace with static classes.

Permitted structural helpers in `styles.scss` (colourless layout/sizing only):
`esti-fill`, `esti-grow`, `esti-dash`, `esti-cal`, `esti-cal-hdr`, `esti-cal-cell`,
`esti-label` / `esti-label--secondary` / `esti-label--helper` (Carbon `label-01`
type-style for hint text — use instead of `fontSize: "0.75rem"` inline),
`esti-kpi-track` / `esti-kpi-fill` (ASPRF bar track/fill — only `width` and
`background` stay dynamic inline), `esti-heat-swatch` (heatmap legend swatch —
`backgroundColor` stays dynamic), `esti-bar-palette`, `esti-personal-panel` (and
sub-classes), `esti-chart-sm/md/lg`, `esti-login-shell/panel`, `esti-toast-host`,
`esti-pomodoro-float`, `esti-header-clock`, `esti-footer`,
`esti-app-shell`, `esti-app-content`, `esti-app-mark` (app shell + brand mark sizing),
`esti-landing-shell` (landing page shell), `esti-page-header` (page header bar),
`esti-portal-logo`, `esti-login-brand/mark` (portal/login identity sizing),
`esti-row` / `esti-row-between` (horizontal flex layout rows),
`esti-form-panel` / `esti-form-panel--wide` (constrained form containers),
`esti-firm-logo`, `esti-input-md` / `esti-input-sm` (sizing constraints),
`esti-zone-head` (dashboard zone header flex row),
`esti-ai-explain__*` / `esti-ai-studio__*` / `esti-ai-settings-tile` / `esti-ai-panel`
(AI assistant layout/type-style helpers),
`esti-float-widget` / `esti-float-panel-shell` / `esti-float-settings` /
`esti-float-calc` / `esti-float-pom-header` / `esti-scroll-affordance` (floating panel),
`esti-av-strip` (audio-video header strip),
`esti-geo--sm/circle/triangle/square/act` (geo-marker glyph sizing),
`esti-staff-tile__photo` / `esti-staff-tile__accent` / `esti-staff-tile__dot` /
`esti-staff-tile__level-badge` (staff tile colour elements — `background` stays dynamic
inline from `resolveColor()`; same pattern as `esti-kpi-fill`),
`esti-id-card__initials-bg` / `esti-id-card__overlay` / `esti-id-card__role-dot` /
`esti-id-card__level-badge` (ID card colour elements — same dynamic `background` pattern),
`esti-staff-avatar` (circular avatar — `width/height/minWidth/background/fontSize` all
computed from props; no fixed visual values).

Permitted functional animations in `styles.scss` (state-indicator keyframes — not decorative;
Carbon provides no equivalent pulse/breathe keyframes):
`esti-pom-pulse` (Pomodoro ring), `esti-zone-pulse` (dashboard zone attention indicator),
`esti-calm-breathe` (wellbeing breathing exercise), `esti-qpulse` (quick status pulse).

## Python worker (`worker/`)

The worker is a **Redis Streams consumer** that handles CPU/IO-heavy jobs
off-loaded by the TypeScript backend. It consumes `esti:jobs`, retries up to
3 times, and routes poison jobs to `esti:jobs:dead`.

Three job handlers (`worker/esti_worker/jobs/`):

| Type | Handler | Purpose |
|---|---|---|
| `dxf_to_svg` | `dxf.py` | Converts DXF takeoff to SVG via `ezdxf` |
| `render_pdf` | `pdf.py` | HTML → PDF via WeasyPrint; targets include `invoice`, `estimate`, `bbs`, `running_bill`, `feeproposal`, `proposal`, `inspection`, `progress_report`, `drawing` (full set: `_RENDERERS` in `pdf.py`) |
| `reconcile_import` | `reconcile.py` | Parses bank/26AS/AIS/GSTR imports and matches entries via `pandas` |

Config (`worker/esti_worker/config.py`): Pydantic Settings reading `REDIS_URL`,
`DATABASE_URL`, `S3_*` env vars. Storage (`storage.py`): S3 `get_bytes`/`put_bytes`.
DB (`db.py`): patches `pdf_status` (PENDING → PROCESSING → READY) and `pdf_key`
on `esti_site_assessment` and invoice rows after PDF upload.

Tests: `worker/tests/test_jobs.py` (handler unit tests) and
`test_retry_dlq.py` (retry/dead-letter stream tests). Run with `pytest` from the
`worker/` directory.

## Dev / verify loop

- Source for `backend` is bind-mounted but `tsx watch` does not reload across
  the VM mount — `docker restart esti-backend` after backend changes.
- `frontend` runs in the `esti-frontend` container (Vite at
  `http://localhost:5173`); typecheck/lint inside it:
  `docker exec esti-frontend sh -lc "cd /app/esti/frontend && pnpm exec tsc -p tsconfig.json --noEmit"`
  and `pnpm exec eslint <files>`.
- After editing `packages/contracts`, rebuild it in the relevant container
  (`cd /app/esti/packages/contracts && pnpm build`).
- Quick render check: `GET http://localhost:5173/src/<path>` should return 200.
- Migrations live in `backend/drizzle/`; generate with drizzle-kit, copy the
  `.sql` + `meta/` into the container, applied on boot by `runMigrations()`.
- **Apply migrations manually** using `docker cp` (stdin pipe is unreliable):
  ```
  docker cp backend/drizzle/NNNN_name.sql esti-db:/tmp/NNNN_name.sql
  docker exec esti-db sh -lc "psql -U esti -d esti -f /tmp/NNNN_name.sql"
  ```
  Multi-column `ALTER TABLE` via PowerShell heredoc to a container stdin only
  applies the first column — always use `docker cp` + `-f` instead.

## Conventions

- Money is stored/handled in integer **paise**; format with `formatINR` /
  `formatINRShort`.
- Permissions/capabilities live in `packages/contracts/src/permissions.ts`
  (`can(role, capability)`); procedure tiers in `backend/src/trpc/trpc.ts`.
- Login email is canonicalised: `normalizeEmail` (trim+lowercase) on every
  account-creating write, `emailMatches` for case-insensitive lookup/uniqueness
  (both `backend/src/lib/email.ts` — never raw `eq(users.email, …)` or `ilike`).
- Portable identity handles: `AORMS-U-` (person) / `AORMS-C-` (company) on the
  licensing platform via `newPublicId` — see `docs/esti/AORMS-IDENTITY.md`.
- Commit messages end with:
  `Co-Authored-By: Codex Opus 4.8 <noreply@anthropic.com>`
- Two files have ongoing parallel WIP — avoid editing `frontend/src/routes/
  Projects.tsx` and `frontend/src/routes/Clients.tsx` unless asked.

## Module map (all tRPC namespaces — `backend/src/trpc/router.ts`)

Root router has **80+ namespaces** (see `backend/src/trpc/router.ts`). Organised by domain below.

**Public (no auth):** `health` (liveness), `profile` (India config: currency, FY dates,
GST rates, SAC codes)

**Auth / identity:** `auth` (login/session), `users` (user management), `firm`
(firm profile; `firm:admin` capability required), `settings` (user/firm prefs),
`admin` (admin utilities), `audit` (immutable audit log; `reports:view`)

**Clients & projects:**
- `clients` — client CRM; `clientLog` — interaction history
- `projectOffice` — project-level admin data; `phases` — project phase management
- `proposals` — **unified** proposals: COA fee proposals + scope agreements in one
  `esti_proposal` model (`fees:manage`); includes the Project OS client-approval gate
  (`setClientApproval`). *(The separate `feeProposals` namespace + thin `esti_proposal`
  were merged here — migration 0116.)*
- `invoices` — GST invoicing (`invoice:manage`/`invoice:delete`); `reconcile` —
  financial reconciliation; `purchaseOrders` — PO management
- `permits` — building permit tracking; `approvals` — internal approval workflows
- `transmittals` — document transmittals; `letters` / `contracts` — office
  documents (both exported from `backend/src/modules/office/router.ts`)
- `spec` — project specifications; `inspections` — site inspections (PDF generation)
- `reports` — GST/TDS filing abstracts (`reports:view`)

**Drawings:**
- `drawings` — drawing/document management (DXF register + ESTICAD launch)

> The **Estimation OS** (estimates/BOQ, `esti_component`/RuleSet engine,
> `formula-engine`/`ruleset-engine`, CostingWindow, ParametricCanvas, ComponentLibrary)
> and the **Construction Cost spine** (tenders, work packages, running bills,
> measurement book, deviations/variations, final accounts, cost dashboard, GRN,
> procurement forecast, BBS + steel reconciliation) were **removed** in the 2026-06-28
> teardown — to be rebuilt from the ground up. **Rate Books** (`dsr` / `esti_dsr_*` /
> `@hcw/master-dsr-kit` / MasterDsr) and **Rate Analysis** (`rateAnalysis` /
> `esti_rate_*`) were also removed (migration `0108`); the spec-catalogue's optional
> spec → rate-book link went with them.

**Team / HR / Performance:**
- `team` / `assignments` — roster and project-staff assignments
- `leaves` / `payroll` — HR (from `backend/src/modules/team/hr.ts`; `hr:manage`)
- `workload` — team workload overview; `notifications` — notification system
- `attendance` — per-person daily attendance and time attribution records
- `aspRf` — rolling 30-day ASPRF composite score; `teamScores/myScore`
- `rewards` — reward point events with audit; `listByMember/grant` (owner-only)

**Consultants / Collaborators:**
- `consultants` — external consultant directory; `engagements` — scope/engagement
  records; `collab` — collaborator portal sessions
  (all three from `backend/src/modules/consultant/`)

**Knowledge:**
- `knowledgeBank` — knowledge catalog (Specification and Lessons surfaced in
  `KnowledgeBank.tsx`)
- `specCatalog` — specification material catalogue (Knowledge Bank)

> The in-product RIE/compliance rule engine, site assessments (`ruleVersions` /
> `siteAssessments`), and the BBMP bylaw calculator (`bbmpRules`) were removed in the
> 2026-06 Knowledge-Bank cleanup. The Estimation OS + Construction Cost spine
> (incl. BBS / `esti_bbs`, the Components + Parametric KB tabs) were removed in the
> 2026-06-28 teardown, **followed by Rate Books (`dsr`) and Rate Analysis
> (`rateAnalysis`)** — the Knowledge Bank now holds only Specification + Lessons.

**Supplementary:** `comments` — threaded comments on records; `criticalNotes` —
project critical notes; `activity` — immutable activity timeline; `dashboard` —
computed KPIs, Action Center, health modules (`dashboard.home` bundles the office home view); `portal` — client portal access

**Site delivery (consultancy site supervision):**
- `snags` / `siteInstructions` / `progressReports` / `phaseProgress` / `siteVisits` /
  `inspections` — architect site supervision ("Site Progress" under Projects).

> **Removed in the 2026-06-29 consultancy-only teardown** (migration 0117 dropped the
> tables): `pmc` (hub/portfolio), `programme` (delivery Gantt / milestones),
> `constructionSchedule` (CPM), `construction` (contractor coordination), the **tenders**
> spine (`esti_tender*`), and **mood boards** (`esti_moodboard`). Do not reference these.

**Library (2026-06-29):**
- `compliance` — structured compliance library: `far` / `setback` / `nbc` / `fire` /
  `regulation` sub-routers (each CRUD; tables `esti_compliance_*`, migration 0118)
- `masterPlans` — master-plan file library (`esti_master_plan`, migration 0119; upload
  route `/upload/master-plan`)
- `standards` — design standards by discipline + attached files (`esti_standard` +
  `esti_standard_file`, migration 0120; upload route `/upload/standard-file`)
- `userProfile` — current user's Work Profile aggregate (`workSummary`); distinct from
  the public India-config `profile` namespace

**Project brief, expenses, and system (Phases 17–20):**
- `projectBrief` — Project Info questionnaire sections
- `accounts` / `expenses` — office cash book and project costing expenses
- `system` — release metadata (owner-only)
- `companion` — ESTICAD device auth, takeoff catalog, linked drawings
- `marketing` — landing visit counter
- `specCatalog` — specification material catalogue (Knowledge Bank)

## Frontend routes (`frontend/src/routes/`)

> **Sidebar / module placement** is canonically defined in
> [docs/esti/NAVIGATION.md](docs/esti/NAVIGATION.md) — the **Canonical V3** IA
> (Studio Intelligence · Projects · Tasks · AI Studio · Library · Studio · Third Parties ·
> Office · Finance · LXOS · Admin), consultancy-only, with per-module ✅/🚧/🔲 status. The
> nested sidebar is a recursive `NavNode` tree (`link` | `menu`) in `App.tsx`; **Library**
> (Item/Compliance/Master Plan/Standards) and **AI Studio** (plan+rank gated) are top-level
> sidebar entries; Studio holds Teams/Performance/HR. Search is a **header** action
> (with the Alerts bell, ID card, clock and Pomodoro). **Removed (consultancy-only):** PMC,
> Construction, Programme, Tenders, mood boards. Edit nav via the `nav` tree and keep
> NAVIGATION.md in sync.

Key routes by area:

| File | Purpose |
|---|---|
| `StudioAbstract.tsx` | **Studio Intelligence** home screen (route `/`; component/file name kept as StudioAbstract) — tabs Overview · Lead · Project · Financial · Team · Work · Approval, each one shell: header + **4 KPI cards** + a **DataTable** that scrolls inside its Tile (page never scrolls, 100% width). Overview merges Studio + Summary and carries the right **sidebar** (AI recommendation over last-10 Office Log). Shell + zone-state vocab in `components/dashboard/abstractShell.tsx` + `zoneState.ts`; uses `dashboard.home`. |
| `Projects.tsx` ⚠️ | Project list (parallel WIP — avoid editing unless asked) |
| `ProjectDetail.tsx` | Single project — phases, tasks, drawings, decisions |
| `ArchivedProjects.tsx` | Archived project browser |
| `Clients.tsx` ⚠️ | Client CRM (parallel WIP — avoid editing unless asked); Third Parties (`/clients`) |
| `Work.tsx` | Work hub shell — tabs in `components/work/` (`/tasks`; `/work` alias); Tasks pillar |
| `Lxos.tsx` | **LXOS** pillar placeholder (`/lxos`; `/leos` redirects) — 4 exchange layers, greenfield |
| `Team.tsx` / `Hr.tsx` | Team roster and HR/payroll (hrEnabled gated); Studio (`/team`, `/hr`) |
| `Invoices.tsx` | Consultancy invoices (Finance) |
| `Proposals.tsx` | **Unified Proposals** (Office, `/office/proposals`) — COA fee + scope; `trpc.proposals` |
| `Reconcile.tsx` | Financial reconciliation (route kept; not in V3 menu) |
| `Consultants.tsx` / `Contractors.tsx` | Consultants / contractors (Third Parties) |
| `Letters.tsx` / `Contracts.tsx` | Office documents |
| `Filing.tsx` | GST/TDS filing abstracts (Finance › Financial Reports) |
| `KnowledgeBank.tsx` | **Item Library** (Library, `/knowledge-bank`) — Materials/Labour/Items/Brands/Specifications/Recipes/Brand Catalogue (Lessons moved to LXOS) |
| `ComplianceLibrary.tsx` | Library › Compliance (`/libraries/compliance`) — NBC/FAR/Setbacks/Fire/Regulations CRUD |
| `MasterPlanLibrary.tsx` | Library › Master Plan (`/libraries/master-plans`) — PDF/DWG file uploads |
| `StandardsLibrary.tsx` | Library › Standards (`/libraries/standards`) — by discipline + files |
| `Payroll.tsx` | Finance › Payroll (`/finance/payroll`) — payslips (reuses `payroll` namespace) |
| `Vendors.tsx` | Third Parties › Vendors (`/vendors`) — placeholder |
| `Profile.tsx` | User Profile (`/profile`) — Personal + Work Profile + identity/cert placeholders |
| `Performance.tsx` | ASPRF performance dashboard |
| `AuditLog.tsx` | Audit trail (firm:admin gated) |
| `Alerts.tsx` | Notification/alert center (header bell) |
| `Portal.tsx` | Client portal — `/` and `/projects/:projectId` |
| `CollaboratorPortal.tsx` | Consultant portal — `/` and `/projects/:projectId` |
| `Company.tsx` | Firm profile (firm:admin) |
| `Users.tsx` | User management (firm:admin) |
| `Settings.tsx` | Preferences & password (Profile › Preferences links here) |
| `Landing.tsx` / `Login.tsx` | Unauthenticated pages |

## Domain conventions

- **Task dimensions**: `TaskClassification` (BILLABLE/NON_BILLABLE/TRAINING/
  COLLABORATION/PERSONAL) is financial. `TaskWorkType` (DESIGN_COMMUNICATION/
  DESIGN_DEVELOPMENT/TECHNICAL_PRODUCTION/CONSTRUCTION_SUPPORT) is architectural
  work category for ASPRF scoring. Both are now live fields on `esti_task`.
- **Task ASPRF fields**: `difficultyCoefficient` (1–5, default 3, anti-gaming weight)
  and `estimatedHours` (numeric, for delivery-predictability scoring) are separate
  from classification and work type.
- **Revision types**: decisions carry a `revisionCategory` (MINOR/MAJOR/CRITICAL)
  and a `revisionSource` (CLIENT_DRIVEN/INTERNAL_ERROR/TECHNICAL_QUERY/SCOPE_CHANGE).
  Both fields are live and feed the Revision Intelligence dashboard module.
- **ASPRF performance weights**: Reliability 30%, Quality 25%, Client Impact 15%,
  Collaboration 15%, Learning 10%, Wellbeing 5%. Wellbeing is opt-in only.
