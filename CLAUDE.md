# ESTI — agent instructions

ESTI is an Architectural Office Resource Management System (AORMS) for Indian
architecture practices, by Holagundi Consulting Works.

Monorepo (pnpm workspaces): `packages/contracts`, `backend` (Fastify + tRPC +
Drizzle), `frontend` (React + Vite), plus a Python `worker`. Services run via
podman (`compose.yaml`).

## UI / design system — PURE CARBON ONLY

**External packages (workspace):** `@hcw/carbon-agent-kit` → linked at `.carbon-kit/` after `pnpm install`.

**Design thinking (first):** `.carbon-kit/design-intelligence/` — senior product designer playbook.  
**Screen patterns (before code):** `.carbon-kit/pattern-library/`  
**Carbon implementation:** `.carbon-kit/knowledge/` — rules, index, theme rules 1–8.  
**ESTI exceptions:** [`docs/esti/CARBON-UI-DIRECTION.md`](docs/esti/CARBON-UI-DIRECTION.md)

### UI task order

1. `.carbon-kit/design-intelligence/design_decision_engine.md`
2. `.carbon-kit/pattern-library/` — select screen pattern, zones, Carbon map
3. `.carbon-kit/knowledge/theme_implementation.md` — theme rules 1–8
4. `.carbon-kit/knowledge/` — index search, implementation rules
5. `docs/esti/CARBON-UI-DIRECTION.md` — ESTI exceptions

Refresh Carbon index: `pnpm carbon:index` · Search: `pnpm carbon:search <terms>`

**AORMS AI:** `@hcw/aorms-ai-kit` (prompts + Ollama SDK) — backend dependency; product docs stay in `docs/esti/`.

**The frontend must use ONLY the IBM Carbon Design System. No custom UI
elements.**

- Build every screen from `@carbon/react` components (`Grid`, `Column`,
  `Tile`/`ClickableTile`, `Tag`, `ProgressBar`, `Stack`, `Tabs`, `Modal`,
  `Select`, `DataTable`, `Button`, etc.), `@carbon/icons-react`, and
  `@carbon/pictograms-react`.
- Use Carbon's **2x Grid** (`Grid` + `Column`, 16 / 8 / 4 columns) for layout.
- Use Carbon design tokens (`--cds-*`) for any colour — never hard-coded hex.
- **Do not** write custom CSS classes, custom keyframe animations, bespoke
  colour palettes, hand-rolled bars/cards, or inline decorative styling
  (font-size, colours, shadows, gradients). For progress/quantities use Carbon
  `ProgressBar`; for status use `Tag`; for spacing use `Stack`.
- The only permitted non-Carbon CSS is **structural and colourless** — e.g.
  `.esti-fill { height: 100% }` so a Tile fills its Grid Column. No visual
  styling in custom CSS.
- Prefer semantic HTML (`h1`–`h4`, `p`) inside Carbon containers over styled
  `div`s. Let Carbon/Plex typography apply.
- Keep `styles.scss` minimal: the `@carbon/react` import (with the IBM Plex CDN
  `$font-path`), the viewport min-height fix, and colourless structural helpers only.

When in doubt, reach for an existing Carbon component before inventing markup.

Permitted structural helpers in `styles.scss` (colourless layout/sizing only):
`esti-fill`, `esti-grow`, `esti-dash`, `esti-cal`, `esti-cal-hdr`, `esti-cal-cell`,
`esti-label` / `esti-label--secondary` / `esti-label--helper` (Carbon `label-01`
type-style for hint text — use instead of `fontSize: "0.75rem"` inline),
`esti-kpi-track` / `esti-kpi-fill` (ASPRF bar track/fill — only `width` and
`background` stay dynamic inline), `esti-heat-swatch` (heatmap legend swatch —
`backgroundColor` stays dynamic), `esti-bar-palette`, `esti-personal-panel` (and
sub-classes), `esti-chart-sm/md/lg`, `esti-login-shell/panel`, `esti-toast-host`,
`esti-pomodoro-float`, `esti-header-clock`, `esti-footer`.

## Python worker (`worker/`)

The worker is a **Redis Streams consumer** that handles CPU/IO-heavy jobs
off-loaded by the TypeScript backend. It consumes `esti:jobs`, retries up to
3 times, and routes poison jobs to `esti:jobs:dead`.

Three job handlers (`worker/esti_worker/jobs/`):

| Type | Handler | Purpose |
|---|---|---|
| `dxf_to_svg` | `dxf.py` | Converts DXF takeoff to SVG via `ezdxf` |
| `render_pdf` | `pdf.py` | HTML → PDF (invoices, compliance reports, drawing sets) via WeasyPrint; targets: `invoice`, `compliance`, `drawing` |
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
  the VM mount — `podman restart esti-backend` after backend changes.
- `frontend` runs in the `esti-frontend` container (Vite at
  `http://localhost:5173`); typecheck/lint inside it:
  `podman exec esti-frontend sh -lc "cd /app/esti/frontend && pnpm exec tsc -p tsconfig.json --noEmit"`
  and `pnpm exec eslint <files>`.
- After editing `packages/contracts`, rebuild it in the relevant container
  (`cd /app/esti/packages/contracts && pnpm build`).
- Quick render check: `GET http://localhost:5173/src/<path>` should return 200.
- Migrations live in `backend/drizzle/`; generate with drizzle-kit, copy the
  `.sql` + `meta/` into the container, applied on boot by `runMigrations()`.
- **Apply migrations manually** using `podman cp` (stdin pipe is unreliable):
  ```
  podman cp backend/drizzle/NNNN_name.sql esti-db:/tmp/NNNN_name.sql
  podman exec esti-db sh -lc "psql -U esti -d esti -f /tmp/NNNN_name.sql"
  ```
  Multi-column `ALTER TABLE` via PowerShell heredoc to a container stdin only
  applies the first column — always use `podman cp` + `-f` instead.

## Conventions

- Money is stored/handled in integer **paise**; format with `formatINR` /
  `formatINRShort`.
- Permissions/capabilities live in `packages/contracts/src/permissions.ts`
  (`can(role, capability)`); procedure tiers in `backend/src/trpc/trpc.ts`.
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
- `proposals` — project proposals; `feeProposals` — fee proposals (`fees:manage`)
- `invoices` — GST invoicing (`invoice:manage`/`invoice:delete`); `reconcile` —
  financial reconciliation; `purchaseOrders` — PO management
- `permits` — building permit tracking; `approvals` — internal approval workflows
- `transmittals` — document transmittals; `letters` / `contracts` — office
  documents (both exported from `backend/src/modules/office/router.ts`)
- `spec` — project specifications; `inspections` — site inspections (PDF generation)
- `reports` — GST/TDS filing abstracts (`reports:view`)

**Drawings / BOQ / Steel:**
- `drawings` — drawing/document management; `measurements` — measurement sheets
- `dsr` — Delhi Schedule of Rates reference; `estimates` — BOQ cost estimates;
  `bbs` — Bar Bending Schedule (all three from `backend/src/modules/boq/`)
- `steelflow` — Steel Arranger workflow

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

**Knowledge / RIE:**
- `ruleVersions` / `siteAssessments` — RIE knowledge bank and site assessments
  (`backend/src/modules/rie/router.ts`; contracts in `packages/contracts/src/rie.ts`)
- `knowledgeBank` — knowledge catalog
- `bbmpRules` — BBMP bye-law reference rules feeding the RIE compliance engine
  (`backend/src/modules/bylaw/bbmpRules.ts`; the in-product bylaw calculator was
  removed in Phase 7 — only the shared rule reference remains)

**Supplementary:** `comments` — threaded comments on records; `criticalNotes` —
project critical notes; `activity` — immutable activity timeline; `dashboard` —
computed KPIs, Action Center, health modules (`dashboard.home` bundles the office home view); `portal` — client portal access

**Programme, PMC, and site delivery (Phases 14–16):**
- `programme` — office delivery programme and Gantt milestones
- `pmc` — PMC hub, portfolio, progress reports; `constructionSchedule` — site CPM/Gantt
- `snags` / `siteInstructions` / `progressReports` / `phaseProgress` — PMC site ops

**Project brief, expenses, and system (Phases 17–20):**
- `projectBrief` — Project Info questionnaire sections
- `accounts` / `expenses` — office cash book and project costing expenses
- `system` — release metadata (owner-only)
- `companion` — ESTICAD device auth, takeoff catalog, linked drawings
- `marketing` — landing visit counter
- `specCatalog` — specification material catalogue (Knowledge Bank)

## Frontend routes (`frontend/src/routes/`)

29 route files total. Key routes by area:

| File | Purpose |
|---|---|
| `Dashboard.tsx` | KPI overview, Action Center (uses `dashboard.home` bundle) |
| `Projects.tsx` ⚠️ | Project list (parallel WIP — avoid editing unless asked) |
| `ProjectDetail.tsx` | Single project — phases, tasks, drawings, decisions |
| `ArchivedProjects.tsx` | Archived project browser |
| `Clients.tsx` ⚠️ | Client CRM (parallel WIP — avoid editing unless asked) |
| `Work.tsx` | Work hub shell — tabs in `components/work/` (`/tasks`; `/work` alias) |
| `Team.tsx` / `Hr.tsx` | Team roster and HR/payroll (hrEnabled gated) |
| `FeeProposals.tsx` / `Invoices.tsx` | Financial documents |
| `Proposals.tsx` | Project proposals |
| `Reconcile.tsx` | Financial reconciliation |
| `Consultants.tsx` | External consultants |
| `Letters.tsx` / `Contracts.tsx` | Office documents |
| `Filing.tsx` | GST/TDS filing abstracts |
| `KnowledgeBank.tsx` | DSR, compliance/RIE, specification, SteelFlow tabs (`/compliance` redirects here) |
| `components/knowledge/SteelArranger.tsx` | Steel BBS panel (embedded in Knowledge Bank) |
| `components/knowledge/MasterDsr.tsx` | DSR panel (embedded in Knowledge Bank) |
| `Performance.tsx` | ASPRF performance dashboard |
| `AuditLog.tsx` | Audit trail (firm:admin gated) |
| `Alerts.tsx` | Notification/alert center |
| `Portal.tsx` | Client portal — `/` and `/projects/:projectId` |
| `CollaboratorPortal.tsx` | Consultant portal — `/` and `/projects/:projectId` |
| `Company.tsx` | Firm profile (firm:admin) |
| `Users.tsx` | User management (firm:admin) |
| `Settings.tsx` | User profile and password |
| `Landing.tsx` / `Login.tsx` | Unauthenticated pages |

## Domain conventions

- **Task dimensions**: `TaskClassification` (BILLABLE/NON_BILLABLE/TRAINING/
  COLLABORATION/PERSONAL) is financial. `TaskWorkType` (DESIGN_COMMUNICATION/
  DESIGN_DEVELOPMENT/TECHNICAL_PRODUCTION/CONSTRUCTION_SUPPORT) is architectural
  work category for ASPRF scoring. Both are now live fields on `esti_task`.
- **Task ASPRF fields**: `difficultyCoefficient` (1–5, default 3, anti-gaming weight)
  and `estimatedHours` (numeric, for delivery-predictability scoring) are separate
  from classification and work type.
- **RIE FAR**: `siteArea × FAR = maxPermissibleBuiltUp` is the **gross** limit.
  User-entered `proposedBuiltUpSqm` should be net after subtracting excluded
  areas (parking, stairs, lifts, ramps, machine rooms, open balconies, ducts,
  water tanks). The engine compares net proposed against the gross limit.
- **Revision types**: decisions carry a `revisionCategory` (MINOR/MAJOR/CRITICAL)
  and a `revisionSource` (CLIENT_DRIVEN/INTERNAL_ERROR/TECHNICAL_QUERY/SCOPE_CHANGE).
  Both fields are live and feed the Revision Intelligence dashboard module.
- **ASPRF performance weights**: Reliability 30%, Quality 25%, Client Impact 15%,
  Collaboration 15%, Learning 10%, Wellbeing 5%. Wellbeing is opt-in only.
