---
title: Management — operational framework
slug: management
excerpt: How an architecture consultancy runs on AORMS — finance, billing, HR, licensing, team performance, and the operational spine.
order: 1
section: Overview
domain: management
updated: 2026-07-10
---

**Management** in AORMS means how the **consultancy office runs** — not client construction delivery. The platform provides an **operational framework** (process, audit trails, review chains) and a **design framework** (engagement models, deliverable templates) on one spine.

For AORMS-Studio, management modules include:

## Finance & compliance

| Module | Route | Purpose |
| --- | --- | --- |
| **Proposals** | `/office/proposals` | COA fee proposals and scope agreements |
| **Invoices** | `/finance/invoices` | GST invoicing, SAC codes, FY-sequential numbering |
| **Reconciliation** | `/finance/reconcile` | Bank, 26AS, AIS, GSTR imports |
| **Filing** | `/finance/filing` | GST/TDS filing abstracts |
| **Office expenses** | `/finance/expenses` | Project and office costing |
| **Cash book** | `/finance/cash-book` | Office cash movements |
| **Payroll** | `/finance/payroll` | Payslips (HR-gated) |

See [Finance and billing](finance-and-billing) for step-by-step guides.

## People & performance

| Module | Route | Purpose |
| --- | --- | --- |
| **Team** | `/team` | Roster, assignments, workload |
| **HR** | `/hr` | Leaves, payroll inputs (hr:manage) |
| **Performance** | `/performance` | ASPRF composite scores |
| **Attendance** | (per-person records) | Daily attendance and time attribution |

**ASPRF** weights: Reliability 30%, Quality 25%, Client Impact 15%, Collaboration 15%, Learning 10%, Wellbeing 5% (opt-in).

## Administration

| Topic | Guide |
| --- | --- |
| Licence & storage metering | [Account and licence](account-and-licence) |
| Users & roles | Firm admin → Users (`firm:admin`) |
| Audit log | Admin → Audit (`reports:view`) |
| Company profile | Firm → Company |

## Third parties

- **Clients** — CRM and client log (`/clients`)
- **Consultants** — engagements and collaborator portal
- **Vendors** — placeholder directory

## Operational principles

1. **Money in paise** — all amounts integer; display with `formatINR`
2. **Immutable audit** — activity and audit namespaces for traceability
3. **Capabilities** — `can(role, capability)` gates procedures; not ad-hoc UI hides
4. **India profile** — April–March FY, GST rates, SAC codes from public `profile` namespace

## Platform vs workspace

| Layer | Management scope |
| --- | --- |
| **AORMS platform** | Frameworks, EmOI governance, multi-vertical roadmap |
| **AORMS-Studio** | Indian consultancy finance, HR, team, and office modules listed above |

## Frequently asked questions

### Is there a Lite or Pro tier?

No. One **AORMS Standard** licence — full workspace, unlimited users, 5 GB included storage. Legacy tier names are retired.

### Where is project management?

Engagement delivery lives on the **project record** (phases, drawings, revisions) — see [AORMS-Studio](aorms-studio). AORMS is not a construction PM tool.

### Who can see financial reports?

Capability-gated — typically principals and finance roles. See `packages/contracts/src/permissions.ts` for the canonical matrix.
