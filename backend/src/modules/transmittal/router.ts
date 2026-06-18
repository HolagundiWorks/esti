import { ProjectCursorListParams, TransmittalCreate, clampListLimit } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { transmittalItems, transmittals } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { buildCursorPage, cursorWhere } from "../../lib/cursorPage.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { requireDrawingsInProject } from "../../lib/projectScope.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet } from "../../lib/storage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const transmittalRouter = router({
  listByProject: protectedProcedure
    .input(ProjectCursorListParams)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(transmittals)
        .where(
          and(
            eq(transmittals.projectId, input.projectId),
            cursorWhere(input.cursor, transmittals.createdAt, transmittals.id),
          ),
        )
        .orderBy(desc(transmittals.createdAt), desc(transmittals.id))
        .limit(clampListLimit(input.limit) + 1);
      return buildCursorPage(rows, input.limit);
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(transmittals).where(eq(transmittals.id, input.id));
      if (!row) return null;
      const items = await ctx.db
        .select()
        .from(transmittalItems)
        .where(eq(transmittalItems.transmittalId, input.id))
        .orderBy(asc(transmittalItems.createdAt));
      const pdfUrl = row.pdfKey ? await presignedGet(row.pdfKey).catch(() => null) : null;
      return { ...row, items, pdfUrl };
    }),

  create: protectedProcedure.input(TransmittalCreate).mutation(async ({ ctx, input }) => {
    await requireDrawingsInProject(
      ctx.db,
      input.projectId,
      input.items.flatMap((item) => (item.drawingId ? [item.drawingId] : [])),
    );
    const { ref } = await nextRef(ctx.db, "transmittal", "TRN");
    const row = await ctx.db.transaction(async (tx) => {
      const [t] = await tx
        .insert(transmittals)
        .values({
          ref,
          projectId: input.projectId,
          recipient: input.recipient,
          purpose: input.purpose,
          channel: input.channel,
          dateIssued: input.dateIssued ?? null,
          notes: input.notes ?? null,
          createdById: ctx.user.id,
        })
        .returning();
      await tx.insert(transmittalItems).values(
        input.items.map((i) => ({
          transmittalId: t!.id,
          drawingId: i.drawingId ?? null,
          drawingRef: i.drawingRef,
          title: i.title,
          rev: i.rev ?? null,
          copies: i.copies,
        })),
      );
      return t!;
    });
    await writeAudit(ctx.db, {
      entity: "transmittal",
      entityId: row.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row;
  }),

  generatePdf: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(transmittals).where(eq(transmittals.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .update(transmittals)
        .set({ pdfStatus: "PENDING" })
        .where(eq(transmittals.id, input.id));
      await enqueueJob("render_pdf", {
        target: "transmittal",
        id: row.id,
        firm: await firmPayload(ctx.db),
      }, ctx.requestId);
      await writeAudit(ctx.db, {
        entity: "transmittal",
        entityId: input.id,
        action: "PDF_REQUEST",
        actorId: ctx.user.id,
        before: { pdfStatus: row.pdfStatus },
        after: { pdfStatus: "PENDING" },
      });
      return { ok: true };
    }),
});
