import {
  UpsertPlanMarkupItemInput,
  UpsertSheetCalibrationInput,
  areaPointsToMm2,
  geometryAreaPoints,
  geometryBoundsPoints,
  geometryLengthPoints,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  drawings,
  planMarkupItems,
  planMarkupSets,
  sheetCalibrations,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

async function getOrCreateSet(
  db: Parameters<typeof writeAudit>[0],
  projectId: string,
  drawingId: string,
) {
  const [existing] = await db
    .select()
    .from(planMarkupSets)
    .where(and(eq(planMarkupSets.projectId, projectId), eq(planMarkupSets.drawingId, drawingId)))
    .orderBy(desc(planMarkupSets.createdAt))
    .limit(1);
  if (existing) return existing;

  const [drawing] = await db.select().from(drawings).where(eq(drawings.id, drawingId)).limit(1);
  if (!drawing || drawing.projectId !== projectId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Drawing not found for project" });
  }

  const [set] = await db
    .insert(planMarkupSets)
    .values({
      projectId,
      drawingId,
      title: `Markup — ${drawing.ref}`,
    })
    .returning();
  return set!;
}

function dimsFromGeometry(
  geometry: UpsertPlanMarkupItemInput["geometry"],
  unitsPerPoint: number | null,
  overrides: {
    lengthMm?: number | null;
    breadthMm?: number | null;
    heightMm?: number | null;
  },
) {
  const calibrated = unitsPerPoint != null && unitsPerPoint > 0;

  // Enclosed area is a property of the shape, so it is computed even when the
  // user has overridden length/breadth — those describe a run, not the polygon.
  // 0 for any shape that encloses nothing (a line, an open polyline).
  const areaMm2 = calibrated
    ? areaPointsToMm2(geometryAreaPoints(geometry), unitsPerPoint) || null
    : null;

  if (overrides.lengthMm != null || overrides.breadthMm != null || !calibrated) {
    return {
      lengthMm: overrides.lengthMm ?? null,
      breadthMm: overrides.breadthMm ?? null,
      heightMm: overrides.heightMm ?? null,
      areaMm2,
    };
  }

  const lenPts = geometryLengthPoints(geometry);
  const bounds = geometryBoundsPoints(geometry);
  const lengthMm = Math.round(lenPts * unitsPerPoint);
  // For RECT / closed shapes, also capture breadth from the shorter axis.
  const breadthMm =
    geometry.kind === "RECT" || geometry.closed
      ? Math.round(Math.min(bounds.width, bounds.height) * unitsPerPoint)
      : overrides.breadthMm ?? null;
  return {
    lengthMm: lengthMm > 0 ? lengthMm : null,
    breadthMm,
    heightMm: overrides.heightMm ?? null,
    areaMm2,
  };
}

export const planMarkupRouter = router({
  getForDrawing: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), drawingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const set = await getOrCreateSet(ctx.db, input.projectId, input.drawingId);
      const [calibration] = await ctx.db
        .select()
        .from(sheetCalibrations)
        .where(
          and(
            eq(sheetCalibrations.drawingId, input.drawingId),
            eq(sheetCalibrations.pageNo, 0),
          ),
        )
        .limit(1);
      const items = await ctx.db
        .select()
        .from(planMarkupItems)
        .where(eq(planMarkupItems.setId, set.id))
        .orderBy(asc(planMarkupItems.createdAt));
      return { set, calibration: calibration ?? null, items };
    }),

  upsertCalibration: protectedProcedure
    .input(UpsertSheetCalibrationInput)
    .mutation(async ({ ctx, input }) => {
      const [drawing] = await ctx.db
        .select()
        .from(drawings)
        .where(eq(drawings.id, input.drawingId))
        .limit(1);
      if (!drawing) throw new TRPCError({ code: "NOT_FOUND" });

      const [existing] = await ctx.db
        .select()
        .from(sheetCalibrations)
        .where(
          and(
            eq(sheetCalibrations.drawingId, input.drawingId),
            eq(sheetCalibrations.pageNo, input.pageNo),
          ),
        )
        .limit(1);

      if (existing) {
        const [row] = await ctx.db
          .update(sheetCalibrations)
          .set({
            unitsPerPoint: input.unitsPerPoint,
            unitLabel: input.unitLabel,
          })
          .where(eq(sheetCalibrations.id, existing.id))
          .returning();
        await writeAudit(ctx.db, {
          entity: "sheet_calibration",
          entityId: row!.id,
          action: "UPDATE",
          actorId: ctx.user.id,
          after: row,
        });
        return row!;
      }

      const [row] = await ctx.db
        .insert(sheetCalibrations)
        .values({
          drawingId: input.drawingId,
          pageNo: input.pageNo,
          unitsPerPoint: input.unitsPerPoint,
          unitLabel: input.unitLabel,
        })
        .returning();
      await writeAudit(ctx.db, {
        entity: "sheet_calibration",
        entityId: row!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: row,
      });
      return row!;
    }),

  upsertItem: protectedProcedure
    .input(UpsertPlanMarkupItemInput)
    .mutation(async ({ ctx, input }) => {
      const [set] = await ctx.db
        .select()
        .from(planMarkupSets)
        .where(eq(planMarkupSets.id, input.setId))
        .limit(1);
      if (!set) throw new TRPCError({ code: "NOT_FOUND", message: "Markup set not found" });

      const [calibration] = await ctx.db
        .select()
        .from(sheetCalibrations)
        .where(
          and(eq(sheetCalibrations.drawingId, set.drawingId), eq(sheetCalibrations.pageNo, 0)),
        )
        .limit(1);

      const dims = dimsFromGeometry(input.geometry, calibration?.unitsPerPoint ?? null, {
        lengthMm: input.lengthMm,
        breadthMm: input.breadthMm,
        heightMm: input.heightMm,
      });

      const values = {
        setId: input.setId,
        markerKind: input.markerKind,
        libraryItemId: input.libraryItemId ?? null,
        label: input.label,
        geometry: input.geometry,
        lengthMm: dims.lengthMm,
        breadthMm: dims.breadthMm,
        heightMm: dims.heightMm,
        // Explicit override wins (hand-entered area); otherwise from the shape.
        areaMm2: input.areaMm2 ?? dims.areaMm2,
        count: input.count ?? 1,
      };

      if (input.id) {
        const [row] = await ctx.db
          .update(planMarkupItems)
          .set(values)
          .where(eq(planMarkupItems.id, input.id))
          .returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }

      const [row] = await ctx.db.insert(planMarkupItems).values(values).returning();
      return row!;
    }),

  removeItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(planMarkupItems).where(eq(planMarkupItems.id, input.id));
      return { ok: true };
    }),
});
