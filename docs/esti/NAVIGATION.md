# AORMS — Navigation Architecture (V2, canonical)

**Status:** Canonical navigation IA · **Owner:** Holagundi Consulting Works ·
**Adopted:** 2026-06-28

> This document is the **single source of truth for navigation**. Where any other
> doc describes the sidebar / module placement differently, **this one wins**.
> For *what code exists today* the authority remains
> [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) § "System state"; the
> two are reconciled here via the **Status** column.

## Design philosophy

AORMS must not feel like traditional ERP or office-management software. The
navigation reflects how an architecture practice naturally operates:

> Growth drives business · Studio drives execution · Learning drives better
> professionals · Office supports operations.

Principles: architecture-native terminology; minimise enterprise complexity; keep
frequently-used modules primary; push configuration and infrastructure deeper;
work and learning coexist in one ecosystem.

## Five permanent pillars

```
HOME · GROWTH OS · STUDIO · LEOS · OFFICE
```

## Status legend

| Tag | Meaning |
|---|---|
| ✅ | **Live** — code exists and passes the roadmap gate |
| 🚧 | **Partial / rebuilding** — exists in a different shape, or under active rebuild |
| 🔲 | **Planned** — not built yet |

> The V2 *grouping* (five pillars, OFFICE sub-sections) is itself **🔲 planned** —
> the implemented sidebar today is the flat-links-plus-`Accounts`/`Practice`/`Admin`
> layout in `frontend/src/App.tsx`. The "Where it lives today" column maps each
> module to its current route so the doc stays truthful until the pillar sidebar
> is implemented. See **Current vs V2** below.

---

## 1. HOME

System overview and daily operational pulse.

| Module | Status | Where it lives today |
|---|---|---|
| Dashboard | ✅ | `/` (`Dashboard.tsx`, `dashboard.home` bundle) |

## 2. GROWTH OS

Practice growth and business acquisition.

| Module | Status | Where it lives today |
|---|---|---|
| Leads | ✅ | `/leads` (`Leads.tsx`, `esti_lead`) |
| Fee Proposals | ✅ | `/accounting/fees` (`FeeProposals.tsx`) |
| Contracts | ✅ | `/office/contracts` (`Contracts.tsx`) |
| Client Onboarding | 🚧 | exists inside the project pipeline (`ProjectPipeline.tsx`, `esti_client_onboarding`, Project OS Phase 31), not a standalone GROWTH OS nav module |

Workflow: Lead → Proposal → Contract → Client Onboarding → Project created.

## 3. STUDIO

Core execution environment — where project work happens.

| Module | Status | Where it lives today |
|---|---|---|
| Projects | ✅ | `/projects` → `/projects/:id` (`Projects.tsx`, `ProjectDetail.tsx`) |
| Tasks | ✅ | `/tasks` (Work hub — `Work.tsx`) |
| Programme | ✅ | `/programme` (office portfolio rollup) + per-project programme |
| Construction | ✅ | `/office/construction` (plan `pmc` + `pmcEnabled` + rank ≥ 60) |
| PMC | ✅ | `/pmc` (plan `pmc` + `pmcEnabled` + rank ≥ 60) |

Inside each project (V2): Estimation OS · BOQ · Drawings · Documents · Site
Progress · Construction Tracking.

| In-project module | Status | Note |
|---|---|---|
| Drawings, Documents, Site progress, Construction tracking | ✅ | live in `ProjectDetail.tsx` / PMC site ops |
| Estimation OS, BOQ | 🚧 | **removed in the 2026-06-28 teardown, being rebuilt** — see [ESTIMATION-OS.md](ESTIMATION-OS.md) |

## 4. LEOS — Learning Environment Operating System

Continuous professional development inside the practice (not a traditional LMS).
Certificates are **not** stored here — they sync externally.

| Module | Status |
|---|---|
| Learning Sessions (weekly / Saturday / vendor / team) | 🔲 |
| Presentations (team, case studies, research, reviews) | 🔲 |
| Research & Knowledge (papers, building case studies, code/standards/material discussions) | 🔲 |
| Whiteboard Studio (design/detail discussions, markups, sketch sessions) | 🔲 |
| Personal Learning (notes, flashcards, saved references, bookmarks) | 🔲 |
| Assessments (practical exercises, competency tests, simulations) | 🔲 |
| Learning Progress (hours logged, attendance, assessment history, tracker) | 🔲 |

> **The entire LEOS pillar is 🔲 planned — no code exists today.**

## 5. OFFICE

Operational backbone. All secondary modules consolidate here under five
sub-sections.

### 5.1 External Network — outside relationships

| Module | Status | Where it lives today |
|---|---|---|
| Clients | ✅ | `/external-network?tab=clients` (`Clients.tsx`, `ExternalNetworkHub.tsx`) |
| Consultants | ✅ | `/external-network?tab=consultants` (`Consultants.tsx`) |
| Contractors | ✅ | `/external-network?tab=contractors` (`Contractors.tsx`) |
| Site Supervisors (directory) | 🔲 | `SITE_SUPERVISOR` role + site portal exist, but no directory nav module |

### 5.2 Finance

| Module | Status | Where it lives today |
|---|---|---|
| Invoices | ✅ | `/invoices` |
| Office Expenses | ✅ | `/accounting/office-expenses` |
| Cash Book | ✅ | `/accounting/cash-book` |
| Reconciliation | ✅ | `/reconcile` |
| GST Filing | ✅ | `/filing` (plan `gstFiling` + `reports:view`) |

### 5.3 Internal Operations

| Module | Status | Where it lives today |
|---|---|---|
| Team | ✅ | `/team?tab=team` (`Team.tsx`, `TeamHub.tsx`; plan `hr` + `hrEnabled`) |
| HR | ✅ | `/team?tab=hr` (`Hr.tsx`; `hr:manage`) |
| Performance | ✅ | `/team?tab=performance` (`Performance.tsx`; plan `performance` + rank ≥ 60) |
| Documents Register | ✅ | `/office/documents` |
| Letters | ✅ | `/office/letters` |

### 5.4 Standards Library *(was "Knowledge Bank")*

System-configuration / reference layer — not a daily-use module; restricted access.

| Group → Module | Status | Note |
|---|---|---|
| Construction Standards (Items, Categories, Specification Books, Specifications) | 🚧 | Knowledge Bank rebuild in progress (`specCatalog`, library CSV import/recipes) — see [CONSTRUCTION-KNOWLEDGE-BANK.md](CONSTRUCTION-KNOWLEDGE-BANK.md). Today `/knowledge-bank` ships Specification + Lessons |
| Estimation Intelligence (Rules Engine, Recipes Engine, Rate Books, Formula Engine) | 🚧 | **Rate Books removed (migration 0108); Estimation OS torn down 2026-06-28.** Recipes data-mapper landing (KB Phase 2b). Target: [ESTIMATION-OS.md](ESTIMATION-OS.md) + [CONSTRUCTION-KNOWLEDGE-BANK.md](CONSTRUCTION-KNOWLEDGE-BANK.md) |

### 5.5 Administration

| Module | Status | Where it lives today |
|---|---|---|
| Company | ✅ | `/company` (`firm:admin`) |
| Users | ✅ | `/users` (`firm:admin`) |
| Audit Log | ✅ | `/audit` (plan `auditLog` + `firm:admin`) |
| License Management | 🚧 | lives inside Company (`LicensePanel`); not a separate nav module |
| Settings | ✅ | `/settings` |

---

## Header utilities *(not in the sidebar)*

| Utility | Status | Today |
|---|---|---|
| Global Search | ✅ | currently a top-level sidebar link `/search` → moves to header in V2 |
| Notifications | ✅ | `AlertsBell` in header + `/alerts` link |
| Pomodoro Timer | ✅ | `HeaderPomodoro` |
| AI Assistant | ✅ | "Ask ESTI" floating action |
| User Profile | ✅ | `UserIdCard` in header |

## Removed from the dedicated sidebar (V2)

These no longer get top-level navigation; they are integrated elsewhere:

| Today | V2 home |
|---|---|
| Search (top-level link) | Header utility |
| Alerts (top-level link) | Header utility (Notifications) |
| AI Studio (Practice group) | Integrated (header AI assistant / project AI) |
| Knowledge Bank (top-level link) | **Renamed → OFFICE › Standards Library** |
| Admin (group) | OFFICE › Administration |
| Accounts (group) | OFFICE › Finance |
| Practice (group) | split: GROWTH OS (proposals/contracts) + STUDIO (programme/PMC/construction) + OFFICE (documents/letters/AI) |

---

## Current vs V2 (gap summary)

**Implemented sidebar today** (`frontend/src/App.tsx`):
flat links — Dashboard · Leads · Projects · Work · **Team** · **External Network** ·
Knowledge · Search · Alerts — plus collapsible groups **Accounts** · **Practice** ·
**Admin**.

**To reach V2** (🔲 not started unless noted):
1. Introduce the five-pillar sidebar (HOME / GROWTH OS / STUDIO / LEOS / OFFICE)
   with OFFICE sub-sections.
2. Build the **LEOS** pillar (greenfield).
3. Move Search + Alerts into the header; rename Knowledge Bank → Standards Library.
4. Add **Site Supervisors** directory and surface **Client Onboarding** /
   **License Management** as their own modules.
5. Land the Estimation OS / BOQ / Standards-Library rebuild (in progress).

**Realigned 2026-06-28 (this session):** the interim **External Network** hub
(`/external-network`, `ExternalNetworkHub.tsx`) replaces the short-lived
"Third Parties" hub — tabs Clients · Consultants · Contractors, matching OFFICE ›
External Network. The **Team** hub (`/team`) bundles Team · HR · Performance,
matching OFFICE › Internal Operations. Legacy paths (`/clients`, `/consultants`,
`/contractors`, `/third-parties`, `/hr`, `/performance`) redirect into the hubs.
These two hubs are an **interim** step; both fold under the OFFICE pillar when the
full V2 sidebar is built.

## Closing philosophy

AORMS is not architecture-office-management software — it is an **operating system
for design studios**: work and learning coexist, knowledge becomes infrastructure,
growth becomes measurable, professional development becomes continuous.
