# AORMS — Information Architecture

> Status: **implemented.** Backend (tRPC namespaces, DB) is unchanged — this is a
> navigation / information-architecture map. The goal is one home per module, a
> clear flow, and a project surfaced under two delivery heads.
>
> - Global nav restructured into the 9 areas below (`frontend/src/App.tsx`):
>   standalone areas Home · Clients · Projects · Work · Knowledge, and the
>   collapsible groups Practice · Accounts · People · Admin.
> - Programme and PMC moved from top-level links into **Practice** as read-only
>   portfolio rollups; the per-project Programme and PM head remain the masters.
> - The two-head project workspace and the single Costing & Measurement window
>   are live (`ProjectDetail.tsx`, `ProjectCosting.tsx`).

## The core idea: two delivery heads + shared practice

Every project moves through up to two **heads**, and the office wraps them with
shared **practice** functions that are not project-internal.

- **Consultancy** — design services on the COA/RIBA stages: brief → design →
  drawings → approvals → fees. This is what the firm *designs*.
- **Project Management (PMC)** — construction delivery: BOQ & costing → tenders →
  contractors → measurement → running bills → site. This is what the firm
  *administers on site*.
- **Practice (shared)** — Clients, Accounts, People, Knowledge, Admin. Cross-cuts
  every project; each lives in exactly one place.

A project is shown under **both heads as two tabs**, each containing only the
items that belong to that head. The same project record powers both (backend
unchanged) — the split is purely how the work is presented.

## Global navigation — one home per module

| Area | Contains (existing modules) |
|---|---|
| **Home** | Dashboard, Action Center, Alerts, Search |
| **Clients** | Client CRM, client log, portal access |
| **Projects** | Project list → **project workspace** (two heads, below) · Archived projects |
| **Work** | Tasks, workload, my work |
| **Practice** | Proposals pipeline, Letters, Contracts, Document register, **Office programme & PMC portfolios** (read-only rollups), AI Studio |
| **Accounts** | Invoices (cross-project rollup), Reconciliation, Expenses & cash book, GST/TDS filing |
| **People** | Team, HR, Performance, Consultants (directory), Contractors (directory) |
| **Knowledge** | DSR rates, Rate-analysis library, Spec catalogue, SteelFlow BBS reference |
| **Admin** | Company, Users, Audit log, System, My profile |

## The project workspace — two heads

**Shared header** (always visible): Overview · Project Info · Programme · Settings

### Consultancy head — design delivery
- Client log
- Design & drawings — drawings, transmittals, approvals
- Decisions & revisions — revision intelligence (source / category)
- Documents
- **Fee & billing** — fee proposal **and** raise/manage invoices for this project
- Team · Comments · Lessons

### Project Management head — construction delivery *(when the project is a PMC engagement)*
- PMC control — programme of works, progress reports
- **Costing & Measurement** — the single window (see below): rate analysis →
  estimation → BOQ → costing → site measurement → RA running bills → submissions
- Tenders & contractors — tender → bids → award *(prices the BOQ)*
- Site — snags, site instructions, inspections, progress
- Purchase orders
- Specification sheets

## Costing & Measurement — the single window

The biggest source of "scattered + relinking" today is that rates, quantities,
the BOQ, site measurement and bills live in separate screens that re-key the same
items. They should be **one workspace on one shared item/rate spine** — quantities
and rates flow forward, nothing is re-entered:

```
Rate analysis ─▶ Estimation ─▶ BOQ ─▶ Costing ─▶ Site measurement ─▶ Running bills (RA) ─▶ Submissions
```

| Step | What it is | Source / sink |
|---|---|---|
| **Rate analysis** | composite rate build-up (material + labour + machinery + overhead), or pull a DSR rate | the analysed-rate library (Knowledge) seeds it |
| **Estimation** | apply rates to *estimated* quantities (takeoff from the Consultancy drawings) | reads `measurements` (takeoff) |
| **BOQ** | the formal bill of quantities — the tender/contract document | priced by **Tenders** |
| **Costing** | project cost roll-up, budget vs estimate, lead % | summary rolls to **Accounts** |
| **Site measurement** | *actual* measured quantities recorded on site (measurement sheet / abstract) | the as-built quantities |
| **Running bills (RA)** | measured qty × analysed/BOQ rate → RA bill; the measure→verify→approve→bill lifecycle | contractor portal |
| **Submissions** | contractor submits the bill against approved quantities | closes the loop |

One item carries its rate from analysis all the way to the running bill — so the
RA bill is **rate-analysis-based by construction**, not re-keyed. This window is
the heart of the **Project Management** head.

## What this fixes (current → proposed)

| Scattered today | Move to |
|---|---|
| Estimates / BBS / measurement / running bills as **separate screens** | **One Costing & Measurement window** (rate analysis → estimation → BOQ → costing → site measurement → RA bills → submissions) on a shared item/rate spine |
| **Programme** as top-level nav *and* project Info tab | Per-project Programme stays in the project (shared header); top-level becomes a read-only **portfolio Gantt** under Practice |
| **PMC** as top-level nav *and* project group | Project Management is a **project head**; the nav item becomes the read-only **PMC portfolio** rollup under Practice |
| **Tenders**, **Construction** under nav "Office" | **Project Management head** (per project); Practice shows the portfolio rollup |
| **Invoices** raised from several places | Raised in the project's **Consultancy › Fee & billing**; **Accounts** is the cross-project rollup + reconciliation / GST-TDS filing |
| **Expenses** in project Costing *and* nav Accounting | One home: **Accounts** (filterable by project); the project shows a read-only summary that links there |
| **Spec sheets** (project) vs **Spec catalogue** (Knowledge) | Keep both, labelled: catalogue = reference (Knowledge), sheets = instance (project) |
| **Consultants / Contractors** under People *and* as engagements | Directory = **People** (master); the project shows the **engagement** linking back |

## Principles

1. **One home per module.** If something must appear in two places, one is the
   master (editable) and the other is a read-only summary that links to it.
2. **Project = two heads.** Consultancy and Project Management never mix items.
3. **Practice wraps projects.** Clients, Accounts, People, Knowledge, Admin are
   office-wide, reached from the global nav, not from inside a project.
4. **Flow, not a flat list.** Consultancy: brief → design → drawings → approvals
   → fee. Project Management: BOQ → tender → running bills → site. The drawings
   handoff (takeoff) is the one bridge between the heads.

---

# Complete module placement — senior-architect recommendation

*Free-hand pass over every module. Organising principle: a construction
practice runs on a **delivery lifecycle** (the project is the spine), wrapped by
**office-wide services** that serve many projects at once. Rule: one entity has
one read-write home; everywhere else links to it. Below, every module is placed.*

## The delivery spine — a project, in order

```
Capture ──▶ Design (Consultancy) ──▶ Procure (Tender) ──▶ Construct (PMC) ──▶ Close
```

Capture is pre-project (pipeline). Design + Procure + Construct + Close are the
project workspace, grouped under the two heads. Procurement and construction sit
under **Project Management**; design under **Consultancy**.

## Project workspace — modules by stage

### Setup (shared header — visible under both heads)
| Module / sub-module | Why here |
|---|---|
| Overview, Project info (`projectOffice`) | identity, status, jurisdiction, type |
| Project brief (`projectBrief`) | the questionnaire that scopes the job |
| Phases (`phases`) | the COA stages this project runs on |
| Programme (`programme`, per-project) | this project's delivery Gantt |
| Team & assignments (`assignments`) | who is staffed on it |
| Settings | per-project config (PMC toggle, module gates) |

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
| Fee & billing (`feeProposals`, `invoices`) | COA fee for this project + **raise invoices here** |

### Project Management head — Construction  *(PMC engagements only)*
| Module / sub-module | Why here |
|---|---|
| PMC control (`pmc`) | hub, progress reports, portfolio status |
| Construction schedule (`constructionSchedule`, `phaseProgress`) | site CPM / Gantt |
| **Costing & Measurement** (`estimates`, `measurements`, `bbs`, `dsr`, `runningBills`) | the single window — rate analysis → estimation → BOQ → costing → site measurement → RA bills → submissions |
| Tenders & contractors (tender → bid → award) | prices the BOQ; links the contractor record |
| Site ops (`snags`, `siteInstructions`, `progressReports`, `inspections`) | day-to-day construction administration |
| Purchase orders (`purchaseOrders`) | procurement of goods |
| Project expenses (`expenses`) | project cost book (read-write here, rolls up to Accounts) |

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
| **Practice / Office** | `letters`, `contracts`, document register (office-wide), Programme + PMC **portfolios** (read-only rollups), AI Studio | office documents + cross-project overview |
| **Accounts** | `invoices` (rollup), `reconcile`, `accounts`/cash book, `expenses` rollup, `reports` (GST/TDS filing), `purchaseOrders` rollup | single home for firm finance; invoices *raised* in-project, *filed* here |
| **People** | `team`, `attendance`, `leaves`+`payroll` (HR), `workload`, performance (`aspRf`, `teamScores`, `rewards`); `consultants` + `contractors` **directories** | the firm's roster + capability; engagements live in the project |
| **Knowledge** | `dsr` (rates), `knowledgeBank`, analysed-rate library, `specCatalog`, `steelflow` | **reference data**, not project instances |
| **Admin / Governance** | `firm` (company), `users`, `settings`, `audit`, `system` (release), `companion` (ESTICAD devices), `marketing` | run the installation |

`health`, `profile` are public/infra — no nav home.

## Key relocations (the wins)

1. **One costing window.** `estimates` + `measurements` + `bbs` + `runningBills` become a single **Costing & Measurement** workspace on a shared item/rate spine — rate analysis flows all the way to the RA bill, nothing re-keyed. Today they are separate screens that re-enter the same items.
2. **Statutory work lands in Design.** `permits` and `inspections` move out of "Office"/floating into the Consultancy head (or PM Site, for site inspections) where they belong to the stage.
3. **Tenders & Construction leave the global "Office" group** for the PM head; Practice keeps only the read-only **portfolio** rollup.
4. **Expenses: one editor, one rollup.** Read-write in the project; Accounts is the cross-project summary — not two editable copies.
5. **Directory vs engagement.** `consultants`/`contractors` are master **directories** under People; the project shows the engagement, linking back.
6. **Collaboration is contextual, not navigational.** `comments`, `criticalNotes`, `activity` attach to records and timelines, not a sidebar item.
7. **Reference vs instance.** Knowledge holds the rate/spec *banks* (`dsr`, analysed-rate library, `specCatalog`); projects hold the *applied* result (BOQ, `spec` sheets).
8. **Portals are one project, scoped.** Client, consultant and contractor portals are the same project data filtered by role — not separate modules.
