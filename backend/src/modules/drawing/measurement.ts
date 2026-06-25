import {
  CompanionMeasurementCreate,
  ProjectCursorListParams,
  computeTakeoffBoq,
  clampListLimit,
  takeoffElement,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { drawings, measurements } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { assertCompanionTakeoff } from "../../lib/companion/writeGate.js";
import { buildCursorPage, cursorWhere } from "../../lib/cursorPage.js";
import { enforceRateLimit } from "../../lib/ratelimit.js";
import { requireProject } from "../../lib/projectScope.js";
import { importTakeoffToEstimate, previewTakeoffForDsr } from "../boq/takeoffImport.js";
import { companionWriteProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

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
          source: measurements.source,
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

  /** Preview takeoff quantities with rate-book rates for a chosen schedule. */
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

  /** ESTICAD — world-coordinate measurement create (online only). */
  createCompanion: companionWriteProcedure
    .input(CompanionMeasurementCreate)
    .mutation(async ({ ctx, input }) => {
      await assertCompanionTakeoff(ctx);
      await enforceRateLimit("companion-measurement", ctx.deviceSessionId!, 120, 60);
      await requireProject(ctx.db, input.projectId);

      const [drawing] = await ctx.db
        .select()
        .from(drawings)
        .where(and(eq(drawings.id, input.drawingId), eq(drawings.projectId, input.projectId)))
        .limit(1);
      if (!drawing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Drawing not found in project" });
      }

      const el = takeoffElement(input.elementTypeId);
      const boq = computeTakeoffBoq({
        elementTypeId: input.elementTypeId,
        measureKind: input.kind,
        realLength: input.realLength,
        unit: input.scaleWorldUnits,
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
          vbLength: 0,
          realLength: input.realLength,
          unit: input.scaleWorldUnits,
          elementTypeId: input.elementTypeId,
          elementCategory: el?.category ?? null,
          heightMm: input.heightMm ?? el?.defaultHeightMm ?? null,
          itemCount: input.itemCount,
          boqQty: boq.boqQty,
          boqUnit: boq.boqUnit,
          boqDescription: boq.boqDescription,
          source: "ESTICAD",
          worldGeometry: input.worldGeometry ?? null,
          entityRefs: input.entityRefs ?? null,
          scaleWorldUnits: input.scaleWorldUnits,
          createdByClient: input.createdByClient,
        })
        .returning();

      await writeAudit(ctx.db, {
        entity: "measurement",
        entityId: row!.id,
        action: "CREATE_COMPANION",
        actorId: ctx.user.id,
        after: row,
      });
      await writeActivity(ctx.db, {
        projectId: input.projectId,
        objectType: "measurement",
        objectId: row!.id,
        eventType: "measurement.created",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `${row!.label} (${row!.boqQty} ${row!.boqUnit})`,
        metadata: { drawingId: input.drawingId, source: "ESTICAD" },
      });

      return row!;
    }),

  /** ESTICAD — delete a companion measurement. */
  removeCompanion: companionWriteProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertCompanionTakeoff(ctx);
      const [before] = await ctx.db.select().from(measurements).where(eq(measurements.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      if (before.source !== "ESTICAD") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only ESTICAD measurements can be removed here" });
      }

      await ctx.db.delete(measurements).where(eq(measurements.id, input.id));
      await writeAudit(ctx.db, {
        entity: "measurement",
        entityId: input.id,
        action: "DELETE_COMPANION",
        actorId: ctx.user.id,
        before,
      });
      return { ok: true };
    }),

  /** Push tagged takeoff rows into a draft estimate (rate-book rates applied when matched). */
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
