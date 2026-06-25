import { z } from "zod";
import { estimateItemAmount } from "./boq.js";

/**
 * Predefined structural/architectural elements for drawing takeoff and BOQ.
 * One catalog drives: snap-assisted marking on drawings and estimate line items.
 */

export const TakeoffCategory = z.enum(["WALL", "SLAB", "BEAM", "COLUMN", "FOOTING"]);
export type TakeoffCategory = z.infer<typeof TakeoffCategory>;

export const TakeoffMeasureKind = z.enum(["LINEAR", "AREA", "COUNT"]);
export type TakeoffMeasureKind = z.infer<typeof TakeoffMeasureKind>;

export const TakeoffElementSpec = z.object({
  id: z.string().min(1).max(40),
  category: TakeoffCategory,
  label: z.string().min(1).max(120),
  measureKind: TakeoffMeasureKind,
  thicknessMm: z.number().int().positive().optional(),
  widthMm: z.number().int().positive().optional(),
  depthMm: z.number().int().positive().optional(),
  boqUnit: z.string().min(1).max(12),
  boqDescription: z.string().min(1).max(400),
  /** Rate-book item code in the linked schedule (matched within the estimate's rate-book version). */
  dsrItemCode: z.string().min(1).max(40).optional(),
  defaultHeightMm: z.number().int().positive().optional(),
});
export type TakeoffElementSpec = z.infer<typeof TakeoffElementSpec>;

export const TAKEOFF_CATALOG: TakeoffElementSpec[] = [
  {
    id: "WALL_230",
    category: "WALL",
    label: '230 mm wall (9")',
    measureKind: "LINEAR",
    thicknessMm: 230,
    boqUnit: "rm",
    boqDescription: "Brick masonry 230 mm thick in cement mortar",
    dsrItemCode: "BM-230",
    defaultHeightMm: 3000,
  },
  {
    id: "WALL_200",
    category: "WALL",
    label: "200 mm wall",
    measureKind: "LINEAR",
    thicknessMm: 200,
    boqUnit: "rm",
    boqDescription: "Brick masonry 200 mm thick in cement mortar",
    dsrItemCode: "BM-200",
    defaultHeightMm: 3000,
  },
  {
    id: "WALL_115",
    category: "WALL",
    label: '115 mm wall (4½")',
    measureKind: "LINEAR",
    thicknessMm: 115,
    boqUnit: "rm",
    boqDescription: "Brick masonry 115 mm thick partition in cement mortar",
    dsrItemCode: "BM-115",
    defaultHeightMm: 3000,
  },
  {
    id: "WALL_110",
    category: "WALL",
    label: "110 mm wall",
    measureKind: "LINEAR",
    thicknessMm: 110,
    boqUnit: "rm",
    boqDescription: "Brick masonry 110 mm thick partition in cement mortar",
    dsrItemCode: "BM-110",
    defaultHeightMm: 3000,
  },
  {
    id: "WALL_100",
    category: "WALL",
    label: "100 mm wall",
    measureKind: "LINEAR",
    thicknessMm: 100,
    boqUnit: "rm",
    boqDescription: "Brick masonry 100 mm thick partition in cement mortar",
    dsrItemCode: "BM-100",
    defaultHeightMm: 3000,
  },
  {
    id: "WALL_150_BLOCK",
    category: "WALL",
    label: "150 mm AAC block wall",
    measureKind: "LINEAR",
    thicknessMm: 150,
    boqUnit: "rm",
    boqDescription: "AAC block masonry 150 mm thick in adhesive mortar",
    dsrItemCode: "AAC-150",
    defaultHeightMm: 3000,
  },
  {
    id: "SLAB_100",
    category: "SLAB",
    label: "RCC slab 100 mm",
    measureKind: "AREA",
    thicknessMm: 100,
    boqUnit: "sqm",
    boqDescription: "RCC slab 100 mm thick M25",
    dsrItemCode: "RCC-SLAB-100",
  },
  {
    id: "SLAB_125",
    category: "SLAB",
    label: "RCC slab 125 mm",
    measureKind: "AREA",
    thicknessMm: 125,
    boqUnit: "sqm",
    boqDescription: "RCC slab 125 mm thick M25",
    dsrItemCode: "RCC-SLAB-125",
  },
  {
    id: "SLAB_150",
    category: "SLAB",
    label: "RCC slab 150 mm",
    measureKind: "AREA",
    thicknessMm: 150,
    boqUnit: "sqm",
    boqDescription: "RCC slab 150 mm thick M25",
    dsrItemCode: "RCC-SLAB-150",
  },
  {
    id: "SLAB_200",
    category: "SLAB",
    label: "RCC slab 200 mm",
    measureKind: "AREA",
    thicknessMm: 200,
    boqUnit: "sqm",
    boqDescription: "RCC slab 200 mm thick M25",
    dsrItemCode: "RCC-SLAB-200",
  },
  {
    id: "BEAM_230x450",
    category: "BEAM",
    label: "Beam 230 × 450 mm",
    measureKind: "LINEAR",
    widthMm: 230,
    depthMm: 450,
    boqUnit: "rm",
    boqDescription: "RCC beam 230 × 450 mm M25",
    dsrItemCode: "RCC-BEAM-230450",
  },
  {
    id: "BEAM_230x600",
    category: "BEAM",
    label: "Beam 230 × 600 mm",
    measureKind: "LINEAR",
    widthMm: 230,
    depthMm: 600,
    boqUnit: "rm",
    boqDescription: "RCC beam 230 × 600 mm M25",
    dsrItemCode: "RCC-BEAM-230600",
  },
  {
    id: "BEAM_300x600",
    category: "BEAM",
    label: "Beam 300 × 600 mm",
    measureKind: "LINEAR",
    widthMm: 300,
    depthMm: 600,
    boqUnit: "rm",
    boqDescription: "RCC beam 300 × 600 mm M25",
    dsrItemCode: "RCC-BEAM-300600",
  },
  {
    id: "COL_230x230",
    category: "COLUMN",
    label: "Column 230 × 230 mm",
    measureKind: "COUNT",
    widthMm: 230,
    depthMm: 230,
    boqUnit: "nos",
    boqDescription: "RCC column 230 × 230 mm M25",
    dsrItemCode: "RCC-COL-230",
    defaultHeightMm: 3000,
  },
  {
    id: "COL_300x300",
    category: "COLUMN",
    label: "Column 300 × 300 mm",
    measureKind: "COUNT",
    widthMm: 300,
    depthMm: 300,
    boqUnit: "nos",
    boqDescription: "RCC column 300 × 300 mm M25",
    dsrItemCode: "RCC-COL-300",
    defaultHeightMm: 3000,
  },
  {
    id: "COL_450x450",
    category: "COLUMN",
    label: "Column 450 × 450 mm",
    measureKind: "COUNT",
    widthMm: 450,
    depthMm: 450,
    boqUnit: "nos",
    boqDescription: "RCC column 450 × 450 mm M25",
    dsrItemCode: "RCC-COL-450",
    defaultHeightMm: 3000,
  },
  {
    id: "FTG_1000x1000x450",
    category: "FOOTING",
    label: "Isolated footing 1.0 × 1.0 × 0.45 m",
    measureKind: "COUNT",
    widthMm: 1000,
    depthMm: 1000,
    thicknessMm: 450,
    boqUnit: "nos",
    boqDescription: "Isolated RCC footing 1000 × 1000 × 450 mm M25",
    dsrItemCode: "RCC-FTG-1000",
  },
  {
    id: "FTG_1200x1200x500",
    category: "FOOTING",
    label: "Isolated footing 1.2 × 1.2 × 0.5 m",
    measureKind: "COUNT",
    widthMm: 1200,
    depthMm: 1200,
    thicknessMm: 500,
    boqUnit: "nos",
    boqDescription: "Isolated RCC footing 1200 × 1200 × 500 mm M25",
    dsrItemCode: "RCC-FTG-1200",
  },
  {
    id: "FTG_STRIP_600x450",
    category: "FOOTING",
    label: "Strip footing 600 mm wide × 450 mm deep",
    measureKind: "LINEAR",
    widthMm: 600,
    thicknessMm: 450,
    boqUnit: "rm",
    boqDescription: "Strip RCC footing 600 mm wide × 450 mm deep M25",
    dsrItemCode: "RCC-FTG-STRIP600",
  },
];

export const TAKEOFF_CATALOG_BY_ID = new Map(TAKEOFF_CATALOG.map((e) => [e.id, e]));

export function takeoffElement(id: string): TakeoffElementSpec | undefined {
  return TAKEOFF_CATALOG_BY_ID.get(id);
}

export function takeoffElementsForCategory(category: TakeoffCategory): TakeoffElementSpec[] {
  return TAKEOFF_CATALOG.filter((e) => e.category === category);
}

function toMetres(value: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case "mm":
      return value / 1000;
    case "cm":
      return value / 100;
    case "m":
      return value;
    case "ft":
      return value * 0.3048;
    case "in":
      return value * 0.0254;
    default:
      return value;
  }
}

export type TakeoffBoqResult = {
  boqQty: number;
  boqUnit: string;
  boqDescription: string;
};

export function computeTakeoffBoq(input: {
  elementTypeId: string;
  measureKind: TakeoffMeasureKind;
  realLength: number;
  unit: string;
  heightMm?: number | null;
  itemCount?: number;
}): TakeoffBoqResult {
  const el = takeoffElement(input.elementTypeId);
  if (!el) {
    return {
      boqQty: input.realLength,
      boqUnit: input.measureKind === "AREA" ? "sqm" : input.measureKind === "COUNT" ? "nos" : "rm",
      boqDescription: "Takeoff item",
    };
  }

  const count = Math.max(1, input.itemCount ?? 1);

  if (input.measureKind === "COUNT" || el.measureKind === "COUNT") {
    return { boqQty: count, boqUnit: el.boqUnit, boqDescription: el.boqDescription };
  }

  if (input.measureKind === "AREA" || el.measureKind === "AREA") {
    const lenM = toMetres(input.realLength, input.unit);
    const unitM = toMetres(1, input.unit);
    const areaSqm = lenM * unitM;
    return { boqQty: Number(areaSqm.toFixed(3)), boqUnit: el.boqUnit, boqDescription: el.boqDescription };
  }

  const lengthM = toMetres(input.realLength, input.unit);
  return {
    boqQty: Number(lengthM.toFixed(3)),
    boqUnit: el.boqUnit,
    boqDescription: el.boqDescription,
  };
}

export function takeoffEstimateUnit(boqUnit: string): string {
  switch (boqUnit) {
    case "rm":
      return "rm";
    case "sqm":
      return "sqm";
    case "nos":
      return "nos";
    case "cum":
      return "cum";
    default:
      return boqUnit;
  }
}

export const CompanionMeasurementCreate = z.object({
  drawingId: z.string().uuid(),
  projectId: z.string().uuid(),
  label: z.string().min(1).max(120),
  kind: TakeoffMeasureKind,
  elementTypeId: z.string().min(1).max(40),
  realLength: z.number().nonnegative(),
  scaleWorldUnits: z.string().min(1).max(8),
  worldGeometry: z
    .object({
      type: z.enum(["LINE", "POLYLINE", "POLYGON", "POINT"]),
      points: z.array(z.object({ x: z.number(), y: z.number() })).min(1),
    })
    .optional(),
  entityRefs: z.array(z.string().min(1).max(120)).optional(),
  createdByClient: z.string().min(1).max(80).default("esticad/unknown"),
  heightMm: z.number().int().positive().optional(),
  itemCount: z.number().int().positive().default(1),
});
export type CompanionMeasurementCreate = z.infer<typeof CompanionMeasurementCreate>;

export const TakeoffMeasurementCreate = z.object({
  drawingId: z.string().uuid(),
  projectId: z.string().uuid(),
  label: z.string().min(1).max(120),
  kind: TakeoffMeasureKind,
  vbLength: z.number().nonnegative(),
  realLength: z.number().nonnegative(),
  unit: z.string().min(1).max(8),
  elementTypeId: z.string().min(1).max(40),
  heightMm: z.number().int().positive().optional(),
  itemCount: z.number().int().positive().default(1),
});
export type TakeoffMeasurementCreate = z.infer<typeof TakeoffMeasurementCreate>;

export const DEFAULT_SNAP_GRID_MM = 100;

// --- Rate-book-linked estimation ----------------------------------------------

export type DsrItemRef = {
  id: string;
  code: string;
  description: string;
  unit: string;
  ratePaise: number;
};

export type TakeoffMeasurementRef = {
  elementTypeId: string | null;
  label: string;
  boqQty: number | null;
  boqUnit: string | null;
  boqDescription: string | null;
};

function normDsrCode(code: string): string {
  return code.toUpperCase().replace(/[\s._-]/g, "");
}

/** Match a takeoff catalog entry to a rate-book line by `dsrItemCode`. */
export function matchTakeoffToDsr(elementTypeId: string, dsrItems: DsrItemRef[]): DsrItemRef | null {
  const el = takeoffElement(elementTypeId);
  if (!el?.dsrItemCode) return null;
  const want = normDsrCode(el.dsrItemCode);
  return dsrItems.find((d) => normDsrCode(d.code) === want) ?? null;
}

export type TakeoffEstimatePreviewLine = {
  elementTypeId: string;
  elementLabel: string;
  dsrItemCode: string | null;
  dsrItemId: string | null;
  dsrMatched: boolean;
  description: string;
  unit: string;
  qty: number;
  ratePaise: number;
  amountPaise: number;
  takeoffNames: string[];
  measurementCount: number;
};

/** Aggregate tagged measurements into estimate lines with rate-book rates when matched. */
export function buildTakeoffEstimateLines(
  rows: TakeoffMeasurementRef[],
  dsrItems: DsrItemRef[],
): TakeoffEstimatePreviewLine[] {
  const grouped = new Map<
    string,
    { qty: number; names: string[]; count: number; boqUnit: string; boqDescription: string }
  >();

  for (const m of rows) {
    if (!m.elementTypeId || m.boqQty == null) continue;
    const prev = grouped.get(m.elementTypeId);
    grouped.set(m.elementTypeId, {
      qty: (prev?.qty ?? 0) + m.boqQty,
      names: [...(prev?.names ?? []), m.label],
      count: (prev?.count ?? 0) + 1,
      boqUnit: m.boqUnit ?? prev?.boqUnit ?? "rm",
      boqDescription: m.boqDescription ?? prev?.boqDescription ?? m.label,
    });
  }

  const lines: TakeoffEstimatePreviewLine[] = [];
  for (const [elementTypeId, g] of grouped) {
    const el = takeoffElement(elementTypeId);
    const dsr = matchTakeoffToDsr(elementTypeId, dsrItems);
    const unit = dsr?.unit ?? takeoffEstimateUnit(g.boqUnit);
    const ratePaise = dsr?.ratePaise ?? 0;
    const qty = g.qty;
    lines.push({
      elementTypeId,
      elementLabel: el?.label ?? elementTypeId,
      dsrItemCode: el?.dsrItemCode ?? null,
      dsrItemId: dsr?.id ?? null,
      dsrMatched: !!dsr,
      description: dsr?.description ?? g.boqDescription,
      unit,
      qty,
      ratePaise,
      amountPaise: estimateItemAmount(qty, ratePaise, 0),
      takeoffNames: g.names,
      measurementCount: g.count,
    });
  }

  lines.sort((a, b) => a.elementLabel.localeCompare(b.elementLabel));
  return lines;
}
