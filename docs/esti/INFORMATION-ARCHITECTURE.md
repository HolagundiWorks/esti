# AORMS — Information Architecture

> **⚠ Navigation superseded (2026-06-29).** The canonical sidebar / module
> placement is now [NAVIGATION.md](NAVIGATION.md) — the **Canonical V3** IA
> (consultancy-only: Studio Intelligence · Projects · Tasks · Studio · Third Parties · Office ·
> Finance · LXOS · Admin). The "Global navigation" section below is the **prior** IA,
> kept only for module-placement rationale (one-home-per-module) — **defer to
> NAVIGATION.md for what the sidebar contains.** Construction-delivery (PMC,
> Construction, Programme, tenders) and mood boards are **removed**.

> **⚠ Reconciliation note (2026-06-28).** The **Estimation OS**, **Construction Cost
> spine**, **Rate Books**, and **Rate Analysis** were **removed** in the teardown — the
> Costing / Measurement / estimation IA below is **historical**. The authoritative record
> of what exists today is [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md)
> § "System state"; the active rebuild is
> [CONSTRUCTION-KNOWLEDGE-BANK.md](CONSTRUCTION-KNOWLEDGE-BANK.md) +
> [COST-MANAGEMENT-SYSTEM.md](COST-MANAGEMENT-SYSTEM.md).

> Status: **historical map.** Backend (tRPC namespaces, DB) has since changed — this
> was a navigation / information-architecture proposal. The goal is one home per
> module and a clear flow.
>
> - **Sidebar:** see [NAVIGATION.md](NAVIGATION.md) — the canonical **Canonical V3**
>   IA (consultancy-only). The layout described below is the **prior** structure.
> - Programme and PMC (top-level *and* portfolio rollups) were **removed** in the
>   2026-06-29 consultancy-only teardown — they are no longer masters or rollups.
> - The project workspace is live (`ProjectDetail.tsx`), now **consultancy-only**
>   (design head + architect site supervision). The single Costing & Measurement
>   window was **removed** in the 2026-06-28 teardown (see the reconciliation note
>   above); estimation/costing is being rebuilt on the Knowledge Bank.
> - 2026-06 cleanup: the entire in-product compliance engine is **removed** — the
>   BBMP bylaw calculator, the RIE/site-feasibility rule engine
>   (`ruleVersions`/`siteAssessments`/`bbmpRules`), the KB Compliance tab, and the
>   public `/compliance-check` SEO tool are all gone. *(Rate Books/`dsr`, Rate
>   Analysis, and the spec → rate-book mapping were also removed in the
>   2026-06-28 teardown — see the reconciliation note above.)*

## The core idea: delivery head + shared practice

> **Historical (superseded 2026-06-29).** The original model below proposed **two**
> delivery heads — Consultancy and Project Management (PMC). AORMS is now
> **consultancy-only**: the PMC / construction-delivery head (tenders, contractors,
> running bills, site CPM) was **removed**. The project workspace keeps the
> **Consultancy** head plus architect **site supervision** (snags / inspections /
> progress reports). Estimation/costing is rebuilding as the Construction Knowledge
> Bank → Cost Management System, not the removed PMC spine.

Every project moves through its **Consultancy** delivery head, and the office wraps
it with shared **practice** functions that are not project-internal.

- **Consultancy** — design services on the COA/RIBA stages: brief → design →
  drawings → approvals → fees. This is what the firm *designs*.
- **Practice (shared)** — Clients, Accounts, People, Knowledge, Admin. Cross-cuts
  every project; each lives in exactly one place.

The same project record powers the workspace (backend unchanged) — the split is
purely how the work is presented.

## Global navigation — one home per module

| Area | Contains (existing modules) |
|---|---|
| **Home** | Dashboard, Action Center, Alerts, Search |
| **Clients** | Client CRM, client log, portal access — *(V3: Third Parties)* |
| **Projects** | Project list → **project workspace** (two heads, below) · Archived projects |
| **Work** | Tasks, workload, my work |
| **Practice** | Proposals pipeline, Letters, Contracts, Document register, AI Studio |
| **Accounts** | Invoices (cross-project rollup), Reconciliation, Expenses & cash book, GST/TDS filing |
| **People** *(retired)* | Team, HR, Performance → *(V3: Studio)*; Consultants, Contractors → *(V3: Third Parties)* |
| **Knowledge** | Spec catalogue, Construction Knowledge Bank (Material/Labour/Item libraries, Specifications, Recipes), Lessons |
| **Admin** | Company, Users, Audit log, System, My profile |

## The project workspace

**Shared header** (always visible): Overview · Project Info · Settings

### Consultancy head — design delivery
- Client log
- Design & drawings — drawings, transmittals, approvals
- Decisions & revisions — revision intelligence (source / category)
- Documents
- **Fee & billing** — fee proposal **and** raise/manage invoices for this project
- Team · Comments · Lessons

### Site supervision *(architect site delivery — consultancy scope)*
- Site — snags, site instructions, inspections, progress reports
- Purchase orders
- Specification sheets

> **Removed (consultancy-only, 2026-06-29).** The former **Project Management (PMC)
> head** — PMC control / programme of works, the single **Costing & Measurement**
> window (rate analysis → estimation → BOQ → running bills), and **Tenders &
> contractors** — was torn down. Estimation/costing is rebuilding as the
> Construction Knowledge Bank → Cost Management System; only architect **site
> supervision** (above) remains on the project.

## Costing & Measurement — REMOVED (rebuilding)

> The "single Costing & Measurement window" (rate analysis → estimation → BOQ → costing →
> site measurement → running bills) described here was part of the Estimation OS +
> Construction Cost spine **torn down on 2026-06-28**. It is being rebuilt ground-up on a
> cleaner model: [CONSTRUCTION-KNOWLEDGE-BANK.md](CONSTRUCTION-KNOWLEDGE-BANK.md) (the
> reference foundation — libraries, specifications, recipes live) →
> [COST-MANAGEMENT-SYSTEM.md](COST-MANAGEMENT-SYSTEM.md) (estimate → derivation → BOQ → cost, planned). The
> nav-mapping tables below that still reference `estimates`/`bbs`/`dsr`/`runningBills` are
> historical; current state is authoritative in
> [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) § "System state".

## What this fixes (current → proposed)

> **Note.** The rows that previously relocated **Estimates / BBS / running bills**,
> **Programme**, **PMC**, and **Tenders / Construction** are dropped — those modules
> were removed in the consultancy-only + estimation/cost teardown. Estimation/costing
> is rebuilding as the Construction Knowledge Bank → Cost Management System.

| Scattered today | Move to |
|---|---|
| **Invoices** raised from several places | Raised in the project's **Consultancy › Fee & billing**; **Accounts** is the cross-project rollup + reconciliation / GST-TDS filing |
| **Expenses** in project Costing *and* nav Accounting | One home: **Accounts** (filterable by project); the project shows a read-only summary that links there |
| **Spec sheets** (project) vs **Spec catalogue** (Knowledge) | Keep both, labelled: catalogue = reference (Knowledge), sheets = instance (project) |
| **Consultants / Contractors** under People *and* as engagements | Directory = **People** (master); the project shows the **engagement** linking back |

## Principles

1. **One home per module.** If something must appear in two places, one is the
   master (editable) and the other is a read-only summary that links to it.
2. **Project = one consultancy head + site supervision.** Design delivery and
   architect site supervision never mix items. *(The former Project Management/PMC
   head was removed — consultancy-only.)*
3. **Practice wraps projects.** Clients, Accounts, People, Knowledge, Admin are
   office-wide, reached from the global nav, not from inside a project.
4. **Flow, not a flat list.** Consultancy: brief → design → drawings → approvals
   → fee. The drawings takeoff hands off into the rebuilding Cost Management System.

---

# Complete module placement — senior-architect recommendation

*Free-hand pass over every module. Organising principle: a construction
practice runs on a **delivery lifecycle** (the project is the spine), wrapped by
**office-wide services** that serve many projects at once. Rule: one entity has
one read-write home; everywhere else links to it. Below, every module is placed.*

## The delivery spine — a project, in order

```
Capture ──▶ Design (Consultancy) ──▶ Site supervision ──▶ Close
```

Capture is pre-project (pipeline). Design + Site supervision + Close are the
project workspace under the **Consultancy** head. *(The former Procure (Tender) and
Construct (PMC) stages were removed — AORMS is consultancy-only; estimation/costing
is rebuilding as the Cost Management System.)*

## Project workspace — modules by stage

### Setup (shared header — visible under both heads)
| Module / sub-module | Why here |
|---|---|
| Overview, Project info (`projectOffice`) | identity, status, jurisdiction, type |
| Project brief (`projectBrief`) | the questionnaire that scopes the job |
| Phases (`phases`) | the COA stages this project runs on |
| Team & assignments (`assignments`) | who is staffed on it |
| Settings | per-project config (module gates) |

### Consultancy head — Design
| Module / sub-module | Why here |
|---|---|
| Client log (`clientLog`) | interactions on this project |
| Drawings & transmittals (`drawings`, `transmittals`) | the register + issue record |
| Approvals (`approvals`) | sign-off / issue log against drawing versions |
| Decisions & revisions (revision intelligence) | source/category — the design audit trail |
| Documents (`documents`) | this project's document register (instance) |
| Specifications (`spec`) | this project's spec sheets (instance) |
| Statutory permits (`permits`) | sanction/approval tracking with authorities |
| Fee & billing (`proposals`, `invoices`) | COA fee for this project + **raise invoices here** |

### Site supervision — architect site delivery  *(consultancy scope)*
| Module / sub-module | Why here |
|---|---|
| Site ops (`snags`, `siteInstructions`, `progressReports`, `phaseProgress`, `inspections`, `siteVisits`) | architect site supervision on this project |
| Purchase orders (`purchaseOrders`) | procurement of goods |
| Project expenses (`expenses`) | project cost book (read-write here, rolls up to Accounts) |

> **Removed (2026-06-29).** The **Project Management (PMC) head** — `pmc` hub,
> `constructionSchedule` (CPM), the **Costing & Measurement** window
> (`estimates`/`measurements`/`bbs`/`dsr`/`runningBills`), and **Tenders &
> contractors** — was torn down (AORMS is consultancy-only). Estimation/costing is
> rebuilding as the Construction Knowledge Bank (`kb`) → Cost Management System
> (`cms`); only architect site supervision (above) remains on the project.

### Collaboration — cross-cutting *inside* the project (surfaced contextually, not a nav item)
| Module | Why here |
|---|---|
| Comments (`comments`) | threaded discussion on any record |
| Critical notes (`criticalNotes`) | flagged project notes |
| Activity (`activity`) | immutable per-project timeline |
| Portals (`portal`, `collab`, contractor portal) | scoped external views of *this* project |

## Office-wide services — wrap many projects

| Area | Modules | Role |
|---|---|---|
| **Home / Work** | `dashboard`, `notifications` (Alerts), `workload`, search | the firm's pulse + my tasks |
| **Clients & pipeline** | `clients`, `clientLog` (CRM master), `proposals`, `feeProposals` (pre-award) | winning work, *before* it is a project |
| **Practice / Office** | `letters`, `contracts`, document register (office-wide), AI Studio | office documents + cross-project overview |
| **Accounts** | `invoices` (rollup), `reconcile`, `accounts`/cash book, `expenses` rollup, `reports` (GST/TDS filing), `purchaseOrders` rollup | single home for firm finance; invoices *raised* in-project, *filed* here |
| **People** *(V3: Studio + Third Parties)* | `team`, `attendance`, `leaves`+`payroll` (HR), `workload`, performance (`aspRf`, `teamScores`, `rewards`) → Studio; `consultants` + `contractors` **directories** → Third Parties | the firm's roster + capability; engagements live in the project |
| **Knowledge** | `knowledgeBank`, `specCatalog`, Construction Knowledge Bank (`kb`: Material/Labour/Item libraries, Specifications, Recipes), Lessons | **reference data**, not project instances |
| **Admin / Governance** | `firm` (company), `users`, `settings`, `audit`, `system` (release), `companion` (ESTICAD devices), `marketing` | run the installation |

`health`, `profile` are public/infra — no nav home.

## Key relocations (the wins)

1. **Unified cost spine (rebuilding).** Estimation/costing is rebuilt ground-up as the **Construction Knowledge Bank** (`kb`) → **Cost Management System** (`cms`): Element spine → Estimate → BOQ → Final Estimation Set → (planned) Site Measurement Book → Work Orders → Bill Certification. *(The old `estimates`/`measurements`/`bbs`/`runningBills` "Costing & Measurement" window and rate spine were removed.)*
2. **Statutory work lands in Design.** `permits` and `inspections` move out of "Office"/floating into the Consultancy head (or site supervision, for site inspections) where they belong to the stage.
3. **Expenses: one editor, one rollup.** Read-write in the project; Accounts is the cross-project summary — not two editable copies.
4. **Directory vs engagement.** `consultants`/`contractors` are master **directories** under People; the project shows the engagement, linking back.
5. **Collaboration is contextual, not navigational.** `comments`, `criticalNotes`, `activity` attach to records and timelines, not a sidebar item.
6. **Reference vs instance.** Knowledge holds the spec *catalogue* and Construction Knowledge Bank libraries (`specCatalog`, `kb`); projects hold the *applied* result (`spec` sheets, and CMS estimates/BOQ). *(Rate Books/`dsr` and the analysed-rate library were removed.)*
7. **Portals are one project, scoped.** Client, consultant and contractor portals are the same project data filtered by role — not separate modules.
