/**
 * Hosapete (Hospet) zonal regulations — ported from `docs/reference/zonal-compliance/hospet_zoning_calculator.py`
 * with Table-1 side setbacks corrected per `Cities/_EXTRACTED_DATA.md`.
 */
import type { ZonalComplianceResult, ZonalSiteInput, ZonalZone } from "./types.js";
import { zonalCity } from "./cities.js";

const INF = Number.POSITIVE_INFINITY;

export const HOSAPETE_BAND_LABELS = [
  "Up to 6",
  "Over 6 up to 9",
  "Over 9 up to 12",
  "Over 12 up to 18",
  "Over 18 up to 24",
  "Over 24",
] as const;

function bandIndex(dim: number): number {
  if (dim <= 6) return 0;
  if (dim <= 9) return 1;
  if (dim <= 12) return 2;
  if (dim <= 18) return 3;
  if (dim <= 24) return 4;
  return 5;
}

/** Table-1 — front/rear by depth band; left/right by width band (asymmetric). */
const TABLE_1: Record<
  Exclude<ZonalZone, "Industrial">,
  { front: number[]; rear: number[]; left: number[]; right: number[] }
> = {
  Residential: {
    front: [1.0, 1.0, 1.0, 1.5, 2.0, 2.5],
    rear: [0, 1.0, 1.0, 1.0, 1.5, 2.0],
    left: [0, 1.0, 1.0, 1.5, 2.0, 2.5],
    right: [1.0, 1.0, 1.0, 2.0, 3.0, 3.0],
  },
  Commercial: {
    front: [1.0, 1.5, 1.5, 2.0, 2.5, 3.0],
    rear: [0, 0, 1.0, 1.5, 2.0, 2.5],
    left: [0, 0, 1.0, 1.5, 2.0, 2.5],
    right: [1.0, 1.0, 1.5, 2.0, 2.5, 3.0],
  },
  "Public & Semi-Public": {
    front: [1.5, 1.5, 2.0, 2.5, 3.0, 3.5],
    rear: [0, 1.5, 1.5, 1.5, 2.0, 2.5],
    left: [0, 1.0, 1.5, 1.75, 2.5, 3.0],
    right: [1.0, 1.5, 1.75, 2.5, 3.0, 4.0],
  },
};

const INDUSTRIAL_SETBACK = { front: 3.0, rear: 3.0, side: 1.0 };

const COVERAGE: Record<ZonalZone, [number, number][]> = {
  Residential: [
    [500, 0.7],
    [750, 0.65],
    [1000, 0.6],
    [INF, 0.55],
  ],
  Commercial: [
    [500, 0.65],
    [750, 0.6],
    [1000, 0.55],
    [INF, 0.5],
  ],
  "Public & Semi-Public": [
    [500, 0.6],
    [750, 0.55],
    [1000, 0.5],
    [INF, 0.5],
  ],
  Industrial: [
    [230, 0.8],
    [1000, 0.65],
    [INF, 0.55],
  ],
};

const FAR_BY_ROAD: Record<ZonalZone, [number, number][]> = {
  Residential: [
    [9, 1.5],
    [12, 1.75],
    [18, 2.0],
    [INF, 2.25],
  ],
  Commercial: [
    [9, 1.75],
    [12, 2.0],
    [18, 2.5],
    [INF, 3.0],
  ],
  "Public & Semi-Public": [
    [9, 1.5],
    [12, 1.75],
    [18, 2.0],
    [INF, 2.25],
  ],
  Industrial: [
    [9, 1.5],
    [INF, 1.75],
  ],
};

export const HOSAPETE_BUILDING_LINE: Record<string, number | null> = {
  "National Highway No. 13 & 63 (outer)": 40.0,
  "National Highway No. 13 & 63": 21.0,
  "State Highway (outer)": 40.0,
  "State Highway": 21.0,
  "Major District Road (outer)": 25.0,
  "Major District Road": 13.0,
  "30 m wide road": 21.0,
  "24 m wide road": 15.0,
  "20 m wide road": 13.0,
  "18 m wide road": 11.0,
  "Other / local road (no building line)": null,
};

export const HOSAPETE_BUILDING_LINE_KEYS = Object.keys(HOSAPETE_BUILDING_LINE);

const CORRIDOR: Record<string, number> = {
  "Residential building": 1.0,
  "Assembly (auditorium / cinema)": 2.0,
  "Government office": 2.0,
  "Government hospital": 2.4,
  "Educational institution": 2.0,
  "Commercial (office/nursing/lodge)": 2.0,
  "All other buildings": 1.5,
};

export const HOSAPETE_BUILDING_TYPES: Record<
  string,
  { corridor: string; park: string; qtyLabel: string | null; tenement: boolean }
> = {
  "Residential building (single unit)": {
    corridor: "Residential building",
    park: "residential",
    qtyLabel: null,
    tenement: false,
  },
  "Apartment / Multi-family residential": {
    corridor: "Residential building",
    park: "multifamily",
    qtyLabel: "Carpet area per tenement (sqm)",
    tenement: true,
  },
  "Lodging establishment / Tourist home": {
    corridor: "All other buildings",
    park: "lodging",
    qtyLabel: "Number of guest rooms",
    tenement: false,
  },
  "Educational (school / college)": {
    corridor: "Educational institution",
    park: "educational",
    qtyLabel: "Carpet area of office+public areas (sqm)",
    tenement: false,
  },
  Hospital: {
    corridor: "Government hospital",
    park: "hospital",
    qtyLabel: "Number of beds",
    tenement: false,
  },
  "Nursing home": {
    corridor: "Commercial (office/nursing/lodge)",
    park: "nursing",
    qtyLabel: "Number of beds",
    tenement: false,
  },
  "Assembly / Auditorium / Cinema theatre": {
    corridor: "Assembly (auditorium / cinema)",
    park: "assembly",
    qtyLabel: "Number of seats",
    tenement: false,
  },
  "Kalyana Mantapa": {
    corridor: "Assembly (auditorium / cinema)",
    park: "kalyana",
    qtyLabel: "Auditorium floor area (sqm)",
    tenement: false,
  },
  "Government / Semi-public building": {
    corridor: "Government office",
    park: "govt",
    qtyLabel: "Carpet area (sqm)",
    tenement: false,
  },
  "Retail business / Shop": {
    corridor: "All other buildings",
    park: "retail",
    qtyLabel: "Carpet area (sqm)",
    tenement: false,
  },
  "Office building": {
    corridor: "Government office",
    park: "office",
    qtyLabel: "Floor area (sqm)",
    tenement: false,
  },
  "Industrial building": {
    corridor: "All other buildings",
    park: "industrial",
    qtyLabel: "Carpet area (sqm)",
    tenement: false,
  },
  "Storage / Warehouse": {
    corridor: "All other buildings",
    park: "storage",
    qtyLabel: "Storage area (sqm)",
    tenement: false,
  },
  "Restaurant / Food & Beverage": {
    corridor: "All other buildings",
    park: "restaurant",
    qtyLabel: "Floor area (sqm)",
    tenement: false,
  },
  Hostel: {
    corridor: "All other buildings",
    park: "hostel",
    qtyLabel: "Number of rooms",
    tenement: false,
  },
};

export const HOSAPETE_BUILDING_TYPE_KEYS = Object.keys(HOSAPETE_BUILDING_TYPES);

function lookupStep(table: [number, number][], key: number): number {
  for (const [upper, val] of table) {
    if (key <= upper) return val;
  }
  return table[table.length - 1]![1];
}

function setbacksFor(zone: ZonalZone, depth: number, width: number) {
  if (zone === "Industrial") {
    return {
      front: INDUSTRIAL_SETBACK.front,
      rear: INDUSTRIAL_SETBACK.rear,
      left: INDUSTRIAL_SETBACK.side,
      right: INDUSTRIAL_SETBACK.side,
      frBand: null as number | null,
      sideBand: null as number | null,
    };
  }
  const t = TABLE_1[zone];
  const dIdx = bandIndex(depth);
  const wIdx = bandIndex(width);
  return {
    front: t.front[dIdx]!,
    rear: t.rear[dIdx]!,
    left: t.left[wIdx]!,
    right: t.right[wIdx]!,
    frBand: dIdx,
    sideBand: wIdx,
  };
}

function parkingRequired(
  parkId: string,
  ctx: { tenements: number; qty: number },
): { cars: number; basis: string } {
  const { tenements: ten, qty: q } = ctx;
  const ceilDiv = (a: number, b: number) => (b ? Math.ceil(a / b) : 0);

  switch (parkId) {
    case "residential":
      return { cars: 1, basis: "Minimum one car space (2.50 m x 5.00 m)" };
    case "multifamily": {
      if (ten <= 0) return { cars: 1, basis: "Minimum one car space" };
      if (q > 150) {
        return { cars: Math.max(1, ten), basis: "1 car per tenement (carpet area > 150 sqm)" };
      }
      return {
        cars: Math.max(1, ceilDiv(ten, 2)),
        basis: "1 car per 2 tenements (carpet area 75-150 sqm)",
      };
    }
    case "lodging":
      return { cars: Math.max(1, ceilDiv(q, 8)), basis: "1 car per 8 guest rooms" };
    case "educational":
      return { cars: ceilDiv(q, 200), basis: "1 car per 200 sqm of office + public areas" };
    case "hospital":
      return { cars: Math.max(1, ceilDiv(q, 15)), basis: "1 car per 15 beds (min 195 sqm)" };
    case "nursing":
      return { cars: Math.max(1, ceilDiv(q, 7)), basis: "1 car per 7 beds (min 195 sqm)" };
    case "assembly":
      return { cars: ceilDiv(q, 50), basis: "1 car per 50 seats" };
    case "kalyana":
      return { cars: ceilDiv(q, 30), basis: "1 car per 30 sqm of auditorium floor area" };
    case "govt":
      return { cars: ceilDiv(q, 150), basis: "1 car per 150 sqm carpet area" };
    case "retail":
      if (q <= 100) return { cars: 0, basis: "No parking insisted up to 100 sqm (shops)" };
      return { cars: ceilDiv(q, 100), basis: "1 car per 100 sqm carpet area" };
    case "office":
      return { cars: ceilDiv(q, 100), basis: "1 car per 100 sqm floor area" };
    case "industrial":
      return { cars: ceilDiv(q, 200), basis: "1 car per 200 sqm carpet area" };
    case "storage":
      if (q <= 500) return { cars: ceilDiv(q, 100), basis: "1 car per 100 sqm (up to 500 sqm)" };
      return { cars: 5 + ceilDiv(q - 500, 200), basis: "1 per 100 sqm to 500 sqm, then 1 per 200 sqm" };
    case "restaurant":
      return { cars: ceilDiv(q, 75), basis: "1 car per 75 sqm floor area" };
    case "hostel":
      return { cars: ceilDiv(q, 15), basis: "1 car per 15 rooms" };
    default:
      return { cars: 0, basis: "-" };
  }
}

export function computeHosapeteZonal(input: ZonalSiteInput): ZonalComplianceResult {
  const city = zonalCity("hosapete")!;
  const meta = HOSAPETE_BUILDING_TYPES[input.buildingType];
  if (!meta) throw new Error("Unknown building type");

  const width = input.widthM;
  const depth = input.depthM;
  if (width <= 0 || depth <= 0) throw new Error("Enter valid site width and depth");

  const area = input.plotAreaSqm && input.plotAreaSqm > 0 ? input.plotAreaSqm : width * depth;
  const roads = [input.roadFrontM, input.roadRearM, input.roadLeftM, input.roadRightM];
  const frontRoad = roads[0] ?? 0;
  const detRoad = Math.max(...roads) > 0 ? Math.max(...roads) : frontRoad;

  const sb = setbacksFor(input.zone, depth, width);

  const blVal = HOSAPETE_BUILDING_LINE[input.roadClass] ?? null;
  let blFromBoundary: number | null = null;
  if (blVal != null && frontRoad > 0) {
    blFromBoundary = Math.max(0, blVal - frontRoad / 2);
  }

  let frontSetback = sb.front;
  if (blFromBoundary != null) {
    frontSetback = Math.max(frontSetback, blFromBoundary);
  }

  const far = lookupStep(FAR_BY_ROAD[input.zone], detRoad);
  const cov = lookupStep(COVERAGE[input.zone], area);
  const maxBuiltUp = far * area;
  const maxGround = cov * area;

  const buildableWidth = Math.max(0, width - sb.left - sb.right);
  const buildableDepth = Math.max(0, depth - frontSetback - sb.rear);
  const envelope = buildableWidth * buildableDepth;

  const corridor = CORRIDOR[meta.corridor] ?? 1.5;
  const { cars, basis } = parkingRequired(meta.park, {
    tenements: input.tenements,
    qty: input.parkingQty,
  });
  const twoWheeler = Math.ceil(cars * 0.25);

  const setbacks = [
    { side: "Front", roadWidthM: frontRoad ? frontRoad.toFixed(2) : "-", setbackM: frontSetback },
    { side: "Rear", roadWidthM: roads[1] ? roads[1]!.toFixed(2) : "-", setbackM: sb.rear },
    { side: "Left side", roadWidthM: roads[2] ? roads[2]!.toFixed(2) : "-", setbackM: sb.left },
    { side: "Right side", roadWidthM: roads[3] ? roads[3]!.toFixed(2) : "-", setbackM: sb.right },
  ];

  return {
    ok: true,
    city,
    plotAreaSqm: area,
    permissibleFar: far,
    maxBuiltUpSqm: maxBuiltUp,
    groundCoveragePct: cov * 100,
    maxGroundCoverageSqm: maxGround,
    determiningRoadM: detRoad,
    setbacks,
    frontSetbackM: frontSetback,
    rearM: sb.rear,
    leftM: sb.left,
    rightM: sb.right,
    buildableWidthM: buildableWidth,
    buildableDepthM: buildableDepth,
    buildableEnvelopeSqm: envelope,
    buildingLineFromCentreM: blVal,
    buildingLineFromBoundaryM: blFromBoundary,
    corridorCategory: meta.corridor,
    corridorWidthM: corridor,
    carSpaces: cars,
    twoWheelerSpaces: twoWheeler,
    parkingBasis: basis,
    bandLabels: {
      frontRear: sb.frBand != null ? HOSAPETE_BAND_LABELS[sb.frBand]! : "Industrial",
      sides: sb.sideBand != null ? HOSAPETE_BAND_LABELS[sb.sideBand]! : "Industrial",
    },
  };
}
