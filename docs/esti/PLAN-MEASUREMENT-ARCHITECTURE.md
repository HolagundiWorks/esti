# Plan measurement — architecture

**Status:** Phase 3 in progress (2026-07) — PDF.js native plan upload + render.  
Phases 1–2: items library, measurement book, floors, DXF→SVG plan reader + markup.

## Purpose

Office-standard **items library** drives project **measurement sheets** (Indian abstract format):

| Particulars | Length | Breadth | Height | Area/Volume | UOM | Rate |

Plan markers (walls, doors, windows, heights) will attach to library items and derive sheet rows in Phase 2.

## Three catalogues

| Catalogue | Table prefix | Purpose |
|-----------|--------------|---------|
| **Standard items library** | `esti_item_library_*` | BOQ/measurement templates — code, UOM, L/B/H rules |
| **Spec catalogue** | `esti_spec_catalog_*` | Finish/material specs for project spec sheets (existing) |
| **Measurement book** | `esti_measurement_*` | Project-scoped quantity instances |

Optional link: `esti_item_library_item.spec_catalog_item_id` → spec catalogue row.

## Data model

```
esti_item_library_version
esti_item_library_item

esti_building_level          (per project — GF, FF1, …)
esti_measurement_book        (per project, frozen library version on issue)
esti_measurement_row

esti_plan_markup_set         (Phase 2 — per drawing revision)
esti_plan_markup_item
esti_sheet_calibration       (Phase 2 — PDF/DXF page scale)
```

## Quantity derivation

Stored dimensions in **mm**; `quantity` is derived from `measureKind` + `uom` via `@esti/contracts` `deriveMeasurementQuantity()`.

| measureKind | Typical uom | Formula |
|-------------|-------------|---------|
| L | RMT | L / 1000 |
| LB | SQM | L × B / 1e6 |
| LBH | CUM | L × B × H / 1e9 |
| COUNT | NOS | count (default 1) |

Manual overrides set `derivation = OVERRIDE`.

## API (tRPC)

| Namespace | Scope |
|-----------|--------|
| `itemLibrary` | Office library versions + items |
| `measurement` | Project book, rows, building levels, derive-from-markup |
| `planMarkup` | Sheet calibration + markup sets/items on a drawing |

## UI

| Route | Screen |
|-------|--------|
| `/libraries/items` | Item library admin (mirror spec catalogue) |
| `/libraries/spec-catalog` | Spec catalogue (existing) |
| Project → **Settings** | **Building floors** — LVL 0…10 count, floor-name map, FFL-to-FFL heights |
| Project → **Measurement** tab | **Sheet \| Plan** toggle — abstract grid + SVG plan reader |

## Building floors (LVL stack)

- Contiguous **LVL 0 … LVL N** (N ≤ 10).
- **Ownership rule:** the storey between LVL *n* and LVL *n+1* belongs to **LVL *n***  
  (LVL 0 = 0→1, LVL 1 = 1→2, …). The top level’s height is FFL → roof/parapet.
- User maps each level to a **floor name** (LVL 0 often Basement / Ground / Stilt).
- Each level stores that storey’s **FFL-to-FFL height** (mm). Absolute FFL elevation is derived from LVL 0 datum.
- Measurement rows **link** to a level: height is owned by that level’s storey
  (column = lvl − slab − beam; wall = lvl − slab − beam − lintel).
- **Beam / lintel cascade:** project defaults ← per-level override ← per-row override
  (blank at a layer means inherit from the layer above). Use this when floors or
  spans have different beam depths or lintels.
- Saving **Building floors** or **Structural deductions** re-syncs linked AUTO rows.
- Measurement dock action **Sync heights** re-applies on demand.
- Qty OVERRIDE rows keep their manual quantity; height still follows the level unless unlinked.

## Phases

1. ✅ Items library + measurement book + levels
2. ✅ Plan reader — SVG canvas (from DXF render), calibration, markup tools, push to sheet
3. ✅ PDF.js native plan upload — upload PDF drawings (READY immediately), render page 0 under the same markup overlay; DXF path unchanged
4. 🔲 Export Excel/PDF abstract; rates when cost spine returns

See also: [HCW-UI-KIT.md](./HCW-UI-KIT.md) (rail · stage for Plan studio).
