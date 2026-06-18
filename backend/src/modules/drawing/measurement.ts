import { ProjectCursorListParams, clampListLimit } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { drawings, measurements } from "../../db/schema.js";
import { buildCursorPage, cursorWhere } from "../../lib/cursorPage.js";
import { importTakeoffToEstimate, previewTakeoffForDsr } from "../boq/takeoffImport.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

const ESTICAD_ONLY =
  "Quantity takeoff is only available in ESTICAD. Open the drawing from AORMS with Open in ESTICAD.";

export const measurementRouter = router({
  listByDrawing: protectedProcedure
    .input(
      z.object({
        drawingId: z.string().uuid(),
        limit: z.number().int().min(1).max(500).optional(),
        cursor: ProjectCursorListParams.shape.cursor,
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(measurements)
        .where(
          and(
            eq(measurements.drawingId, input.drawingId),
            cursorWhere(input.cursor, measurements.createdAt, measurements.id),
          ),
        )
        .orderBy(desc(measurements.createdAt), desc(measurements.id))
        .limit(clampListLimit(input.limit) + 1);
      return buildCursorPage(rows, input.limit);
    }),

  listByProject: protectedProcedure
    .input(ProjectCursorListParams)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
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
          createdAt: measurements.createdAt,
        })
        .from(measurements)
        .innerJoin(drawings, eq(drawings.id, measurements.drawingId))
        .where(
          and(
            eq(measurements.projectId, input.projectId),
            cursorWhere(input.cursor, measurements.createdAt, measurements.id),
          ),
        )
        .orderBy(desc(measurements.createdAt), desc(measurements.id))
        .limit(clampListLimit(input.limit) + 1);
      return buildCursorPage(rows, input.limit);
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

  create: protectedProcedure.mutation(() => {
    throw new TRPCError({ code: "FORBIDDEN", message: ESTICAD_ONLY });
  }),

  remove: protectedProcedure.mutation(() => {
    throw new TRPCError({ code: "FORBIDDEN", message: ESTICAD_ONLY });
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
