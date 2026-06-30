# Cost Management System — Architecture

**Status:** Active build · **Owner:** Holagundi Consulting Works
· **Builds on:** [CONSTRUCTION-KNOWLEDGE-BANK](CONSTRUCTION-KNOWLEDGE-BANK.md)

> **Supersedes:** the former "Estimation OS" concept. There is no separate
> Estimation OS — cost control is a single, unified **Cost Management System (CMS)**
> that follows one permanent Element identity from initial estimate through to
> certified contractor bills. All prior `ESTIMATION-OS*` docs are retired.

---

## 1. Purpose

The CMS turns **Knowledge Bank intelligence into project cost control**. The
operating principle:

> **Enter each physical element once → the system tracks its cost from estimate
> through certified bill, with no re-keying.**

An architect picks *what* is being built, enters its dimensions once, and the
system computes quantity, derives the BOQ, records site measurements, and
certifies contractor bills — all referencing the same permanent element identity.

---

## 2. Position in AORMS

```
  Construction Knowledge Bank  (Items · Specifications · Recipes)
                │  read-only derivation
                ▼
    Cost Management System  (project instances)
      │
      ├─ Estimate  (elements + dimensions → qty × rate → amount)
      │     ↓  Mark as Final
      ├─ Final Estimation Set  (frozen snapshot → Documents → PDF)
      │
      ├─ BOQ  (read-model grouping of elements)
      │
      ├─ Site Measurement Book  (measured executed qty per element)
      │
      ├─ Work Orders  (contractor agreement: items + agreed rates)
      │
      ├─ Contractor Bills + Certification
      │     (claimed qty vs site-measured qty; arithmetic check; certify/hold/reject)
      │
      ├─ Material Intelligence  (read-model: spec recipe × element qty)
      │
      └─ Cost Dashboard  (Estimated vs BOQ vs Executed vs Certified)
```

---

## 3. The unifying concept — Element identity

Every estimable physical object in a project gets a **permanent Element code**
(`EL-001`, `EL-002`…) that never changes. Child components inherit a suffix
(`EL-001A`, `EL-001B`…).

The Element holds:
- Spatial location (Zone / Building / Floor / Room / Section)
- Knowledge Bank item + specification (with rate snapshot)
- Measurement type (VOLUME / AREA / LENGTH / COUNT) + dimensions (in mm)
- Derived quantity and amount (deterministic, no re-keying)

Every downstream record — measurement entries, bill lines, certifications —
references the same Element code. Cost ambiguity is eliminated.

---

## 4. Data model (`esti_cms_*`)

| Table | Purpose |
| --- | --- |
| `esti_cms_location` | Spatial tree: `project_id`, `parent_id`, `kind` (ZONE/BUILDING/FLOOR/ROOM/SECTION), `name` |
| `esti_cms_element` | **The spine.** Permanent identity (`EL-001`), dimensions → computed quantity, spec rate snapshot → amount |
| `esti_cms_final_set` | Frozen estimate snapshot: `revision_no`, `snapshot_json`, `total_paise`, `pdf_status` → Documents |
| `esti_cms_measurement` | Site Measurement Book: executed qty per element, per date — cumulative |
| `esti_cms_work_order` + `_item` | Contractor agreement: items + agreed rates |
| `esti_cms_bill` + `_line` | Contractor bill: claimed qty vs certified qty per element, rates from Work Order |

**BOQ, Material Intelligence, Cost Dashboard** = pure read-models (no additional tables).

---

## 5. Quantity derivation

Pure, headless, deterministic — in `@esti/contracts`:

```
VOLUME  = length × height × thickness (mm → m³, ÷ 1e9)
AREA    = length × height (mm → m², ÷ 1e6)
LENGTH  = length (mm → m, ÷ 1000)
COUNT   = nos
```

`cmsAmountPaise(quantity, ratePaise) = Math.round(quantity × ratePaise)`

Rate is snapshotted from the chosen Knowledge Bank Specification at element creation.

---

## 6. Local vs Server data policy

| State | Where |
| --- | --- |
| Draft elements, measurements, work orders, bills | **DB working data** (mutable) |
| Final Estimation Set (once FINAL) | **Immutable DB row → Documents tab** |
| CMS Final Set PDF | **Object storage → Documents tab** |

"Mark as Final" triggers: assigns revision number → snapshots full element list + BOQ
into `snapshot_json` → sets status FINAL (immutable) → enqueues `render_pdf` worker job
→ PDF lands in Documents under "Final Estimation Records".

---

## 7. Bill certification scope

Architect certification involves:
- **Measurement check** — claimed quantity vs site-measured cumulative quantity
- **Arithmetic check** — `claimed_qty × rate_from_work_order = claimed_amount`
- **Decision** — Approve / Hold / Reject

Out of scope: rate-vs-contract comparison, advances, payments, retention
(those belong to the client's accounts, not AORMS).

---

## 8. Build phases

| Phase | Status | Scope |
| --- | --- | --- |
| **CMS-1 — Element spine + Estimate** | ✅ | `esti_cms_location` + `esti_cms_element`; `computeQuantity` vitest 7/7; Element CRUD; "Cost Management" tab |
| **CMS-2 — BOQ + Final Estimation Set** | ✅ | BOQ read-model; `esti_cms_final_set`; "Mark as Final" → snapshot → PDF; Documents register |
| **CMS-3 — Components (auto-gen)** | 🔲 | `esti_kb_item_dependency`; parent element → suggested child elements. **Deliberately skipped** to ship 4→8 directly. |
| **CMS-4 — Site Measurement Book** | ✅ | `esti_cms_measurement` (mig 0124); element-keyed DRAFT→VERIFIED records, `measuredById`/`verifiedById`; `cms.measurements.*` (listByElement, summaryByProject, create, verify [`cost:approve`], remove); Site Measurement tab |
| **CMS-5 — Work Orders** | ✅ | `esti_cms_work_order` + `esti_cms_wo_item` (mig 0125); DRAFT→ISSUED→CLOSED; `cms.workOrders.*` (9 procs); rate locked at WO-item level; Work Orders tab |
| **CMS-6 — Contractor Bills + Certification** | ✅ | `esti_cms_bill` + `esti_cms_bill_line` (mig 0126); rate auto-snapshot from WO item; DRAFT→SUBMITTED→CERTIFIED/HELD/REJECTED; `cms.bills.*` (10 procs); certify sums certified line amounts; Contractor Bills tab |
| **CMS-7 — Material Intelligence** | ✅ | `cms.intelligence.materialForecast` read-model: Σ(element qty × spec recipe × wastage) → material + labour forecast; no new tables |
| **CMS-8 — Cost Dashboard** | ✅ | `cms.intelligence.costDashboard` read-model: Estimated / Executed (verified qty × rate) / Certified + %; Cost Intelligence tab; no new tables |

---

## 9. UI placement

**"Cost Management"** tab group in `ProjectDetail.tsx` (alongside "Setup" and
"Project workspace"), tabs: **Estimate · BOQ · Site Measurement · Work Orders ·
Contractor Bills · Cost Dashboard**.

Pure Carbon throughout — `DataTable`, `Tag`, `ProgressBar`, `Stack`, `Modal`.

---

## 10. tRPC namespace

`cms` — all procedures under `backend/src/modules/cms/router.ts`:
- `cms.locations.*` — spatial tree CRUD
- `cms.elements.*` — element CRUD (auto-code generation, spec snapshot)
- `cms.boq.byProject` — grouped BOQ read-model
- `cms.finalSet.*` — freeze/list/byId

---

*Designed and developed by Holagundi Consulting Works.*
