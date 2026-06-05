# ESTI Architect Practice Profile

Developed by **Holagundi Consulting Works (HCW)**. This profile turns ESTI into
practice-management software for Indian freelance and small architect offices.
It is the primary ESTI product profile — see [AEC Platform](AEC-PLATFORM.md) —
and runs on the API-only backend + Carbon React SPA described in
[SPA Architecture](SPA-ARCHITECTURE.md). It adapts the HCW Architect Platform
technical documentation and viewer addendum to ESTI naming (`hcw` → `esti`).

## Primary Users

- **Principal architect (HCW)** — full access.
- **Collaborating consultants** (structural, MEP, interior) — project-scoped,
  no fee/invoice visibility.
- **Clients** — read-only portal for drawings, invoices, and approvals.

## Module Map (HCW design → ESTI modules)

| HCW module | ESTI module | Dolibarr / ESTI base | New tables |
|---|---|---|---|
| Fee Proposal | `esti_feeproposal` (+ COA calc) | ESTI / Dolibarr proposal base | `llx_esti_feeproposal_revision` |
| Project Management (phases) | `esti_projectoffice` + phases | ESTI | `llx_esti_phase` |
| Client & Communication | `esti_client` (societe + actioncomm) | `societe` | `llx_esti_approval` |
| Fee & Invoicing | `esti_invoice` (GST/TDS) | `facture` | `llx_esti_gst_detail` |
| Permit & Compliance | `esti_permit` | new | `llx_esti_permit`, `llx_esti_bylaw` |
| Drawing & Document Vault | `esti_drawing` | `ecm` | `llx_esti_drawing_revision` |
| Collaborators & Consultants | `esti_collaborator` | `user` | `llx_esti_collaborator` |
| Drawing takeoff | `esti_takeoff` + viewer service | new | `llx_esti_takeoff_item`, `llx_esti_drawing_scale` |
| Business Health Dashboard | dashboard (aggregation) | all of the above | — |

## Project Phases

Standard HCW phase sequence (editable per project), stored in `llx_esti_phase`
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

A Karnataka **bylaw quick-reference library** (`llx_esti_bylaw`) seeds FAR,
setbacks, height limits, and zone rules by authority. Selecting a project's
jurisdiction auto-populates the applicable reference panel.

BPAS/AutoPlan portal integration (status polling) is a later phase; Phase 1 is
manual status entry with a link to the portal application.

## Drawing & Document Vault (`esti_drawing`)

Revision-controlled drawing register on top of Dolibarr ECM file storage.

- HCW drawing numbering: discipline prefix `A-`/`S-`/`M-`/`E-`/`L-`/`I-` + number
  (e.g. `A-101`, `S-001`), enforced by a Zod schema in the SPA.
- Revision codes `A→B→C` (or `P1→P2` for permit sets); issue purpose
  CLIENT / CONTRACTOR / AUTHORITY / INTERNAL.
- Each issue creates an approval record (`llx_esti_approval`) tracking what was
  sent, when, via which channel (email / WhatsApp / portal), and the sign-off
  status (PENDING / APPROVED / REJECTED / SUPERSEDED).
- Watermarked download for client/authority sets ("FOR APPROVAL" / "NOT FOR
  CONSTRUCTION") — applied via the viewer/PDF service.

## COA Fee Proposals (`esti_feeproposal` + COA)

The architect profile uses an architect-specific fee proposal workflow with a
COA scale-of-charges calculator. The SPA shows the proposed fee against the
Council of Architecture benchmark (e.g. "Billing at 87% of COA scale"). COA
rates are user-editable in Settings (the published scale is dated and may be
revised), held in `src/constants/coaRates.js` with a Settings override.

## Fee & Invoicing — GST / TDS (`esti_invoice`)

Stage-wise (phase-linked) invoicing with the India tax layer:

- GST: intra-state Karnataka CGST 9% + SGST 9%; inter-state IGST 18%; SAC
  `998311` (architectural services). GSTR-1 CSV export.
- TDS u/s 194J: 10% on professional fees, tracked per invoice for year-end Form
  26AS reconciliation; CSV export of TDS receivables.
- Detail stored in `llx_esti_gst_detail` linked to `facture`.

## Consultants & Collaborators (`esti_collaborator`)

Per-project consultant register: discipline (structural, MEP, electrical,
plumbing, fire, landscape, interior, geotechnical, acoustic, facade, legal,
survey), agreed fee, payments made, running balance, and scope notes.
Collaborators can be invited as Dolibarr `consultant`-role users limited to their
assigned project's drawing folder.

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
  → measurement saved to llx_esti_takeoff_item and pushed as a line into the
    estimate / BOQ (and the Dolibarr proposal line if applicable)
```

- Linear two-point distance is Phase 1; polygon area and count tools are Phase 2.
- Scale calibration is persisted per drawing file hash (`llx_esti_drawing_scale`)
  so a drawing need not be recalibrated on reopen.
- Layout: Carbon `Grid` 8/4 split — drawing viewer left, BOQ DataTable right; on
  small screens, "Drawing" / "BOQ" tabs.

The viewer service, scale engine, MeasureTool, and component breakdown are in
[SPA Architecture](SPA-ARCHITECTURE.md).

## New Tables (ESTI naming)

Tables use the `llx_esti_*` prefix (HCW `llx_hcw_*` renamed). Each carries
`entity` for multi-company compatibility and an optional `fk_firm` reserved for
future multi-firm SaaS:

- `llx_esti_phase` — design phases on a project (code, status, dates, billing %).
- `llx_esti_feeproposal_revision` — fee proposal version, scope, exclusions,
  deliverables, COA benchmark, approval state, and client-facing notes.
- `llx_esti_permit` — statutory approval tracking (type, authority, dates,
  linked document).
- `llx_esti_bylaw` — Karnataka bylaw quick-reference (FAR, setbacks, height).
- `llx_esti_drawing_revision` — drawing register + revision control.
- `llx_esti_approval` — issue/sign-off log per drawing or fee proposal.
- `llx_esti_collaborator` — consultant assignment, fee, payments.
- `llx_esti_gst_detail` — GST/TDS detail per invoice (HSN/SAC, CGST/SGST/IGST,
  TDS, financial year).
- `llx_esti_takeoff_item` — measurement pushed to a BOQ line.
- `llx_esti_drawing_scale` — per-drawing scale calibration.

Full column definitions follow the HCW technical documentation, renamed to ESTI
conventions and built as Dolibarr-native `esti_*` modules.

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
7. Business health dashboard.
