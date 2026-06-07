import { z } from "zod";

/**
 * BBMP development-control calculator (Phase 9). See docs/esti/BYLAWS-BBMP.md.
 * Turns site geometry into the governing FAR, ground coverage, setbacks and
 * parking. The rule tables below are editable seed defaults — verify against the
 * current BBMP byelaws / RMP before relying on a result.
 */
export const BuildingType = z.enum(["RESIDENTIAL", "COMMERCIAL", "SEMI_PUBLIC", "PUBLIC"]);
export type BuildingType = z.infer<typeof BuildingType>;

export const BUILDING_TYPE_LABEL: Record<string, string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  SEMI_PUBLIC: "Semi-public",
  PUBLIC: "Public building",
};

const sideInput = z.object({
  abutsRoad: z.boolean().default(false),
  roadWidthM: z.number().nonnegative().default(0),
  /** Restricted building line measured from the centre of the road (m). */
  rblFromCentreM: z.number().nonnegative().default(0),
});

export const BylawCalcInput = z.object({
  buildingType: BuildingType,
  siteAreaSqm: z.number().positive(),
  proposedHeightM: z.number().positive().default(11.5),
  front: sideInput,
  rear: sideInput,
  left: sideInput,
  right: sideInput,
});
export type BylawCalcInput = z.infer<typeof BylawCalcInput>;

export interface BylawEnvelope {
  far: number;
  coveragePct: number;
  maxBuiltUpSqm: number;
  maxFootprintSqm: number;
  setbacks: { front: number; rear: number; left: number; right: number };
  governingRoadWidthM: number;
  parking: string;
  notes: string[];
}

/** FAR + coverage by abutting road width (residential RMP-2015-style seed). */
const FAR_BY_ROAD = [
  { maxRoadW: 12, far: 1.75, coverage: 60 },
  { maxRoadW: 18, far: 2.25, coverage: 60 },
  { maxRoadW: 24, far: 2.5, coverage: 60 },
  { maxRoadW: 30, far: 3.0, coverage: 60 },
  { maxRoadW: Infinity, far: 3.25, coverage: 60 },
];

/** Setbacks (m) by building height tier — front/rear/side. */
const SETBACK_BY_HEIGHT = [
  { maxHeight: 11.5, front: 3.0, rear: 1.5, side: 1.5 },
  { maxHeight: 15, front: 5.0, rear: 3.0, side: 3.0 },
  { maxHeight: 18, front: 6.0, rear: 3.0, side: 3.0 },
  { maxHeight: 24, front: 7.0, rear: 5.0, side: 5.0 },
  { maxHeight: Infinity, front: 10.0, rear: 7.0, side: 7.0 },
];

/** Commercial uses a higher coverage/FAR floor (seed); others reuse residential. */
function farRow(buildingType: BuildingType, roadWidth: number) {
  const row = FAR_BY_ROAD.find((r) => roadWidth < r.maxRoadW) ?? FAR_BY_ROAD[FAR_BY_ROAD.length - 1]!;
  if (buildingType === "COMMERCIAL") return { far: row.far + 0.25, coverage: 65 };
  return { far: row.far, coverage: row.coverage };
}

function setbackRow(heightM: number) {
  return SETBACK_BY_HEIGHT.find((r) => heightM <= r.maxHeight) ?? SETBACK_BY_HEIGHT[0]!;
}

function parkingFor(buildingType: BuildingType, builtUpSqm: number): string {
  if (buildingType === "RESIDENTIAL") {
    const ecs = Math.ceil(builtUpSqm / 100);
    return `~${ecs} ECS (1 per 100 sq m built-up)`;
  }
  const ecs = Math.ceil(builtUpSqm / 50);
  return `~${ecs} ECS (1 per 50 sq m built-up)`;
}

/** Pure, deterministic envelope computation (shared by backend + SPA). */
export function computeBylawEnvelope(input: BylawCalcInput): BylawEnvelope {
  const sides = { front: input.front, rear: input.rear, left: input.left, right: input.right };
  const roadWidths = Object.values(sides)
    .filter((s) => s.abutsRoad && s.roadWidthM > 0)
    .map((s) => s.roadWidthM);
  const governingRoadWidthM = roadWidths.length ? Math.max(...roadWidths) : 0;

  const { far, coverage } = farRow(input.buildingType, governingRoadWidthM);
  const maxBuiltUpSqm = Math.round(input.siteAreaSqm * far);
  const maxFootprintSqm = Math.round((input.siteAreaSqm * coverage) / 100);

  const sb = setbackRow(input.proposedHeightM);
  const tableSetback = (side: "front" | "rear" | "left" | "right") =>
    side === "front" ? sb.front : side === "rear" ? sb.rear : sb.side;

  const notes: string[] = [];
  const setbackForSide = (side: "front" | "rear" | "left" | "right") => {
    const s = sides[side];
    const table = tableSetback(side);
    const roadSetback = s.abutsRoad ? Math.max(0, s.rblFromCentreM - s.roadWidthM / 2) : 0;
    const governing = Math.max(table, roadSetback);
    if (s.abutsRoad && roadSetback > table) {
      notes.push(`${side}: RBL governs (${roadSetback.toFixed(2)} m > table ${table} m)`);
    }
    return Number(governing.toFixed(2));
  };

  return {
    far,
    coveragePct: coverage,
    maxBuiltUpSqm,
    maxFootprintSqm,
    setbacks: {
      front: setbackForSide("front"),
      rear: setbackForSide("rear"),
      left: setbackForSide("left"),
      right: setbackForSide("right"),
    },
    governingRoadWidthM,
    parking: parkingFor(input.buildingType, maxBuiltUpSqm),
    notes,
  };
}
