import { BbsBulkImport, BbsCreate, BbsItemCreate, bbsItemTotals, validateBbsSchedule } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { bbsItems, bbsSchedules } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { loadBbsItems, requireValidBbsSchedule } from "../../lib/bbsValidate.js";
import { firmPayload } from "../../lib/firm.js";
import { nextRef } from "../../lib/numbering.js";
import { enqueueJob } from "../../lib/redis.js";
import { presignedGet } from "../../lib/storage.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const bbsRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(bbsSchedules)
        .where(eq(bbsSchedules.projectId, input.projectId))
        .orderBy(desc(bbsSchedules.createdAt));
    }),

  items: protectedProcedure
    .input(z.object({ bbsId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(bbsItems)
        .where(eq(bbsItems.bbsId, input.bbsId))
        .orderBy(asc(bbsItems.createdAt));
    }),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(bbsSchedules).where(eq(bbsSchedules.id, input.id));
    if (!row) return null;
    const pdfUrl = row.pdfKey ? await presignedGet(row.pdfKey).catch(() => null) : null;
    return { ...row, pdfUrl };
  }),

  create: protectedProcedure.input(BbsCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "bbs", "BBS");
    const [row] = await ctx.db
      .insert(bbsSchedules)
      .values({ ref, projectId: input.projectId, title: input.title })
      .returning();
    await writeAudit(ctx.db, { entity: "bbs", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  addItem: protectedProcedure.input(BbsItemCreate).mutation(async ({ ctx, input }) => {
    const { weightKg } = bbsItemTotals({
      diaMm: input.diaMm,
      noOfMembers: input.noOfMembers,
      barsPerMember: input.barsPerMember,
      cuttingLengthMm: input.cuttingLengthMm,
    });
    const [row] = await ctx.db.insert(bbsItems).values({
      bbsId: input.bbsId,
      barMark: input.barMark,
      member: input.member ?? null,
      diaMm: input.diaMm,
      noOfMembers: input.noOfMembers,
      barsPerMember: input.barsPerMember,
      cuttingLengthMm: input.cuttingLengthMm,
      weightKg,
    }).returning();
    await writeAudit(ctx.db, { entity: "bbsitem", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return { ok: true };
  }),

  bulkImport: protectedProcedure.input(BbsBulkImport).mutation(async ({ ctx, input }) => {
    for (const row of input.rows) {
      const { weightKg } = bbsItemTotals({
        diaMm: row.diaMm,
        noOfMembers: row.noOfMembers,
        barsPerMember: row.barsPerMember,
        cuttingLengthMm: row.cuttingLengthMm,
      });
      await ctx.db.insert(bbsItems).values({
        bbsId: input.bbsId,
        barMark: row.barMark,
        member: row.member ?? null,
        diaMm: row.diaMm,
        noOfMembers: row.noOfMembers,
        barsPerMember: row.barsPerMember,
        cuttingLengthMm: row.cuttingLengthMm,
        weightKg,
      });
    }
    await writeAudit(ctx.db, {
      entity: "bbs",
      entityId: input.bbsId,
      action: "BULK_IMPORT",
      actorId: ctx.user.id,
      after: { rowCount: input.rows.length },
    });
    return { ok: true, count: input.rows.length };
  }),

  generatePdf: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(bbsSchedules).where(eq(bbsSchedules.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    await requireValidBbsSchedule(ctx.db, input.id);
    await ctx.db.update(bbsSchedules).set({ pdfStatus: "PENDING" }).where(eq(bbsSchedules.id, input.id));
    await enqueueJob(
      "render_pdf",
      { target: "bbs", id: row.id, firm: await firmPayload(ctx.db) },
      ctx.requestId,
    );
    return { ok: true };
  }),

  removeItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(bbsItems).where(eq(bbsItems.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(bbsItems).where(eq(bbsItems.id, input.id));
      await writeAudit(ctx.db, { entity: "bbsitem", entityId: input.id, action: "DELETE", actorId: ctx.user.id, before });
      return { ok: true };
    }),

  exportRows: protectedProcedure
    .input(z.object({ bbsId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [sched] = await ctx.db.select().from(bbsSchedules).where(eq(bbsSchedules.id, input.bbsId));
      if (!sched) throw new TRPCError({ code: "NOT_FOUND" });
      await requireValidBbsSchedule(ctx.db, input.bbsId);
      const items = await ctx.db
        .select()
        .from(bbsItems)
        .where(eq(bbsItems.bbsId, input.bbsId))
        .orderBy(asc(bbsItems.createdAt));
      return {
        ref: sched.ref,
        title: sched.title,
        rows: items.map((i) => ({
          Mark: i.barMark,
          Member: i.member ?? "",
          "Dia mm": i.diaMm,
          Members: i.noOfMembers,
          "Bars/member": i.barsPerMember,
          "Cutting mm": i.cuttingLengthMm,
          "Weight kg": i.weightKg,
        })),
      };
    }),

  validate: protectedProcedure
    .input(z.object({ bbsId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [sched] = await ctx.db.select().from(bbsSchedules).where(eq(bbsSchedules.id, input.bbsId));
      if (!sched) throw new TRPCError({ code: "NOT_FOUND" });
      const items = await loadBbsItems(ctx.db, input.bbsId);
      return validateBbsSchedule(items);
    }),
});
