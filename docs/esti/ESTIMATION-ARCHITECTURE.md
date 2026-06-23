# Estimation Architecture

**Status:** Canonical architecture note  
**Reviewed:** 2026-06-23

ESTI estimation is a deterministic commercial workflow, not a drawing tool. Geometry is captured in ESTICAD, rates are governed in Master DSR, and AORMS produces auditable estimates, BOQs, BBS exports, PDFs, and tender-commercial records.

## Architecture Spine

| Layer | Owner | Data / code |
| --- | --- | --- |
| Quantity capture | ESTICAD desktop | `measurements.createCompanion`, `esti_measurement` |
| Quantity semantics | Shared contracts | `packages/contracts/src/takeoff.ts`, `TAKEOFF_CATALOG` |
| Rate catalog | Knowledge Bank | `esti_dsr_version`, `esti_dsr_item`, `@hcw/master-dsr-kit` |
| Estimate engine | Backend | `backend/src/modules/boq/*`, `esti_estimate`, `esti_estimate_item` |
| Output | AORMS worker/web | XLSX export, estimate PDF, issued document register |
| Downstream commercial | AORMS | Approved estimate becomes project BOQ and can feed tenders / purchase decisions |

## Source Of Truth

The estimate line is the commercial source of truth after it is created. It stores:

- final quantity, unit, rate, lead, and amount;
- the line source: `MANUAL`, `DSR_PICK`, `BULK_IMPORT`, or `TAKEOFF_IMPORT`;
- a DSR snapshot: code, description, and version label;
- takeoff provenance where relevant: measurement IDs, element type, element label, and measurement names.

This is intentional. DSR catalogs and ESTICAD measurements can change later, but an issued BOQ must remain explainable.

## Workflow

1. **Prepare quantities**
   - ESTICAD creates calibrated world-coordinate measurements.
   - AORMS stores them as `esti_measurement` rows with element type, BOQ quantity, unit, and description.
2. **Select rates**
   - A published DSR version is linked to the estimate.
   - Draft DSR versions cannot be linked to estimates.
3. **Generate / enter estimate lines**
   - Manual item: user enters description, unit, quantity, and rate.
   - DSR pick: user selects a DSR item; the line snapshots that DSR item.
   - Bulk import: CSV/TSV rows are imported and tagged as imported.
   - Takeoff import: measurements are grouped by takeoff element and matched to DSR code.
4. **Recompute**
   - Backend recomputes subtotal and total from persisted items.
   - Amount = quantity x rate x item lead.
   - Total = subtotal x whole-estimate lead.
5. **Approve**
   - Approved estimates are locked.
   - The approved estimate becomes the project BOQ.
   - Revision creates the next version and records an issued-document event.

## Boundaries

- No browser geometry capture.
- No local ESTICAD BOQ database.
- No implicit live recalculation of issued BOQs from changed DSR rates.
- No hidden AI pricing decisions. AI may draft narratives or assist quantity interpretation, but deterministic quantities/rates remain explicit.
- No inventory, labour ledger, GRN, subcontractor accounting, or contractor ERP.

## Implementation Map

| Concern | File |
| --- | --- |
| Contracts and totals | `packages/contracts/src/boq.ts` |
| Takeoff catalog and DSR matching | `packages/contracts/src/takeoff.ts` |
| Estimate router | `backend/src/modules/boq/estimate.ts` |
| Takeoff import | `backend/src/modules/boq/takeoffImport.ts` |
| Recompute totals | `backend/src/modules/boq/recomputeEstimate.ts` |
| Estimate line provenance | `backend/src/modules/boq/estimateProvenance.ts` |
| Schema | `backend/src/db/schema/knowledge-compliance.ts` |
| Project UI | `frontend/src/components/ProjectEstimates.tsx` |
| ESTICAD boundary | `docs/esti/ESTICAD-COMPANION.md` |

## Current MVP Limitations

- Takeoff aggregation groups by element type; it does not yet create room/floor/package-level BOQ sections.
- Estimate line hierarchy is flat; future work may add sections, packages, and tender schedule grouping.
- Rate analysis is schedule-rate based; labour/material breakup is outside current scope.
- Parametric canvas is exploratory UI, not the authoritative estimate engine.

