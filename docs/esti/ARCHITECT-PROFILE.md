# ESTI Architect Practice Profile

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-06

Developed by **Holagundi Consulting Works (HCW)**. This profile turns ESTI into
practice-management software for Indian freelance and small architect offices.
It is the primary ESTI product profile — see [Product Vision](PRODUCT-VISION.md) —
and runs on the greenfield TypeScript backend + Carbon React SPA + Python worker
described in [System Architecture](ARCHITECTURE.md). It adapts the HCW Architect
Platform technical documentation and viewer addendum to ESTI (`hcw` → `esti`).

## Primary Users

- **Principal architect (HCW)** — full access.
- **Collaborating consultants** (structural, MEP, interior) — project-scoped,
  no fee/invoice visibility.
- **Clients** — read-only portal for drawings, invoices, and approvals.

## Module Map (HCW design → ESTI modules)

All modules are ESTI-native (TypeScript backend + PostgreSQL); the Python worker
handles DXF/PDF/imports.

| HCW design module | ESTI module | New tables |
|---|---|---|
| Fee Proposal | `esti_feeproposal` (+ COA calc) | `esti_feeproposal_revision` |
| Project Management (phases) | `esti_projectoffice` + phases | `esti_phase` |
| Client & Communication | `esti_clientlog` | `esti_client`, `esti_approval` |
| Fee & Invoicing | `esti_invoiceindia` (GST/TDS) | `esti_invoice`, `esti_gst_detail` |
| Permit & Compliance | `esti_permit` | `esti_permit`, `esti_bylaw` |
| Drawing & Document Vault | `esti_drawing` (object storage) | `esti_drawing_revision` |
| Collaborators & Consultants | `esti_collaborator` | `esti_collaborator` |
| Drawing takeoff | `esti_takeoff` + Python worker | `esti_takeoff_item`, `esti_drawing_scale` |
| Reconciliation | `esti_reconcile` (+ pandas imports) | `esti_reconcile_*` |
| Business Health Dashboard | dashboard (aggregation) | — |

## Project Phases

Standard HCW phase sequence (editable per project), stored in `esti_phase`
linked to `esti_projectoffice` projects. Each phase carries status, planned/actual
dates, a billing percentage, and a linked invoice.

| Code | Phase | Typical billing % |
|---|---|---|
| `CONCEPT` | Concept design | 10 |
| `SD` | Schematic design | 10 |
| `DD` | Design development | 15 |
| `WD` | Working drawings | 25 |
| `PERMIT` | Permit drawings & submission | 15 |
| `TENDER` | Tender documents | 10 |
| `EXECUTION` | Construction administration | 10 |
| `COMPLETION` | As-built & completion | 5 |

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

The architect profile uses an architect-specific fee proposal workflow with a
COA scale-of-charges calculator. The SPA shows the proposed fee against the
Council of Architecture benchmark (e.g. "Billing at 87% of COA scale"). COA
rates are user-editable in Settings (the published scale is dated and may be
revised), held in `src/constants/coaRates.ts` as effective-dated data with a
Settings override.

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

## Consultants & Collaborators (`esti_collaborator`)

Per-project consultant register: discipline (structural, MEP, electrical,
plumbing, fire, landscape, interior, geotechnical, acoustic, facade, legal,
survey), agreed fee, payments made, running balance, and scope notes.
Collaborators are invited as ESTI `consultant`-role users, row-scoped to their
assigned project (see [ARCHITECTURE](ARCHITECTURE.md) ADR-04).

## Reconciliation (`esti_reconcile`)

Closes the loop between invoices, receipts, and statutory deductions:

- **Payments / receipts:** match invoices to receipts and bank-statement imports
  by UTR / amount / date; flag unmatched.
- **TDS:** expected TDS per invoice vs **Form 26AS / AIS** import; flag
  mismatches for year-end.
- **GST output:** invoices issued vs the period return — **GSTR-1** (Regular) or
  **CMP-08 / GSTR-4** (Composition).

See [INDIA-PROFILE](INDIA-PROFILE.md) for the tax rules these reconcile against.

## Client Portal

A separate SPA route (`/portal`, no sidebar) for `client`-role users showing only
their projects' drawings, invoices, and approvals.

## Drawing Takeoff (`esti_takeoff` + viewer service)

The signature architect-profile feature: measure on a drawing and push the
measurement straight into a BOQ / fee proposal line.

### Flow

```
Upload DXF (or PDF) in EstimationDetail
  → viewer service returns SVG + bounds (DXF) or pdf.js renders PNG (PDF)
  → scale set: auto from DXF INSUNITS=6 (metres, HCW-TOOLS standard) or
    manual two-point calibration → pixels-per-metre (ppm) stored per file hash
  → user clicks two points → MeasureTool returns real-world metres
  → user labels it ("Room 2 – north wall") and confirms a rate
  → measurement saved to esti_takeoff_item and pushed as a fee-proposal/BOQ
    line in one transactional backend call
```

- Linear two-point distance is Phase 1; polygon area and count tools are Phase 2.
- Scale calibration is persisted per drawing file hash (`esti_drawing_scale`)
  so a drawing need not be recalibrated on reopen.
- Layout: Carbon `Grid` 8/4 split — drawing viewer left, BOQ DataTable right; on
  small screens, "Drawing" / "BOQ" tabs.

The viewer service, scale engine, MeasureTool, and component breakdown are in
[System Architecture](ARCHITECTURE.md).

## New Tables (ESTI naming)

Tables use the `esti_*` prefix. ESTI is single-firm: `entity` is fixed to
`1` and there is no `fk_firm` column (see [ARCHITECTURE](ARCHITECTURE.md) ADR-03):

- `esti_phase` — design phases on a project (code, status, dates, billing %).
- `esti_feeproposal_revision` — fee proposal version, scope, exclusions,
  deliverables, COA benchmark, approval state, and client-facing notes.
- `esti_permit` — statutory approval tracking (type, authority, dates,
  linked document).
- `esti_bylaw` — Karnataka bylaw quick-reference (FAR, setbacks, height).
- `esti_drawing_revision` — drawing register + revision control.
- `esti_approval` — issue/sign-off log per drawing or fee proposal.
- `esti_collaborator` — consultant assignment, fee, payments.
- `esti_gst_detail` — GST/TDS detail per invoice (SAC, CGST/SGST/IGST, TDS,
  financial year), stored natively (no Dolibarr tax fields).
- `esti_takeoff_item` — measurement pushed to a fee/BOQ line.
- `esti_drawing_scale` — per-drawing scale calibration.
- `esti_reconcile_payment`, `esti_reconcile_tds`,
  `esti_reconcile_gst` — reconciliation runs and matches.
- `esti_audit`, `esti_sequence` — append-only audit log and per-FY
  numbering sequences (see [ARCHITECTURE](ARCHITECTURE.md) ADR-06, ADR-11).

These are built as ESTI **TypeScript service** modules with `esti_*` tables,
not Dolibarr PHP modules (see [ARCHITECTURE](ARCHITECTURE.md) ADR-01).

## Business Health Dashboard

Read-only aggregation (Carbon `Tile` KPI cards + `@carbon/charts-react`):

- KPIs: active projects, outstanding receivables, invoiced this FY, TDS pending
  reconciliation, permits due in 30 days, drawings issued this month.
- Charts: fee pipeline (invoiced vs received vs outstanding), project-stage
  distribution, permit-status breakdown.
- Priority alerts: overdue permits, invoices unpaid > 30 days, stale projects,
  TDS certificates not yet received.

## Build Order (architect profile)

1. Project office + phase model and COA fee proposal workflow.
2. Fee & invoicing GST/TDS layer.
3. Permit tracker with due-date alerts + bylaw reference.
4. Drawing vault + revision/approval log.
5. Drawing takeoff (viewer service + DXF/PDF + two-point measure → BOQ).
6. Consultants + client portal.
7. Reconciliation (payments, TDS/26AS, GST output).
7. Business health dashboard.
