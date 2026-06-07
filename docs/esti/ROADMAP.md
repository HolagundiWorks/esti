# ESTI Architect Platform Roadmap

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-07

> _Part of the [ESTI documentation set](README.md). This is the **forward
> product build** plan; for what the modules are, see the
> [Module Map](ARCHITECT-PROFILE.md)._

This roadmap is the public ESTI direction — an Indian architecture office
management system (AORMS) developed by **Holagundi Consulting Works (HCW)**.

Operational links for source, releases, updates, issues, and documentation point
to:

```text
https://github.com/HolagundiWorks/esti
```

## Delivered to date (build status)

The greenfield stack is live end-to-end in the Podman pod (TS/Fastify + tRPC
backend, Carbon React SPA, Python worker, PostgreSQL + Redis + MinIO). Every
module below is verified against the running system.

| Area | Module(s) | State |
| --- | --- | --- |
| Foundation | auth (owner/consultant/client), money/GST/TDS, per-FY numbering, audit log, Redis job bus | ✅ |
| Office core | `esti_projectoffice`, `esti_phase` (COA 8-stage), `esti_clientlog`, `esti_feeproposal`, `esti_invoiceindia`, `esti_reconcile` | ✅ |
| Drawing & compliance | `esti_permit`, `esti_bylaw`, `esti_drawing`, `esti_approval` | ✅ (watermarked issue sets pending) |
| Viewer & takeoff | DXF→SVG + ezdxf layer/entity takeoff (worker) | ◐ canvas measurement overlay pending |
| Collaboration & portal | consultant register + engagements, read-only **client portal** (role-scoped) | ◐ consultant login pending |
| Optional **Team & HR** | settings toggle, `esti_teammember`, site-incharge, `esti_leave`, payroll | ✅ (off by default for freelancers) |
| Documents | invoice / payslip / fee-proposal **PDF** (WeasyPrint, one dispatch table) | ✅ |
| Office dashboard | project/fee/invoice/permit KPIs + HR tile (gated) | ✅ |
| Tooling | containerised dev pod, GitHub Actions CI (typecheck + tests), dev-seed | ✅ |

## 0. Foundation — Done

- Greenfield monorepo scaffolded: shared `contracts` (money, GST, FY, schemas),
  TypeScript backend (Fastify + tRPC + Drizzle/PostgreSQL), Python worker, and
  the Carbon React SPA.
- India profile locked and hardcoded — INR, FY Apr–Mar, COA Legal ID, the three
  GST systems, SAC table, and TDS (see [INDIA-PROFILE](INDIA-PROFILE.md)).
- Development pod runs every service in containers (see `DEVELOPMENT.md`).

## 1. Scope

ESTI is an architecture-office system, not a general ERP. First-release focus:
clients, projects, phases, fee proposals, invoices, permits, drawings,
consultants, client portal, reconciliation, and the office dashboard.

DSR/SOR rate reference and BOQ/quantity structures exist only to support
architect workflows (tender costing, drawing takeoff) — not as the product
centre. Labour teams, site stock, purchase orders, RA billing, and contractor
measurement books are out of scope.

## 2. Architecture Office Core — Done

Stand up the ESTI TypeScript service and the Carbon React SPA shell first, then
the backbone domain modules (all TypeScript service modules with `esti_*`
tables — see [ARCHITECTURE](ARCHITECTURE.md)).

0. **Backend service + SPA shell** — Fastify + tRPC + ORM + auth
   (owner / consultant / client), the money/tax utilities, per-FY numbering
   sequences, the append-only audit log, the PostgreSQL schema, and the Redis
   job bus to the Python worker.
1. `esti_projectoffice` — architecture project record, project type,
   jurisdiction, phase plan, client, owner, dates, and status.
2. `esti_phase` — Concept, SD, DD, WD, Permit, Tender, Execution, Completion,
   with status, planned/actual dates, billing percentage, and linked invoice.
3. `esti_clientlog` — enquiry, meeting notes, calls, decisions, approvals, and
   client communication timeline in ESTI-native client tables.
4. `esti_feeproposal` — scope, deliverables, exclusions, fee calculation, COA
   benchmark, revisions, approval state, and PDF output.
5. `esti_invoiceindia` — phase-linked invoices under the firm's GST system, SAC
   per [INDIA-PROFILE](INDIA-PROFILE.md), TDS u/s 194J, receipts, and exports.
6. `esti_reconcile` — payments/receipts, TDS vs 26AS/AIS, and GST-output
   reconciliation.

This phase should produce a usable app for one architect to track active
projects, fees, invoices, client decisions, and reconciliation. **Delivered** —
plus fee-proposal and GST-invoice PDFs, and an invoice DRAFT→ISSUED→PAID
lifecycle that feeds the dashboard and reconciliation settlement loop.

## 3. Drawing And Compliance Core — Done (issue sets pending)

1. `esti_permit` — statutory approval tracker for BPAS, RERA, Fire NOC,
   Aviation NOC, environmental clearance, OC, CC, and local authority workflows.
2. `esti_bylaw` — quick-reference library for authority, zone, FAR, setback,
   height, parking, and document checklist rules.
3. `esti_drawing` — drawing register with discipline, drawing number, title,
   revision, status, issue purpose, and linked stored document (object storage).
4. `esti_approval` — drawing/fee/submission approval log with sent date, channel,
   recipient, status, and superseded (revision) history. **Done** — a new
   revision auto-retires the one it supersedes.
5. Watermarked client/authority issue sets for drawings and PDFs. **Pending.**

This phase turns ESTI into the central record for drawing versions, statutory
submissions, and client approvals. Items 1–4 are delivered; only the watermarked
issue sets remain.

## 4. Viewer And Takeoff — In Progress

- Convert DXF to SVG server-side and cache by file hash. **Done** (Python worker,
  ezdxf; content-addressed in MinIO).
- Extract per-layer entity counts and model bounds. **Done** (automated takeoff
  written back to `esti_drawing`).
- Render PDFs for drawing/document review. **Done** (WeasyPrint worker).
- Carbon React drawing viewer with canvas measurement overlay. **Pending.**
- Per-drawing scale calibration + linear two-point measurement. **Pending.**
- Push measured quantities into BOQ / fee-support lines. **Pending.**

Area measurement, counting tools, snapping, and title-block metadata extraction
are later enhancements.

## 5. Collaboration And Portal — In Progress

- Consultant register with discipline, scope, agreed fee, payments, balance.
  **Done** (`esti_consultant` + per-project `esti_engagement` with payment →
  balance tracking).
- Client portal with read-only access to issued invoices, approvals, ready
  drawings, and project status. **Done** — owner provisions a CLIENT login
  scoped to one client; office endpoints are staff-only (OWNER/CONSULTANT).
- Project-scoped consultant collaborator login. **Pending.**
- Approval requests and notifications for stale client decisions or consultant
  deliverables. **Pending.**

## 5a. Team & HR — Done (optional module)

Off by default (single configurable office setting, `orgSettings.hrEnabled`) so a
solo freelancer never sees it; a studio owner toggles it on.

- `esti_teammember` — staff register (role, employment type, monthly salary,
  active).
- `esti_assignment` — per-project staff incl. the **site in-charge**.
- `esti_leave` — request → owner approve/reject.
- Payroll (`esti_payslip`) — one slip per member per month, net of deductions,
  mark-paid, and a salary-slip PDF.
- Dashboard Team & HR tile (headcount, pending leaves, unpaid payslips) shown
  only when enabled.

Write paths are guarded server-side: HR mutations are rejected while the module
is off, not merely hidden.

## 6. Carbon React UI — In Progress

- Standalone Carbon React SPA (Vite), type-unified with the backend via tRPC.
  **Done** — full Carbon stylesheet, global side nav (role- and feature-gated),
  Modal/Table/Tag/Toggle/FileUploader components throughout.
- Built workflows: dashboard, projects/phases, client log, fee proposals,
  invoices, permits, bylaws, drawings/takeoff, approvals, consultants,
  reconcile, team/HR, settings, and the client portal.
- Remaining: local side panel pattern, richer DataTable usage, and a drawing
  viewer surface (see Phase 4).

## 7. Release Hardening — In Progress

- GitHub Actions CI (typecheck + vitest for contracts/backend, ruff + pytest for
  the worker) on every push. **Done.**
- Validate create/edit/delete, permissions, and multi-entity behaviour for every
  module. **Ongoing** — each module is verified against the running pod at build
  time; automated coverage is being broadened.
- Unit coverage for money/GST/TDS, COA fee logic, and worker pure helpers.
  **Partial** (contracts + tax + worker helper tests in place).
- Re-enable repo-wide `eslint` in CI (flat-config wiring fix). **Pending.**
- Publish container metadata, release notes, security policy, and operator docs.
  **Pending.**

## Non-Goals For The First Architect Release

- General-purpose ERP functionality.
- Contractor RA billing, measurement book certification, labour team payroll,
  warehouse/site stock, purchase orders, GRN, or supplier bill operations.
- Global multi-country accounting or multi-currency.
- Theme marketplace or user-defined theme customization.
- Any general-purpose ERP, CRM, or commerce surface.
