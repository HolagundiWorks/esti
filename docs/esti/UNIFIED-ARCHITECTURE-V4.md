# AORMS — Unified Architecture v4.0 (north-star)

> **Status:** Forward-vision / north-star · **Authored:** 2026-06-25 · Owner: Holagundi Consulting Works
>
> This is the **one-architecture** view future agents should read first to
> understand *what AORMS is becoming*. It is deliberately product-shaped (the OS
> pillars), not a code map. For the **current** implementation state read
> [INFORMATION-ARCHITECTURE.md](INFORMATION-ARCHITECTURE.md) (live IA + nav),
> [ROADMAP.md](ROADMAP.md) (delivery history + the active increment), and
> [ARCHITECTURE.md](ARCHITECTURE.md) (system/stack). Access control:
> [ACCESS-HIERARCHY.md](ACCESS-HIERARCHY.md). UI law:
> [CARBON-UI-DIRECTION.md](CARBON-UI-DIRECTION.md).

## What AORMS is

**AORMS = Architecture / AEC Office Resource Management System** — one operating
system for an Indian architecture practice, from first client conversation to
final account on site. It is delivered as a single codebase (pnpm monorepo:
`packages/contracts`, `backend`, `frontend`, Python `worker`) gated two ways that
are orthogonal: **`can(role, capability)`** by *person*
([ACCESS-HIERARCHY.md](ACCESS-HIERARCHY.md)) and **`planAllows(plan, feature)`**
by *firm edition* ([PLANS-AND-TIERS.md](PLANS-AND-TIERS.md)).

It must **feel like one OS** — Pure Carbon everywhere (office workspace *and* every
portal), mobile-first for portals. No second design system.

## The six pillars

Status legend — **✅ Implemented** (shipped, in the live router) ·
**◐ Partial** (core shipped; needs consolidation/mapping into the unified spine) ·
**○ Needs creation** (vision; not built).

| Pillar | What it is | Primary live namespaces / routes | Status |
|---|---|---|---|
| **1. Ask OS** | Conversational + cognition layer — ask the office anything, AI-assisted decisions, AI Studio, public "Ask ESTI" | `ai.*` (`ai.run`, `ai.generateCad`), `dashboard` cognition/Action Center, `companion`, public `marketing.askEsti` | ◐ |
| **2. Project OS** | The project as the unit of work — two heads: **Consultancy** (design) and **Project Management** (construction) | `projectOffice`, `phases`, `projectBrief`, `drawings`, `transmittals`, `approvals`, `permits`, `proposals`, `feeProposals`, `invoices`; `ProjectDetail.tsx` | ✅ |
| **3. Task OS** | Everyone's work surface — tasks (billable/work-type/difficulty dimensions), assignments, workload, attendance, ASPRF | `team`, `assignments`, `workload`, `attendance`, `aspRf`, `rewards`; `Work.tsx` hub | ◐ |
| **4. Construction Cost Management OS** | Money on a job, end to end: estimate → BOQ → rate analysis → BBS → tender → award → site measurement → running bill → deviation → final account | `estimation`, `estimates`, `components`, `rateAnalysis`, `dsr`, `bbs`, `tenders`, `contractorPortal`, `workPackages`, `measurementBook`, `runningBills`, `construction`, `constructionSchedule`, `pmc` | ◐ |
| **5. Portals** | External collaborators on the same OS, scoped + mobile-first | `portal` (client), `collab` (consultant), `contractorPortal` (contractor bids + running bills); `Portal.tsx`, `CollaboratorPortal.tsx`, `ContractorPortal.tsx` | ◐ |
| **6. AI/ML/LLM extraction & decision support** | The intelligence under the pillars — takeoff/CAD extraction, reconciliation matching, cognition, risk notes | `companion` (ESTICAD takeoff), `ai.generateCad`, `reconcile` + worker (`dxf_to_svg`, `reconcile_import` via `pandas`), cognition engine | ◐ |

## Per-pillar: implemented vs needs-mapping vs needs-creation

### 1. Ask OS — ◐
- **Implemented:** AI Studio + agent (`ai.run`), CAD draft generation (`ai.generateCad`, `esti_ai_run.source`), dashboard cognition engine + Action Center, public "Ask ESTI" corner (`marketing.askEsti`). Backend AI lives behind `@hcw/aorms-ai-kit` (prompts + Ollama SDK). Gated to Core/Enterprise.
- **Needs mapping:** a single "ask the office" entry that spans projects, tasks, and cost data — today cognition is dashboard-scoped and AI Studio is its own route.
- **Needs creation:** office-wide retrieval/decision surface that reads across all pillars; per-pillar AI affordances (e.g. "explain this deviation", "draft this letter") as first-class actions.

### 2. Project OS — ✅
- **Implemented:** two-head ProjectDetail (Consultancy | Project Management), phases, project brief/Info, drawings + transmittals, approvals, permits, decisions + revision intelligence (CRIF), proposals, fee proposals, in-project invoicing.
- **Needs mapping:** Programme/PMC become read-only **portfolio** rollups (restructure Phase 5) rather than separate top-level areas.

### 3. Task OS — ◐
- **Implemented:** Work hub (tasks/board/calendar/activity), assignments, workload, attendance, ASPRF scoring with live `TaskClassification` + `TaskWorkType` + `difficultyCoefficient` + `estimatedHours`.
- **Needs mapping / creation:** the unified **Task OS spine** — one task model that consistently links project ↔ phase ↔ assignment ↔ time ↔ ASPRF across every surface (flagged as the next build after the cleanup pass).

### 4. Construction Cost Management OS — ◐
- **Implemented:** Estimation OS phases 1–4 (design-stage estimate + freeze/version, component + IFC catalog + auto-BOQ, rate analysis build-up, work packages + running bills with double-billing guard); CC phases **A** (tender BOQ + item-wise bids), **B** (award → work order), **C** (site Measurement Book: measure→approve→bill, bill types + deductions → net payable, running-bill PDF).
- **Needs creation (the active increment):** **CC Phase D — Controls** (quantity/rate deviations, variation orders, extra items, approval queue), then **E** (BBS into the spine), **F** (final account + closure), **G** (cost dashboard + reports). See [ROADMAP.md](ROADMAP.md) § "AORMS restructure & Construction Cost OS" and [CONSTRUCTION-COST-MANAGEMENT-OS.md](CONSTRUCTION-COST-MANAGEMENT-OS.md).
- **Needs mapping:** consolidate estimates + measurement + BBS + running bills into one staged **Costing & Measurement window** on a shared item/rate spine (restructure Phase 4).

### 5. Portals — ◐
- **Implemented:** Client portal (`portal`), Consultant/collaborator portal (`collab`), Contractor bid + running-bills portal (`contractorPortal`). All Pure Carbon, mobile-first.
- **Needs creation:** a dedicated **Site Supervisor** surface. Today the L5 *Site Supervisor* role is internal staff inside the office workspace; the unified vision is a mobile-first site-ops surface (measurements, snags, progress, photos) consistent with the other portals.

### 6. AI/ML/LLM extraction & decision support — ◐
- **Implemented:** ESTICAD companion takeoff capture + linked drawings (`companion`), DXF→SVG conversion + AI CAD drafts, reconciliation import + matching (worker `reconcile_import`, `pandas`), dashboard cognition + risk signals.
- **Needs creation:** extraction feeding the cost spine directly (takeoff → BOQ quantities), decision support attached to deviations/variations and fee defence, and a consistent "AI assist" pattern reused across pillars.

## Reading order for a new agent

1. **This doc** — what AORMS is becoming (the six pillars + status).
2. [INFORMATION-ARCHITECTURE.md](INFORMATION-ARCHITECTURE.md) — current nav/IA.
3. [ROADMAP.md](ROADMAP.md) — delivery history + the active increment (CC Phase D next).
4. [ACCESS-HIERARCHY.md](ACCESS-HIERARCHY.md) + [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) — the two gates.
5. [CARBON-UI-DIRECTION.md](CARBON-UI-DIRECTION.md) — the UI law (Pure Carbon).
6. [ARCHITECTURE.md](ARCHITECTURE.md) — stack/system; `CLAUDE.md` — the module map + conventions.

## Document control

| Version | Date | Change |
|---|---|---|
| 4.0 | 2026-06-25 | Initial unified north-star — six pillars, status against live router, reading order |
