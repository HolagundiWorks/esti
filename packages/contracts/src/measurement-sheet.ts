import { z } from "zod";
import { MeasurementUom } from "./item-library.js";

export const MeasurementBookStatus = z.enum(["DRAFT", "ISSUED"]);
export type MeasurementBookStatus = z.infer<typeof MeasurementBookStatus>;

export const MeasurementDerivation = z.enum(["AUTO", "MANUAL", "OVERRIDE"]);
export type MeasurementDerivation = z.infer<typeof MeasurementDerivation>;

/** Max inclusive LVL index (LVL 0 … LVL 10). */
export const BUILDING_LEVEL_MAX_INDEX = 10;

/** Default FFL-to-FFL storey height (3.0 m). */
export const DEFAULT_STOREY_HEIGHT_MM = 3000;

/** Suggested floor names for LVL 0 (user may type anything). */
export const LVL0_FLOOR_NAME_SUGGESTIONS = [
  "Basement",
  "Basement 1",
  "Basement 2",
  "Ground",
  "Stilt",
  "Podium",
] as const;

export const BuildingLevel = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  levelIndex: z.number().int().min(0).max(BUILDING_LEVEL_MAX_INDEX),
  code: z.string(),
  name: z.string(),
  elevationMm: z.number().int(),
  storeyHeightMm: z.number().int().positive(),
  /** null = use project structural default. */
  beamDepthMm: z.number().int().nonnegative().nullable(),
  /** null = use project structural default. */
  lintelHeightMm: z.number().int().nonnegative().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BuildingLevel = z.infer<typeof BuildingLevel>;

export const FloorLevelDraft = z.object({
  levelIndex: z.number().int().min(0).max(BUILDING_LEVEL_MAX_INDEX),
  floorName: z.string().min(1).max(120),
  /**
   * Storey owned by this level: FFL of LVL n → FFL of LVL n+1 (or roof on the top level),
   * in millimetres. The floor between LVL 0 and LVL 1 is LVL 0; between 1 and 2 is LVL 1; etc.
   */
  storeyHeightMm: z.number().int().positive().max(20_000),
  /** Optional; null/omit = project default beam depth. */
  beamDepthMm: z.number().int().nonnegative().max(5000).nullable().optional(),
  /** Optional; null/omit = project default lintel height. */
  lintelHeightMm: z.number().int().nonnegative().max(2000).nullable().optional(),
});
export type FloorLevelDraft = z.infer<typeof FloorLevelDraft>;

/**
 * Replace the project's LVL stack.
 * `levels` must be contiguous from 0 … N (N ≤ 10), each with a floor name + FFL height.
 */
export const ConfigureBuildingFloorsInput = z.object({
  projectId: z.string().uuid(),
  levels: z
    .array(FloorLevelDraft)
    .min(1)
    .max(BUILDING_LEVEL_MAX_INDEX + 1)
    .refine(
      (rows) => {
        const idxs = rows.map((r) => r.levelIndex).sort((a, b) => a - b);
        return idxs.every((v, i) => v === i);
      },
      { message: "Levels must be contiguous LVL 0 … LVL N with no gaps" },
    ),
});
export type ConfigureBuildingFloorsInput = z.infer<typeof ConfigureBuildingFloorsInput>;

/** Project-wide RCC deductions used to auto-derive column / wall heights. */
export const ProjectStructuralDefaults = z.object({
  slabThicknessMm: z.number().int().nonnegative().max(2000),
  beamDepthMm: z.number().int().nonnegative().max(5000),
  lintelHeightMm: z.number().int().nonnegative().max(2000),
});
export type ProjectStructuralDefaults = z.infer<typeof ProjectStructuralDefaults>;

export const UpsertProjectStructuralDefaultsInput = ProjectStructuralDefaults.extend({
  projectId: z.string().uuid(),
});
export type UpsertProjectStructuralDefaultsInput = z.infer<
  typeof UpsertProjectStructuralDefaultsInput
>;

export const UpsertBuildingLevelInput = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid().optional(),
  levelIndex: z.number().int().min(0).max(BUILDING_LEVEL_MAX_INDEX).optional(),
  code: z.string().min(1).max(16),
  name: z.string().min(1).max(120),
  elevationMm: z.number().int(),
  storeyHeightMm: z.number().int().positive().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpsertBuildingLevelInput = z.infer<typeof UpsertBuildingLevelInput>;

export const MeasurementBook = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  status: MeasurementBookStatus,
  libraryVersionId: z.string().uuid().nullable(),
  revisionNo: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MeasurementBook = z.infer<typeof MeasurementBook>;

export const MeasurementRow = z.object({
  id: z.string().uuid(),
  bookId: z.string().uuid(),
  levelId: z.string().uuid().nullable(),
  libraryItemId: z.string().uuid().nullable(),
  libraryItemCode: z.string().nullable(),
  particulars: z.string(),
  lengthMm: z.number().int().nullable(),
  breadthMm: z.number().int().nullable(),
  heightMm: z.number().int().nullable(),
  /** null = inherit level then project. */
  beamDepthMm: z.number().int().nonnegative().nullable(),
  /** null = inherit level then project. */
  lintelHeightMm: z.number().int().nonnegative().nullable(),
  quantity: z.number(),
  uom: MeasurementUom,
  ratePaise: z.number().int().nullable(),
  derivation: MeasurementDerivation,
  specCatalogItemId: z.string().uuid().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MeasurementRow = z.infer<typeof MeasurementRow>;

export const UpsertMeasurementRowInput = z.object({
  bookId: z.string().uuid(),
  id: z.string().uuid().optional(),
  levelId: z.string().uuid().nullable().optional(),
  libraryItemId: z.string().uuid().nullable().optional(),
  libraryItemCode: z.string().nullable().optional(),
  particulars: z.string().min(1).max(2000),
  lengthMm: z.number().int().nonnegative().nullable().optional(),
  breadthMm: z.number().int().nonnegative().nullable().optional(),
  heightMm: z.number().int().nonnegative().nullable().optional(),
  /** null = inherit; omit on update to leave unchanged when not sent from UI. */
  beamDepthMm: z.number().int().nonnegative().max(5000).nullable().optional(),
  lintelHeightMm: z.number().int().nonnegative().max(2000).nullable().optional(),
  quantity: z.number().nonnegative().optional(),
  uom: MeasurementUom,
  ratePaise: z.number().int().nonnegative().nullable().optional(),
  derivation: MeasurementDerivation.optional(),
  specCatalogItemId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpsertMeasurementRowInput = z.infer<typeof UpsertMeasurementRowInput>;

/** Canonical level code for index n. */
export function buildingLevelCode(levelIndex: number): string {
  return `LVL ${levelIndex}`;
}

/**
 * Compute absolute FFL elevations from a contiguous LVL stack.
 * LVL 0 sits at datum 0; each next FFL = previous FFL + previous storey height.
 */
export function computeLevelElevations(
  levels: { levelIndex: number; storeyHeightMm: number }[],
): Map<number, number> {
  const sorted = [...levels].sort((a, b) => a.levelIndex - b.levelIndex);
  const elev = new Map<number, number>();
  let running = 0;
  for (const row of sorted) {
    elev.set(row.levelIndex, running);
    running += row.storeyHeightMm;
  }
  return elev;
}
