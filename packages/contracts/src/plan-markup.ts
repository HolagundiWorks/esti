import { z } from "zod";
import { PlanMarkerKind } from "./item-library.js";

/** Phase 2 — plan reader markup on calibrated sheets. */
export const SheetCalibration = z.object({
  id: z.string().uuid(),
  drawingId: z.string().uuid(),
  pageNo: z.number().int().nonnegative(),
  unitsPerPoint: z.number().positive(),
  unitLabel: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SheetCalibration = z.infer<typeof SheetCalibration>;

export const PlanMarkupSet = z.object({
  id: z.string().uuid(),
  drawingId: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PlanMarkupSet = z.infer<typeof PlanMarkupSet>;

export const PlanMarkupGeometry = z.object({
  kind: z.enum(["LINE", "POLYLINE", "RECT", "POINT", "DIMENSION"]),
  points: z.array(z.object({ x: z.number(), y: z.number() })),
  closed: z.boolean().optional(),
});
export type PlanMarkupGeometry = z.infer<typeof PlanMarkupGeometry>;

export const PlanMarkupItem = z.object({
  id: z.string().uuid(),
  setId: z.string().uuid(),
  markerKind: PlanMarkerKind,
  libraryItemId: z.string().uuid().nullable(),
  label: z.string(),
  geometry: PlanMarkupGeometry,
  lengthMm: z.number().int().nullable(),
  breadthMm: z.number().int().nullable(),
  heightMm: z.number().int().nullable(),
  /** Enclosed plan area in mm² (AREA markers only; see areaPointsToMm2). */
  areaMm2: z.number().nonnegative().nullable(),
  count: z.number().int().positive().default(1),
  measurementRowId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PlanMarkupItem = z.infer<typeof PlanMarkupItem>;

export const UpsertSheetCalibrationInput = z.object({
  drawingId: z.string().uuid(),
  pageNo: z.number().int().nonnegative().default(0),
  /** Real millimetres per SVG/PDF point (or viewBox unit). */
  unitsPerPoint: z.number().positive(),
  unitLabel: z.string().min(1).max(16).default("mm"),
});
export type UpsertSheetCalibrationInput = z.infer<typeof UpsertSheetCalibrationInput>;

export const UpsertPlanMarkupItemInput = z.object({
  setId: z.string().uuid(),
  id: z.string().uuid().optional(),
  markerKind: PlanMarkerKind,
  libraryItemId: z.string().uuid().nullable().optional(),
  label: z.string().min(1).max(200),
  geometry: PlanMarkupGeometry,
  lengthMm: z.number().int().nonnegative().nullable().optional(),
  breadthMm: z.number().int().nonnegative().nullable().optional(),
  heightMm: z.number().int().nonnegative().nullable().optional(),
  areaMm2: z.number().nonnegative().nullable().optional(),
  count: z.number().int().positive().default(1),
});
export type UpsertPlanMarkupItemInput = z.infer<typeof UpsertPlanMarkupItemInput>;

/** Euclidean length of a polyline in sheet points. */
export function geometryLengthPoints(geometry: PlanMarkupGeometry): number {
  const pts = geometry.points;
  if (pts.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  if (geometry.closed && pts.length > 2) {
    const a = pts[pts.length - 1]!;
    const b = pts[0]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

/**
 * Enclosed area of a closed shape, in **square** sheet points (shoelace).
 *
 * RECT is treated as its bounding box; POLYLINE only encloses an area when it
 * is `closed`. Anything else (a line, a point, an open polyline) has no area
 * and returns 0 — an open shape must never silently report one.
 *
 * The result is unsigned, so winding order does not matter.
 */
export function geometryAreaPoints(geometry: PlanMarkupGeometry): number {
  const pts = geometry.points;
  if (geometry.kind === "RECT") {
    const { width, height } = geometryBoundsPoints(geometry);
    return width * height;
  }
  if (geometry.kind !== "POLYLINE" || !geometry.closed || pts.length < 3) return 0;
  let twiceArea = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    twiceArea += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twiceArea) / 2;
}

/**
 * Convert an enclosed area from sheet points to real mm².
 *
 * Calibration is **linear** (mm per point), so area scales by its **square**.
 * Multiplying an area by `unitsPerPoint` once is a classic and silent error —
 * at a typical 1:100 sheet it under-reports by around two orders of magnitude.
 */
export function areaPointsToMm2(areaPoints: number, unitsPerPoint: number): number {
  return areaPoints * unitsPerPoint * unitsPerPoint;
}

/** Axis-aligned width/height of geometry bounding box in sheet points. */
export function geometryBoundsPoints(geometry: PlanMarkupGeometry): {
  width: number;
  height: number;
} {
  const pts = geometry.points;
  if (pts.length === 0) return { width: 0, height: 0 };
  let minX = pts[0]!.x;
  let maxX = pts[0]!.x;
  let minY = pts[0]!.y;
  let maxY = pts[0]!.y;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { width: maxX - minX, height: maxY - minY };
}
