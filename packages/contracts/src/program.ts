import { z } from "zod";

/**
 * Project OS — Program Formulation.
 *
 * The architectural program (space schedule) is formulated from client
 * requirements, bounded by the feasibility envelope. The pre-project assessment's
 * `superBuiltupArea` is the single source of truth for the **max built extent**;
 * the program must fit inside it. Over-allocation is an advisory warning, never a
 * hard block (mirrors ESTI's checker-is-advisory ethos).
 *
 * A program is versioned: DRAFT → FROZEN. A FROZEN program is the baseline that
 * design revisions reference; a new version clones the frozen one for the next
 * round of changes.
 */

// --- Enums ------------------------------------------------------------------

export const ProgramStatus = z.enum(["DRAFT", "FROZEN"]);
export type ProgramStatus = z.infer<typeof ProgramStatus>;
export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  DRAFT: "Draft",
  FROZEN: "Frozen",
};
export const PROGRAM_STATUS_TAG: Record<ProgramStatus, "blue" | "green"> = {
  DRAFT: "blue",
  FROZEN: "green",
};

export const ProgramSpaceCategory = z.enum([
  "LIVING",
  "DINING",
  "KITCHEN",
  "BEDROOM",
  "BATHROOM",
  "STUDY",
  "POOJA",
  "UTILITY",
  "STORE",
  "CIRCULATION",
  "BALCONY",
  "PARKING",
  "SERVICE",
  "COMMERCIAL",
  "OTHER",
]);
export type ProgramSpaceCategory = z.infer<typeof ProgramSpaceCategory>;
export const PROGRAM_SPACE_CATEGORY_LABEL: Record<ProgramSpaceCategory, string> = {
  LIVING: "Living",
  DINING: "Dining",
  KITCHEN: "Kitchen",
  BEDROOM: "Bedroom",
  BATHROOM: "Bathroom",
  STUDY: "Study / Work",
  POOJA: "Pooja",
  UTILITY: "Utility",
  STORE: "Store",
  CIRCULATION: "Circulation",
  BALCONY: "Balcony / Open",
  PARKING: "Parking",
  SERVICE: "Service",
  COMMERCIAL: "Commercial",
  OTHER: "Other",
};

// --- Input schemas ----------------------------------------------------------

export const ProgramSpaceCreate = z.object({
  programId: z.string().uuid(),
  name: z.string().min(1).max(200),
  category: ProgramSpaceCategory,
  floorLevel: z.number().int().min(-2).max(60).default(0),
  unitAreaSqm: z.number().nonnegative(),
  count: z.number().int().positive().default(1),
  notes: z.string().max(1000).optional(),
});
export type ProgramSpaceCreate = z.infer<typeof ProgramSpaceCreate>;

export const ProgramSpaceUpdate = z.object({
  id: z.string().uuid(),
  programId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  category: ProgramSpaceCategory.optional(),
  floorLevel: z.number().int().min(-2).max(60).optional(),
  unitAreaSqm: z.number().nonnegative().optional(),
  count: z.number().int().positive().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type ProgramSpaceUpdate = z.infer<typeof ProgramSpaceUpdate>;

// --- Pure summary -----------------------------------------------------------

const EPS = 1e-6;

export interface ProgramSpaceLike {
  id: string;
  name: string;
  category: string;
  floorLevel: number;
  unitAreaSqm: number;
  count: number;
}

export interface ProgramSpaceRow extends ProgramSpaceLike {
  areaSqm: number;
}

export interface FloorRollup {
  floorLevel: number;
  areaSqm: number;
  spaceCount: number;
}

export interface CategoryRollup {
  category: string;
  areaSqm: number;
  spaceCount: number;
}

export interface ProgramSummary {
  spaces: ProgramSpaceRow[];
  totalProgrammedAreaSqm: number;
  maxBuiltAreaSqm: number;
  /** total / maxBuilt × 100; null when no feasibility envelope is set. */
  utilizationPct: number | null;
  /** maxBuilt − total (negative = over the envelope). null when no envelope. */
  remainingAreaSqm: number | null;
  /** Advisory: programmed area exceeds the feasibility envelope. */
  overEnvelope: boolean;
  floorsUsed: number;
  byFloor: FloorRollup[];
  byCategory: CategoryRollup[];
}

/**
 * Summarise a program's spaces against the feasibility max-built envelope.
 * `maxBuiltAreaSqm` is the assessment's super-builtup area (source of truth).
 */
export function summarizeProgram(
  spaces: ProgramSpaceLike[],
  maxBuiltAreaSqm: number,
): ProgramSummary {
  const rows: ProgramSpaceRow[] = spaces.map((s) => ({
    ...s,
    areaSqm: s.unitAreaSqm * s.count,
  }));

  const totalProgrammedAreaSqm = rows.reduce((sum, r) => sum + r.areaSqm, 0);

  const floorMap = new Map<number, FloorRollup>();
  const catMap = new Map<string, CategoryRollup>();
  for (const r of rows) {
    const f = floorMap.get(r.floorLevel) ?? { floorLevel: r.floorLevel, areaSqm: 0, spaceCount: 0 };
    f.areaSqm += r.areaSqm;
    f.spaceCount += r.count;
    floorMap.set(r.floorLevel, f);

    const c = catMap.get(r.category) ?? { category: r.category, areaSqm: 0, spaceCount: 0 };
    c.areaSqm += r.areaSqm;
    c.spaceCount += r.count;
    catMap.set(r.category, c);
  }

  const hasEnvelope = maxBuiltAreaSqm > EPS;
  const utilizationPct = hasEnvelope ? (totalProgrammedAreaSqm / maxBuiltAreaSqm) * 100 : null;
  const remainingAreaSqm = hasEnvelope ? maxBuiltAreaSqm - totalProgrammedAreaSqm : null;
  const overEnvelope = hasEnvelope && totalProgrammedAreaSqm > maxBuiltAreaSqm + EPS;

  return {
    spaces: rows,
    totalProgrammedAreaSqm,
    maxBuiltAreaSqm,
    utilizationPct,
    remainingAreaSqm,
    overEnvelope,
    floorsUsed: floorMap.size,
    byFloor: [...floorMap.values()].sort((a, b) => a.floorLevel - b.floorLevel),
    byCategory: [...catMap.values()].sort((a, b) => b.areaSqm - a.areaSqm),
  };
}
