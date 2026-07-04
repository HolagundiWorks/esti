/**
 * Estimates (Estimation OS rebuild, phase 1) — the keyboard-first measurement
 * sheet. Elements come from the Knowledge Bank item library; a selected
 * element's mapped child items (esti_kb_item_dependency) drive the sheet's
 * dependency queue after the main item is closed.
 */
import { EstimateLineUpsert } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, ilike, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { estimateLines, estimates, kbItemDependencies, kbItems } from "../../db/schema.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import { getProjectById } from "../projectoffice/queries.js";

const childItem = alias(kbItems, "child_item");

export const estimatesRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(estimates)
        .where(eq(estimates.projectId, input.projectId))
        .orderBy(asc(estimates.createdAt)),
    ),

  create: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), title: z.string().trim().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const project = await getProjectById(ctx.db, input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const [row] = await ctx.db
        .insert(estimates)
        .values({ projectId: input.projectId, title: input.title })
        .returning();
      return row!;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [estimate] = await ctx.db
        .select()
        .from(estimates)
        .where(eq(estimates.id, input.id))
        .limit(1);
      if (!estimate) throw new TRPCError({ code: "NOT_FOUND" });
      const lines = await ctx.db
        .select()
        .from(estimateLines)
        .where(eq(estimateLines.estimateId, input.id))
        .orderBy(asc(estimateLines.sortOrder), asc(estimateLines.createdAt));
      return { ...estimate, lines };
    }),

  /** "/" element search — active KB items by name/category prefix match. */
  searchElements: protectedProcedure
    .input(z.object({ q: z.string().trim().max(120) }))
    .query(async ({ ctx, input }) => {
      if (!input.q) {
        return ctx.db
          .select({
            id: kbItems.id,
            name: kbItems.name,
            category: kbItems.category,
            unit: kbItems.unit,
          })
          .from(kbItems)
          .where(eq(kbItems.active, true))
          .orderBy(asc(kbItems.category), asc(kbItems.name))
          .limit(12);
      }
      return ctx.db
        .select({
          id: kbItems.id,
          name: kbItems.name,
          category: kbItems.category,
          unit: kbItems.unit,
        })
        .from(kbItems)
        .where(and(eq(kbItems.active, true), ilike(kbItems.name, `%${input.q}%`)))
        .orderBy(asc(kbItems.name))
        .limit(12);
    }),

  /** Mapped child items of an element — the sheet's dependency queue. */
  elementChildren: protectedProcedure
    .input(z.object({ kbItemId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select({
          kbItemId: kbItemDependencies.childItemId,
          name: childItem.name,
          unit: childItem.unit,
          ratio: kbItemDependencies.ratio,
          dependencyType: kbItemDependencies.dependencyType,
        })
        .from(kbItemDependencies)
        .innerJoin(childItem, eq(kbItemDependencies.childItemId, childItem.id))
        .where(eq(kbItemDependencies.parentItemId, input.kbItemId))
        .orderBy(asc(childItem.name)),
    ),

  /** Persist a closed line (main item or dependency) with its measurements. */
  addLine: protectedProcedure.input(EstimateLineUpsert).mutation(async ({ ctx, input }) => {
    const [estimate] = await ctx.db
      .select({ id: estimates.id })
      .from(estimates)
      .where(eq(estimates.id, input.estimateId))
      .limit(1);
    if (!estimate) throw new TRPCError({ code: "NOT_FOUND" });
    const [agg] = await ctx.db
      .select({ next: sql<number>`coalesce(max(${estimateLines.sortOrder}), 0) + 1` })
      .from(estimateLines)
      .where(eq(estimateLines.estimateId, input.estimateId));
    const next = agg?.next ?? 1;
    const [row] = await ctx.db
      .insert(estimateLines)
      .values({
        estimateId: input.estimateId,
        parentLineId: input.parentLineId ?? null,
        kbItemId: input.kbItemId ?? null,
        sortOrder: next,
        code: input.code ?? null,
        description: input.description,
        unit: input.unit,
        measurements: input.measurements,
      })
      .returning();
    await ctx.db
      .update(estimates)
      .set({ updatedAt: new Date() })
      .where(eq(estimates.id, input.estimateId));
    return row!;
  }),

  updateLine: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        description: z.string().trim().min(1).max(500).optional(),
        measurements: EstimateLineUpsert.shape.measurements.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const patch: Record<string, unknown> = {};
      if (input.description !== undefined) patch.description = input.description;
      if (input.measurements !== undefined) patch.measurements = input.measurements;
      const [row] = await ctx.db
        .update(estimateLines)
        .set(patch)
        .where(eq(estimateLines.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  removeLine: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Dependency lines fall with their parent.
      await ctx.db.delete(estimateLines).where(eq(estimateLines.parentLineId, input.id));
      await ctx.db.delete(estimateLines).where(eq(estimateLines.id, input.id));
      return { ok: true };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(estimates).where(eq(estimates.id, input.id));
      return { ok: true };
    }),
});
