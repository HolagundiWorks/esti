# AORMS — Unified Architecture v4.1 (north-star)

> **Status:** North-star + **single source of truth for AORMS-Studio system state** ·
> **Authored:** 2026-06-25 · **Reconciled:** 2026-06-28 · **Nomenclature:** 2026-07-10 · Owner: HCW
>
> **AORMS** = **Accelerated Operational Resources Management System** (platform).
> This document's **System state** section describes **AORMS-Studio**
> workspace shipped from this monorepo. Platform north-star:
> [AORMS-DEVELOPMENT-SPEC.md](AORMS-DEVELOPMENT-SPEC.md).
> Naming: [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md).
>
> ⚠️ **Known stale (2026-07-09):** `a9cd072` removed the Knowledge Bank (`kb.*`) and CMS
> (`cms.*`) entirely — the "System state" and pillar-4 sections below still describe
> them as Live/Rebuilding. See [DOC-CODE-DRIFT-2026-07.md](DOC-CODE-DRIFT-2026-07.md) §3.
> Not yet reconciled.
>
> Future agents read this **first**. The "System state" section below is the
> **authoritative record of what exists today** — where any other doc (ROADMAP, PRD,
> INFORMATION-ARCHITECTURE, ARCHITECT-PROFILE, PRODUCT-VISION) disagrees about what is
> built, **this doc wins**; those still carry planning detail written *before* the
> 2026-06-28 teardown and are being reconciled. Access control:
> [ACCESS-HIERARCHY.md](ACCESS-HIERARCHY.md). UI law:
> [HCW-UI-KIT.md](HCW-UI-KIT.md). Stack:
> [ARCHITECTURE.md](ARCHITECTURE.md).

## System state (current reality — read this first)

> Last reconciled **2026-06-28**. This is the source of truth for what is live, removed,
> and being rebuilt. Verified against the live tRPC router.
>
> **Navigation / sidebar** is defined canonically in [NAVIGATION.md](NAVIGATION.md)
> (the Canonical V3 IA, consultancy-only: Studio Intelligence · Projects · Tasks · AI Studio ·
> Library · Studio · Third Parties · Office · Finance · LXOS · Admin). This section
> stays authoritative for *what code exists*; NAVIGATION.md is authoritative for
> *where it appears*.

**Live** (shipping, in the router): Project OS (`projectOffice`, `phases`, `drawings`,
`transmittals`, `approvals`, `permits`, `proposals`, `invoices`, `purchaseOrders`,
`reconcile`, `reports`), the pre-project **Pipeline** (`leads` → `projectDna` →
`assessment` → `feasibility` → `negotiation` → `onboarding`), **Task/Work OS** (`tasks`,
`team`, `assignments`, `workload`, `attendance`, `aspRf`, `rewards`, `userProfile`), **HR**
(`leaves`, `payroll`, `hrProfile`), **Clients/CRM** (`clients`, `clientLog`), **Consultants
& Contractors** (`consultants`, `engagements`, `collab`, `contractors`), **Site delivery**
(`snags`, `siteInstructions`, `progressReports`, `phaseProgress`, `siteVisits`,
`inspections`), **Studio Libraries** — Item Library (`knowledgeBank`, `specCatalog`,
`kb`) + **`compliance`** (far/setback/nbc/fire/regulation) + **`masterPlans`** +
**`standards`**, **Office** (`letters`, `contracts`, `accounts`, `expenses`), **AI**
(`ai`, `companion`), **Portals** (`portal`, `collab`, contractor), **Licensing/Sync**
(`licensing`, `license`, `sync`), plus `dashboard`, `audit`, `search`, `notifications`,
`lessons`, `settings`, `firm`, `users`, `system`.

> **Proposals unified (2026-06-29):** the `feeProposals` namespace + thin `esti_proposal`
> were merged into one **`proposals`** model (migration 0116). `lessons` now lives under
> **LXOS** (Internal Exchange), removed from the Item Library.

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

**Rebuilding** (the active increment — a ground-up replacement of the removed cost/estimation
stack on a cleaner model):
1. **Construction Knowledge Bank** (`kb`) — the reference foundation. **Live:** Material /
   Labour / Item libraries, item-mapped Specifications, consumption Recipes, CSV import/export.
   **Planned:** Brand layer, Vendor rates, Formula + Derivation engines.
   Canonical: [CONSTRUCTION-KNOWLEDGE-BANK.md](CONSTRUCTION-KNOWLEDGE-BANK.md).
2. **Cost Management System** (`cms`) — the unified project cost lifecycle: Element spine
   (EL-001 permanent identity), Estimate, BOQ, Final Estimation Set (Documents), Site
   Measurement Book, Work Orders, Contractor Bill Certification, Material Intelligence,
   Cost Dashboard. **CMS-1 + CMS-2 live**; CMS-3–8 planned.
   Canonical: [COST-MANAGEMENT-SYSTEM.md](COST-MANAGEMENT-SYSTEM.md).

## What AORMS is

**AORMS = Accelerated Operational Resources Management System** — the **platform**
for AEC consulting firms. **AORMS-Studio** is the shipped **architecture app**
(this monorepo): one operating system for an Indian architecture practice, from
first client conversation to final account on site. **AORMS-Consultancy** is the
**engineering app** on the roadmap — structural, MEP, civil, and multidisciplinary
firms on the same **`AORMS-{Name}`** pattern.

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
| **1. Ask OS** | Conversational + cognition layer — ask the office anything, AI-assisted decisions, AI Studio, public "Ask ESTI" | `ai.*` (`ai.run`, `ai.generateCad`), `dashboard` cognition/Action Center, `companion`, public `marketing.askEsti` | ◐ |
| **2. Project OS** | The project as the unit of work — two heads: **Consultancy** (design) and **Project Management** (construction) | `projectOffice`, `phases`, `projectBrief`, `drawings`, `transmittals`, `approvals`, `permits`, `proposals` (absorbed `feeProposals`, migration 0116), `invoices`; `ProjectDetail.tsx` | ✅ |
| **3. Task OS** | Everyone's work surface — tasks (billable/work-type/difficulty dimensions), assignments, workload, attendance, ASPRF | `team`, `assignments`, `workload`, `attendance`, `aspRf`, `rewards`; `Work.tsx` hub | ◐ |
| **4. Cost Management System** | Architect cost control from estimate to certified bill — unified CMS on the Construction Knowledge Bank foundation | `kb.*` (Construction Knowledge Bank — live); `cms.*` (CMS-1+2 live: Element spine, Estimate, BOQ, Final Estimation Set; CMS-3–8 planned). Office costing (`accounts`, `expenses`, `purchaseOrders`) stays live | ◐ |
| **5. Portals** | External collaborators on the same OS, scoped + mobile-first | `portal` (client), `collab` (consultant), `contractorPortal` (token-scoped site coordination / view-only project access); `Portal.tsx`, `CollaboratorPortal.tsx`, `ContractorPortal.tsx` | ◐ |
| **6. AI/ML/LLM extraction & decision support** | The intelligence under the pillars — takeoff/CAD extraction, reconciliation matching, cognition, risk notes | `reconcile` + worker (`dxf_to_svg`, `reconcile_import` via `pandas`), cognition engine (ESTICAD takeoff and `ai.generateCad` retired 2026-07-19) | ◐ |

## Per-pillar: implemented vs needs-mapping vs needs-creation

### 1. Ask OS — ◐
- **Implemented:** AI Studio + agent (`ai.run`), CAD draft generation (`ai.generateCad`, `esti_ai_run.source`), dashboard cognition engine + Action Center, public "Ask ESTI" corner (`marketing.askEsti`). Backend AI lives behind `@hcw/aorms-ai-kit` (prompts + Ollama SDK). Gated to Pro.
- **Needs mapping:** a single "ask the office" entry that spans projects, tasks, and cost data — today cognition is dashboard-scoped and AI Studio is its own route.
- **Needs creation:** office-wide retrieval/decision surface that reads across all pillars; per-pillar AI affordances (e.g. "explain this deviation", "draft this letter") as first-class actions.

### 2. Project OS — ✅
- **Implemented:** two-head ProjectDetail (Consultancy | Project Management), phases, project brief/Info, drawings + transmittals, approvals, permits, decisions + revision intelligence (CRIF), proposals, fee proposals, in-project invoicing.
- **Needs mapping:** Programme/PMC become read-only **portfolio** rollups (restructure Phase 5) rather than separate top-level areas.

### 3. Task OS — ◐
- **Implemented:** Work hub (tasks/board/calendar/activity), assignments, workload, attendance, ASPRF scoring with live `TaskClassification` + `TaskWorkType` + `difficultyCoefficient` + `estimatedHours`.
- **Needs mapping / creation:** the unified **Task OS spine** — one task model that consistently links project ↔ phase ↔ assignment ↔ time ↔ ASPRF across every surface (flagged as the next build after the cleanup pass).

### 4. Construction Cost Management OS — ○ (rebuilding)
- **Removed (2026-06-28):** the entire prior spine — Estimation OS (component master /
  RuleSet / auto-BOQ / IFC mapping), tenders + contractor bidding, work packages, running
  bills, measurement book, deviations/variations, final accounts, cost dashboard, procurement
  forecast, GRN, BBS + steel reconciliation, Rate Books, Rate Analysis. See "System state".
- **Live:** PMC + site delivery (`pmc`, `constructionSchedule`, `snags`, `siteInstructions`,
  `progressReports`, `phaseProgress`), office cash book + expenses (`accounts`, `expenses`),
  purchase orders (`purchaseOrders`).
- **Rebuilding (active increment):** **Construction Knowledge Bank** (`kb`) is the new
  foundation (libraries + specifications + recipes live; brands / vendor rates / formula /
  derivation engine planned), then the **Cost Management System** (`cms`) on top of it
  (Element spine + Estimate + BOQ + Final Set live as CMS-1/2; Measurement, Work Orders,
  Bill Certification planned as CMS-3–8). Canonical:
  [CONSTRUCTION-KNOWLEDGE-BANK.md](CONSTRUCTION-KNOWLEDGE-BANK.md) +
  [COST-MANAGEMENT-SYSTEM.md](COST-MANAGEMENT-SYSTEM.md).

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
3. [CONSTRUCTION-KNOWLEDGE-BANK.md](CONSTRUCTION-KNOWLEDGE-BANK.md) + [COST-MANAGEMENT-SYSTEM.md](COST-MANAGEMENT-SYSTEM.md) — the active rebuild (cost/estimation domain).
4. [ACCESS-HIERARCHY.md](ACCESS-HIERARCHY.md) + [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) — the two gates.
5. [HCW-UI-KIT.md](HCW-UI-KIT.md) — the UI law for the whole product, including the landing page.
6. [ARCHITECTURE.md](ARCHITECTURE.md) — stack/system; `CLAUDE.md` — the module map + conventions.
7. [INFORMATION-ARCHITECTURE.md](INFORMATION-ARCHITECTURE.md), [ROADMAP.md](ROADMAP.md), [PRD.md](PRD.md) — module rationale/history/requirements; **defer to NAVIGATION.md for the sidebar and to the System state above where they describe the removed estimation/cost stack.**

## Document control

| Version | Date | Change |
|---|---|---|
| 4.0 | 2026-06-25 | Initial unified north-star — six pillars, status against live router, reading order |
| 4.1 | 2026-06-28 | Reconciled to the 2026-06-28 teardown — added the **System state** source-of-truth section; rewrote pillar 4 (Estimation OS + Construction Cost spine + Rate Books removed, rebuilding via Knowledge Bank → Estimation OS); fixed reading order. This doc is now authoritative on current state. |
