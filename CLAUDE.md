# ESTI — agent instructions

ESTI is an Architectural Office Resource Management System (AORMS) for Indian
architecture practices, by Holagundi Consulting Works.

Monorepo (pnpm workspaces): `packages/contracts`, `backend` (Fastify + tRPC +
Drizzle), `frontend` (React + Vite), plus a Python `worker`. Services run via
podman (`compose.yaml`).

## UI / design system — PURE CARBON ONLY

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
  `$font-path`), the viewport min-height fix, the drawing-viewer SVG rule, and
  the colourless structural helpers only.

When in doubt, reach for an existing Carbon component before inventing markup.

## Dev / verify loop

- Source for `backend` is bind-mounted but `tsx watch` does not reload across
  the VM mount — `podman restart esti-backend` after backend changes.
- `frontend` runs in the `esti-frontend` container (Vite at
  `http://localhost:5173`); typecheck/lint inside it:
  `podman exec esti-frontend sh -lc "cd /app/frontend && pnpm exec tsc -p tsconfig.json --noEmit"`
  and `pnpm exec eslint <files>`.
- After editing `packages/contracts`, rebuild it in the relevant container
  (`cd /app/packages/contracts && pnpm build`).
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

Root router has 57 namespaces. Organised by domain below.

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
- `timesheets` — per-person per-day project/task time attribution with billable
  flag; `list/create/update/remove/summary`
- `dailyUpdates` — stand-up upsert per team member per date; `list/upsertMine/today`
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
- `bylaws` — building bylaw rules; `bylawCalc` — bylaw compliance calculator
  (both from `backend/src/modules/bylaw/`)

**Supplementary:** `comments` — threaded comments on records; `criticalNotes` —
project critical notes; `activity` — immutable activity timeline; `dashboard` —
computed KPIs, Action Center, health modules; `portal` — client portal access

## Frontend routes (`frontend/src/routes/`)

33 route files total. Key routes by area:

| File | Purpose |
|---|---|
| `Dashboard.tsx` | KPI overview, Action Center |
| `Projects.tsx` ⚠️ | Project list (parallel WIP — avoid editing unless asked) |
| `ProjectDetail.tsx` | Single project — phases, tasks, drawings, decisions |
| `ArchivedProjects.tsx` | Archived project browser |
| `Clients.tsx` ⚠️ | Client CRM (parallel WIP — avoid editing unless asked) |
| `Tasks.tsx` / `Work.tsx` | Task list views (Work.tsx is the staff "my tasks" view) |
| `Team.tsx` / `Hr.tsx` | Team roster and HR/payroll (hr:manage gated) |
| `Workload.tsx` | Team workload matrix |
| `FeeProposals.tsx` / `Invoices.tsx` | Financial documents |
| `Proposals.tsx` | Project proposals |
| `Reconcile.tsx` | Financial reconciliation |
| `Consultants.tsx` | External consultants |
| `Letters.tsx` / `Contracts.tsx` | Office documents |
| `Filing.tsx` / `Compliance.tsx` | Regulatory filing; Compliance is an alias for KnowledgeBank |
| `KnowledgeBank.tsx` | RIE/bylaw knowledge catalog |
| `SteelArranger.tsx` | Steel BBS workflow tool |
| `MasterDsr.tsx` | DSR rate reference viewer |
| `Performance.tsx` | ASPRF performance dashboard |
| `ActivityCenter.tsx` | Activity timeline browser |
| `AuditLog.tsx` | Audit trail (firm:admin gated) |
| `Alerts.tsx` | Notification/alert center |
| `Portal.tsx` | Client portal (CLIENT role) |
| `CollaboratorPortal.tsx` | Consultant collaborator portal |
| `Company.tsx` | Firm profile (firm:admin) |
| `Users.tsx` | User management (firm:admin) |
| `Settings.tsx` | User settings |
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
