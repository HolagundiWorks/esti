# AORMS restructure — implementation roadmap

Sequenced to be **non-breaking at each step** and to land foundations before the
things that depend on them. Source designs:
[INFORMATION-ARCHITECTURE](INFORMATION-ARCHITECTURE.md) · [PLANS-AND-TIERS](PLANS-AND-TIERS.md).

| Phase | What | Risk | Depends on |
|---|---|---|---|
| **1. Plan & quota foundation** | `plan` on org settings; `Plan`/`PLAN_LIMITS`/`planAllows` in contracts; `settings.get` exposes plan; quota helper; seed (demo = Enterprise); `usePlan` hook. **No behaviour change yet.** | low | — |
| **2. Enforce tiers** | Apply `planAllows` gates to nav/features; quota checks on create (team/clients/contractors/projects) with upgrade prompts; Lite hides AI. | med | 1 |
| **3. Project two-head refactor** | ProjectDetail → **Consultancy \| Project Management** heads; BOQ moves to PM; billing in-project. | med | — |
| **4. Single Costing & Measurement window** | Consolidate estimates + measurement + BBS + running bills into one staged workspace on a shared item/rate spine. **This is Estimation OS** — see [ESTIMATION-OS-ARCHITECTURE](ESTIMATION-OS-ARCHITECTURE.md) + [IFC-COMPONENT-MAPPING](IFC-COMPONENT-MAPPING.md); active increment = OS Phases 1–3 (below). | med-high | 3 |
| **5. Global nav restructure** | The 9 areas; Programme/PMC become read-only **portfolio** rollups; Tenders/Construction leave "Office". | med | 3 |
| **6. Rate analysis capability** | Composite-rate build-up (material+labour+machinery+overhead) feeding the rate-book library and the costing window. Scaffolding already exists (`esti_rate_analysis`/`esti_rate_component`); OS Phase 3 completes it and links component rates. | high (new) | 4 |
| **7. Cleanup** | Drop bylaw from product nav (keep public `/compliance-check` SEO tool); persistent spec→rate-book mapping; marketing rename decision. | low | — |

## Locked assumptions
- Demo = **Enterprise**; new firms default **Lite**.
- Lite keeps **basic GST invoicing**; reconciliation/filing are Core.
- Core = **25 seats** + add-seats.
- Public **`/compliance-check`** stays as a marketing tool; bylaw leaves the product nav.
- Marketing copy keeps "DSR"; the app says "Rate Books".
- **Rate analysis** build-up is net-new (Phase 6 / OS Phase 3) — scaffolding tables exist, the engine does not.
- Estimation OS **extends** the existing `esti_estimate` engine — one component master, never a parallel estimate.

## Estimation OS sub-phases (restructure Phase 4 + 6)

Spec: [ESTIMATION-OS-ARCHITECTURE](ESTIMATION-OS-ARCHITECTURE.md) §28,
[IFC-COMPONENT-MAPPING](IFC-COMPONENT-MAPPING.md). Each sub-phase is additive and
non-breaking; nothing overwrites a frozen estimate.

| OS phase | What | State |
|---|---|---|
| **1. Design-Stage Estimation** | `esti_estimate` gains stage + wider status; items gain cost head, calculation type (AREA_RATE/PERCENTAGE/LUMPSUM/NON_MODELED), confidence, % clause parent; freeze → `esti_estimate_version` snapshot (never overwrite). | **Active** |
| **2. Component + IFC execution detail** | `esti_component` (AORMS code) master + `esti_ifc_mapping` catalog + `esti_component_related` templates; `esti_estimate_component` expands to BOQ items via the contracts formula registry (auto-BOQ). | **Active** |
| **3. Ratebook + Rate Analysis** | Complete `esti_rate_analysis` build-up; link `componentId`; a component's rate is sourced from a rate analysis or the rate book. | **Active** |
| **4. Work packages + running bills** | Group frozen BOQ into contractor packages (`esti_work_package`/`esti_work_package_item`); running bills link to package items and check previously-billed qty across the project (double-billing prevention, spec Rule 9). Office + contractor-portal balances. | **Done** |
| **5. Deviations + escalation** | Deviation records vs frozen baseline; escalation clauses. (Phase 4 ships a manual `variationQty` allowance only.) Now folded into **Construction Cost OS Phase D**. | Next |
| **6. IFC sync + intelligence** | Re-sync from updated IFC models; dependency intelligence. Now folded into **Construction Cost OS Future**. | Next |

Phases 4–6 overlap the existing PMC/site-delivery modules (`programme`, `pmc`,
`progressReports`, `snags`) and are sequenced as a separate increment.

## Construction Cost Management OS (the umbrella over Estimation OS)

Estimation OS is the *pre-construction + billing core* of a wider lifecycle:
estimate → BOQ → rate analysis → BBS → **tender → award → site measurement →
running bill → deviation/variation → final account**. Spec:
[CONSTRUCTION-COST-MANAGEMENT-OS](CONSTRUCTION-COST-MANAGEMENT-OS.md) — the
ESTI-adapted map of the reference architecture (what's built, changed, created).

| CC phase | What | State |
|---|---|---|
| **A. BOQ tendering** | Tender BOQ line items carved from a frozen estimate version (or manual); item-wise contractor quoting (`esti_tender_bid_item`, office `recordItemBid` + portal `submitItemBid`) with addendum-ack guard; item-wise comparison (`compareItems`, sealed→revealed, lowest-per-line + ranked totals + XLSX). Migration `0089`. *Deferred:* tender-doc PDF generation; `TenderStatus` not widened. | **Done** (2026-06-25) |
| **B. Award → Work Order** | `tenders.award` populates an `esti_work_package` (+ items) from the winning bid's rates; `work_package.tender_id` ↔ `tender.estimate_version_id`; one-shot (double-award → CONFLICT); audit + activity. The work package **is** the award artifact (one spine). *Deferred:* contract-condition columns + WO PDF. | **Done** (2026-06-25) |
| **C. Site Measurement Book** | `esti_measurement_record` (location/floor/zone/photo-key/measure→approve→bill) feeding running bills; double-billing guard moved onto approved measurements (consumed = billed + approved-unbilled); bill **types** + **deduction block** (retention/advance/tax-TDS/other → `net_payable_paise`, gross unchanged); running-bill PDF target. Strict — only approved records feed BOQ lines; free-text extras stay. Migration `0090`. *Deferred:* photo capture/upload UI. | **Done** (2026-06-25) |
| **D. Controls** ← **next** | Quantity + rate deviations, **variation orders** (additions), extra items, approval queue. **Subsumes Estimation OS Phase 5.** | Planned |
| **E. BBS into the spine** | Link `esti_bbs` → BOQ item / work order / drawing revision; diameter-/floor-wise summaries; steel reconciliation (issued vs measured). | Planned |
| **F. Final Account** | `esti_final_account` + closure checklist + closure PDF. | Planned |
| **G. Cost dashboard + reports** | `dashboard.constructionCost`; package/contractor/deviation/billing summaries; AI risk notes. | Planned |
| **Future** | Procurement forecast, material reconciliation, IFC/CAD extraction (Estimation OS Phase 6). | Deferred |

Named priorities map to **A+B (tendering)**, **D (additions/variations)**, **E
(BBS)**. **Phases A+B (tender management) and C (site Measurement Book) shipped
2026-06-25 — next increment: Phase D (Controls — deviations + variations).** **UI decision (owner, 2026-06-25, revised):**
**Pure Carbon everywhere** — the earlier Material-UI exception for external/site
portals was retired; portals are built in Carbon with mobile-first layout
discipline (no `@mui/*` dependency — see
[CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md)).

## Phase 1 — deliverables (this pass)
1. `orgSettings.plan` (`LITE|CORE|ENTERPRISE`, default `LITE`) + migration.
2. `packages/contracts/src/plans.ts` — `Plan`, `PLAN_LIMITS`, `PLAN_FEATURES`,
   `planAllows(plan, feature)`, `withinQuota(plan, kind, current)`.
3. `settings.get` returns `plan`; `firm.get` too (for display).
4. `backend/src/trpc/trpc.ts` — `assertPlanFeature` / quota helper (wired in Phase 2).
5. Seed: demo org → `ENTERPRISE`.
6. Frontend `usePlan()` hook + nothing gated yet (Phase 2 applies gates).
