import { InspectionCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { inspections } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet, removeObject } from "../../lib/storage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const inspectionRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(inspections)
        .where(eq(inspections.projectId, input.projectId))
        .orderBy(desc(inspections.createdAt)),
    ),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(inspections).where(eq(inspections.id, input.id));
    if (!row) return null;
    const pdfUrl = row.pdfKey ? await presignedGet(row.pdfKey).catch(() => null) : null;
    return { ...row, pdfUrl };
  }),

  create: protectedProcedure.input(InspectionCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "inspection", "SIR");
    const [row] = await ctx.db
      .insert(inspections)
      .values({
        ref,
        projectId: input.projectId,
        dateVisit: input.dateVisit ?? null,
        weather: input.weather ?? null,
        attendees: input.attendees ?? null,
        progress: input.progress ?? null,
        observations: input.observations ?? null,
        instructions: input.instructions ?? null,
        nextVisit: input.nextVisit ?? null,
        inspectorName: input.inspectorName ?? null,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "inspection", entityId: row!.id, action: "CREATE", actorId: ctx.user.id });
    return row!;
  }),

  generatePdf: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(inspections).where(eq(inspections.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await ctx.db.update(inspections).set({ pdfStatus: "PENDING" }).where(eq(inspections.id, input.id));
    await enqueueJob("render_pdf", { target: "inspection", id: row.id, firm: await firmPayload(ctx.db) }, ctx.requestId);
    return { ok: true };
  }),

  remove: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(inspections).where(eq(inspections.id, input.id));
    if (row?.pdfKey) await removeObject(row.pdfKey);
    await ctx.db.delete(inspections).where(eq(inspections.id, input.id));
    return { ok: true };
  }),
});
