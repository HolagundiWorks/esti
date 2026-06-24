# AORMS — Information Architecture (proposed)

> Status: **proposal for review.** Backend (tRPC namespaces, DB) is unchanged —
> this is a navigation / information-architecture map. The goal is one home per
> module, a clear flow, and a project surfaced under two delivery heads.

## The core idea: two delivery heads + shared practice

Every project moves through up to two **heads**, and the office wraps them with
shared **practice** functions that are not project-internal.

- **Consultancy** — design services on the COA/RIBA stages: brief → design →
  drawings → approvals → fees. This is what the firm *designs*.
- **Project Management (PMC)** — construction delivery: tenders → contractors →
  measurement → running bills → site. This is what the firm *administers on site*.
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
| **Practice** | Proposals pipeline, Fee proposals, Letters, Contracts, Document register, Office programme (portfolio Gantt), AI Studio |
| **Accounts** | Invoices, Reconciliation, Expenses & cash book, GST/TDS filing, Purchase orders |
| **People** | Team, HR, Performance, Consultants (directory), Contractors (directory) |
| **Knowledge** | DSR rates, Bylaw / RIE compliance, Spec catalogue, SteelFlow BBS reference |
| **Admin** | Company, Users, Audit log, System, My profile |

## The project workspace — two heads

**Shared header** (always visible): Overview · Project Info · Programme · Settings

### Consultancy head — design delivery
- Client log
- Design & drawings — drawings, transmittals, approvals
- Decisions & revisions — revision intelligence (source / category)
- BOQ & estimation — takeoff → estimate → BBS *(quantities flow from drawings)*
- Documents
- Fee & billing — fee proposal, consultancy invoices
- Team · Comments · Lessons

### Project Management head — construction delivery *(when PMC enabled)*
- PMC control — programme of works, progress reports
- Tenders & contractors — tender → bids → award *(prices the Consultancy BOQ)*
- Running bills — measurement → contractor → office → bill (RA bills)
- Site — snags, site instructions, inspections, progress
- Purchase orders
- Specification sheets

## What this fixes (current → proposed)

| Scattered today | Move to |
|---|---|
| Estimates / BBS under project **PMC › Costing** | **Consultancy › BOQ & estimation** (design output); Tenders/Costing *reference* it |
| **Programme** as top-level nav *and* project Info tab | Per-project Programme stays in the project; top-level becomes a read-only **portfolio** Gantt under Practice |
| **PMC** as top-level nav *and* project group | Project Management is a **project head**; the nav item becomes the PMC **portfolio** rollup |
| **Tenders**, **Construction** under nav "Office" | **Project Management head** (per project) + a Practice rollup |
| **Expenses** in project Costing *and* nav Accounting | One home: **Accounts** (filterable by project); project shows a read-only summary that links there |
| **Spec sheets** (project) vs **Spec catalogue** (Knowledge) | Keep both, labelled: catalogue = reference (Knowledge), sheets = instance (project) |
| **Consultants / Contractors** under People *and* as engagements | Directory = **People** (master); project shows the **engagement** linking back |

## Principles

1. **One home per module.** If something must appear in two places, one is the
   master (editable) and the other is a read-only summary that links to it.
2. **Project = two heads.** Consultancy and Project Management never mix items.
3. **Practice wraps projects.** Clients, Accounts, People, Knowledge, Admin are
   office-wide, reached from the global nav, not from inside a project.
4. **Flow, not a flat list.** Brief → design → approvals → BOQ → tender → site →
   bills, with each step owned by one head.
