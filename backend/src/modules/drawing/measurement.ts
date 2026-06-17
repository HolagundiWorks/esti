import {
  TakeoffMeasurementCreate,
  computeTakeoffBoq,
  takeoffElement,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { drawings, measurements } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { importTakeoffToEstimate, previewTakeoffForDsr } from "../boq/takeoffImport.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const measurementRouter = router({
  listByDrawing: protectedProcedure
    .input(z.object({ drawingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(measurements)
        .where(eq(measurements.drawingId, input.drawingId))
        .orderBy(desc(measurements.createdAt));
    }),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: measurements.id,
          label: measurements.label,
          kind: measurements.kind,
          realLength: measurements.realLength,
          unit: measurements.unit,
          elementTypeId: measurements.elementTypeId,
          elementCategory: measurements.elementCategory,
          boqQty: measurements.boqQty,
          boqUnit: measurements.boqUnit,
          boqDescription: measurements.boqDescription,
          itemCount: measurements.itemCount,
          drawingTitle: drawings.title,
          drawingRef: drawings.ref,
        })
        .from(measurements)
        .innerJoin(drawings, eq(drawings.id, measurements.drawingId))
        .where(eq(measurements.projectId, input.projectId))
        .orderBy(desc(measurements.createdAt));
    }),

  /** Preview takeoff quantities with DSR rates for a chosen master schedule. */
  takeoffPreview: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        dsrVersionId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => previewTakeoffForDsr(ctx.db, input)),

  create: protectedProcedure.input(TakeoffMeasurementCreate).mutation(async ({ ctx, input }) => {
    const [drawing] = await ctx.db
      .select({ projectId: drawings.projectId })
      .from(drawings)
      .where(eq(drawings.id, input.drawingId));
    if (!drawing) throw new TRPCError({ code: "NOT_FOUND", message: "Drawing not found" });
    if (drawing.projectId !== input.projectId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Drawing belongs to another project" });
    }

    const el = takeoffElement(input.elementTypeId);
    if (!el) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown takeoff element type" });

    const boq = computeTakeoffBoq({
      elementTypeId: input.elementTypeId,
      measureKind: input.kind,
      realLength: input.realLength,
      unit: input.unit,
      heightMm: input.heightMm,
      itemCount: input.itemCount,
    });

    const [row] = await ctx.db
      .insert(measurements)
      .values({
        drawingId: input.drawingId,
        projectId: input.projectId,
        label: input.label,
        kind: input.kind,
        vbLength: input.vbLength,
        realLength: input.realLength,
        unit: input.unit,
        elementTypeId: input.elementTypeId,
        elementCategory: el.category,
        heightMm: input.heightMm ?? el.defaultHeightMm ?? null,
        itemCount: input.itemCount ?? 1,
        boqQty: boq.boqQty,
        boqUnit: boq.boqUnit,
        boqDescription: boq.boqDescription,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "measurement",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(measurements).where(eq(measurements.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(measurements).where(eq(measurements.id, input.id));
      await writeAudit(ctx.db, {
        entity: "measurement",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before,
      });
      return { ok: true };
    }),

  /** Push tagged takeoff rows into a draft estimate (DSR rates applied when matched). */
  applyToEstimate: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        estimateId: z.string().uuid(),
        measurementIds: z.array(z.string().uuid()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      importTakeoffToEstimate(ctx.db, { ...input, actorId: ctx.user.id }),
    ),
});
