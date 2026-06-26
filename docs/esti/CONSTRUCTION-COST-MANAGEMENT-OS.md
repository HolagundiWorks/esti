# AORMS Construction Cost Management OS

**Status:** Canonical · **Target architecture** for the full cost lifecycle —
estimate → BOQ → rate analysis → BBS → tender → award → measurement → running
bill → deviation/variation → final account · **Reviewed:** 2026-06-26

This is the ESTI-adapted version of the reference spec
(`AORMS_Construction_Cost_Management_OS_Architecture.md`). The reference is a
greenfield design; **this doc maps it onto what ESTI already ships** and names
the real tables, tRPC namespaces, routes, and conventions. Where the reference
conflicts with ESTI law (money in paise, `esti_*` tables, **Pure Carbon only**,
the existing capability/plan model), **this doc wins**.

Construction Cost Management OS is **not a new product** — it is the umbrella that
contains the already-built **Estimation OS**
([ESTIMATION-OS-ARCHITECTURE](ESTIMATION-OS-ARCHITECTURE.md), Phases 1–4 done)
and extends it forward through **tendering, award, site measurement, controls
(deviations/variations), and final-account closure**.

---

## 1. The cost lifecycle and where ESTI stands

```text
Planned → Estimated → Quantified → Analysed → Tendered → Awarded
        → Measured → Billed → Deviated → Approved → Closed
```

| Stage | Reference module | ESTI today | Verdict |
|---|---|---|---|
| Estimated | 5.2 Estimate | `esti_estimate` (+stage/status), `esti_estimate_item`, `esti_estimate_component`, `esti_estimate_version` (freeze); `estimates`/`designEstimate` namespaces | **Built** (Estimation OS 1) |
| Quantified | 5.3 BOQ, 5.5 Structural | `esti_estimate_item` + auto-BOQ from `esti_component` via the formula registry | **Built** (extend validation) |
| Analysed | 5.4 Rate Analysis | `esti_rate_analysis` / `esti_rate_component` + rate book (`rateAnalyses`, `dsr`); Knowledge Bank → Rate Analysis | **Built** (Estimation OS 3) |
| Steel | 5.6 Bar Bending Schedule | `esti_bbs` / `esti_bbs_item`, `bbs` namespace, `D²/162`, validation, PDF; spine links (`work_package_id` / `boq_item_id` / `drawing_id`) + diameter/floor summaries + `esti_steel_reconciliation` (scheduled vs issued vs consumed, `cost:approve` finalize) | **Built + linked** (CC Phase E) → steel-recon PDF + full-BBS fields deferred |
| Tendered | 5.7 Tender, 5.8 Bidding, 5.9 Comparison | `esti_tender` (+invitations/bids/documents/acks), `esti_tender_item`/`esti_tender_bid_item`, `tenders` namespace (item procedures + `compareItems`), `Tenders.tsx`, contractor portal (`submitItemBid`) | **Built** (CC Phase A) → tender-doc PDF deferred |
| Awarded | 5.10 Work Order, Award | `esti_work_package` / `esti_work_package_item` ← `tenders.award` (winning rates); `work_package.tender_id` ↔ `tender.estimate_version_id` | **Built** (CC Phase B) → contract-condition columns + WO PDF deferred |
| Measured | 5.11 Measurement Book | `esti_measurement_record` (location/floor/zone, photo evidence, measured/checked-by, measure→approve→bill) + the double-billing guard now at approval; `esti_measurement` = drawing takeoff (different thing) | **Built** (CC Phase C) → photo capture/upload UI deferred |
| Billed | 5.12 Running Bill | `esti_running_bill` 9-state machine + double-billing guard (Rule 9) + bill **types** + **deduction block** (retention/advance/tax-TDS/other → net payable) + running-bill PDF | **Built** (Estimation OS 4 + CC Phase C) |
| Deviated | 5.13 Qty / 5.14 Rate / 5.15 Variation | `esti_deviation` (qty + rate; severity ladder; rate document-and-approve only — Rule 5) + `esti_variation`/`esti_variation_item` (two-step ladder → **Apply** writes the `variationQty` ledger + self-keyed extra-item lines); `deviations`/`variations` namespaces, `ProjectControls.tsx`; `cost:approve` gate | **Built** (CC Phase D) → variation-order PDF deferred |
| Approved | §10 Approvals | `esti_approval` (generic) + `approval` namespace; `esti_audit` immutable log | **Built (generic)** → wire financial chains |
| Closed | 5.18 Final Account | `esti_final_account` (per work package; auto-rolled reconciliation snapshot + manual closing adjustments) + Rule-6 closure checklist (`cost:approve` close sets the work package `CLOSED`) + closure PDF (`final_account` worker target); `finalAccount` namespace, `ProjectFinalAccount.tsx` | **Built** (CC Phase F) |

**Headline:** the *pre-construction half* of the OS (estimate → BOQ → rate
analysis → BBS) and the *billing core* (work packages → running bills with
double-billing prevention) already exist. The middle is now built — BOQ-driven
**tendering/award** (A+B), the **site measurement book** (C), the **controls
layer** (deviations + variations + extra items, D), and **BBS-into-the-spine**
linkage + **steel reconciliation** (E), and **final-account closure** (F). The
**remaining tail** is a **cost-health dashboard** over all of it (G).

---

## 2. Navigation — mapped to ESTI routes

The reference proposes a standalone "Construction Cost Management OS" nav. ESTI
already surfaces most of this inside the **project workspace** (Costing &
Measurement window) and the **Office** area. Mapping:

| Reference nav | ESTI surface |
|---|---|
| Pre-Construction → Estimates / BOQ / Rate Analysis / BBS | Project → **Costing & Measurement** tabs (`ProjectCosting.tsx`): Estimation & BOQ, Design & components, Bar bending schedule (with spine links + **steel reconciliation** under it once a work package exists); rate analysis is office-wide in **Knowledge Bank** |
| Tendering → Packages / Documents / Issue / Queries / Addendums / Comparison | Office → **Tenders** (`Tenders.tsx`, `tenders` namespace) + **Contractor portal** |
| Award → Work Orders / Awarded Rates | Project → Costing → **Work packages** (`WorkPackages.tsx`) — becomes the award artifact |
| Execution Cost Control → Measurements / Running Bills | Project → Costing → **Site measurement & RA bills** (`ProjectRunningBills.tsx`) |
| Controls → Deviations / Variations / Extra Items / Approval Queue | Project → Costing → **Controls** (`ProjectControls.tsx`, `deviations`/`variations` namespaces) — **Built** (CC Phase D) |
| Final Account → Final Bill / Retention / Recoveries / Closure | **New** project sub-area |
| Reports → Cost / Package / Contractor / Deviation / Billing | `reports` + `dashboard` read models (extend) |

No new top-level product OS shell — keep one workspace. Construction/Tenders/PMC
are gated by the `pmc` plan feature; costing by the `costing` feature (both Core+).

---

## 3. Module-by-module gap map

### 3.1 Dashboard (ref 5.1) — **Built (CC Phase G)**
`dashboard.constructionCost(projectId)` reads the whole spine back as one calm
cost-health panel: Estimated / Tendered / Awarded / Billed (gross) / Certified
(net payable) KPIs, pending bills, approved + unapproved deviations, variation
value, cost-overrun %, and package- and contractor-wise Green/Amber/Red/Grey
status. The three **AI risk checks** (duplicate/over-billing, unbalanced bid,
bill deviation) are computed **deterministically** in the read model (the §9
"checker" role — arithmetic over financial data, never an LLM that could
"silently approve"), surfaced as advisory notes with a severity; the logic is
pure + unit-tested in `@esti/contracts` (`cost-dashboard.ts`). Read-only, no
migration. Surfaced as the `showBills`-gated **Cost dashboard** tab in
`ProjectCosting.tsx` (`ProjectCostDashboard.tsx`). The panel now also prints: the
**cost-report PDF** (`dashboard.generateCostReport` → worker `cost_report` target)
renders this whole picture straight from a stored snapshot — see the Future-row
slice below. *Deferred:* optional LLM narration of the risk notes (`ai` namespace);
office-wide cross-project roll-up.

### 3.2 Estimate (ref 5.2) — **Built**
Estimation OS Phase 1. Statuses (`draft … design_frozen … billing_active …
archived`) and immutable `esti_estimate_version` snapshots already satisfy the
versioning/approval requirements. **No work.** (Concept/Revision estimate *types*
are a thin label add if wanted.)

### 3.3 BOQ (ref 5.3) — **Built + validation checklist (2026-06-26)**
Auto-BOQ from components via the formula registry exists. The BOQ *validation*
checklist now ships: `estimates.validateBoq` runs the pure `validateBoqItems`
checker (`packages/contracts/src/boq-validation.ts`) over an estimate's lines and
surfaces advisory warnings — missing UOM, zero/negative qty, zero rate, duplicate
description, missing trade/cost head, percentage line without a basis, component
line without a link — each with a severity. Read-only, no writes, nothing blocked.
Surfaced as a "BOQ checks" panel + a header count Tag in the Design-estimate tab of
`CostingWindow.tsx`. (The reference's spec/drawing-ref + stale-drawing-revision
checks are out of scope — estimate lines carry no such column; they would need a
drawing-link model.) No migration, no worker.

### 3.4 Rate Analysis (ref 5.4) — **Built + rate-deviation ladder (2026-06-26)**
`esti_rate_analysis` build-up (material/labour/equipment + wastage/overhead/
profit) ships. The **rate-deviation ladder** is now built: `deviations.rateLadder`
recomputes every work-package line's rate journey live off the spine — **estimated**
(`esti_estimate_item`) → **tendered** (`esti_tender_item.est_rate_paise` office
baseline) → **awarded** (`esti_work_package_item.rate_paise` winning bid) →
**revised** (latest non-rejected RATE `esti_deviation`) — joined by the Rule-9
`boqItemId` ledger key, with per-hop deviation %/severity (`rateLadderHops`) and the
active deviation's status/reason. Surfaced as the **Rate ladder** tab in
`ProjectControls.tsx` (`ProjectRateLadder.tsx`), where a line can raise a RATE
deviation through the existing Phase-D flow. The create path now also persists the
estimated/tendered rungs on the stored row. No migration — `esti_deviation` already
carried all four rate columns; Rule 5 unchanged (a revised rate reaches bills only
via a variation).

### 3.5 Structural Quantification (ref 5.5) — **Thin / optional**
No dedicated structural quantifier; the component master can model footings/
columns/beams/slabs and auto-BOQ concrete/shuttering/steel. **Decision:** treat
structural quantities as component-master usage rather than a separate module;
the only real net-new piece is **BBS linkage** (3.6). Low priority.

### 3.6 Bar Bending Schedule (ref 5.6) — **Built + linked (Phase E)**
`esti_bbs`/`esti_bbs_item`, `bbsItemTotals` (`D²/162 × L`), `validateBbsSchedule`,
worker PDF, `ProjectBbs.tsx`. **Phase E linked it into the spine:** `esti_bbs`
gained `work_package_id` + `boq_item_id` (Rule 9 plain-uuid ledger key, no FK) +
`drawing_id` (`bbs.link`; set-null FKs for the work-package and drawing targets),
an optional `floor` on `esti_bbs_item`, and `diameterSummary` / `floorSummary`
roll-ups. **Steel reconciliation** (`esti_steel_reconciliation` + `_item`,
`steelReconciliation` namespace, `ProjectSteelReconciliation.tsx`): per diameter
`scheduledKg` (auto-seeded from the linked BBS via `seedFromBbs`) vs `issuedKg` vs
`consumedKg`; `wastageKg = issued − consumed` with a severity ladder (≤3% within /
watch / >5% over); **DRAFT → FINALIZED**, finalize gated by `cost:approve`,
finalized record locks edits. **Deferred:** steel-reconciliation PDF; full-BBS
fields (shape code, lap, Ld, hook, bend — formulas already in `steel-arranger.ts`);
deriving consumed steel from the measurement book / a GRN store-issue ledger (the
Future "material reconciliation" slice, 3.17).

### 3.7 Tender Documentation (ref 5.7) — **Built (Phase A); doc-gen deferred**
Tenders now carry **BOQ line items** (`esti_tender_item`) carved from a frozen
estimate version via `tenders.createItemsFromEstimate`, or added manually
(`addItem`/`updateItem`/`removeItem`, DRAFT-only). `estRatePaise` is the office
baseline, hidden from contractors. **Still deferred:** tender-document
*generation* from BOQ+specs+drawings (NIT, ITB, GCC/SCC, drawing list, bid
formats) + a worker `render_pdf` target `tender`. `TenderStatus` was **not**
widened — DRAFT→OPEN→CLOSED→AWARDED maps the flow cleanly; the richer status set
(Query Stage / Addendum Issued / …) is not needed for the shipped increment.

### 3.8 Contractor Bidding (ref 5.8) — **Built (Phase A)**
Contractors quote a **rate per tender line** (`esti_tender_bid_item`, unique per
`(invitation,item)`): office staff via `tenders.recordItemBid`, the contractor via
the login portal `contractorPortal.submitItemBid` (rate table + live total in
`ContractorPortal.tsx`). The header `esti_tender_bid.amountPaise` is rolled up from
the line amounts. The addendum-acknowledgement guard (`tenderDocumentAcks`) is
enforced before an item bid is accepted. **Deferred:** bid-submission *validation*
notes (unquoted item, altered description, abnormal rate).

### 3.9 Bid Comparison (ref 5.9) — **Built (Phase A)**
`tenders.compareItems` returns a sealed view while DRAFT|OPEN (items + contractor
names, no rates) and, once CLOSED/AWARDED, an item-wise matrix: each contractor's
rate+amount per line, lowest-per-line flag, per-contractor totals + rank, exported
to XLSX from `Tenders.tsx`. Lump-sum `exportComparison` stays for itemless tenders.
**Deferred:** AI analysis (unbalanced/front-loaded/missing-scope/risk) via the `ai`
namespace (Core+, opt-in).

### 3.10 Work Order / Award (ref 5.10) — **Built (Phase B); conditions deferred**
The **work package is the award artifact** (no parallel `work_order` table).
`tenders.award` requires the tender CLOSED + carrying an `estimate_version_id`,
then inserts an `esti_work_package` (status AWARDED, `tender_id`, `contractor_id` =
winner) + `esti_work_package_item` rows from the tender items with the winning
contractor's rates (fallback `estRatePaise`); it is one-shot (a second award →
CONFLICT) and writes audit + activity. **Deferred:** contract-condition columns
(start/finish, retention %, mobilisation advance, LD, DLP) and a WO/award PDF
worker target.

### 3.11 Measurement Book (ref 5.11) — **Built (CC Phase C)**
`esti_measurement` is **drawing takeoff** (calibrated DXF lines), not a site MB.
The site Measurement Book is now `esti_measurement_record` (← work package + BOQ
line): location/floor/zone, photo-evidence key, measured-by/checked-by, and a
`MEASURED → APPROVED → BILLED` (or `REJECTED`) flow, with a **duplicate-location
guard** at create. The double-billing guard (Rule 9) **now runs at approval**:
`consumed = previously-billed + approved-but-unbilled` for the BOQ line, so an
approved record reserves balance until a running bill consumes it (stamping it
`BILLED`) — never double-counted across the two buckets. A running bill bills
**only** approved records (strict; the modal's direct package-qty entry is gone),
plus free-text non-BOQ extras. **Deferred:** photo capture/upload UI (`photoKey`
column ships; the Carbon `FileUploader` + object-storage presign is later).

### 3.12 Running Bill (ref 5.12) — **Built (deductions/types added, CC Phase C)**
`esti_running_bill` + 9-state machine (`MEASURED → … → SENT_TO_CLIENT`) +
double-billing guard ship, now with bill **types** (RA / Final / Extra Item /
Variation / Advance Recovery / Retention Release) and the **deduction block**
(retention, advance recovery, tax/TDS, other recoveries). `total_paise` stays the
**gross** Σ(qty×rate); `net_payable_paise = gross − Σ deductions` is stored
alongside. A **running-bill PDF** worker target (`running_bill`) renders the
gross → deductions → net-payable certificate.

### 3.13 Quantity Deviation (ref 5.13) — ✅ **Built (2026-06-25)**
`esti_deviation` (type `QTY`) keyed to a work-package BOQ line; `(executed −
BOQ)/BOQ` with the baseline derived server-side (`boqQty = approvedQty +
variationQty`); a severity ladder (`WITHIN_LIMIT` / `WARNING` / `APPROVAL_REQUIRED`
at ±5 % / ±10 %); signed cost impact; `OPEN → APPROVED / REJECTED` gated by the new
`cost:approve` capability (L2+). Document-and-approve only — it does not move the
ledger. `convertToVariation` rolls an open/approved qty deviation into a draft
variation (seeding the addition line).

### 3.14 Rate Deviation (ref 5.14) — ✅ **Built (2026-06-25)** — *document + approve only (Rule 5)*
`esti_deviation` (type `RATE`): a *proposed* revised rate vs the awarded contract
rate (`revised − awarded`, %), reason + reason-source, `cost:approve` sign-off.
**Approving a rate deviation never overwrites `work_package_item.rate_paise`** —
the contract rate is immutable (Rule 5). A rate change reaches bills only as a
*new* variation-order line, never by mutating the original rate.

### 3.15 Variation Order (ref 5.15) — ✅ **Built (2026-06-25)** — *the "addition" you named*
`esti_variation` + `esti_variation_item` (originator, reason, time/cost impact,
billable?, linked-drawing columns) carrying lines that either add qty to an
existing package line (priced at the contract rate — Rule 5) or introduce an
**extra item** (new scope at its own rate). Two-step approval ladder **Draft →
Submitted → Internal-approved → Client-approved → Applied → Closed** (plus
Rejected), every approve/apply step gated by `cost:approve`. On **Apply**,
`applyVariation` is the *only* writer of the billable ledger: it adds to the
existing line's `variationQty` (recomputing amount at the contract rate) and
inserts a ledger-keyed work-package line for each extra item (`boq_item_id =
variation_item.id` self-key), then recomputes the package contract value — so the
Phase-C bill guard immediately makes the new scope billable. *Deferred:*
variation-order PDF (on-screen first, as tenders were).

### 3.16 Procurement Forecast (ref 5.16) — **Built (2026-06-26)**

`dashboard.procurementForecast(projectId)` — read-only, costing-plan gated. For every
`esti_work_package_item` the **outstanding quantity** = `max(0, contractedQty − billedQty)`,
valued at the awarded rate (integer paise). `contractedQty = approvedQty + variationQty`;
`billedQty` = cumulative `esti_running_bill_item.qty` (same subquery as the Phase-G risk checks).
The pure `summarizeProcurementForecast` helper (contracts) rolls the per-item numbers up
**by cost head** (highest outstanding first) and **by work package** (sorted by ref), plus
project totals (contracted / billed / outstanding / item + package counts). Status per item/package:
`NOT_STARTED` (nothing billed) / `IN_PROGRESS` (partly billed) / `FULLY_BILLED` (outstanding ≤ ε).
Items with no linked estimate line fall under "Uncategorised". `ProjectProcurementForecast.tsx`
(Pure Carbon) — totals Tiles, by-cost-head table, by-package table, per-item DataTable with
status Tags — mounts as a `showBills`-gated **Procurement forecast** tab after the Cost dashboard
in `ProjectCosting.tsx`. No migration, no worker, no writes.

*Deferred:* time-phasing the forecast against `constructionSchedule` milestones; BBS steel
outstanding (scheduled − issued kg); material reconciliation 3.17 (blocked on a GRN module).

### 3.17 Material Reconciliation (ref 5.17) — **Build (later)**
Not present. **Note:** the `reconcile` namespace is **bank/26AS/AIS/GSTR financial**
reconciliation — unrelated. Defer; steel reconciliation (3.6) is the first slice.

### 3.18 Final Account (ref 5.18) — **Built (Phase F)**
`esti_final_account` is a **per-work-package** closing statement (the contract
artifact — a project with several contracts gets several final accounts; no
`_item` table, line detail already lives in the running bills + work-package
items). Its reconciliation snapshot is **auto-rolled off the spine** by
`finalAccountFinancials` — original contract value (`Σ approvedQty × ratePaise`),
approved variations + extra items (`Σ variationQty × ratePaise`), gross billed,
retention held, advances recovered, TDS, other recoveries and net paid (column
sums over the work package's running bills) — and recomputed live on every read
while `DRAFT`. The office enters only the **closing adjustments** by hand (final
certified amount, retention released, no-claim cert, client final approval,
notes); `balanceDuePaise = finalCertifiedPaise − netPaidPaise`.

The **closure checklist** (`finalAccountChecklist`) gates finalisation:
**blocking** = no open deviations (`status = OPEN`), no open variations (not
`CLOSED`/`REJECTED`) — **Rule 6, enforced server-side in `close`, not just the
UI** — plus no-claim cert and client final approval; **advisory** (shown, never
blocks) = approved-unbilled measurements and steel-reconciliation finalized.
Two-state **DRAFT → CLOSED**: `close` (gated by `cost:approve`, Phase D)
re-evaluates the checklist, stamps the snapshot + checklist jsonb +
`closedById`/`closedAt`, sets the parent work package `status = CLOSED`, and
locks the record. A **closure PDF** (`render_pdf` target `final_account`,
`_final_account_html`) is the printable closing certificate. `finalAccount`
namespace; `ProjectFinalAccount.tsx` mounted as the "Final account" stage of the
costing spine. *Deferred:* project-level final account aggregating multiple work
packages; retention-release bill auto-generation; final-account XLSX.

---

## 4. Conventions — ESTI overrides of the reference

- **Money:** integer **paise**, `bigint … _paise` columns, `formatINR`. The
  reference's `NUMERIC(18,2)` rupee columns do **not** apply.
- **Tables:** all `esti_*`; UUID PKs via the `id()` helper; `created_at`/
  `updated_at` helpers. Cross-module FKs added in the migration (avoid schema
  import cycles), per the existing `pmc.ts`/`estimation.ts` pattern.
- **API:** tRPC namespaces (not REST). Reuse `writeAudit` + `writeActivity` on
  every financial mutation — the reference's audit-log fields are already covered
  by `esti_audit`.
- **Permissions:** reuse the capability model in
  `packages/contracts/src/permissions.ts` — `tenders:view` (L3+),
  `invoice:manage`/`fees:manage`/`finance:ops` (L2+), `firm:admin` (L1). Add
  capabilities only where a genuinely new gate is needed (e.g. `cost:approve`).
- **Plan gating:** `pmc` feature gates tendering/construction; `costing` gates the
  measurement window; both **Core+**. `contractorPortal` is Lite (view) / Core
  (write).
- **UI — Pure Carbon everywhere, mobile-first for portals (owner decision
  2026-06-25, revised).** One design system across **all** surfaces. An earlier
  same-day exception that would have used Material Design 3 / MUI for the
  external/site portals was **retired** — there is no second component library and
  no `@mui/*` / `@emotion` dependency. **Office and portals are both PURE CARBON**;
  CLAUDE.md "PURE CARBON ONLY" holds in full. External/site portals (contractor,
  and later client/consultant/vendor/site-supervisor) are built in Carbon with
  **mobile-first layout discipline** — single-column on `sm`, `Button size="lg"/
  "xl"` 48 px+ touch targets, full-screen `Modal` on small viewports — because the
  portal screens are forms + tables Carbon renders responsively. A native field app
  (PWA) is reconsidered only if a later phase needs genuinely native field
  interactions (offline, camera/GPS, gestures). See
  [CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md).

---

## 5. Phased implementation plan

Continues the Estimation OS numbering (1–4 done). Each phase is additive and
non-breaking; nothing overwrites a frozen estimate or a posted bill.

| CC phase | What | Subsumes | Priority |
|---|---|---|---|
| **A — BOQ tendering** ✅ **Done (2026-06-25)** | `esti_tender_item` carved from a frozen estimate version (or manual lines); item-wise contractor quoting (`esti_tender_bid_item`, office `recordItemBid` + portal `submitItemBid`); addendum-ack guard on item bids; item-wise comparison (`compareItems`, sealed→revealed, lowest-per-line + ranked totals + XLSX). *Deferred:* tender-doc PDF generation (`tender` worker target); `TenderStatus` not widened (existing enum maps cleanly) | ref 5.7–5.9 | **High** (you named tendering) |
| **B — Award → Work Order** ✅ **Done (2026-06-25)** | Tender `award` populates an `esti_work_package` (+ items) from the winning bid's rates (fallback `estRatePaise`); links `work_package.tender_id` ↔ `tender.estimate_version_id`; one-shot (double-award → CONFLICT); audit + activity. *Deferred:* contract-condition columns (retention/LD/DLP) + WO/award PDF | ref 5.10, Award nav | **High** |
| **C — Site Measurement Book** ✅ **Done (2026-06-25)** | `esti_measurement_record` (location/floor/zone/photo-key/approve) feeding running bills; the double-billing guard moved onto approved measurements (consumed = billed + approved-unbilled); bill **types** + **deduction block** (retention/advance/tax-TDS/other → `net_payable_paise`, gross unchanged); running-bill PDF worker target. Strict billing — only approved records feed BOQ lines; free-text extras stay. *Deferred:* photo capture/upload UI (`photoKey` column ships) | ref 5.11–5.12 | Med |
| **D — Controls (Deviations + Variations + Extra Items)** ✅ **Done (2026-06-25)** | `esti_deviation` (qty + rate; severity ladder; document-and-approve — rate never overwrites the contract, Rule 5), `esti_variation` + `esti_variation_item` (the "addition"; existing-line additions priced at contract rate, extra items at own rate) with the two-step ladder **Draft → Submitted → Internal → Client → Applied → Closed** (+ Rejected). **Apply** is the only writer of the billable ledger (`variationQty` on existing lines; a self-keyed work-package line per extra item), recomputing the package contract value; the Phase-C bill guard immediately bills the new scope. New `cost:approve` capability (L2+, granted to ACCOUNTANT) gates every approve/apply step. *Deferred:* variation-order PDF | ref 5.13–5.15; **Estimation OS Phase 5** | **High** (you named additions) |
| **E — BBS into the spine + Steel reconciliation** ✅ **Done (2026-06-25)** | `esti_bbs` gains `work_package_id` + `boq_item_id` (Rule 9 plain-uuid ledger key, no FK) + `drawing_id` links (`bbs.link`, set-null FKs for the two real targets); optional `floor` on `esti_bbs_item` driving `diameterSummary` / `floorSummary` roll-ups. `esti_steel_reconciliation` (+ `_item`) compares per diameter `scheduledKg` (auto-seeded from the linked BBS via `seedFromBbs`), `issuedKg` and `consumedKg` (entered); `wastageKg = issued − consumed` with a severity ladder (within ≤3% / watch / over >5%); two-state **DRAFT → FINALIZED**, finalize gated by the existing `cost:approve`, finalized record locks edits. `steelReconciliation` namespace, `ProjectSteelReconciliation.tsx` mounted under `ProjectBbs` in the BBS tab. *Deferred:* steel-reconciliation PDF (mirrors deferred variation-order PDF); full-BBS fields (shape/lap/Ld/hook/bend — formulas already in `steel-arranger.ts`); deriving consumed from the measurement book / a GRN store-issue ledger (Future "material reconciliation") | ref 5.6, 5.5 | **High** (you named BBS) |
| **F — Final Account + Closure** ✅ **Done (2026-06-26)** | `esti_final_account` — **per work package**; reconciliation snapshot auto-rolled off the spine (`finalAccountFinancials`: original contract + variations/extra items + gross billed − retention/advance/TDS/other = net paid) and recomputed live while `DRAFT`; manual closing adjustments (final certified, retention released, no-claim cert, client approval, notes); `balanceDue = finalCertified − netPaid`. Rule-6 closure checklist (`finalAccountChecklist`) — blocking: no open deviations/variations (**enforced server-side in `close`**) + no-claim cert + client approval; advisory: approved-unbilled measurements + steel finalized. Two-state **DRAFT → CLOSED**, `close` gated by `cost:approve`, stamps the snapshot + checklist jsonb and sets the parent work package `CLOSED`. Closure PDF (`final_account` worker target, `_final_account_html`). `finalAccount` namespace, `ProjectFinalAccount.tsx`. *Deferred:* project-level rollup account; retention-release bill auto-gen; final-account XLSX | ref 5.18 | Med |
| **G — Cost dashboard + reports + AI checks** ✅ **Done (2026-06-26)** | `dashboard.constructionCost(projectId)` read model + the `showBills`-gated **Cost dashboard** tab (`ProjectCostDashboard.tsx`): Estimated / Tendered / Awarded / Billed / Certified KPIs, cost-overrun %, package- and contractor-wise Green/Amber/Red/Grey, deviation/variation/pending-bill exposure. The three risk checks (duplicate/over-billing, unbalanced bid, bill deviation) are **deterministic** "checker" output (pure + unit-tested in `cost-dashboard.ts`; the §9 rule that AI must not "silently approve" financial data), advisory-only with a severity. Read-only, no migration, costing-plan gated. *Deferred:* LLM narration of the notes (`ai` namespace); office-wide cross-project roll-up | ref 5.1, §9, §16 | Med |
| **3.4 — Rate-deviation ladder** ✅ **Done (2026-06-26)** | `deviations.rateLadder` recomputes each work-package line's estimated → tendered → awarded → revised rate journey live off the spine (Rule-9 `boqItemId` join), per-hop deviation %/severity (`rateLadderHops`), active-deviation status. **Rate ladder** tab in `ProjectControls.tsx` (`ProjectRateLadder.tsx`) raises a RATE deviation via the existing Phase-D flow; create now persists the estimated/tendered rungs. No migration; Rule 5 unchanged | ref 5.4, §3.4 | Med |
| **Cost-report PDF** ✅ **Done (2026-06-26)** | `dashboard.generateCostReport` (write + costing gated) computes the Phase-G cost-health model once and snapshots the whole result into `esti_cost_report` (one row per project, **unique** `project_id`, upserted), then enqueues the worker `render_pdf` `cost_report` target. `_cost_report_html` + `fetch_cost_report_full` render the KPIs + package/contractor tables + risk checks **straight from the stored `snapshot` jsonb** — an exact, reproducible print, no read-model SQL re-implemented in Python. `dashboard.costReport` polls the async `pdf_status`; "Generate PDF" button + `PDF:` status Tag on `ProjectCostDashboard.tsx`. Migration `0094` | ref 5.1, §16 | Med |
| **BOQ-validation checklist** ✅ **Done (2026-06-26)** | `estimates.validateBoq` runs the pure `validateBoqItems` checker over an estimate's lines and returns advisory warnings (missing UOM, zero/negative qty, zero rate, duplicate description, missing trade/cost head, percentage-without-basis, component-without-link), each with a severity, + a `summarizeBoqValidation` roll-up. Deterministic arithmetic (§9, never an LLM), read-only, nothing blocked. Surfaced as a "BOQ checks" panel + header count Tag in the Design-estimate tab of `CostingWindow.tsx`. No migration, no worker. | ref 5.3 | Med |
| **Procurement forecast (3.16)** ✅ **Done (2026-06-26)** | `dashboard.procurementForecast(projectId)` — outstanding qty/value per WP item (contracted − billed at awarded rate, clamped ≥ 0), rolled up by cost head + by package + totals. Pure `summarizeProcurementForecast` helper (12 vitest); `ProjectProcurementForecast.tsx` (Pure Carbon) tab in `ProjectCosting.tsx`. No migration, no worker, no writes. API E2E 21 checks. | ref 5.16 | Low |
| **Future** | Material reconciliation (3.17, blocked on GRN module), AI narration, IFC/CAD quantity extraction | ref 5.17, §18; **Estimation OS Phase 6** | Low |

Your three named priorities map to **A+B (tender management)**, **D
(additions/variations)**, and **E (BBS)** — a natural first three.

**Phases A–G are now built end-to-end (shipped through 2026-06-26).** The
Construction Cost OS spine is complete: `estimate → frozen BOQ → tender → award →
work package → site measurement → running bill → deviations/variations → BBS +
steel reconciliation → final account + closure → cost dashboard + risk checks`.
The first four Future-row slices — the **rate-deviation ladder (3.4)**, the
**cost-report PDF**, the **BOQ-validation checklist (3.3)**, and the
**procurement forecast (3.16)** — also shipped (2026-06-26). What remains is
additive: material reconciliation (3.17, blocked on a GRN module) and optional
AI narration.

---

## 6. Non-negotiable rules (adapted from ref §17, §20)

1. Every number has a source — every BOQ line traces to a component/estimate item;
   every bill line to a measurement record; every measurement to a work order.
2. Nothing is billed twice — the Rule 9 balance guard (`approved + variation −
   previously billed`) is already enforced and stays the gate.
3. No measurement without a work order; no running bill without an approved
   measurement; no billing above balance without an approved variation.
4. No tender issue without an approved BOQ and the latest drawings.
5. No rate change without approval; original/contract rate is never overwritten.
6. No final-account closure with open variations/deviations — **enforced** in
   `finalAccount.close` (re-evaluates the checklist server-side; blocking failures
   throw `BAD_REQUEST`, even for an OWNER).
7. One spine — the work package is the award artifact; the component master is the
   one identity; never a parallel `work_order`/`execution_component` table.
8. Every financial action leaves an `esti_audit` row.

---

## 7. Source & cross-references

- Reference spec: `AORMS_Construction_Cost_Management_OS_Architecture.md` (external).
- Built foundation: [ESTIMATION-OS-ARCHITECTURE](ESTIMATION-OS-ARCHITECTURE.md)
  (Phases 1–4 done; 5–6 deferred, now folded into CC Phases D and Future).
- Roadmap: [ROADMAP](ROADMAP.md) § "AORMS restructure & Construction Cost OS"
  (the former `IMPLEMENTATION-ROADMAP.md` was folded in and moved to
  `deprecated_review/`).
- UI governance (resolved — Pure Carbon everywhere, mobile-first portals):
  [CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md). The earlier Material-UI portal
  proposal (now in `deprecated_review/AORMS_External_Portals_Material_UI_Architecture.md`) is
  **superseded** and not being implemented.
