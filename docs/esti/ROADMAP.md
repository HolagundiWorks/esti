# ESTI Architect Platform Roadmap

**Status:** Current · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-06

> _Part of the [ESTI documentation set](README.md). This is the **forward
> product build** plan. For the Dolibarr→ESTI fork-migration phases, see
> [MIGRATION-ROADMAP](MIGRATION-ROADMAP.md); for what the modules are, see the
> [Module Map](ARCHITECT-PROFILE.md)._

This roadmap is the public ESTI direction after the product pivot to an Indian
architecture office management platform developed by **Holagundi Consulting
Works (HCW)**.

Operational links for source, releases, updates, issues, and documentation point
to:

```text
https://github.com/HolagundiWorks/esti
```

## 0. Fork Foundation — Done

The Dolibarr→ESTI fork strip-down, product identity, India baseline, and GST
profile are complete. That work and its remaining backend-strip and
fork-release tasks are tracked in [MIGRATION-ROADMAP](MIGRATION-ROADMAP.md) and
are not restated here. From this point on, this document covers only the forward
product build.

## 1. Product Pivot — Current

ESTI is no longer being shaped as a contractor ERP. It is now the ESTI Architect
Platform: practice management software for Indian freelance architects and small
architecture offices.

Immediate documentation and product decisions:

- Update all ESTI docs to identify Holagundi Consulting Works as the developer.
- Reframe construction modules as supporting services, not the main product.
- Prioritize architect workflows: clients, projects, phases, fees, invoices,
  permits, drawings, consultants, client portal, and office dashboard.
- Keep `esti_dsrsor` (DSR/SOR library) as the surviving reference/costing
  engine. The earlier contractor BOQ/estimate modules were removed in the pivot;
  a lighter BOQ/quantity structure is reintroduced only when `esti_takeoff`
  needs a push target (see Phase 4), recoverable from git history if reused.
- Remove first-release plans for labour teams, site stock, purchase orders,
  RA billing, and contractor measurement book.

## 2. Architecture Office Core — Next Build

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
projects, fees, invoices, client decisions, and reconciliation.

## 3. Drawing And Compliance Core — Planned

1. `esti_permit` — statutory approval tracker for BPAS, RERA, Fire NOC,
   Aviation NOC, environmental clearance, OC, CC, and local authority workflows.
2. `esti_bylaw` — quick-reference library for authority, zone, FAR, setback,
   height, parking, and document checklist rules.
3. `esti_drawing` — drawing register with discipline, drawing number, title,
   revision, status, issue purpose, and linked stored document (object storage).
4. `esti_approval` — drawing/fee/submission approval log with sent date, channel,
   recipient, status, and superseded history.
5. Watermarked client/authority issue sets for drawings and PDFs.

This phase turns ESTI into the central record for drawing versions, statutory
submissions, and client approvals.

## 4. Viewer And Takeoff — Planned

- Add the Node.js viewer service inside the Podman pod.
- Convert DXF to SVG server-side and cache by file hash.
- Render PDFs for drawing review.
- Add Carbon React drawing viewer with canvas measurement overlay.
- Store per-drawing scale calibration.
- Support Phase 1 linear two-point measurement.
- Push measured quantities into BOQ / fee-support lines.

Area measurement, counting tools, snapping, and title-block metadata extraction
are later enhancements.

## 5. Collaboration And Portal — Planned

- Consultant register with discipline, scope, agreed fee, payments, balance, and
  assigned project/drawing access.
- Project-scoped collaborator login.
- Client portal with read-only access to issued drawings, invoices, approvals,
  and project status.
- Approval requests and notifications for stale client decisions or consultant
  deliverables.

## 6. Carbon React UI — In Progress

- Current embedded React shell at `/estiui/` is the seed.
- Target UI is a standalone Carbon React SPA.
- Navigation model: fixed global side nav and flexible local side panel.
- IBM Plex Sans typography and Carbon icons only.
- Use Carbon DataTable, Grid, Tabs, SidePanel, Modal, ComboBox, DatePicker,
  InlineLoading, ToastNotification, Tag, and status indicators.
- First React workflows to build: dashboard, projects/phases, fee proposals,
  drawing register, permit list, invoices, and client portal.

## 7. Release Hardening — Planned

- Validate create, edit, delete, permissions, CSRF, and multi-entity behaviour
  for every ESTI module.
- Add smoke tests for disabled upstream modules and architect workflows.
- Add PHPUnit coverage for object classes, fee calculations, GST/TDS logic, and
  drawing/permit lifecycle rules.
- Publish source code, container metadata, release notes, security policy, and
  migration notes from the ESTI repository.

## Non-Goals For The First Architect Release

- General-purpose ERP functionality.
- Contractor RA billing, measurement book certification, labour team payroll,
  warehouse/site stock, purchase orders, GRN, or supplier bill operations.
- Global multi-country accounting or multi-currency.
- Theme marketplace or user-defined theme customization.
- Re-introducing Dolibarr or any general-purpose ERP surface.
