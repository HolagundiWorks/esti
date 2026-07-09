/**
 * Civil Works WBS seed — hardcodes the office's civil-works work-breakdown
 * structure into the Knowledge Bank item library (esti_kb_item), the backbone
 * for BOQs, specifications, checklists, QA/QC and AI reasoning.
 *
 * Child items are mapped as kb item dependencies ONLY where the source WBS
 * declares them explicitly (RCC "Sub-elements", Door/Window "Components") —
 * every other parent/child relation is expressed through `category` and left
 * for manual mapping, per the office's instruction.
 *
 * Idempotent: items match on normalized name (normName, whitespace-stripped);
 * existing items and dependency pairs are never duplicated or overwritten.
 */
import { normName } from "@esti/contracts";
import type { db as Db } from "../db/index.js";
import { kbItemDependencies, kbItems } from "../db/schema.js";

const nameKey = (name: string): string => normName(name).replace(/\s+/g, "");

/** [category, name, unit] — Indian QS conventions; LS where genuinely lump-sum. */
const WBS_ITEMS: ReadonlyArray<readonly [string, string, string]> = [
  // 1. Pre-Construction
  ["Pre-Construction", "Site Survey", "LS"],
  ["Pre-Construction", "Topographic Survey", "LS"],
  ["Pre-Construction", "Soil Investigation", "LS"],
  ["Pre-Construction", "Geotechnical Report", "LS"],
  ["Pre-Construction", "Site Clearing", "sqm"],
  ["Pre-Construction", "Tree Removal", "nos"],
  ["Pre-Construction", "Demolition", "cum"],
  ["Pre-Construction", "Barricading", "rm"],
  ["Pre-Construction", "Temporary Utilities", "LS"],
  ["Pre-Construction", "Site Office", "LS"],
  ["Pre-Construction", "Temporary Roads", "sqm"],
  ["Pre-Construction", "Site Drainage", "rm"],
  ["Pre-Construction", "Layout & Benchmarking", "LS"],
  // 2. Earthwork
  ["Earthwork", "Excavation", "cum"],
  ["Earthwork", "Rock Excavation", "cum"],
  ["Earthwork", "Trenching", "cum"],
  ["Earthwork", "Backfilling", "cum"],
  ["Earthwork", "Compaction", "sqm"],
  ["Earthwork", "Filling", "cum"],
  ["Earthwork", "Earth Retaining", "sqm"],
  ["Earthwork", "Dewatering", "LS"],
  ["Earthwork", "Disposal of Excavated Soil", "cum"],
  ["Earthwork", "Soil Stabilization", "sqm"],
  // 3. Foundations (Foundation Waterproofing lives under Waterproofing)
  ["Foundations", "PCC (Plain Cement Concrete)", "cum"],
  ["Foundations", "Footings", "cum"],
  ["Foundations", "Strip Footings", "cum"],
  ["Foundations", "Combined Footings", "cum"],
  ["Foundations", "Raft Foundation", "cum"],
  ["Foundations", "Pile Foundation", "rm"],
  ["Foundations", "Pile Caps", "cum"],
  ["Foundations", "Grade Beams", "cum"],
  ["Foundations", "Pedestals", "cum"],
  // 4. RCC Structural Works (+ explicit sub-elements)
  ["RCC Structural Works", "Columns", "cum"],
  ["RCC Structural Works", "Beams", "cum"],
  ["RCC Structural Works", "Slabs", "cum"],
  ["RCC Structural Works", "Shear Walls", "cum"],
  ["RCC Structural Works", "Core Walls", "cum"],
  ["RCC Structural Works", "Staircases (RCC)", "cum"],
  ["RCC Structural Works", "Lift Pits", "cum"],
  ["RCC Structural Works", "Retaining Walls", "cum"],
  ["RCC Structural Works", "Water Tanks (RCC)", "cum"],
  ["RCC Structural Works", "Sunken Slabs", "cum"],
  ["RCC Structural Works", "Reinforcement", "kg"],
  ["RCC Structural Works", "Formwork", "sqm"],
  ["RCC Structural Works", "Concrete", "cum"],
  ["RCC Structural Works", "Curing", "sqm"],
  ["RCC Structural Works", "Grouting", "cum"],
  // 5. Masonry (Compound Wall lives under External Development)
  ["Masonry", "External Walls", "cum"],
  ["Masonry", "Internal Walls", "cum"],
  ["Masonry", "AAC Blocks", "cum"],
  ["Masonry", "Fly Ash Bricks", "cum"],
  ["Masonry", "Clay Bricks", "cum"],
  ["Masonry", "Stone Masonry", "cum"],
  ["Masonry", "Partition Walls", "sqm"],
  ["Masonry", "Parapet Walls", "cum"],
  // 6. Waterproofing
  ["Waterproofing", "Foundation Waterproofing", "sqm"],
  ["Waterproofing", "Basement Waterproofing", "sqm"],
  ["Waterproofing", "Terrace Waterproofing", "sqm"],
  ["Waterproofing", "Toilet Waterproofing", "sqm"],
  ["Waterproofing", "Balcony Waterproofing", "sqm"],
  ["Waterproofing", "Water Tank Waterproofing", "sqm"],
  ["Waterproofing", "Expansion Joints", "rm"],
  ["Waterproofing", "Sealants", "rm"],
  // 7. Plastering
  ["Plastering", "Internal Plaster", "sqm"],
  ["Plastering", "External Plaster", "sqm"],
  ["Plastering", "Ceiling Plaster", "sqm"],
  ["Plastering", "Waterproof Plaster", "sqm"],
  ["Plastering", "Decorative Plaster", "sqm"],
  ["Plastering", "Gypsum Plaster", "sqm"],
  // 8. Flooring
  ["Flooring", "PCC Base", "cum"],
  ["Flooring", "Screed", "sqm"],
  ["Flooring", "Tile Flooring", "sqm"],
  ["Flooring", "Stone Flooring", "sqm"],
  ["Flooring", "Marble Flooring", "sqm"],
  ["Flooring", "Granite Flooring", "sqm"],
  ["Flooring", "Wooden Flooring", "sqm"],
  ["Flooring", "Vinyl Flooring", "sqm"],
  ["Flooring", "Epoxy Flooring", "sqm"],
  ["Flooring", "Carpet", "sqm"],
  ["Flooring", "Terrazzo", "sqm"],
  // 9. Wall Finishes (Stone Cladding kept here once; façade variant manual)
  ["Wall Finishes", "Paint", "sqm"],
  ["Wall Finishes", "Texture Paint", "sqm"],
  ["Wall Finishes", "Wallpaper", "sqm"],
  ["Wall Finishes", "Stone Cladding", "sqm"],
  ["Wall Finishes", "Tile Dado", "sqm"],
  ["Wall Finishes", "Wood Cladding", "sqm"],
  ["Wall Finishes", "Metal Panels", "sqm"],
  ["Wall Finishes", "Decorative Panels", "sqm"],
  // 10. Ceiling
  ["Ceiling", "RCC Ceiling Finish", "sqm"],
  ["Ceiling", "Gypsum Ceiling", "sqm"],
  ["Ceiling", "POP Ceiling", "sqm"],
  ["Ceiling", "Metal Ceiling", "sqm"],
  ["Ceiling", "Wooden Ceiling", "sqm"],
  ["Ceiling", "Acoustic Ceiling", "sqm"],
  ["Ceiling", "Stretch Ceiling", "sqm"],
  // 11. Doors (+ explicit components)
  ["Doors", "Main Door", "nos"],
  ["Doors", "Internal Doors", "nos"],
  ["Doors", "Toilet Doors", "nos"],
  ["Doors", "Fire Doors", "nos"],
  ["Doors", "Sliding Doors", "nos"],
  ["Doors", "Folding Doors", "nos"],
  ["Doors", "Glass Doors", "nos"],
  ["Doors", "Metal Doors", "nos"],
  ["Doors", "Service Doors", "nos"],
  ["Doors", "Door Frame", "nos"],
  ["Doors", "Door Shutter", "nos"],
  ["Doors", "Door Hardware", "set"],
  ["Doors", "Door Locks", "nos"],
  ["Doors", "Door Hinges", "nos"],
  ["Doors", "Door Closers", "nos"],
  // 12. Windows (+ explicit components; Louvers kept here once)
  ["Windows", "Aluminium Windows", "sqm"],
  ["Windows", "UPVC Windows", "sqm"],
  ["Windows", "Timber Windows", "sqm"],
  ["Windows", "Steel Windows", "sqm"],
  ["Windows", "Glass Windows", "sqm"],
  ["Windows", "Skylights", "sqm"],
  ["Windows", "Louvers", "sqm"],
  ["Windows", "Window Frame", "nos"],
  ["Windows", "Window Glass", "sqm"],
  ["Windows", "Window Hardware", "set"],
  ["Windows", "Mosquito Mesh", "sqm"],
  ["Windows", "Window Sealants", "rm"],
  // 13. Staircases
  ["Staircases", "RCC Stair", "cum"],
  ["Staircases", "Steel Stair", "kg"],
  ["Staircases", "Timber Stair", "nos"],
  ["Staircases", "Handrails", "rm"],
  ["Staircases", "Balustrades", "rm"],
  ["Staircases", "Treads", "nos"],
  ["Staircases", "Risers", "nos"],
  ["Staircases", "Nosing", "rm"],
  // 14. Railings
  ["Railings", "MS Railings", "rm"],
  ["Railings", "SS Railings", "rm"],
  ["Railings", "Glass Railings", "rm"],
  ["Railings", "Aluminium Railings", "rm"],
  ["Railings", "Wooden Railings", "rm"],
  // 15. Roofing (generic waterproofing lives under Waterproofing)
  ["Roofing", "RCC Roof", "cum"],
  ["Roofing", "Steel Roof", "kg"],
  ["Roofing", "Truss", "kg"],
  ["Roofing", "Deck Sheet", "sqm"],
  ["Roofing", "Roof Insulation", "sqm"],
  ["Roofing", "Roof Tiles", "sqm"],
  ["Roofing", "Gutters", "rm"],
  ["Roofing", "Downpipes", "rm"],
  // 16. External Development
  ["External Development", "Roads", "sqm"],
  ["External Development", "Driveways", "sqm"],
  ["External Development", "Pavers", "sqm"],
  ["External Development", "Kerbs", "rm"],
  ["External Development", "Footpaths", "sqm"],
  ["External Development", "Boundary Wall", "rm"],
  ["External Development", "Compound Wall", "rm"],
  ["External Development", "Gates", "nos"],
  ["External Development", "Security Cabin", "nos"],
  ["External Development", "Landscaping", "sqm"],
  ["External Development", "Irrigation", "LS"],
  ["External Development", "Lawns", "sqm"],
  ["External Development", "Water Features", "nos"],
  // 17. Drainage (Manholes/Inspection Chambers kept here once)
  ["Drainage", "Storm Water Drain", "rm"],
  ["Drainage", "Catch Basins", "nos"],
  ["Drainage", "Manholes", "nos"],
  ["Drainage", "Inspection Chambers", "nos"],
  ["Drainage", "Culverts", "rm"],
  ["Drainage", "Surface Drainage", "rm"],
  // 18. Water Supply (civil scope)
  ["Water Supply", "UG Sump", "nos"],
  ["Water Supply", "OHT", "nos"],
  ["Water Supply", "Pump Rooms", "nos"],
  ["Water Supply", "Water Chambers", "nos"],
  ["Water Supply", "Pipe Trenches (Water)", "rm"],
  ["Water Supply", "Pipe Sleeves", "nos"],
  // 19. Sewerage (civil scope)
  ["Sewerage", "Septic Tank", "nos"],
  ["Sewerage", "STP", "LS"],
  ["Sewerage", "Pipe Trenches (Sewer)", "rm"],
  // 20. Fire Protection (civil scope)
  ["Fire Protection", "Fire Water Tank", "nos"],
  ["Fire Protection", "Valve Chambers", "nos"],
  ["Fire Protection", "Fire Pipe Sleeves", "nos"],
  ["Fire Protection", "Pipe Supports", "nos"],
  // 21. Façade (Stone Cladding + Louvers deduped to their primary categories)
  ["Façade", "ACP Panels", "sqm"],
  ["Façade", "Glass Curtain Wall", "sqm"],
  ["Façade", "Terracotta Panels", "sqm"],
  ["Façade", "GRC Panels", "sqm"],
  ["Façade", "Metal Screens", "sqm"],
  ["Façade", "Sunshades", "rm"],
  // 22. Site Structures
  ["Site Structures", "Guard House", "nos"],
  ["Site Structures", "Utility Buildings", "sqm"],
  ["Site Structures", "Generator Foundation", "nos"],
  ["Site Structures", "Transformer Yard", "LS"],
  ["Site Structures", "Pump House", "nos"],
  ["Site Structures", "Garbage Room", "nos"],
  // 23. Special Civil Works
  ["Special Civil Works", "Swimming Pool", "nos"],
  ["Special Civil Works", "Water Bodies", "sqm"],
  ["Special Civil Works", "Amphitheatre", "LS"],
  ["Special Civil Works", "Gazebos", "nos"],
  ["Special Civil Works", "Pergolas", "nos"],
  ["Special Civil Works", "Retaining Structures", "cum"],
  ["Special Civil Works", "Tennis Courts", "nos"],
  ["Special Civil Works", "Parking Structures", "sqm"],
];

/**
 * Explicit child mappings only — straight from the WBS source:
 * - every RCC element carries the declared Sub-elements
 * - every door type carries the declared door Components
 * - every window type carries the declared window Components
 * Everything else stays unmapped (category expresses the grouping).
 */
const RCC_PARENTS = [
  "Columns", "Beams", "Slabs", "Shear Walls", "Core Walls", "Staircases (RCC)",
  "Lift Pits", "Retaining Walls", "Water Tanks (RCC)", "Sunken Slabs",
];
const RCC_CHILDREN = ["Reinforcement", "Formwork", "Concrete", "Curing", "Grouting"];
const DOOR_PARENTS = [
  "Main Door", "Internal Doors", "Toilet Doors", "Fire Doors", "Sliding Doors",
  "Folding Doors", "Glass Doors", "Metal Doors", "Service Doors",
];
const DOOR_CHILDREN = ["Door Frame", "Door Shutter", "Door Hardware", "Door Locks", "Door Hinges", "Door Closers"];
const WINDOW_PARENTS = [
  "Aluminium Windows", "UPVC Windows", "Timber Windows", "Steel Windows",
  "Glass Windows", "Skylights", "Louvers",
];
const WINDOW_CHILDREN = ["Window Frame", "Window Glass", "Window Hardware", "Mosquito Mesh", "Window Sealants"];

const CHILD_MAPPINGS: ReadonlyArray<readonly [string, string]> = [
  ...RCC_PARENTS.flatMap((p) => RCC_CHILDREN.map((c) => [p, c] as const)),
  ...DOOR_PARENTS.flatMap((p) => DOOR_CHILDREN.map((c) => [p, c] as const)),
  ...WINDOW_PARENTS.flatMap((p) => WINDOW_CHILDREN.map((c) => [p, c] as const)),
];

export async function seedCivilWbs(db: typeof Db): Promise<void> {
  // 1. Items — insert only names the library doesn't already have.
  const existing = await db
    .select({ id: kbItems.id, name: kbItems.name })
    .from(kbItems);
  const byKey = new Map(existing.map((i) => [nameKey(i.name), i.id]));

  let inserted = 0;
  for (const [category, name, unit] of WBS_ITEMS) {
    const key = nameKey(name);
    if (byKey.has(key)) continue;
    const [row] = await db
      .insert(kbItems)
      .values({ name, category, unit, description: `Civil Works WBS › ${category}` })
      .returning({ id: kbItems.id });
    byKey.set(key, row!.id);
    inserted++;
  }

  // 2. Explicit child dependencies — skip pairs that already exist.
  const pairs = await db
    .select({
      parentItemId: kbItemDependencies.parentItemId,
      childItemId: kbItemDependencies.childItemId,
    })
    .from(kbItemDependencies);
  const havePair = new Set(pairs.map((p) => `${p.parentItemId}|${p.childItemId}`));

  let mapped = 0;
  for (const [parentName, childName] of CHILD_MAPPINGS) {
    const parentId = byKey.get(nameKey(parentName));
    const childId = byKey.get(nameKey(childName));
    if (!parentId || !childId || parentId === childId) continue;
    if (havePair.has(`${parentId}|${childId}`)) continue;
    await db.insert(kbItemDependencies).values({
      parentItemId: parentId,
      childItemId: childId,
      ratio: 1,
      dependencyType: "MANDATORY",
      notes: "Seeded from Civil Works WBS",
    });
    havePair.add(`${parentId}|${childId}`);
    mapped++;
  }

  console.log(`✓ civil-works WBS: ${inserted} item(s) added, ${mapped} child mapping(s) added`);
}
