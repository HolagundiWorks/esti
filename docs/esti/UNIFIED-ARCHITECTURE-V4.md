# AORMS — Unified Architecture v4.1 (north-star)

> **Status:** North-star + **single source of truth for system state** ·
> **Authored:** 2026-06-25 · **Reconciled:** 2026-07-22 · **Nomenclature:** 2026-07-10 · Owner: HCW
>
> **AORMS** = **Accelerated Operational Resources Management System** (platform).
> This document's **System state** section describes code shipped from this monorepo
> for **AORMS-Studio** and **AORMS-Consultancy**. Platform north-star:
> [AORMS-DEVELOPMENT-SPEC.md](AORMS-DEVELOPMENT-SPEC.md).
> Naming: [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md).
>
> **Reconciled 2026-07-22:** Knowledge Bank (`kb.*`) / CMS (`cms.*`) removed earlier;
> estimation is Rate Books + project Estimation + plan takeoff; Consultancy SOP closeout
> + pre-con R&O (Studio + Consultancy) landed (`0214`–`0219`). Active queue:
> [AORMS-PRODUCT-AUTOPILOT-ROADMAP.md](AORMS-PRODUCT-AUTOPILOT-ROADMAP.md).
>
> Future agents read this **first**. The "System state" section below is the
> **authoritative record of what exists today** — where any other doc (ROADMAP, PRD,
> INFORMATION-ARCHITECTURE, ARCHITECT-PROFILE, PRODUCT-VISION) disagrees about what is
> built, **this doc wins**. Access control:
> [ACCESS-HIERARCHY.md](ACCESS-HIERARCHY.md). UI law:
> [HCW-UI-KIT.md](HCW-UI-KIT.md). Stack:
> [ARCHITECTURE.md](ARCHITECTURE.md).

## System state (current reality — read this first)

> Last reconciled **2026-07-22**. Source of truth for what is live vs removed.
>
> **Navigation / sidebar** is defined canonically in [NAVIGATION.md](NAVIGATION.md)
> (Canonical V3 IA, consultancy-only). This section stays authoritative for *what code
> exists*; NAVIGATION.md is authoritative for *where it appears*.

**Live** (shipping, in the router):

- **Project OS** — `projectOffice`, `phases`, `projectBrief`, **`projectPrecon`** (risks /
  opportunities / design phase gates — Brief → **R&O**), `drawings`, `drawingSheets`,
  `mdr`, `projectDocs`, `qa`, `transmittals` (+ receiver ack), `approvals`, `permits`,
  `proposals`, `feeStages` (linked Studio invoices), `invoices`, `purchaseOrders`,
  `reconcile`, `reports`, `projectDecisions`
- **Task / Work OS** — `tasks`, `team`, `assignments`, `workload`, `attendance`, `aspRf`,
  `rewards`, `userProfile`
- **HR** — `leaves`, `payroll`
- **Clients / Third Parties** — `clients`, `clientLog`, `consultants`, `engagements`,
  `collab`, contractors
- **Site supervision** (consultancy, not construction PM) — `snags`, `siteInstructions`,
  `progressReports`, `phaseProgress`, `siteVisits`, `inspections`
- **Libraries** — `specCatalog`, `compliance` (far/setback/nbc/fire/regulation),
  `masterPlans`, `standards`, `rateBooks`
- **Estimation** — `estimates`, `measurement` / `planMarkup` (browser takeoff → estimate)
- **Office / Finance** — `letters`, `contracts`, `accounts`, `expenses`, `office`
  (enquiry register + go/no-go), `billing`
- **AORMS-Consultancy** — `consultancy.*` (engagements, deliverables, RACI, HLP,
  timesheets, WIP, contract review, lessons, NC/CAPA, MoM, opportunities, phase gates,
  Ask / EOMS review / precedent / lineage / capacity) — code-complete; launch gated on
  P9.V / P9.M
- **AI** — `ai` (Ask ESTI / AI Studio); ESTICAD `companion` **removed**
- **Portals** — `portal`, `collab`, contractor portal
- **Platform** — `licensing`, `admin` (incl. `usageReports` billing + suspend),
  `dashboard`, `audit`, `notifications`, `settings`, `firm`, `users`, `system`,
  `marketing`, `eoms`

> **Proposals unified (2026-06-29):** the `feeProposals` namespace + thin `esti_proposal`
> were merged into one **`proposals`** model (migration 0116).

**Removed** (no namespace, table, route, or doc remains):
- **Consultancy-only teardown (2026-06-29, migration 0117):** `pmc` (hub/portfolio),
  `programme` (delivery Gantt / `esti_project_milestone`), `constructionSchedule` (CPM),
  `construction` (contractor coordination), the **tenders** spine (`esti_tender*`), and
  **mood boards** (`esti_moodboard`). AORMS is now consultancy-only; site supervision
  (snags/inspections/progress) is kept under Projects.
- **Old Estimation OS + Construction Cost spine** (2026-06-28) — component master,
  RuleSet engine, `formula-engine`, `autoBoq`, CostingWindow, ParametricCanvas, Component
  Library, contractor item-bidding, work packages, running bills, measurement book,
  deviations/variations, final accounts, cost dashboard, procurement forecast, GRN,
  BBS + steel reconciliation, Rate Books (`dsr`), Rate Analysis (`rateAnalysis`).
  Replaced by the unified **Cost Management System (CMS)**.
- **RIE / compliance engine** — bylaw nav, site assessments, BBMP calculator. *(GST / TDS /
  permit / COA compliance stay live; only the bylaw/RIE engine was retired.)*

**Estimation & takeoff** (shipped 2026-07 — the deliberately narrow replacement for the
removed Estimation OS / Construction Cost spine. The `kb.*` / `cms.*` rebuild that briefly
followed the teardown was itself removed 2026-07-09; only the spec catalogue survived):
1. **Rate Books** (`rateBooks`) — firm-level, versioned item-code / unit / rate sets
   (Library → Rate Books), gated to `fees:manage`.
2. **Estimation** (`estimates`) — a project's priced BOQ against one rate book, with a
   per-item measurement book and a contingency/GST rollup (the project **Estimation** tab).
3. **Plan measurement / takeoff** (`measurement`, `planMarkup`) — browser sheet
   calibration + markup; quantities push into an estimate via
   `estimate.importFromMeasurementBook`. Canonical: [NAVIGATION.md](NAVIGATION.md) § Estimation.

## What AORMS is

**AORMS = Accelerated Operational Resources Management System** — the **platform**
for AEC consulting firms. **AORMS-Studio** is the shipped **architecture app**
(this monorepo): one operating system for an Indian architecture practice, from
first client conversation to final account on site. **AORMS-Consultancy** is the
**engineering app** — **code-complete** on the same spine (structural, MEP, civil,
multidisciplinary); public launch gated on P9.V / P9.M.

**ESTI = Embedded Studio Intelligence** — the **internal AI agent** in
**AORMS-Studio** (ESTI AI, Ask ESTI, the cognition engine, ESTI Pulse).
**EOMS = Emergent Object Management System** — the **external knowledge bank** on the
AORMS platform (standard codebooks and compliance codes via a standalone API). The codebase is delivered as a single monorepo (pnpm:
`packages/contracts`, `backend`, `frontend`, Python `worker`) gated two ways that
are orthogonal: **`can(role, capability)`** by *person*
([ACCESS-HIERARCHY.md](ACCESS-HIERARCHY.md)) and **`planAllows(plan, feature)`**
by *firm edition* ([PLANS-AND-TIERS.md](PLANS-AND-TIERS.md)).

It must **feel like one OS** — one shared design system everywhere (office
workspace, every portal, and the landing page): **HCW-UI-Kit** (`@hcw/ui-kit`,
MUI-based). `@carbon/react` was removed (2026-07); no competing second design
system. Mobile-first for portals.

## The six pillars

Status legend — **✅ Implemented** (shipped, in the live router) ·
**◐ Partial** (core shipped; needs consolidation/mapping into the unified spine) ·
**○ Needs creation** (vision; not built).

| Pillar | What it is | Primary live namespaces / routes | Status |
|---|---|---|---|
| **1. Ask OS** | Conversational + cognition layer — ask the office anything, AI-assisted decisions, AI Studio, public "Ask ESTI" | `ai.*` (`ai.generate`), `dashboard` cognition/Action Center, public `marketing.askEsti` | ◐ |
| **2. Project OS** | The project as the unit of delivery — design / consultancy delivery (not construction PM) | `projectOffice`, `phases`, `projectBrief`, `projectPrecon`, `drawings`, `transmittals`, `approvals`, `permits`, `proposals`, `feeStages`, `invoices`; `ProjectDetail.tsx` | ✅ |
| **3. Task OS** | Everyone's work surface — tasks (billable/work-type/difficulty dimensions), assignments, workload, attendance, ASPRF | `team`, `assignments`, `workload`, `attendance`, `aspRf`, `rewards`; `Work.tsx` hub | ◐ |
| **4. Estimation & cost** | Design-stage cost — a priced BOQ from firm rate books, plus office costing | `rateBooks`, `estimates`, `measurement`, `planMarkup` (project Estimation tab + browser plan takeoff); office costing (`accounts`, `expenses`, `purchaseOrders`) | ✅ |
| **5. Portals** | External collaborators on the same OS, scoped + mobile-first | `portal` (client), `collab` (consultant), `contractorPortal` (token-scoped site coordination / view-only project access); `Portal.tsx`, `CollaboratorPortal.tsx`, `ContractorPortal.tsx` | ◐ |
| **6. AI/ML/LLM extraction & decision support** | The intelligence under the pillars — takeoff/CAD extraction, reconciliation matching, cognition, risk notes | `reconcile` + worker (`dxf_to_svg`, `reconcile_import` via `pandas`), cognition engine (ESTICAD takeoff and `ai.generateCad` retired 2026-07-19) | ◐ |

## Per-pillar: implemented vs needs-mapping vs needs-creation

### 1. Ask OS — ◐
- **Implemented:** AI Studio + agent (`ai.generate`), dashboard cognition engine + Action Center, public "Ask ESTI" corner (`marketing.askEsti`). Backend AI lives behind `@hcw/aorms-ai-kit` (prompts + Ollama SDK).
- **Needs mapping:** a single "ask the office" entry that spans projects, tasks, and cost data — today cognition is dashboard-scoped and AI Studio is its own route.
- **Needs creation:** office-wide retrieval/decision surface that reads across all pillars; per-pillar AI affordances (e.g. "explain this deviation", "draft this letter") as first-class actions.

### 2. Project OS — ✅
- **Implemented:** ProjectDetail (consultancy delivery), phases, project brief/Info, **pre-con R&O** (`projectPrecon` — risks, opportunities, CONCEPT→ISSUE_READINESS gates), drawings + transmittals (+ ack), MDR, approvals, permits, decisions + revision intelligence, proposals, fee stages ↔ Studio invoices, in-project invoicing, site supervision.
- **AORMS-Consultancy:** parallel engagement spine (`consultancy.*`) with the same R&O pattern — see [AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md](AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md).
- **Out of scope:** construction PM, CPM, tenders, PMC (removed 2026-06).

### 3. Task OS — ◐
- **Implemented:** Work hub (tasks/board/calendar/activity), assignments, workload, attendance, ASPRF scoring with live `TaskClassification` + `TaskWorkType` + `difficultyCoefficient` + `estimatedHours`.
- **Needs mapping / creation:** the unified **Task OS spine** — one task model that consistently links project ↔ phase ↔ assignment ↔ time ↔ ASPRF across every surface (flagged as the next build after the cleanup pass).

### 4. Estimation & cost — ✅
- **Removed (2026-06-28):** Estimation OS / Construction Cost spine (tenders, RA bills,
  BBS, old Rate Books/`dsr`, Rate Analysis, PMC/CPM). See "System state".
- **Shipped:** firm **Rate Books** (`rateBooks`) price a project's **Estimation** tab
  (`estimates`) — priced BOQ + measurement book + contingency/GST — plus browser plan
  takeoff (`measurement` / `planMarkup`). Office cash book + expenses + purchase orders.
  Canonical: [NAVIGATION.md](NAVIGATION.md) § Estimation.

### 5. Portals — ◐
- **Implemented (AORMS-Studio):** Client portal (`portal`), Consultant portal (`collab`), Contractor portal (`contractorPortal`, stub rebuild), Site portal (`SitePortal` — mobile-first site inspections). All use `ExternalPortalShell` + HCW-UI-Kit (`GlassRail`), mobile-first.
- **Account surfaces:** Personal **AORMS account** (`/account`), **Company account** (`/company-account`), **Licensing console** (`/platform-admin`) — not vertical workspaces; see [AORMS-PLATFORM-NOMENCLATURE](AORMS-PLATFORM-NOMENCLATURE.md) § Portals and surfaces.
- **Staff workspace:** **AORMS-Studio** at `studio.aorms.in` — never called “AORMS portal” in product copy.

### 6. AI/ML/LLM extraction & decision support — ◐
- **Implemented:** DXF→SVG conversion, reconciliation import + matching (worker `reconcile_import`, `pandas`), dashboard cognition + risk signals. (ESTICAD companion takeoff and AI CAD drafts were removed 2026-07-19 — no quantity takeoff surface exists today.)
- **Needs creation:** extraction feeding the cost spine directly (takeoff → BOQ quantities), decision support attached to deviations/variations and fee defence, and a consistent "AI assist" pattern reused across pillars.

## Reading order for a new agent

1. **This doc** — the six pillars + the **System state** (what's live / removed / rebuilding). Authoritative on current state.
2. [NAVIGATION.md](NAVIGATION.md) — the canonical sidebar / module placement (Canonical V3, consultancy-only).
3. [NAVIGATION.md](NAVIGATION.md) § Estimation — the shipped cost/estimation surface (Rate Books + project Estimation tab + plan takeoff).
4. [ACCESS-HIERARCHY.md](ACCESS-HIERARCHY.md) + [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) — the two gates.
5. [HCW-UI-KIT.md](HCW-UI-KIT.md) — the UI law for the whole product, including the landing page.
6. [ARCHITECTURE.md](ARCHITECTURE.md) — stack/system; `CLAUDE.md` — the module map + conventions.
7. [INFORMATION-ARCHITECTURE.md](INFORMATION-ARCHITECTURE.md), [ROADMAP.md](ROADMAP.md), [PRD.md](PRD.md) — module rationale/history/requirements; **defer to NAVIGATION.md for the sidebar and to the System state above where they describe the removed estimation/cost stack.**

## Document control

| Version | Date | Change |
|---|---|---|
| 4.0 | 2026-06-25 | Initial unified north-star — six pillars, status against live router, reading order |
| 4.1 | 2026-06-28 | Reconciled to the 2026-06-28 teardown — added the **System state** source-of-truth section; rewrote pillar 4; fixed reading order. |
| 4.2 | 2026-07-22 | Reconciled System state to post-P9/P10 reality — removed stale `knowledgeBank`/`companion`/`pmc` live claims; added `projectPrecon`, `consultancy.*`, fee-stage invoices, enquiry go/no-go; Project OS = consultancy delivery (not construction PM); Consultancy marked code-complete / launch-gated. |
