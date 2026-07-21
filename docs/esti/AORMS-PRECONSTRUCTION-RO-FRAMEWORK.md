# Pre-construction risk & opportunity — AORMS consultancy scope

**Status:** Product law · **Updated:** 2026-07-21  
**Source brief:** Pre-Construction (Planning & Design) R&O framework (stakeholder input).

AORMS serves **AEC consulting firms** (architecture + engineering). It does **not**
run construction PM, contractor delivery, CPM programmes, or tender packages.
This doc maps the pre-construction R&O brief onto what we **adopt**, **adapt**,
and **refuse** so agents do not reintroduce the 2026-06 consultancy-only teardown.

Canonical SOP map: [AORMS-CONSULTANCY-SOP-CASE-STUDY.md](AORMS-CONSULTANCY-SOP-CASE-STUDY.md).  
Operating model: [AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md](AORMS-CONSULTANCY-OPERATING-MODEL-AND-ARCHITECTURE.md).

---

## Adopt (in product)

| Brief area | AORMS home | Notes |
| --- | --- | --- |
| Business case / feasibility | Enquiry go/no-go · Project DNA | Scorecard before job number; Studio risk/feasibility read-model |
| Stakeholder alignment | Clients · consultants · contractors portals | No unified “stakeholder register” yet — CRM + portals |
| Site / geotech inputs | Input packs (`GEOTECH`, brief) · site visits | Validate before issue; observe, don’t inspect for liability |
| Planning & approvals | Permits · approvals · project brief | Studio project surfaces |
| Design management | MDR · sign-off chain · CRS · calc packages | Reliance engine |
| Cost estimation | Rate books · project Estimation BOQ | Consultancy fee stages separate from BOQ |
| Contract strategy | Contract review checklist (§8.2.3) · proposals | Before LOA |
| Risk register | `esti_cons_risk` (AVOID/REDUCE/TRANSFER/ACCEPT) | Already matches brief response types |
| Opportunity register | `esti_cons_opportunity` | **Shipped with this framework** |
| Phase gate (go/no-go) | `esti_cons_phase_gate` | Design-stage gates — **not** construction readiness |
| Lessons / continuous improvement | Lessons · NC/CAPA · MoM | Closeout registers |
| Digital engineering (thin) | Drawings · measurement/takeoff · calc lineage · EOMS | No BIM Execution Plan module yet |

---

## Adapt (rename / soft language)

| Brief term | Consultancy meaning in AORMS |
| --- | --- |
| Constructability review | **Buildability / coordination review** of consultant deliverables (clashes, issue class, CRS) — not contractor method statements |
| Baseline schedule | Engagement **phase programme** + capacity outlook — not CPM construction schedule |
| Procurement strategy | Long-lead **consultant** inputs / specialist engagement — not work-package tendering |
| Construction readiness | **Engagement readiness for next design stage / issue** — never “start on site” gate |
| Tender preparation | Client tender **support** deliverables only — no tender comparison spine |

---

## Refuse (out of product)

Do **not** implement:

- Construction readiness / site mobilisation checklists as a delivery control
- Baseline construction schedule / CPM / programme Gantt (removed 2026-06-29)
- Tender packages, bid comparison, work packages, running/RA bills, BBS
- Contractor coordination / PMC hub / mood boards
- Procurement forecast for construction materials
- “Handover to construction team” as an app workflow — document export + lessons only

---

## Identify → assess → respond (product loop)

1. **Identify** — workshops, design reviews, input packs, site visits, lessons, Ask intelligence precedents  
2. **Assess** — probability × impact (1–5) on risks and opportunities  
3. **Prioritize** — score bands Critical / High / Medium / Low  
4. **Respond** — Risk: Avoid / Reduce / Transfer / Accept · Opportunity: Exploit / Enhance / Share / Accept  
5. **Own** — owner, action, due date, status  
6. **Monitor** — at each design phase gate (Concept → Schematic → Detailed → Issue readiness)

---

## Phase gates (consultancy)

Gates are recorded on the engagement. A **GO** decision requires the checklist
items for that gate (see `CONSULTANCY_PHASE_GATE_CHECKLIST` in `@esti/contracts`).
Typical gates:

| Gate | Intent |
| --- | --- |
| `CONCEPT` | Brief frozen, major risks/opportunities opened |
| `SCHEMATIC` | Coordinated concept, fee path clear, open high risks mitigated or accepted |
| `DETAILED` | Sign-off chain ready, input packs validated, CRS closing |
| `ISSUE_READINESS` | Issue class + reliance + fee stage billable path confirmed |

---

## KPI mapping (existing signals)

| Brief KPI | Where it shows today |
| --- | --- |
| Cost estimate accuracy / contingency | Estimation rollup · fee position |
| Design completion / clashes / CRS closure | MDR status · open CRS count · issue gates |
| Open high risks / mitigation | Risk register scores |
| Opportunity value realized | Opportunity register status `REALIZED` |
| Approval / decision turnaround | Approvals · TQ due dates · enquiry go/no-go |
| Lessons captured | Lessons published |

---

## Change rule

Material expansions of this framework update this doc **and** the SOP product map
in the same PR. Prefer enriching consultancy registers over new top-level modules.
