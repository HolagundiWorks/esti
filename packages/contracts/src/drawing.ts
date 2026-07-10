import { z } from "zod";

/**
 * Drawings & automated takeoff (ADR-10).
 * - DXF: stored content-addressed, worker (ezdxf) renders SVG + takeoff; status polls PENDING→READY.
 * - PDF: stored as the plan source; READY immediately (no worker); Plan Measurement renders via PDF.js.
 */
export const DrawingStatus = z.enum(["PENDING", "PROCESSING", "READY", "FAILED"]);
export type DrawingStatus = z.infer<typeof DrawingStatus>;

/** How the plan sheet is sourced for Measurement Plan reader. */
export const DrawingSourceKind = z.enum(["DXF", "PDF"]);
export type DrawingSourceKind = z.infer<typeof DrawingSourceKind>;

/** Infer source kind from storage key prefix or file name. */
export function drawingSourceKind(opts: {
  storageKey?: string | null;
  fileName?: string | null;
}): DrawingSourceKind {
  const key = (opts.storageKey ?? "").toLowerCase();
  if (key.startsWith("pdf/")) return "PDF";
  const name = (opts.fileName ?? "").toLowerCase();
  if (name.endsWith(".pdf")) return "PDF";
  return "DXF";
}

/** Per-layer takeoff row produced by the worker. */
export const DrawingLayer = z.object({
  name: z.string(),
  entityCount: z.number().int().nonnegative(),
  color: z.number().int().optional(),
});
export type DrawingLayer = z.infer<typeof DrawingLayer>;

/** Model-space extents in drawing units (from $EXTMIN/$EXTMAX). */
export const DrawingBounds = z.object({
  minX: z.number(),
  minY: z.number(),
  maxX: z.number(),
  maxY: z.number(),
});
export type DrawingBounds = z.infer<typeof DrawingBounds>;

/** Upload metadata accepted by the multipart REST route (validated server-side). */
export const DrawingUploadFields = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  // When uploading a new revision of an existing drawing, any revision id in
  // that drawing's chain; the server links it and bumps the revision number.
  rootId: z.string().uuid().optional(),
  revisionNote: z.string().max(500).optional(),
});
export type DrawingUploadFields = z.infer<typeof DrawingUploadFields>;

export const DRAWING_MAX_BYTES = 25 * 1024 * 1024; // 25 MB DXF / PDF cap
