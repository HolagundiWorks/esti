import { EstimateCreate, EstimateItemCreate, estimateItemAmount, estimateTotals } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { estimateItems, estimates } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

/** Recompute and persist an estimate's subtotal/total from its items + lead. */
async function recompute(db: DB, estimateId: string) {
  const [est] = await db.select().from(estimates).where(eq(estimates.id, estimateId));
  if (!est) return;
  const items = await db.select().from(estimateItems).where(eq(estimateItems.estimateId, estimateId));
  const { subtotalPaise, totalPaise } = estimateTotals(
    items.map((i) => ({ qty: i.qty, ratePaise: i.ratePaise, itemLeadPct: i.itemLeadPct })),
    est.leadPct,
  );
  await db.update(estimates).set({ subtotalPaise, totalPaise }).where(eq(estimates.id, estimateId));
}

export const estimateRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(estimates)
        .where(eq(estimates.projectId, input.projectId))
        .orderBy(desc(estimates.createdAt));
    }),

  items: protectedProcedure
    .input(z.object({ estimateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(estimateItems)
        .where(eq(estimateItems.estimateId, input.estimateId))
        .orderBy(asc(estimateItems.sortOrder), asc(estimateItems.createdAt));
    }),

  create: protectedProcedure.input(EstimateCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "estimate", "EST");
    const [row] = await ctx.db
      .insert(estimates)
      .values({
        ref,
        projectId: input.projectId,
        title: input.title,
        dsrVersionId: input.dsrVersionId ?? null,
        leadPct: input.leadPct,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "estimate",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  setLead: protectedProcedure
    .input(z.object({ id: z.string().uuid(), leadPct: z.number().min(0).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await assertDraft(ctx.db, input.id);
      await ctx.db.update(estimates).set({ leadPct: input.leadPct }).where(eq(estimates.id, input.id));
      await recompute(ctx.db, input.id);
      return { ok: true };
    }),

  addItem: protectedProcedure.input(EstimateItemCreate).mutation(async ({ ctx, input }) => {
    await assertDraft(ctx.db, input.estimateId);
    const amountPaise = estimateItemAmount(input.qty, input.ratePaise, input.itemLeadPct);
    await ctx.db.insert(estimateItems).values({
      estimateId: input.estimateId,
      dsrItemId: input.dsrItemId ?? null,
      description: input.description,
      unit: input.unit,
      qty: input.qty,
      ratePaise: input.ratePaise,
      itemLeadPct: input.itemLeadPct,
      amountPaise,
    });
    await recompute(ctx.db, input.estimateId);
    return { ok: true };
  }),

  removeItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select()
        .from(estimateItems)
        .where(eq(estimateItems.id, input.id));
      if (!item) return { ok: true };
      await assertDraft(ctx.db, item.estimateId);
      await ctx.db.delete(estimateItems).where(eq(estimateItems.id, input.id));
      await recompute(ctx.db, item.estimateId);
      return { ok: true };
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(estimates)
        .set({ status: "APPROVED" })
        .where(eq(estimates.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await writeAudit(ctx.db, {
        entity: "estimate",
        entityId: input.id,
        action: "APPROVE",
        actorId: ctx.user.id,
        after: { status: "APPROVED", totalPaise: row.totalPaise },
      });
      return row;
    }),
});

async function assertDraft(db: DB, estimateId: string) {
  const [est] = await db.select({ status: estimates.status }).from(estimates).where(eq(estimates.id, estimateId));
  if (est && est.status !== "DRAFT") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Approved estimate is locked" });
  }
}
