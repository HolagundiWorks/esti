# AORMS Stability Charter

**Status:** Canonical · **Owner:** Holagundi Consulting Works (HCW) · **Reviewed:** 2026-06-19

Long-term product discipline for AORMS. Architects use CAD, BIM, modeling,
and rendering tools as their **primary** workspace. AORMS is the **secondary**
office record — projects, fees, CRIF, documents, coordination, and traceability.

See also [PRODUCT-VISION](PRODUCT-VISION.md), [ROADMAP](ROADMAP.md), and
[ARCHITECTURE](ARCHITECTURE.md).

> **Browser-geometry ban LIFTED (2026-07-19).** ESTICAD is retired and AORMS is
> web-only, so measuring in the browser is now the *only* way to take off
> quantities — and it is explicitly supported. Note this rule had already
> drifted from the code: on-canvas calibrate/measure/markup shipped in
> `PlanReaderPanel.tsx` under Plan Measurement Phases 1–3 while the charter
> still forbade it. The rule below is corrected to match reality.

---

## Role in the practice

| Layer | Tools | AORMS role |
| --- | --- | --- |
| Primary | Revit, SketchUp, Rhino, AutoCAD, Blender, etc. | None — do not compete |
| ~~Bridge~~ | ~~ESTICAD desktop (takeoff + CAD AI)~~ | **Retired 2026-07-19** |
| Secondary | AORMS web | Record, coordinate, bill, search, advise |

Design geometry, rendering, and mark-up stay in primary tools. AORMS stores
decisions, issued documents, commercial records, and estimate quantities.

---

## Stability rules

These rules apply to all material changes unless the roadmap records an explicit
charter exception with migration plan and redirects.

| Rule | Meaning |
| --- | --- |
| **IA freeze** | Side nav, project tabs, Work module URLs (`/tasks?tab=`), and portal entry points do not rename or move without a deprecation period and redirects. Phase 2G (2026-06-15) was the last major IA pass. |
| **Browser takeoff is the takeoff** *(replaces "No browser geometry", lifted 2026-07-19)* | Measuring happens **in the browser**: open a drawing (DXF→SVG or PDF), two-point **calibrate** the sheet, then measure/mark up. Quantities land in the measurement book and flow to estimates. Scope guard: AORMS measures **on 2D sheets** — it is not a CAD editor and does not author or edit geometry. Design geometry still belongs to the primary tools. |
| **Human issue only** | AI (ESTI agent, AI Studio) never auto-issues invoices, drawings, CRIF decisions, or portal messages. |
| **Additive schema** | Prefer new optional columns and API fields over reshaping workflows. |
| **Secondary UX** | Marketing landing and dashboard polish do not drive in-app navigation changes. |
| **Read-only agent** | ESTI (Alt+A) reads live AORMS data and suggests next steps; it does not execute mutations or uploads on behalf of the user. |

---

## Default answer: no

Unless a paying firm sponsors a pilot and the roadmap accepts a charter exception:

- Web takeoff or in-browser drawing markup
- In-browser CRIF annotation canvas (store the decision record, not the canvas)
- Live BPAS / AutoPlan / authority portal polling
- Contractor inventory, GRN, labour, or construction ERP
- Contractor-side RA accounting ledgers remain out of scope; architect-side site-measurement verification and client forwarding are in scope (rebuilding as the CMS).
- CAD/BIM vendor asset libraries inside the Item Library / Construction Knowledge Bank
- Real-time SSE/push before scale justifies it
- Major dashboard relayout or new top-level nav modules
- AI that auto-acts on office records

Deferred P3 ideas in [ROADMAP](ROADMAP.md) remain **charter-rejected by default**.

---

## What we implement instead

1. **Production ops** — backup/restore drill, pagination, smoke tests — **Phase 12 engineering complete**; operator restore sign-off remains ([PRODUCTION-OPS](PRODUCTION-OPS.md)).
2. ~~**ESTICAD bridge** — cloud measurements, drawing link, device admin~~ — **dropped 2026-07-19**.
3. **Incremental record-keeping** — exports, search, deep links, lessons learned, spec catalogue consumption.
4. **Documentation accuracy** — PRD, module profile, and roadmap stay aligned with code.

---

## Change process

Every material feature pull request must:

1. Update [PRD](PRD.md) and [ROADMAP](ROADMAP.md) in the same change set.
2. State whether the change touches IA, geometry capture, or AI issue paths.
3. If yes, cite a charter exception or confirm the change is additive/performance-only.

Point-in-time audit files are not added; findings go into the roadmap backlog.
