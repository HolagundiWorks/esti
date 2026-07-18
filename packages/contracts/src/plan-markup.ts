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
