# SteelFlow Bounded Context

**Status:** Canonical · **Owner:** HCW · **Reviewed:** 2026-06-15

SteelFlow is ESTI’s reinforcement-detailing sub-domain: member-flow reinforcement
mapping and automated Bar Bending Schedule (BBS) generation. It is embedded
in the Knowledge Bank (`/knowledge-bank?tab=steelflow`) and reachable via the
legacy alias `/steel-arranger`.

## Naming: `sf_*` vs `esti_*`

| Prefix | Scope | Rationale |
| --- | --- | --- |
| `esti_*` | Core AORMS domain | Projects, invoices, drawings, compliance, HR, activity — single-firm office operations |
| `sf_*` | SteelFlow only | Isolated session/element/rebar model; can evolve independently of project costing tables |

SteelFlow tables use the **`sf_`** prefix in PostgreSQL and Drizzle exports
(`sfSessions`, `sfElements`, `sfRebars`, `sfStirrups`). They do **not** use
the `esti_` table prefix because:

1. **Bounded context** — SteelFlow is a tool module, not a statutory office record.
2. **Migration clarity** — migration `0022_steel_arranger.sql` created a distinct
   schema island; grep and backups can target `sf_%` without touching core tables.
3. **Optional linkage** — `sf_sessions.project_id` is nullable; sessions can exist
   without a project office row (Knowledge Bank lab work).

Core BBS registers on projects (`esti_bbs`, `esti_bbs_item`) remain under
`esti_*` for approved project deliverables. SteelFlow sessions may feed those
registers in future phases but are not the same persistence model.

## Catalogue vs workshop

SteelFlow in the Knowledge Bank has two layers:

| Layer | Purpose |
| --- | --- |
| **Catalogue** (`esti_structural_element_template`) | Versioned IS-aligned configurations: section (e.g. 230×600 mm), M25, bar roles (top, bottom, extra, skin), stirrups, and **length rules** |
| **Workshop** (`sf_*` sessions) | Project or lab BBS sessions; slab/beam/column/footing members are mapped as flow nodes, then bars and links generate BBS rows |

### Length rules (catalogue → cutting length)

| Rule | Example |
| --- | --- |
| `FULL_SPAN` | Main top/bottom bars = beam span |
| `SPAN_FRACTION` | Extra top at supports = **L/4** (`spanFraction: 0.25`) |
| `FIXED_MM` | Constant lap / chair length |
| `DEVELOPMENT_LENGTH` | `Ld` from IS:456 cl.26.2 |

Contracts: `packages/contracts/src/steelflow-catalog.ts` — `applySteelFlowCatalogEntry()`.

API: `knowledgeBank.createSteelFlowCatalog`, `listPublishedSteelFlowCatalog`, `steelflow.applyCatalog`.

## Tables

| Table | Drizzle export | Purpose |
| --- | --- | --- |
| `sf_sessions` | `sfSessions` | Named BBS workspace; optional `project_id` |
| `sf_elements` | `sfElements` | Beam/column/slab/footing geometry within a session |
| `sf_rebars` | `sfRebars` | Longitudinal bars (mark, dia, shape, canvas position) |
| `sf_stirrups` | `sfStirrups` | Transverse reinforcement (spacing, hooks, zone) |

Cascade deletes: session → elements → rebars/stirrups.

## Code layout

| Layer | Location |
| --- | --- |
| Schema | `backend/src/db/schema/steelflow.ts` |
| API | `backend/src/modules/steelflow/router.ts` |
| UI panel | `frontend/src/components/knowledge/SteelArranger.tsx` |
| BBS engine | `frontend/src/engine/bbsEngine.ts` |

## Activity and audit

SteelFlow mutations write to **`esti_audit`** (entity `steelflow` / session id)
via the steelflow router. They do **not** yet emit `esti_activity` events — lab
sessions are not project timeline events unless linked to a `project_id`
(planned when export-to-project-BBS is wired in Phase 8).

## Related documents

- [ROADMAP Phase 2E](ROADMAP.md) — SteelFlow delivery scope
- [STEELFLOW-BBS-FLOW](STEELFLOW-BBS-FLOW.md) — current member-flow interface and IS-rule boundary
- [ARCHITECTURE](ARCHITECTURE.md) — stack and ADRs
- [CARBON-UI-DIRECTION](CARBON-UI-DIRECTION.md) — SteelFlow tab uses standard Carbon shell
