# SteelFlow BBS Flow

SteelFlow is the reinforcement quantity and BBS workspace for AORMS. It is a
rule-assisted detailing aid, not a structural design authority. Structural
drawings, bar sizes, curtailment, laps, anchorage, and final issue remain under
the responsible structural engineer.

## Interface Model

The workshop uses a member-flow canvas:

1. Footing
2. Column
3. Beam
4. Slab

Each node is a structural member instance with geometry, concrete grade, TMT
yield grade, and cover. Selecting a node opens the reinforcement editor for that
member. Bar groups and links/stirrups generate BBS rows deterministically.

## Member Components

| Member | Geometry | Reinforcement groups | Links |
| --- | --- | --- | --- |
| Footing | Length, width, depth, cover | Bottom X, bottom Y, optional top mesh | No |
| Column | Height, width, depth, cover | Corner/main longitudinal bars, intermediate face bars | Closed/open ties |
| Beam | Span, width, depth, cover | Bottom main, top main, extra top/bottom, side-face bars | Stirrups |
| Slab | Span, strip width, thickness, cover | Bottom mesh, top negative mesh, distribution bars | No |

## TMT Bars

The shared SteelFlow contract exposes IS 1786 nominal bar diameters:

`4, 5, 6, 8, 10, 12, 16, 20, 25, 28, 32, 36, 40, 45, 50 mm`

The UI exposes common IS 1786 grade families:

`Fe415`, `Fe415D`, `Fe415S`, `Fe500`, `Fe500D`, `Fe500S`,
`Fe550`, `Fe550D`, `Fe600`

The persisted member currently stores the yield value (`fy`) because existing
database schema stores grade as a number. D/S ductility suffixes are treated as
selection guidance until material certificate tracking is added.

## Code References

SteelFlow currently encodes:

- IS 456:2000 rule-assist references for development length, cover prompts,
  steel ratio warnings, and stirrup/link spacing prompts.
- IS 2502:1963 bending/BBS conventions for straight, L-bend, Z/S-bend,
  hairpin/U-shape, cranked, and closed-stirrup cutting lengths.
- IS 1786:2008 nominal TMT diameter and grade families.

The rule engine deliberately warns instead of approving. It should block only
deterministic data-quality failures, such as missing bars or impossible
quantities. Engineering acceptance remains outside the app.

## BBS Extraction

For each selected member, SteelFlow computes:

- bar mark
- diameter
- shape code
- quantity
- cutting length
- total length
- unit weight using `d² / 162`
- total steel weight

The BBS table can be exported to Excel from the member editor. Server-side BBS
generation remains available through the `steelflow.generateBbs` API for full
session extraction.

## Implementation

- UI: `frontend/src/components/knowledge/SteelArranger.tsx`
- Shared calculations and schemas: `packages/contracts/src/steel-arranger.ts`
- BBS row wrapper: `frontend/src/engine/bbsEngine.ts`
- API and persistence: `backend/src/modules/steelflow/router.ts`
- Database tables: `sf_sessions`, `sf_elements`, `sf_rebars`, `sf_stirrups`

## Sources

- IS 456:2000, Plain and Reinforced Concrete Code of Practice.
- IS 2502:1963, Code of Practice for Bending and Fixing of Bars for Concrete Reinforcement.
- IS 1786:2008, High Strength Deformed Steel Bars and Wires for Concrete Reinforcement.
