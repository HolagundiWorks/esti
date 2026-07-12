# AORMS (`esti`) — agent instructions

**AORMS** (**Accelerated Operational Resources Management System**) is the
**platform** — operational consolidation for **AEC consulting firms** with dual-tier AI.
The **shipped app** in this monorepo is **AORMS-Studio** (slug `aorms-studio`, legacy
slugs `hived` and `aorms-architecture`, Indian architecture practices). **AORMS-Consultancy**
(slug `aorms-consultancy`) is the engineering consultancy app on the roadmap. Nomenclature:
[`docs/esti/AORMS-PLATFORM-NOMENCLATURE.md`](docs/esti/AORMS-PLATFORM-NOMENCLATURE.md).

**ESTI** (Embedded Studio Intelligence) is the **internal AI agent** in
**AORMS-Studio**: Ask ESTI, the cognition engine, Studio Intelligence, ESTI Pulse.
**EmOI** (Embedded Operational Intelligence) is the **external AI agent** on the
AORMS platform — validates and gates content from outside sources.
Code identifiers (`@esti/*` packages, `esti_*` tables, repo name) keep the
`esti` codename.

Monorepo (pnpm workspaces): `packages/contracts`, `backend` (Fastify + tRPC +
Drizzle), `frontend` (React + Vite), plus a Python `worker`. Services run via
Docker Compose (`compose.yaml`).

## Product naming (agent memory — 2026-07-11)

**Canonical doc:** [`docs/esti/AORMS-PLATFORM-NOMENCLATURE.md`](docs/esti/AORMS-PLATFORM-NOMENCLATURE.md).
**Executable constants:** `frontend/src/lib/product-nomenclature.ts` — import
`AORMS_PLATFORM`, `AORMS_APPS`, `AORMS_STUDIO`, `AORMS_CONSULTANCY`, `AORMS_PORTALS`, `PLATFORM_APPS`, `EMOI`, `ESTI` for user-facing copy; do
not hard-code product strings in UI/SEO.

| Name | Role |
| --- | --- |
| **AORMS** | Platform — *Accelerated Operational Resources Management System*; **AEC consulting firms only** (architecture + engineering); **not** solution delivery or construction PM |
| **AORMS-Studio** | Shipped **architecture** app from this repo — Indian architecture consultancies; SPA at **`studio.aorms.in`** |
| **AORMS-Consultancy** | **Engineering** consultancy app (roadmap) — structural, MEP, civil, multidisciplinary firms |
| **EmOI** | **External AI agent** — dual-tier quality gate on outside sources |
| **ESTI** | **Internal AI agent** in **AORMS-Studio** — Ask ESTI, Studio Intelligence, ESTI Pulse |
| **`AORMS_PORTALS`** | Portal/surface UI labels — staff workspace, external portals, account hub |
| **`aorms-studio`** | URL/wiki **slug** — legacy slugs `hived`, `aorms-architecture` redirect |
| **`aorms-consultancy`** | Engineering app **slug** (roadmap) |
| **`esti`** | Repo codename — `@esti/*`, `esti_*` tables; never in marketing |

**Retired terms (do not use in new copy):**

- *Architecture Office Resource Management System* → **AORMS** (platform) or **AORMS-Studio** (app)
- **AORMS portal** / **AORMS-Architecture** / **HiveD** (staff workspace) → **AORMS-Studio** — client/consultant/**contractor** *portals* keep the word *portal*
- Pre-2026-07 multi-industry platform scope (risk, education, auditing) → **AEC only**

**Public marketing surfaces:**

| Path / host | Role |
| --- | --- |
| `/` · **aorms.in** | Platform landing — operational + design frameworks, EmOI; all path-based pages below |
| `/wiki` | Four-pillar wiki: HCW-UI · AORMS-Studio · AI core · Management |
| `/access` | Client, consultant, contractor, site portal sign-in |
| `/account` · `/company-account` | AORMS account & licensing hub |
| `/libraries/knowledge-bank-portal` | Knowledge Bank portal (EmOI textbook library) |
| **studio.aorms.in** · `/login` | **AORMS-Studio** workspace (architecture) |
| **consultancy.aorms.in** · `/aorms-consultancy` | **AORMS-Consultancy** engineering marketing (roadmap) |
| **admin.aorms.in** | Licensing console (operators only) |

Frozen host map: [`docs/esti/AORMS-SURFACE-URLS.md`](docs/esti/AORMS-SURFACE-URLS.md) ·
`frontend/src/lib/aorms-surface-urls.ts`.

**Operator:** **Human Centric Works (HCW)** — design studio behind `@hcw/ui-kit` and AORMS.
- [`docs/marketing/LANDING-REDESIGN-CONTEXT.md`](docs/marketing/LANDING-REDESIGN-CONTEXT.md) — landing/marketing brief.
- [`docs/hcw-kit/11-audits/README.md`](docs/hcw-kit/11-audits/README.md) — audit index (kit + surfaces).
- [`docs/marketing/PUBLIC-PAGES-AUDIT-2026-07-11.md`](docs/marketing/PUBLIC-PAGES-AUDIT-2026-07-11.md) — public URL audit & tracked issues.
- [`docs/marketing/PUBLIC-PAGES-UX-AUDIT-2026-07-11.md`](docs/marketing/PUBLIC-PAGES-UX-AUDIT-2026-07-11.md) — public pages UI/UX audit (2026-07-11).
- [`docs/marketing/PUBLIC-PAGES-UX-FIX-PLAN-2026-07-11.md`](docs/marketing/PUBLIC-PAGES-UX-FIX-PLAN-2026-07-11.md) — UX fix plan + changelog.
- [`docs/esti/SECURITY-AUDIT-2026-07-11.md`](docs/esti/SECURITY-AUDIT-2026-07-11.md) — application security audit (2026-07-11).
- [`docs/esti/AORMS-STUDIO-INTERFACE-AUDIT-2026-07-11.md`](docs/esti/AORMS-STUDIO-INTERFACE-AUDIT-2026-07-11.md) — authenticated workspace UI audit (2026-07-11).

When editing wiki markdown under `frontend/src/content/wiki/`, rebuild the AI wiki
index if Ask ESTI should see changes: regenerate `backend/src/lib/ai/wiki-knowledge.generated.ts`
via the repo’s wiki sync/build step.

## UI / design system — HCW-UI-KIT

> **⚠️ CANONICAL (2026-07): `@hcw/ui-kit` v0.5.0** (*HCW-UI-Kit — Human Centric Works*,
> `packages/hcw-ui-kit`) is the centralised, **layered** design system deployed
> against **every** surface — **AORMS-Studio**, client/consultant portals,
> licensing console, and the landing page. **`@carbon/react` was removed (2026-07).**
> Carbon *Sass* colours/type scale survive only as a frozen `--cds-*` compat block in
> `frontend/src/styles.scss` — no Carbon React components anywhere.
>
> **Documentation map (read in order):** [`docs/hcw-kit/README.md`](docs/hcw-kit/README.md)
> (sections 00–13). Agent contract + detection recipes:
> [`docs/esti/HCW-KIT-AI-KNOWLEDGE-BASE.md`](docs/esti/HCW-KIT-AI-KNOWLEDGE-BASE.md).
> Living debt queue: [`DESIGN-DEBT-REGISTER.md`](docs/hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md).
> Audit index: [`11-audits/README.md`](docs/hcw-kit/11-audits/README.md).
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
> **Spatial model — Rail · Stage · Taskbar footer · ActionDock:** glass **rail**
> (20%, full viewport height, fixed) + **stage** (scrolls independently), **glass
> taskbar footer** (calculator LEFT · launcher cluster CENTRE · tray RIGHT —
> `AppFooterBar`), and a **global ActionDock** (LEFT destroy · CENTER create ·
> RIGHT commit). Studio Intelligence (`/`) is the canonical glass-rail reference;
> marketing uses the same model without a taskbar (dock-only CTAs). Rollout U0–U6 ✅:
> [`AORMS-UI-AUTOPILOT-ROADMAP.md`](docs/esti/AORMS-UI-AUTOPILOT-ROADMAP.md).
> **Login/auth forms sit in the rail, not on the stage.** Screen CTAs via
> `useScreenActions` (publish `[]` while dialogs open).
>
> **Brand font: Urbanist** (OFL) — `@fontsource/urbanist` in `main.tsx`, mirrored
> in the kit theme.
>
> **Colour schemes:** `createAormsTheme({ scheme })` — `light` (default) · `dark` ·
> `highContrast`. `MuiRoot({ scheme })` wires the provider; Settings → Appearance
> persists choice (preview-labelled). Gallery: `/design-system#schemes`.

**Governance chain:** [`HCW-DESIGN-PLAYBOOK.md`](docs/HCW-DESIGN-PLAYBOOK.md) (why) →
[`00-CONSTITUTION.md`](docs/hcw-kit/00-CONSTITUTION.md) (law) →
[`12-AI-AGENT-RULEBOOK.md`](docs/hcw-kit/12-AI-AGENT-RULEBOOK.md) (permanent AI behaviour) →
[`HCW-KIT-AI-KNOWLEDGE-BASE.md`](docs/esti/HCW-KIT-AI-KNOWLEDGE-BASE.md) (R1–R9 recipes).

| # | Topic | Canonical doc |
| --- | --- | --- |
| 01 | Layers · spatial model | [`HCW-UI-KIT.md`](docs/esti/HCW-UI-KIT.md) |
| 02 | Tokens (executable) | `packages/hcw-ui-kit/src/tokens.ts` · [`02-TOKEN-GOVERNANCE.md`](docs/hcw-kit/02-TOKEN-GOVERNANCE.md) |
| 03 | Components | [`CHANGELOG`](packages/hcw-ui-kit/CHANGELOG.md) · [`03-COMPONENT-QUALITY-CHECKLIST.md`](docs/hcw-kit/03-COMPONENT-QUALITY-CHECKLIST.md) |
| 05 | Page templates (8 anatomies) | [`05-TEMPLATES.md`](docs/hcw-kit/05-TEMPLATES.md) — clone shipped references |
| 07 | UX checklists | [`HCW-UI-UX-PRINCIPLES.md`](docs/esti/HCW-UI-UX-PRINCIPLES.md) · [`07-UX-REVIEW-CHECKLISTS.md`](docs/hcw-kit/07-UX-REVIEW-CHECKLISTS.md) |
| 10 | MUI mapping | [`10-MUI-MAPPING.md`](docs/hcw-kit/10-MUI-MAPPING.md) — MUI is implementation only |
| 11 | Audits + debt | [`11-audits/README.md`](docs/hcw-kit/11-audits/README.md) · [`DESIGN-DEBT-REGISTER.md`](docs/hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md) |
| 09 | Kit semver / contribution | [`packages/hcw-ui-kit/GOVERNANCE.md`](packages/hcw-ui-kit/GOVERNANCE.md) |

**Kit primitives** (`@hcw/ui-kit` — use these, never fork):

| Primitive | Role |
| --- | --- |
| `MuiRoot` | Theme provider (`scheme` prop) |
| `Surface` | Layer 1/2/3 material |
| `GlassRail` | Rail shell (clear/heading glass variants) |
| `ActionDock` + `useScreenActions` | Global dock contract |
| `TaskbarFooter` | App footer launchers |
| `SectionDock` | Marketing scroll-spy nav |
| `HealthGlassOrb` | Zone health (shape + colour) |
| `BrandMark` | HCW mark |
| `StatusDot` | Status indicator (never filled Chip) |
| `DataState` | Loading skeleton + empty state |
| `ConfirmModal` | Destroy confirmation |
| `PageBreadcrumb` | Wayfinding + `document.title` |
| `ToastHost` + `pushToast` | Transient feedback |
| `Avatar` + `getInitials` | Identity mark (colour injected by caller) |

App compat shims re-export kit primitives where noted (`StatusTag` delegates to
`StatusDot`). Domain colour logic (`StaffAvatar`, `resolveColor`) stays app-side.

Brand heritage: [`AORMS-BRANDING-KIT.md`](docs/esti/AORMS-BRANDING-KIT.md).
Historical Carbon→MUI migration: [`MATERIAL-UI-DIRECTION.md`](docs/esti/MATERIAL-UI-DIRECTION.md).

**Open design debt (2026-07-11):** D3s dark/HC owner sign-off · D2e wire Playwright
`visual` project into CI · D11 `Clients.tsx` parallel-WIP (TagChip + dialog a11y).
Skill: `.claude/skills/hcw-design-audit`.

### UI task order

1. Read [`DESIGN-DEBT-REGISTER.md`](docs/hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md) — current state.
2. Read [`HCW-UI-KIT.md`](docs/esti/HCW-UI-KIT.md) + [`05-TEMPLATES.md`](docs/hcw-kit/05-TEMPLATES.md) — pick the shipped reference anatomy.
3. Read [`HCW-UI-UX-PRINCIPLES.md`](docs/esti/HCW-UI-UX-PRINCIPLES.md) + [`07-UX-REVIEW-CHECKLISTS.md`](docs/hcw-kit/07-UX-REVIEW-CHECKLISTS.md) before review.
4. Build from `@mui/material` (themed/neutral per [`10-MUI-MAPPING.md`](docs/hcw-kit/10-MUI-MAPPING.md)) + `@hcw/ui-kit` — never hard-coded hex;
   raw colour lives ONLY in `packages/hcw-ui-kit/src/tokens.ts` (+ sanctioned
   `DATA_VIZ` for canvas/SVG). `frontend/src/theme/` is a thin re-export shim.
   Prefer kit tokens over `--cds-*` compat; never add new `--cds-*` usage.
   Marketing atmosphere in `landing.scss`; app-screen CSS in `styles.scss` (structural only).
5. Kit-first: shared visual changes land in `packages/hcw-ui-kit` once. After kit
   edits in Docker dev: `docker cp` kit `src/` into `esti-frontend` (Windows bind-mounts
   lag), then `pnpm test` in the kit and typecheck frontend.
6. Visual regression: `e2e/tests/visual-regression.spec.ts` (Playwright `visual`
   project; baselines under `e2e/tests/visual-regression.spec.ts-snapshots/`).

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

Four job handlers (`worker/esti_worker/jobs/`):

| Type | Handler | Purpose |
|---|---|---|
| `dxf_to_svg` | `dxf.py` | Converts DXF takeoff to SVG via `ezdxf` |
| `pdf_to_markdown` | `pdf_to_markdown.py` | Knowledge Bank portal: PDF → Markdown via `pymupdf4llm` (HCW Markdown Tool pipeline) |
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
