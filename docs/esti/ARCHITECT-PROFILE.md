# ESTI Architect Practice Profile

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-07

Developed by **Holagundi Consulting Works (HCW)**. This profile turns ESTI into
practice-management software for Indian freelance and small architect offices.
It is the primary ESTI product profile — see [Product Vision](PRODUCT-VISION.md) —
and runs on the greenfield TypeScript backend + Carbon React SPA + Python worker
described in [System Architecture](ARCHITECTURE.md). It adapts the HCW Architect
Platform technical documentation and viewer addendum to ESTI (`hcw` → `esti`).

## Primary Users (four access tiers, all enforced in the backend)

- **Owner (principal architect)** — full office access.
- **Internal staff** — a `CONSULTANT`-role user **not** linked to a consultant
  record; full office access (intended for office employees).
- **Collaborating consultant** — a `CONSULTANT`-role user **linked to a
  consultant record**; a project-scoped read-only portal limited to the projects
  they are engaged on (no other projects, no office endpoints).
- **Client** — a `CLIENT`-role user scoped to one client record; a read-only
  portal for their own projects (status, issued invoices, sent approvals, ready
  drawings).

Office endpoints are staff-only; portal users (client / collaborator) are
rejected from them — see [ARCHITECTURE](ARCHITECTURE.md) ADR-04.

## Module Map (as built)

All modules are ESTI-native (TypeScript backend + PostgreSQL); the Python worker
handles DXF takeoff, PDF rendering and statement imports.

| Domain | ESTI module(s) | Tables |
|---|---|---|
| Clients & communication | client register + communication timeline | `esti_client`, `esti_clientlog` |
| Projects & phases | project office + COA 8-stage phases | `esti_projectoffice`, `esti_phase` |
| Fee proposals (COA) | COA benchmark + below-min guardrail + PDF | `esti_feeproposal` |
| Invoicing (GST/TDS) | GST/TDS invoice + DRAFT→ISSUED→PAID + PDF | `esti_invoice` |
| Permits & compliance | statutory permit tracker | `esti_permit` |
| Bylaws (DCR) | development-control compliance params | `esti_bylaw` |
| Drawings & takeoff | register, ezdxf takeoff, viewer + measurement | `esti_drawing`, `esti_measurement` |
| Approvals & issues | issue/sign-off log + watermarked issue PDF | `esti_approval` |
| Consultants | register + per-project engagements (fee/balance) | `esti_consultant`, `esti_engagement` |
| Reconciliation | bank-statement import → match → settle | `esti_reconcile` |
| Collaboration & portals | client portal · consultant portal · alerts | `esti_user` (`client_id`/`consultant_id`), notifications (aggregation) |
| Team & HR (optional) | staff, site-incharge, leaves, payroll + slip PDF | `esti_teammember`, `esti_assignment`, `esti_leave`, `esti_payslip` |
| Office settings | feature toggle (HR module) | `esti_orgsettings` |
| Dashboard | office-health KPIs (+ HR tile when enabled) | — |
| Platform | auth, sessions, audit, per-FY numbering | `esti_user`, `esti_session`, `esti_audit`, `esti_sequence` |

The render-PDF worker produces four document types from one dispatch table —
**GST invoice, salary slip, fee proposal, and a watermarked drawing issue set** —
with an optional watermark applicable to any of them.

## Project Phases

Phases follow the **COA Conditions of Engagement** stages (editable per project),
stored in `esti_phase` linked to `esti_projectoffice` projects. Each phase carries
status, planned/actual dates, a billing percentage, and a linked invoice. The
cumulative payment schedule is in [INDIA-PROFILE](INDIA-PROFILE.md).

| Code | COA stage | Per-stage billing % |
|---|---|---|
| `BRIEF` | Client's brief (retainer) | 5 |
| `CONCEPT` | Concept design | 5 |
| `PRELIMINARY` | Preliminary design & estimate | 10 |
| `APPROVALS` | Drawings for statutory approvals | 15 |
| `WORKING_TENDER` | Working drawings & tender documents | 10 |
| `CONTRACTOR` | Appointment of contractors | 10 |
| `CONSTRUCTION` | Construction / site supervision | 35 |
| `COMPLETION` | Completion | 10 |

Rendered in the SPA as a Carbon `ProgressIndicator`. Project type taxonomy
(Residential / Commercial / Institutional / Site & Landscape / Interiors) and
jurisdiction tags (`BBMP`, `BDA`, `Panchayat`, `HMDA`, `CMDA`) drive which
permits and bylaw rules apply.

## Permit & Compliance (`esti_permit`)

Tracks statutory approvals per project with due-date alerts.

Permit types: BPAS (building plan approval), RERA, Fire NOC, Aviation NOC (AAI),
Environmental clearance (KSPCB/MoEFCC), Heritage NOC, Occupancy Certificate (OC),
Completion Certificate (CC), BESCOM, BWSSB — each with its applicable
authorities. Status lifecycle: `NOT_STARTED → SUBMITTED → UNDER_REVIEW →
APPROVED / REJECTED / EXPIRED`.

Due-date alerts surface on the dashboard and permit list: red = overdue, yellow =
due within 14 days, blue = upcoming (15–30 days).

A Karnataka **bylaw quick-reference library** (`esti_bylaw`) seeds FAR,
setbacks, height limits, and zone rules by authority. Selecting a project's
jurisdiction auto-populates the applicable reference panel.

BPAS/AutoPlan portal integration (status polling) is a later phase; Phase 1 is
manual status entry with a link to the portal application.

## Drawing & Document Vault (`esti_drawing`)

Revision-controlled drawing register on ESTI object storage (content-addressed,
write-once).

- HCW drawing numbering: discipline prefix `A-`/`S-`/`M-`/`E-`/`L-`/`I-` + number
  (e.g. `A-101`, `S-001`), enforced by a Zod schema in the SPA.
- Revision codes `A→B→C` (or `P1→P2` for permit sets); issue purpose
  CLIENT / CONTRACTOR / AUTHORITY / INTERNAL.
- Each issue creates an approval record (`esti_approval`) tracking what was
  sent, when, via which channel (email / WhatsApp / portal), and the sign-off
  status (PENDING / APPROVED / REJECTED / SUPERSEDED).
- Watermarked download for client/authority sets ("FOR APPROVAL" / "NOT FOR
  CONSTRUCTION") — applied via the viewer/PDF service.

## COA Fee Proposals (`esti_feeproposal` + COA)

Fee proposals benchmark against the **COA scale of charges** (encoded in
`@esti/contracts` `coa.ts`; rates and rules in [INDIA-PROFILE](INDIA-PROFILE.md)):

- The COA minimum is computed from **work category × cost of works**
  (construction cost, excluding land); the SPA shows "Quoted at X% of the COA
  minimum".
- A quote **below the COA minimum** raises a compliance warning with an audited
  override + reason — not a hard block.
- **Documentation & Communication @ 10%** of the professional fee is a
  first-class proposal/invoice line; optional **1% contractor-verification** and
  advisory day-rate lines are supported.
- Reimbursable expenses are itemised separately from the % fee; client-borne
  items (topo survey, soil tests) are tracked as scope notes.
- Lifecycle: draft → internal review → client submission → revised → approved
  (locked); revisions create new versions with full audit history.

## Fee & Invoicing — GST / TDS (`esti_invoiceindia`)

Phase-linked invoicing under the firm's single active GST system — Not
applicable / Composition 5% (bill of supply) / Regular 18% — with the fixed
rules, SAC table (998321–998339), thresholds, and TDS defined in
[INDIA-PROFILE](INDIA-PROFILE.md).

- ESTI-native invoices (gap-free per-FY numbering, GST/TDS detail in
  `esti_gst_detail`); the Python worker renders the GST tax-invoice /
  bill-of-supply PDF via WeasyPrint.
- TDS u/s 194J (10%) tracked per invoice; 26AS/AIS reconciliation via the
  reconcile module.

## Consultants & Engagements (`esti_consultant` + `esti_engagement`)

Office-wide consultant register (discipline: structural, MEP, electrical,
plumbing, HVAC, landscape, interior, survey, soil/geotech, PMC) plus per-project
**engagements** that track agreed fee, payments recorded, running balance, and
engagement status (engaged / completed / cancelled). The owner can provision a
**project-scoped collaborator login** for a consultant (`consultants.createLogin`):
a `CONSULTANT`-role user linked to the consultant record, who then sees only
their engaged projects (see [ARCHITECTURE](ARCHITECTURE.md) ADR-04).

## Reconciliation (`esti_reconcile`)

Closes the loop between invoices, receipts, and statutory deductions:

- **Payments / receipts:** match invoices to receipts and bank-statement imports
  by UTR / amount / date; flag unmatched.
- **TDS:** expected TDS per invoice vs **Form 26AS / AIS** import; flag
  mismatches for year-end.
- **GST output:** invoices issued vs the period return — **GSTR-1** (Regular) or
  **CMP-08 / GSTR-4** (Composition).

See [INDIA-PROFILE](INDIA-PROFILE.md) for the tax rules these reconcile against.

## Portals & Alerts

- **Client portal** — a separate role-based shell (no office sidebar) for
  `CLIENT`-role users, showing only their projects' status, stages, issued
  invoices, sent approvals, and ready drawings. The owner provisions logins via
  `clients.createPortalUser`.
- **Consultant portal** — the same pattern for collaborator logins, scoped to
  the consultant's engaged projects (status, stages, ready drawings, and their
  own engagement balance).
- **Alerts** — a staff Alerts surface (with a nav count badge) aggregates stale
  client decisions (sent approvals unanswered > 7 days), due/overdue client-log
  follow-ups, and overdue statutory permits, each linked to its project.

## Drawing Viewer & Takeoff (`esti_drawing` + `esti_measurement`)

The signature architect-profile feature: measure on a drawing and collect the
quantities into a per-project takeoff.

### Flow (as built)

```
Upload DXF  → worker (ezdxf) renders SVG + extracts layers/bounds, content-
              addressed in object storage; row goes READY
  → "View / measure" opens the drawing: the backend proxies the SVG same-origin;
     the SPA overlays a transparent <svg> sharing the same viewBox
  → Calibrate: draw a line over a known dimension, enter its real length + unit
     → scale (real units per viewBox unit) saved on the drawing (drawings.setScale)
  → Measure: draw a line → length = viewBox-distance x scale; label and save
     (esti_measurement) — clicks map via getScreenCTM, so it is resolution-
     independent
  → measurements roll up into the project's "Measured quantities (takeoff)" table
```

- Linear two-point distance is delivered; polygon area and count tools are later.
- Calibration is persisted per drawing (`esti_drawing.scale_units_per_vb` +
  `scale_unit`); a drawing need not be recalibrated on reopen.
- A watermarked **drawing issue PDF** (landscape, embedded SVG + title block) is
  produced by the render-PDF worker for client/authority issue sets.

## Team & HR (optional module — `esti_orgsettings.hrEnabled`)

Off by default so a solo freelancer never sees it; a studio owner toggles it on
from **Settings**. Write paths are guarded server-side (not just hidden) — HR
mutations are rejected while the module is off.

- `esti_teammember` — office staff register: role/designation, employment type,
  monthly salary, active flag.
- `esti_assignment` — per-project staff assignment, including the **site
  in-charge** role.
- `esti_leave` — leave requests (casual / sick / earned / unpaid / comp-off),
  owner approve/reject.
- `esti_payslip` — monthly payroll, one per member per month (unique), net of
  deductions, mark-paid, and a **salary-slip PDF** via the render-PDF worker.

When enabled, the dashboard gains a Team & HR tile (headcount, pending leaves,
unpaid payslips).

## Schema (as built — `esti_*` tables)

Single-firm: no `fk_firm` column (see [ARCHITECTURE](ARCHITECTURE.md) ADR-03).

- **Platform** — `esti_user` (+ `client_id` / `consultant_id` for portal
  scoping), `esti_session`, `esti_orgsettings`, `esti_audit`, `esti_sequence`.
- **Clients** — `esti_client`, `esti_clientlog`.
- **Projects** — `esti_projectoffice`, `esti_phase`.
- **Money** — `esti_feeproposal`, `esti_invoice` (GST/TDS snapshot + PDF status).
- **Compliance** — `esti_permit`, `esti_bylaw`.
- **Drawings** — `esti_drawing` (svg key, layers/bounds, scale, issue-PDF),
  `esti_measurement` (takeoff lines).
- **Approvals** — `esti_approval` (issue/sign-off + supersede chain).
- **Consultants** — `esti_consultant`, `esti_engagement`.
- **Reconcile** — `esti_reconcile` (batch + matched lines).
- **Team & HR (optional)** — `esti_teammember`, `esti_assignment`, `esti_leave`,
  `esti_payslip`.

These are ESTI **TypeScript service** modules with `esti_*` tables (see
[ARCHITECTURE](ARCHITECTURE.md) ADR-01).

## Business Health Dashboard

Read-only aggregation (Carbon `Tile` KPI cards):

- KPIs: projects by status + contract value; invoiced / outstanding (net of TDS)
  / collected; permits open + overdue; fee proposals below COA minimum.
- Team & HR tile (only when the HR module is enabled): headcount, pending
  leaves, unpaid payslips.
- The standalone **Alerts** surface carries the priority nudges (stale client
  decisions, due follow-ups, overdue permits).

## Build Order (delivered)

All phases below are implemented and verified against the running pod; see the
[ROADMAP](ROADMAP.md) for per-phase status.

1. Project office + phase model and COA fee proposal workflow.
2. Fee & invoicing GST/TDS layer (+ lifecycle, PDFs).
3. Permit tracker + bylaw (DCR) compliance.
4. Drawings: register, ezdxf takeoff, viewer + calibrated measurement, issue PDF.
5. Consultants + client portal + consultant portal + alerts.
6. Reconciliation (bank-statement import → match → settle).
7. Optional Team & HR (staff, site-incharge, leaves, payroll).
8. Office dashboard.
