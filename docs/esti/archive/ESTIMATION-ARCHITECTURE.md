# Estimation Architecture

**Status:** Canonical — **current-state** note (what ships today)  
**Reviewed:** 2026-06-25

> **Target architecture:** This note describes the estimation engine as it ships
> today. The component-based **Estimation OS** target — component master, design-
> stage cost-head estimate, auto-BOQ, completed rate analysis, freeze/versioning,
> and (later) work packages, running bills, deviations, and IFC sync — is
> specified in [ESTIMATION-OS-ARCHITECTURE](ESTIMATION-OS-ARCHITECTURE.md) and
> [IFC-COMPONENT-MAPPING](IFC-COMPONENT-MAPPING.md). As each Estimation OS phase
> lands, the corresponding section below is superseded by that spec.

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

## Current Limitations → Estimation OS path

These are the boundaries of the current flat engine, each addressed by a named
Estimation OS phase (see [ESTIMATION-OS-ARCHITECTURE](ESTIMATION-OS-ARCHITECTURE.md)
§28 and [IMPLEMENTATION-ROADMAP](IMPLEMENTATION-ROADMAP.md) Phase 4/6):

| Current limitation | Resolved by |
| --- | --- |
| Estimate line hierarchy is flat — no cost heads, no design vs execution stage | **OS Phase 1** Design-Stage Estimation (cost heads, calculation types, % clauses, non-modeled items, confidence, freeze + version history) |
| No component identity; takeoff aggregates only by element type | **OS Phase 2** Component master (AORMS code) + IFC mapping + auto-BOQ from related-item templates |
| Rate analysis is schedule-rate based; labour/material/machinery breakup unfinished | **OS Phase 3** Ratebook + Rate Analysis completion (component rate sourced from analysis or rate book) |
| No execution-stage detail, billing, or change tracking | **OS Phases 4–6** Work packages, running bills (double-billing prevention), deviations/escalation, IFC sync — _deferred_, overlaps PMC/site-delivery |

Phases 1–3 are the active **costing-spine** increment; Phases 4–6 are sequenced
next. The parametric canvas remains exploratory UI, not the authoritative engine.

