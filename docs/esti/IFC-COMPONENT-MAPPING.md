# AORMS IFC Component Mapping Standard

**Status:** Canonical · Component / IFC mapping standard underpinning the
[ESTIMATION-OS-ARCHITECTURE](ESTIMATION-OS-ARCHITECTURE.md) component master ·
**Reviewed:** 2026-06-25

## Document Status

**Product:** AORMS  
**Module:** Estimation OS / IFC Component Master  
**Purpose:** Detailed IFC-to-AORMS component mapping for estimation, auto BOQ generation, quantity input forms, ratebook linking, running bills, and dependency intelligence.  
**Principle:** IFC provides the building-object language. AORMS provides the business/control code, estimation logic, billing logic, and execution intelligence.

---

# 1. Core Philosophy

AORMS should not treat estimation as loose BOQ entry.

The correct hierarchy is:

```text
IFC Entity / AORMS Component
↓
AORMS Component Code
↓
Specification / Ratebook Item
↓
Input Parameters
↓
Quantity Formula
↓
Auto BOQ Items
↓
Work Package
↓
Running Bill
↓
Deviation / Revision
```

IFC should help identify *what the object is*.

AORMS should decide:

```text
How it is estimated
How it is coded
How it is billed
How it is sequenced
How it is revised
```

---

# 2. IFC vs AORMS Identity

## 2.1 Do Not Use IFC GlobalId as Main Code

IFC GlobalIds may change when models are exported, copied, reauthored, regenerated, or exchanged between software.

AORMS must maintain its own stable component code.

Example:

```text
AORMS Code     : SB-STR-FT-01
IFC Entity     : IfcFooting
IFC GlobalId   : 3hYxA82kL9d...
Human Label    : Footing F1
```

## 2.2 IFC Property Set

When IFC tagging/export is available, attach AORMS metadata using:

```text
Pset_AORMS_Component
```

### Properties

```text
AORMSCode
AORMSLevel
AORMSDiscipline
AORMSComponentType
AORMSParentCode
AORMSRevision
AORMSStatus
AORMSBOQItemId
AORMSRatebookId
AORMSEstimateId
AORMSWorkPackageId
AORMSBillingStatus
```

---

# 3. AORMS Component Code Standard

## 3.1 Format

```text
[LEVEL]-[DISCIPLINE]-[COMPONENT]-[SEQUENCE]
```

Example:

```text
SB-STR-FT-01
```

Meaning:

```text
SB  = Substructure
STR = Structural
FT  = Footing
01  = Sequence
```

## 3.2 Level Codes

| Code | Meaning |
|---|---|
| SB | Substructure |
| BM | Basement |
| GF | Ground Floor |
| F1 | First Floor |
| F2 | Second Floor |
| F3 | Third Floor |
| RF | Roof |
| TF | Terrace |
| EX | External Works |
| ST | Staircase Zone |
| LT | Lift Core |
| SITE | Site-wide |

## 3.3 Discipline Codes

| Code | Meaning |
|---|---|
| STR | Structural |
| ARC | Architectural |
| MAS | Masonry |
| FIN | Finishes |
| INT | Interiors |
| FUR | Furniture |
| ELE | Electrical |
| PLB | Plumbing |
| HVAC | HVAC |
| FIRE | Fire Fighting |
| SEC | Security / ELV |
| EXT | External Development |
| LND | Landscape |
| EQP | Equipment |
| PEB | Pre-Engineered Building |
| CIV | Civil Ancillary |
| TEMP | Temporary Works |
| OTH | Others |

---

# 4. Master Database Structure

## 4.1 component_master

```ts
component_master {
  id: uuid
  project_id: uuid

  aorms_code: string
  human_label: string | null

  ifc_global_id: string | null
  ifc_entity_type: string | null
  ifc_predefined_type: string | null

  level_code: string
  discipline_code: string
  component_type_code: string
  sequence_no: number

  parent_component_id: uuid | null
  source: "manual" | "ifc_import" | "design_assumption" | "execution_detail" | "revision"

  status: "assumed" | "estimated" | "detailed" | "issued" | "executed" | "billed" | "closed"

  created_at: timestamp
  updated_at: timestamp
}
```

## 4.2 ifc_component_mapping

```ts
ifc_component_mapping {
  id: uuid

  ifc_entity_type: string
  ifc_predefined_type: string | null

  aorms_discipline_code: string
  aorms_component_type_code: string
  component_name: string

  default_uom: string
  default_formula_id: uuid | null

  allowed_ratebook_category: string[]
  default_related_item_template_id: uuid | null

  is_physical_component: boolean
  is_process_component: boolean
}
```

## 4.3 component_input_schema

```ts
component_input_schema {
  id: uuid
  mapping_id: uuid

  field_name: string
  label: string
  data_type: "number" | "text" | "boolean" | "select"
  unit: string | null

  required: boolean
  default_value: string | number | null
  min_value: number | null
  max_value: number | null

  visibility_rule: string | null
}
```

## 4.4 component_related_items

```ts
component_related_items {
  id: uuid
  mapping_id: uuid

  related_item_code: string
  related_item_name: string
  ratebook_category: string

  default_uom: string
  quantity_formula_id: uuid | null

  sequence_order: number
  required: boolean
  condition_rule: string | null

  creates_child_component: boolean
  child_component_type_code: string | null
}
```

## 4.5 quantity_formula_master

```ts
quantity_formula_master {
  id: uuid
  formula_code: string
  name: string
  expression: string

  output_uom: string
  required_inputs: string[]
  fixed_inputs: jsonb
  formula_type: "area" | "volume" | "length" | "weight" | "number" | "percentage" | "lumpsum"
}
```

---

# 5. Standard UOM List

| Code | Meaning | Used For |
|---|---|---|
| cum | Cubic metre | Concrete, excavation, brickwork |
| sqm | Square metre | Plaster, paint, flooring, waterproofing |
| rmt | Running metre | Pipes, conduits, skirting, railing |
| nos | Numbers | Doors, windows, fixtures, equipment |
| kg | Kilogram | Reinforcement, steel |
| ton | Metric tonne | Structural steel, PEB |
| sqft | Square feet | Design-stage estimates |
| ls | Lump sum | Provisional or non-modeled items |
| day | Day | Labour/equipment |
| hour | Hour | Equipment/labour |
| point | Point | Electrical/plumbing points |

---

# 6. Standard Formula Library

## 6.1 Volume

```text
volume = length * breadth * depth
```

Used for:

```text
Concrete
Excavation
PCC
RCC
Backfilling
```

## 6.2 Wall Volume

```text
quantity = (length * height * thickness) - opening_deduction_volume
```

Used for:

```text
Brickwork
Blockwork
Stone masonry
```

## 6.3 Surface Area

```text
area = (length * height * sides) - opening_deduction_area
```

Used for:

```text
Plaster
Paint
Cladding
Wall finishes
```

## 6.4 Floor Area

```text
area = length * breadth
```

Used for:

```text
Flooring
Ceiling
Waterproofing
Screed
```

## 6.5 Count

```text
quantity = count
```

Used for:

```text
Doors
Windows
Lights
Sanitary fixtures
Furniture
Equipment
```

## 6.6 Linear

```text
quantity = length
```

Used for:

```text
Pipes
Conduits
Skirting
Railing
Cable trays
```

## 6.7 Steel Weight

```text
weight = bar_length * unit_weight * number_of_bars
```

Alternative:

```text
unit_weight = (diameter * diameter) / 162
```

---

# 7. Structural Components Mapping

## 7.1 IfcFooting → Footing

### AORMS Mapping

| Field | Value |
|---|---|
| IFC Entity | IfcFooting |
| AORMS Discipline | STR |
| AORMS Component Code | FT |
| Default UOM | cum |
| Example Code | SB-STR-FT-01 |

### Input Parameters

| Field | Unit | Required | Notes |
|---|---|---|---|
| length | m | yes | Footing length |
| breadth | m | yes | Footing breadth |
| depth | m | yes | RCC footing depth |
| excavation_depth | m | optional | If excavation item generated |
| pcc_thickness | m | optional | Default from specification |
| cover | mm | optional | For steel engine |
| concrete_grade | text | optional | M20/M25 etc. |
| steel_grade | text | optional | Fe500 etc. |

### Main Quantity Formula

```text
rcc_quantity = length * breadth * depth
```

### Related Items

| Related Item | UOM | Formula / Logic | Required |
|---|---|---|---|
| Earthwork excavation | cum | length * breadth * excavation_depth | yes |
| Anti-termite treatment | sqm | length * breadth | optional |
| PCC bed | cum | length * breadth * pcc_thickness | yes |
| RCC concrete | cum | length * breadth * depth | yes |
| Reinforcement steel | kg | from steel/BBS engine or thumb rule | yes |
| Shuttering | sqm | side surface area | optional |
| Backfilling | cum | excavation - concrete volume | optional |
| Curing | sqm/ls | surface-based or lump sum | optional |

### Child Component Codes

```text
SB-CIV-EXC-FT01
SB-CIV-ATT-FT01
SB-STR-PCC-FT01
SB-STR-RCC-FT01
SB-STR-STL-FT01
SB-STR-SHT-FT01
SB-CIV-BKF-FT01
```

---

## 7.2 IfcColumn → Column

| Field | Value |
|---|---|
| IFC Entity | IfcColumn |
| AORMS Discipline | STR |
| Component Code | COL |
| Default UOM | cum |
| Example | GF-STR-COL-01 |

### Inputs

| Field | Unit | Required |
|---|---|---|
| width | m | yes |
| depth | m | yes |
| height | m | yes |
| concrete_grade | text | optional |
| steel_grade | text | optional |
| cover | mm | optional |

### Formula

```text
concrete_quantity = width * depth * height
```

### Related Items

| Item | UOM | Logic |
|---|---|---|
| RCC concrete | cum | width * depth * height |
| Reinforcement steel | kg | BBS / thumb rule |
| Shuttering | sqm | perimeter * height |
| Curing | sqm/ls | surface-based |

---

## 7.3 IfcBeam → Beam

| Field | Value |
|---|---|
| IFC Entity | IfcBeam |
| AORMS Discipline | STR |
| Component Code | BM |
| Default UOM | cum |

### Inputs

| Field | Unit | Required |
|---|---|---|
| width | m | yes |
| depth | m | yes |
| length | m | yes |
| concrete_grade | text | optional |
| steel_grade | text | optional |

### Formula

```text
concrete_quantity = width * depth * length
```

### Related Items

| Item | UOM |
|---|---|
| RCC concrete | cum |
| Reinforcement steel | kg |
| Shuttering | sqm |
| Curing | sqm/ls |

---

## 7.4 IfcSlab → RCC Slab

| Field | Value |
|---|---|
| IFC Entity | IfcSlab |
| AORMS Discipline | STR |
| Component Code | SLB |
| Default UOM | cum |

### Inputs

| Field | Unit | Required |
|---|---|---|
| length | m | yes |
| breadth | m | yes |
| thickness | m | yes |
| opening_deduction_area | sqm | optional |

### Formula

```text
concrete_quantity = (length * breadth - opening_deduction_area) * thickness
```

### Related Items

| Item | UOM |
|---|---|
| RCC concrete | cum |
| Reinforcement steel | kg |
| Centering / shuttering | sqm |
| Curing | sqm |

---

## 7.5 IfcWall / IfcWallStandardCase → RCC Wall / Shear Wall

| Field | Value |
|---|---|
| IFC Entity | IfcWall |
| AORMS Discipline | STR |
| Component Code | RCCW |
| Default UOM | cum |

### Inputs

| Field | Unit |
|---|---|
| length | m |
| height | m |
| thickness | m |
| opening_deduction_volume | cum |

### Related Items

| Item | UOM |
|---|---|
| RCC concrete | cum |
| Steel | kg |
| Shuttering | sqm |
| Curing | sqm |

---

## 7.6 IfcStair → Staircase

| Field | Value |
|---|---|
| IFC Entity | IfcStair |
| AORMS Discipline | STR |
| Component Code | STC |
| Default UOM | ls/cum |

### Inputs

| Field | Unit |
|---|---|
| flight_length | m |
| waist_slab_thickness | m |
| width | m |
| landing_area | sqm |

### Related Items

| Item | UOM |
|---|---|
| RCC staircase concrete | cum |
| Reinforcement | kg |
| Shuttering | sqm |
| Tread/riser finish | sqm |
| Railing | rmt |

---

# 8. Masonry Components Mapping

## 8.1 IfcWall → Brick Wall 230mm

| Field | Value |
|---|---|
| IFC Entity | IfcWall |
| AORMS Discipline | MAS |
| Component Code | BRW |
| Default UOM | cum |
| Thickness | 0.23m fixed |

### Inputs

| Field | Unit | Required |
|---|---|---|
| length | m | yes |
| height | m | yes |
| opening_deduction_area | sqm | optional |

### Formula

```text
quantity = (length * height - opening_deduction_area) * 0.23
```

### Related Items

| Item | UOM | Dependency |
|---|---|---|
| Brickwork | cum | base |
| Electrical conduit chase | rmt/point | before plaster |
| Plumbing conduit chase | rmt/point | before plaster |
| Plaster | sqm | after conduits |
| Primer | sqm | after plaster |
| Paint | sqm | after primer |
| Skirting | rmt | after flooring |

---

## 8.2 IfcWall → Brick Wall 115mm

| Field | Value |
|---|---|
| Component Code | BRW |
| Thickness | 0.115m |
| UOM | cum |

### Inputs

```text
length
height
opening_deduction_area
```

### Formula

```text
quantity = (length * height - opening_deduction_area) * 0.115
```

---

## 8.3 IfcWall → AAC / Blockwork

| Field | Value |
|---|---|
| Component Code | BLW |
| UOM | cum |
| Thickness | From specification |

### Inputs

```text
length
height
opening_deduction_area
thickness if not fixed by spec
```

### Related Items

```text
Blockwork
Reinforcement mesh if specified
Electrical chase
Plumbing chase
Plaster / putty / paint
```

---

# 9. Architectural Finish Components

## 9.1 IfcCovering → Internal Plaster

| Field | Value |
|---|---|
| IFC Entity | IfcCovering |
| AORMS Discipline | FIN |
| Component Code | PLS |
| Default UOM | sqm |

### Inputs

| Field | Unit |
|---|---|
| length | m |
| height | m |
| sides | nos |
| opening_deduction_area | sqm |

### Formula

```text
quantity = (length * height * sides) - opening_deduction_area
```

### Related Items

```text
Surface preparation
Plaster
Curing
Putty if applicable
Primer
Paint
```

---

## 9.2 IfcCovering → External Plaster

| Field | Value |
|---|---|
| Component Code | EPLS |
| UOM | sqm |

### Inputs

```text
length
height
opening_deduction_area
```

### Related Items

```text
Scaffolding
Surface preparation
External plaster
Waterproof additive if applicable
External primer
External paint
```

---

## 9.3 IfcCovering → Flooring

| Field | Value |
|---|---|
| IFC Entity | IfcCovering |
| AORMS Discipline | FIN |
| Component Code | FLR |
| Default UOM | sqm |

### Inputs

| Field | Unit |
|---|---|
| length | m |
| breadth | m |
| deduction_area | sqm |

### Formula

```text
quantity = (length * breadth) - deduction_area
```

### Related Items

```text
Screed / bed mortar
Tile / stone / wood finish
Adhesive
Grouting
Skirting
Polishing if applicable
```

### Dependency Notes

```text
Flooring should generally precede fixed furniture such as TV unit.
Final paint should generally happen after flooring and fixed furniture.
```

---

## 9.4 IfcCovering → Ceiling

| Field | Value |
|---|---|
| IFC Entity | IfcCovering |
| AORMS Discipline | FIN |
| Component Code | CLG |
| Default UOM | sqm |

### Inputs

```text
length
breadth
deduction_area
```

### Related Items

```text
GI framework
Gypsum board
Access panels
Electrical wiring
Light cutouts
HVAC diffuser coordination
Putty
Primer
Paint
```

---

## 9.5 IfcCovering → Painting

| Field | Value |
|---|---|
| Component Code | PTG |
| UOM | sqm |

### Inputs

```text
length
height
sides
opening_deduction_area
coat_count
```

### Related Items

```text
Surface preparation
Putty
Primer
Paint coats
Final touch-up
```

---

## 9.6 IfcCovering → Waterproofing

| Field | Value |
|---|---|
| Component Code | WPF |
| UOM | sqm |

### Inputs

```text
length
breadth
vertical_return_height
perimeter
```

### Formula

```text
quantity = floor_area + (perimeter * vertical_return_height)
```

### Related Items

```text
Surface preparation
Waterproof coating/membrane
Protective screed
Ponding test
```

---

# 10. Doors, Windows, Openings

## 10.1 IfcDoor → Door

| Field | Value |
|---|---|
| IFC Entity | IfcDoor |
| AORMS Discipline | ARC |
| Component Code | DOR |
| Default UOM | nos |

### Inputs

```text
width
height
count
door_type
frame_material
shutter_material
```

### Related Items

```text
Door frame
Door shutter
Hardware
Hinges
Lockset
Polish / laminate / paint
Installation
```

---

## 10.2 IfcWindow → Window

| Field | Value |
|---|---|
| IFC Entity | IfcWindow |
| AORMS Discipline | ARC |
| Component Code | WIN |
| Default UOM | nos/sqm |

### Inputs

```text
width
height
count
frame_material
glass_type
```

### Related Items

```text
Frame
Glass
Hardware
Sealant
Grill if applicable
Installation
```

---

## 10.3 IfcOpeningElement → Opening Deduction

| Field | Value |
|---|---|
| IFC Entity | IfcOpeningElement |
| AORMS Discipline | ARC |
| Component Code | OPN |
| Default UOM | sqm/cum |

### Inputs

```text
width
height
wall_thickness
count
```

### Use

Opening elements should feed deductions into:

```text
Brickwork
Plaster
Paint
Cladding
Concrete wall
```

---

# 11. Interior and Furniture Components

## 11.1 IfcFurniture → Fixed Furniture

| Field | Value |
|---|---|
| IFC Entity | IfcFurniture |
| AORMS Discipline | FUR |
| Component Code | FFU |
| Default UOM | nos/rmt/sqm |

### Inputs

```text
length
height
depth
count
material_spec
finish_spec
```

### Related Items

```text
Carcass
Shutter
Hardware
Laminate/veneer
Countertop if applicable
Installation
```

### Dependency Notes

```text
Fixed furniture often depends on flooring completion.
Final paint usually follows fixed furniture.
Electrical points may need completion before furniture installation.
```

---

## 11.2 IfcFurniture → Loose Furniture

| Field | Value |
|---|---|
| Component Code | LFU |
| UOM | nos |

### Inputs

```text
count
unit_rate
vendor
lead_time
```

### Related Items

```text
Procurement
Delivery
Installation
Warranty
```

---

## 11.3 IfcElementAssembly → TV Unit / Custom Joinery

| Field | Value |
|---|---|
| IFC Entity | IfcElementAssembly / IfcFurniture |
| Discipline | INT/FUR |
| Component Code | TVU |
| UOM | rmt/sqm/nos |

### Inputs

```text
length
height
depth
finish_area
hardware_count
```

### Related Items

```text
Framework
Carcass
Paneling
Hardware
Electrical coordination
Back panel
Finish
```

---

# 12. Electrical Components

## 12.1 IfcCableCarrierSegment → Electrical Conduit

| Field | Value |
|---|---|
| IFC Entity | IfcCableCarrierSegment |
| AORMS Discipline | ELE |
| Component Code | CON |
| Default UOM | rmt |

### Inputs

```text
length
diameter
route_type
point_count
```

### Related Items

```text
Conduit
Junction boxes
Chasing
Pull wire
Fixing accessories
Testing
```

### Dependency Notes

```text
Conduits before plaster.
Ceiling conduits before false ceiling closure.
```

---

## 12.2 IfcCableSegment → Wiring

| Field | Value |
|---|---|
| IFC Entity | IfcCableSegment |
| Component Code | WIR |
| UOM | rmt |

### Inputs

```text
length
wire_size
circuit_count
```

### Related Items

```text
Wire
Pulling
Termination
Testing
```

---

## 12.3 IfcElectricDistributionBoard → Distribution Board

| Field | Value |
|---|---|
| IFC Entity | IfcElectricDistributionBoard |
| Component Code | DBX |
| UOM | nos |

### Inputs

```text
count
phase_type
capacity
module_count
```

### Related Items

```text
DB box
MCB/RCCB
Wiring
Earthing
Testing
Labeling
```

---

## 12.4 IfcLightFixture → Light Fixture

| Field | Value |
|---|---|
| IFC Entity | IfcLightFixture |
| Component Code | LGT |
| UOM | nos |

### Inputs

```text
count
fixture_type
wattage
mounting_type
```

### Related Items

```text
Fixture
Driver
Installation
Testing
```

---

## 12.5 IfcSwitchingDevice → Switch / Socket

| Field | Value |
|---|---|
| IFC Entity | IfcSwitchingDevice |
| Component Code | SWT |
| UOM | nos/point |

### Inputs

```text
point_count
module_count
switch_type
```

### Related Items

```text
Switch plates
Boxes
Wiring
Installation
Testing
```

---

# 13. Plumbing Components

## 13.1 IfcPipeSegment → Pipe Network

| Field | Value |
|---|---|
| IFC Entity | IfcPipeSegment |
| AORMS Discipline | PLB |
| Component Code | PIP |
| Default UOM | rmt |

### Inputs

```text
length
diameter
pipe_material
pressure_class
```

### Related Items

```text
Pipe
Fittings
Supports
Valves
Testing
Insulation if applicable
```

---

## 13.2 IfcPipeFitting → Pipe Fittings

| Field | Value |
|---|---|
| IFC Entity | IfcPipeFitting |
| Component Code | PFT |
| UOM | nos |

### Inputs

```text
count
diameter
fitting_type
```

### Related Items

```text
Elbows
Tees
Reducers
Couplers
Solvent/cement
Installation
```

---

## 13.3 IfcSanitaryTerminal → Sanitary Fixture

| Field | Value |
|---|---|
| IFC Entity | IfcSanitaryTerminal |
| Component Code | SAN |
| UOM | nos |

### Inputs

```text
count
fixture_type
brand_spec
```

### Related Items

```text
WC/wash basin/urinal
Faucets
Traps
Waste connection
Installation
Testing
```

---

## 13.4 IfcTank → Water Tank

| Field | Value |
|---|---|
| IFC Entity | IfcTank |
| Component Code | TNK |
| UOM | nos/litre |

### Inputs

```text
capacity
count
material
```

### Related Items

```text
Tank
Base support
Inlet/outlet connections
Overflow
Float valve
Installation
```

---

# 14. HVAC Components

## 14.1 IfcDuctSegment → Duct

| Field | Value |
|---|---|
| IFC Entity | IfcDuctSegment |
| Discipline | HVAC |
| Component Code | DCT |
| UOM | sqm/rmt |

### Inputs

```text
length
width
height
gauge
```

### Related Items

```text
Ducting
Insulation
Supports
Dampers
Testing
```

---

## 14.2 IfcAirTerminal → Diffuser / Grill

| Field | Value |
|---|---|
| IFC Entity | IfcAirTerminal |
| Component Code | DIF |
| UOM | nos |

### Inputs

```text
count
size
type
```

### Related Items

```text
Diffuser/grill
Neck
Damper
Installation
Balancing
```

---

## 14.3 IfcUnitaryEquipment → AC Unit

| Field | Value |
|---|---|
| IFC Entity | IfcUnitaryEquipment |
| Component Code | ACU |
| UOM | nos |

### Inputs

```text
count
capacity_tr
unit_type
```

### Related Items

```text
Indoor unit
Outdoor unit
Copper piping
Drain piping
Electrical connection
Installation
Testing
```

---

# 15. Fire Fighting Components

## 15.1 IfcFireSuppressionTerminal → Sprinkler

| Field | Value |
|---|---|
| IFC Entity | IfcFireSuppressionTerminal |
| Discipline | FIRE |
| Component Code | SPR |
| UOM | nos |

### Inputs

```text
count
sprinkler_type
```

### Related Items

```text
Sprinkler head
Pipe connection
Testing
```

---

## 15.2 IfcPipeSegment → Fire Pipe

| Field | Value |
|---|---|
| IFC Entity | IfcPipeSegment |
| Discipline | FIRE |
| Component Code | FIP |
| UOM | rmt |

### Inputs

```text
length
diameter
pipe_class
```

### Related Items

```text
Fire pipe
Fittings
Valves
Supports
Hydraulic testing
Painting
```

---

# 16. External Works and Landscape

## 16.1 IfcSite / IfcSlab → Paving

| Field | Value |
|---|---|
| IFC Entity | IfcSlab / IfcCovering / IfcSite |
| Discipline | EXT |
| Component Code | PAV |
| UOM | sqm |

### Inputs

```text
length
breadth
thickness
```

### Related Items

```text
Subgrade preparation
Base course
Paver/tile/stone
Sand bed
Compaction
```

---

## 16.2 IfcCivilElement → Compound Wall

| Field | Value |
|---|---|
| IFC Entity | IfcWall / IfcCivilElement |
| Discipline | EXT |
| Component Code | CMW |
| UOM | rmt/sqm/cum |

### Inputs

```text
length
height
thickness
foundation_depth
```

### Related Items

```text
Excavation
Foundation
Masonry/RCC wall
Plaster
Paint
Coping
Gate integration
```

---

## 16.3 IfcRamp → Ramp

| Field | Value |
|---|---|
| IFC Entity | IfcRamp |
| Discipline | EXT/STR |
| Component Code | RMP |
| UOM | sqm/cum |

### Inputs

```text
length
breadth
thickness
slope
```

### Related Items

```text
Earthwork
Base
RCC/finish
Railing
Anti-skid finish
```

---

# 17. Equipment and Special Items

## 17.1 IfcElectricGenerator → Genset

| Field | Value |
|---|---|
| IFC Entity | IfcElectricGenerator |
| Discipline | EQP |
| Component Code | DG |
| UOM | nos |

### Inputs

```text
capacity_kva
count
fuel_type
```

### Related Items

```text
DG unit
Acoustic enclosure
Foundation
Cabling
Earthing
Exhaust piping
Testing and commissioning
```

---

## 17.2 IfcTransportElement → Lift / Elevator

| Field | Value |
|---|---|
| IFC Entity | IfcTransportElement |
| Discipline | EQP |
| Component Code | LFT |
| UOM | nos |

### Inputs

```text
capacity
stops
speed
count
```

### Related Items

```text
Lift equipment
Shaft coordination
Electrical supply
Installation
Testing
AMC provision
```

---

## 17.3 IfcSolarDevice / IfcElectricGenerator → Solar System

| Field | Value |
|---|---|
| IFC Entity | IfcElectricGenerator / IfcEnergyConversionDevice |
| Discipline | ELE |
| Component Code | SOL |
| UOM | kwp/ls |

### Inputs

```text
capacity_kwp
panel_count
inverter_capacity
```

### Related Items

```text
Panels
Inverter
Mounting structure
Cabling
Earthing
Net meter
Testing
```

---

# 18. PEB Mapping

## 18.1 IfcBuildingElementProxy / IfcMember / IfcBeam → PEB Structure

| Field | Value |
|---|---|
| IFC Entity | IfcBuildingElementProxy / IfcMember / IfcBeam |
| Discipline | PEB |
| Component Code | PEB |
| UOM | ton/sqm/ls |

### Design Stage

PEB may be entered as a percentage clause:

```text
PEB = 18% of Civil Cost
```

### Execution Stage

PEB can be detailed into:

```text
Primary frame
Secondary members
Purlins
Roof sheeting
Wall cladding
Fasteners
Gutters
Downpipes
Erection
Painting/coating
```

### Inputs

```text
builtup_area
span
bay_spacing
height
steel_weight
sheeting_area
```

---

# 19. Process Components vs Physical Components

Some estimate items are not direct IFC physical elements.

Examples:

```text
Excavation
Anti-termite
Curing
Testing
Scaffolding
Mobilization
Temporary works
Overheads
```

These should be represented in AORMS as process or cost components.

## Process Component Mapping

| AORMS Item | Suggested IFC Representation | UOM |
|---|---|---|
| Excavation | IfcTask / IfcConstructionResource | cum |
| Anti-termite | IfcTask / IfcMaterialLayer | sqm |
| Curing | IfcTask | sqm/ls |
| Shuttering | IfcTask / temporary work | sqm |
| Scaffolding | IfcTask / IfcConstructionEquipmentResource | sqm/ls |
| Testing | IfcTask | nos/ls |
| Mobilization | IfcTask | ls |
| Project overhead | Cost item only | ls/% |

---

# 20. Dependency Mapping Examples

## 20.1 Wall Finish Sequence

```text
Brick Wall
↓
Electrical Conduit
↓
Plumbing Conduit
↓
Plaster
↓
Primer
↓
Flooring
↓
Fixed Furniture / TV Unit
↓
Final Paint
```

## 20.2 Foundation Sequence

```text
Excavation
↓
Anti-termite
↓
PCC
↓
Reinforcement
↓
Shuttering
↓
RCC Pour
↓
Curing
↓
Backfilling
```

## 20.3 Ceiling Sequence

```text
Electrical Conduit
↓
HVAC Duct
↓
Ceiling Framework
↓
Board Fixing
↓
Cutouts
↓
Putty
↓
Primer
↓
Paint
↓
Light Fixtures
```

---

# 21. Mapping Table Summary

| IFC Entity | AORMS Code | Discipline | Default UOM | Key Inputs | Main Related Items |
|---|---|---|---|---|---|
| IfcFooting | FT | STR | cum | L,B,D | excavation, PCC, RCC, steel, shuttering |
| IfcColumn | COL | STR | cum | W,D,H | concrete, steel, shuttering |
| IfcBeam | BM | STR | cum | W,D,L | concrete, steel, shuttering |
| IfcSlab | SLB | STR | cum/sqm | L,B,T | concrete, steel, flooring, ceiling |
| IfcWall | BRW/BLW/RCCW | MAS/STR | cum/sqm | L,H,T | masonry, plaster, paint, conduit |
| IfcCovering | PLS/FLR/PTG/CLG | FIN | sqm | L,B/H | finish layers |
| IfcDoor | DOR | ARC | nos | W,H,count | frame, shutter, hardware |
| IfcWindow | WIN | ARC | nos/sqm | W,H,count | frame, glass, hardware |
| IfcPipeSegment | PIP | PLB | rmt | length, dia | pipe, fittings, testing |
| IfcCableCarrierSegment | CON | ELE | rmt | length, dia | conduit, boxes, chasing |
| IfcCableSegment | WIR | ELE | rmt | length, size | wiring, termination |
| IfcLightFixture | LGT | ELE | nos | count,type | fixture, installation |
| IfcSanitaryTerminal | SAN | PLB | nos | count,type | fixture, traps, testing |
| IfcDuctSegment | DCT | HVAC | sqm/rmt | L,W,H | duct, insulation |
| IfcAirTerminal | DIF | HVAC | nos | count,type | diffuser, damper |
| IfcFurniture | FFU/LFU | FUR | nos/rmt/sqm | L,H,D,count | furniture works |
| IfcElectricGenerator | DG | EQP | nos | kva,count | genset works |
| IfcTransportElement | LFT | EQP | nos | stops,count | lift package |
| IfcRamp | RMP | EXT/STR | sqm/cum | L,B,T | ramp works |

---

# 22. Example JSON Mapping

## 22.1 IfcWall 230mm Brickwork

```json
{
  "ifc_entity_type": "IfcWall",
  "aorms_discipline_code": "MAS",
  "aorms_component_type_code": "BRW",
  "component_name": "Brick Wall 230mm",
  "default_uom": "cum",
  "fixed_parameters": {
    "thickness": 0.23
  },
  "required_inputs": [
    "length",
    "height",
    "opening_deduction_area"
  ],
  "formula": "(length * height - opening_deduction_area) * thickness",
  "related_items": [
    {
      "name": "Brickwork 230mm",
      "uom": "cum",
      "sequence_order": 1,
      "required": true
    },
    {
      "name": "Electrical conduit chase",
      "uom": "rmt",
      "sequence_order": 2,
      "required": false
    },
    {
      "name": "Plaster",
      "uom": "sqm",
      "sequence_order": 3,
      "required": true
    },
    {
      "name": "Primer",
      "uom": "sqm",
      "sequence_order": 4,
      "required": true
    },
    {
      "name": "Paint",
      "uom": "sqm",
      "sequence_order": 5,
      "required": true
    }
  ]
}
```

## 22.2 IfcFooting

```json
{
  "ifc_entity_type": "IfcFooting",
  "aorms_discipline_code": "STR",
  "aorms_component_type_code": "FT",
  "component_name": "Isolated Footing",
  "default_uom": "cum",
  "required_inputs": [
    "length",
    "breadth",
    "depth",
    "excavation_depth",
    "pcc_thickness"
  ],
  "formula": "length * breadth * depth",
  "related_items": [
    {
      "name": "Earthwork excavation",
      "uom": "cum",
      "formula": "length * breadth * excavation_depth",
      "sequence_order": 1
    },
    {
      "name": "Anti-termite treatment",
      "uom": "sqm",
      "formula": "length * breadth",
      "sequence_order": 2
    },
    {
      "name": "PCC bed",
      "uom": "cum",
      "formula": "length * breadth * pcc_thickness",
      "sequence_order": 3
    },
    {
      "name": "RCC footing concrete",
      "uom": "cum",
      "formula": "length * breadth * depth",
      "sequence_order": 4
    },
    {
      "name": "Reinforcement steel",
      "uom": "kg",
      "formula": "from_steel_engine",
      "sequence_order": 5
    },
    {
      "name": "Shuttering",
      "uom": "sqm",
      "formula": "side_surface_area",
      "sequence_order": 6
    }
  ]
}
```

---

# 23. UI Rules

## 23.1 Component Selection

User should select:

```text
Category → IFC/AORMS Component → Specification
```

Example:

```text
Masonry → IfcWall → Brickwork 230mm CM 1:6
```

## 23.2 Parameter Display

System should show only parameters needed by selected specification.

Example:

Brickwork 230mm:

```text
Length
Height
Opening deduction
```

Do not show thickness.

RCC footing:

```text
Length
Breadth
Depth
Excavation depth
PCC thickness
```

## 23.3 Advanced Parameters

Advanced fields should be collapsible:

```text
Concrete grade
Steel grade
Cover
Lead
Lift
Wastage
Rate analysis toggle
```

---

# 24. Non-Negotiable Mapping Rules

1. AORMS Code is mandatory.
2. IFC GlobalId is optional.
3. Every estimate component must map to a component type.
4. Every auto BOQ row must trace back to component or clause/manual source.
5. Physical components and process components must be separated.
6. Opening deductions must feed multiple related quantities.
7. Ratebook item controls UOM and input schema.
8. User should not manually edit formula in normal mode.
9. IFC mapping should support manual projects without BIM.
10. Related work items should generate dependency sequence templates.

---

# 25. Implementation Phases

## Phase 1 — Core Mapping

```text
component_master
ifc_component_mapping
component_input_schema
formula master
basic structural + wall + finish mappings
```

## Phase 2 — Auto BOQ Related Items

```text
related item templates
auto BOQ generation
component child codes
quantity formulas
```

## Phase 3 — MEP + Interiors

```text
electrical
plumbing
HVAC
fire fighting
furniture
equipment
```

## Phase 4 — IFC Import / Export

```text
IFC GlobalId storage
IFC property set tagging
IFC model sync
```

## Phase 5 — Dependency Intelligence

```text
sequence templates
contractor delay scoring
priority engine
project health integration
```

---

# 26. Final Definition

This IFC mapping standard turns AORMS into a controlled component-based construction intelligence system.

It ensures:

```text
Component selection is standardized.
Quantity input is controlled.
BOQ is generated automatically.
Billing is traceable.
Deviations are measurable.
Revisions have cost impact.
IFC/BIM can plug in later.
```

The system should remain usable for normal Indian architecture offices without BIM, while becoming BIM-ready when IFC models are available.
