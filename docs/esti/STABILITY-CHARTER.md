# AORMS Stability Charter

**Status:** Canonical · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-18

Long-term product discipline for ESTI AORMS. Architects use CAD, BIM, modeling,
and rendering tools as their **primary** workspace. AORMS is the **secondary**
office record — projects, fees, CRIF, documents, coordination, and traceability.

See also [PRODUCT-VISION](PRODUCT-VISION.md), [ROADMAP](ROADMAP.md), and
[ESTICAD-COMPANION](ESTICAD-COMPANION.md).

---

## Role in the practice

| Layer | Tools | AORMS role |
| --- | --- | --- |
| Primary | Revit, SketchUp, Rhino, AutoCAD, Blender, etc. | None — do not compete |
| Bridge | ESTICAD desktop (takeoff + CAD AI) | Thin companion only |
| Secondary | ESTI AORMS web | Record, coordinate, bill, search, advise |

Design geometry, rendering, and mark-up stay in primary tools. AORMS stores
decisions, issued documents, commercial records, and synced takeoff quantities.

---

## Stability rules

These rules apply to all material changes unless the roadmap records an explicit
charter exception with migration plan and redirects.

| Rule | Meaning |
| --- | --- |
| **IA freeze** | Side nav, project tabs, Work module URLs (`/tasks?tab=`), and portal entry points do not rename or move without a deprecation period and redirects. Phase 2G (2026-06-15) was the last major IA pass. |
| **No browser geometry** | No web takeoff, scale setting, or drawing markup. Drawing actions: register version, transmittal, **Open in ESTICAD**, export. |
| **Human issue only** | AI (ESTI agent, AI Studio, ESTICAD AI) never auto-issues invoices, drawings, CRIF decisions, or portal messages. |
| **Additive schema** | Prefer new optional columns and API fields over reshaping workflows. Breaking companion API changes require versioned contracts. |
| **Secondary UX** | Marketing landing and dashboard polish do not drive in-app navigation changes. |
| **Read-only agent** | ESTI (Alt+A) reads live AORMS data and suggests next steps; it does not execute mutations or uploads on behalf of the user. |

---

## Default answer: no

Unless a paying firm sponsors a pilot and the roadmap accepts a charter exception:

- Web takeoff or in-browser drawing markup
- In-browser CRIF annotation canvas (store the decision record, not the canvas)
- Live BPAS / AutoPlan / authority portal polling
- Contractor inventory, GRN, labour, RA-billing, or construction ERP
- CAD/BIM vendor asset libraries inside Knowledge Bank
- Real-time SSE/push before scale justifies it
- Major dashboard relayout or new top-level nav modules
- AI that auto-acts on office records

Deferred P3 ideas in [ROADMAP](ROADMAP.md) remain **charter-rejected by default**.

---

## What we implement instead

1. **Production ops** — backup/restore drill, pagination, smoke tests (Phase 12).
2. **ESTICAD bridge** — cloud measurements, drawing link, device admin (Phase 13B/C/E before 13D).
3. **Incremental record-keeping** — exports, search, deep links, lessons learned, spec catalogue consumption.
4. **Documentation accuracy** — PRD, module profile, and roadmap stay aligned with code.

---

## Change process

Every material feature pull request must:

1. Update [PRD](PRD.md) and [ROADMAP](ROADMAP.md) in the same change set.
2. State whether the change touches IA, geometry capture, or AI issue paths.
3. If yes, cite a charter exception or confirm the change is additive/performance-only.

Point-in-time audit files are not added; findings go into the roadmap backlog.
