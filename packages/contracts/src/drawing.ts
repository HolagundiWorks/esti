import { z } from "zod";

/**
 * Drawings & automated takeoff (ADR-10).
 * A DXF is uploaded, stored content-addressed in object storage, and handed to
 * the Python worker (ezdxf) which extracts per-layer entity counts + model
 * bounds and writes the result back. Status drives the SPA poll.
 */
export const DrawingStatus = z.enum(["PENDING", "PROCESSING", "READY", "FAILED"]);
export type DrawingStatus = z.infer<typeof DrawingStatus>;

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

export const DRAWING_MAX_BYTES = 25 * 1024 * 1024; // 25 MB DXF cap
