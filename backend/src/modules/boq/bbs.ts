import { BbsCreate, BbsItemCreate, bbsItemTotals } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { bbsItems, bbsSchedules } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
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

  create: protectedProcedure.input(BbsCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(bbsSchedules)
      .values({ projectId: input.projectId, title: input.title })
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

  removeItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(bbsItems).where(eq(bbsItems.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(bbsItems).where(eq(bbsItems.id, input.id));
      await writeAudit(ctx.db, { entity: "bbsitem", entityId: input.id, action: "DELETE", actorId: ctx.user.id, before });
      return { ok: true };
    }),
});
