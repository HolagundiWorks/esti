# HCW Construction UX Overlay

**Status:** Intentional specialization · **Adopted:** 2026-07-21  
**Parent:** [HCW-UX.md](../HCW-UX.md) · framework [HCW-UX-FRAMEWORK.md](../HCW-UX-FRAMEWORK.md) · process [HCW-UX-PROCESS.md](../HCW-UX-PROCESS.md)  
**Rule:** This overlay **does not** pollute `@hcw/ui-kit`. Domain concepts stay in product composition; the kit remains industry-agnostic (Constitution III).

Construction project delivery needs coordination, safety, traceability, and field usability that a generic product chrome framework cannot claim alone. This overlay maps those needs onto HCW geography, capacity, and decision law.

---

## 1. Problem (domain)

Multi-party construction projects fail UX when:

- Each stakeholder reinvents status and “what needs my signature”
- Office and site see different truths with no shared geography
- Safety/regulatory interrupts compete with ambient noise
- Decisions lack freeze/trace → rework and RFIs

**Overlay goal:** same HCW muscle memory (Rail · Stage · Dock) with **role modes**, **lifecycle phases**, and **interrupt classes** tuned for delivery.

---

## 2. Lifecycle alignment

| Phase | User job | HCW surface emphasis |
| --- | --- | --- |
| **Pre-construction** | Scope, fee, compliance, team | Stage editors · Decision queue · CAPACITY on options |
| **Construction** | Progress, site issues, changes | Field density · safety interrupts · photo/artifact stage |
| **Handover** | Snags, docs, as-built | Checklist Stage · frozen decisions archive |
| **Operations** | Facility / warranty | Read-mostly Stage · scarce dock · status shapes |

Phase is a **Stage frame** (tabs or Mission phase strip) — not a new shell region.

---

## 3. Stakeholder modes

| Mode | Cognitive role | Chrome bias |
| --- | --- | --- |
| **Owner / client** | Approve / fund | Judgment-heavy rail · recommendation-first decisions |
| **Architect / principal** | Design intent | Full studio chrome · dock commits |
| **Consultant** | Advise / certify | Portal GlassRail · limited dock |
| **Contractor** | Execute / report | Compact density · field targets |
| **Subcontractor / site** | Task + safety | **Field mode:** larger targets (`COGA`/`calm`), fewer nav items, offline-tolerant patterns (product) |

Mode switches **content and density**, never geography. One building, different rooms.

---

## 4. Safety & regulatory interrupts

Map to `INTERRUPTION` + judgment flags:

| Class | Examples | UX |
| --- | --- | --- |
| **Safety blocker** | Site stop, PPE breach, structural risk | Assertive interrupt · cannot dismiss without ack · shape+label |
| **Regulatory** | Consent, statutory filing, inspection | Decision card · freeze until resolved |
| **Commercial** | Variation, claim | Decision queue · cost/schedule/quality trade-off band |
| **Ambient** | Progress %, routine sync | **Never** toast — rail telemetry only |

---

## 5. Risk & opportunity

- Risk rows use **shape + label** (`HealthGlassOrb` / `STATUS_SHAPE`) — colour secondary.
- Opportunity is a **Decision** with upside impact — not a second accent colour.
- Rail holds ≤ `CAPACITY.railObjectives` live risks for the current phase.

---

## 6. BIM & digital tools

| Concern | Overlay stance |
| --- | --- |
| Authoring | External (Revit, etc.) — out of HCW kit |
| Review / clash / markups | Stage artifact · orchestration in rail |
| Model viewer chrome | Compact density · Fitts-sized tools · no duplicate page CTAs |
| Data handoff | Decision freeze + artifact link in outcome banner |

---

## 7. Cost · schedule · quality trade-offs

Every commercial Decision card should expose **three impact chips** (cost · time · quality/risk) — contiguous (Mayer), capped at three. Dock RIGHT commits the chosen alternative; freeze records the trade-off.

---

## 8. Decision traceability

| Record | UX home |
| --- | --- |
| Pending | Rail Decision queue |
| Frozen | Read-only Stage/rail archive + lock pictogram |
| Outcome | `publishOutcome` / ActionOutcomeBanner |
| Audit | Product log — kit supplies the interaction grammar only |

---

## 9. Field usability

| Rule | Detail |
| --- | --- |
| Density | Prefer `KitRoot density="comfortable"` + COGA calm floors when calm ships |
| Targets | ≥44px always; gloves/sun → prefer 48+ in field mode (product token) |
| Chrome | Collapse rail earlier; Taskbar tools over deep ribbon |
| Network | Skeletons + optimistic only where safe; never silent fail |
| Offline | Product concern — UX must show connection state in rail SA strip |

---

## 10. Success (domain)

An overlay-compliant surface improves:

- Communication (shared geography + four questions)
- Errors / rework (freeze + confirm kinds)
- Decision speed (recommendation-first · capacity caps)
- Intuitive delivery for office **and** site (modes + field rules)

KPIs: [HCW-UX-KPI-INSTRUMENT.md](HCW-UX-KPI-INSTRUMENT.md) § Construction.
