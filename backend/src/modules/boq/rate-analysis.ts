import {
  RateAnalysisCreate,
  RateComponentCreate,
  RateComponentUpdate,
  analysedRate,
  rateComponentAmount,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { dsrItems, dsrVersions, rateAnalyses, rateComponents } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { assertDsrVersionWritable } from "../../lib/dsrCatalog.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

async function recomputeAnalysis(db: DB, id: string) {
  const components = await db
    .select()
    .from(rateComponents)
    .where(eq(rateComponents.rateAnalysisId, id));

  const [analysis] = await db
    .select({ overheadPct: rateAnalyses.overheadPct })
    .from(rateAnalyses)
    .where(eq(rateAnalyses.id, id));

  const directCost = components.reduce((s, c) => s + c.amountPaise, 0);
  const analysedRatePaise = analysedRate(directCost, analysis?.overheadPct ?? 0);

  await db
    .update(rateAnalyses)
    .set({ directCostPaise: directCost, analysedRatePaise, updatedAt: new Date() })
    .where(eq(rateAnalyses.id, id));

  return { directCostPaise: directCost, analysedRatePaise };
}

export const rateAnalysisRouter = router({
  /** List all rate analyses, optionally filtered by rate-book version. */
  list: protectedProcedure
    .input(z.object({ dsrVersionId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "rateBooks");
      const q = ctx.db
        .select()
        .from(rateAnalyses)
        .orderBy(desc(rateAnalyses.createdAt));
      if (input?.dsrVersionId) {
        return q.where(eq(rateAnalyses.dsrVersionId, input.dsrVersionId));
      }
      return q;
    }),

  /** Single analysis with all component lines. */
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "rateBooks");
      const [analysis] = await ctx.db
        .select()
        .from(rateAnalyses)
        .where(eq(rateAnalyses.id, input.id));
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });

      const components = await ctx.db
        .select()
        .from(rateComponents)
        .where(eq(rateComponents.rateAnalysisId, input.id))
        .orderBy(asc(rateComponents.sortOrder), asc(rateComponents.createdAt));

      return { ...analysis, components };
    }),

  /** Create analysis header + optional initial components. */
  create: protectedProcedure
    .input(RateAnalysisCreate)
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "rateBooks");

      const [analysis] = await ctx.db
        .insert(rateAnalyses)
        .values({
          code: input.code,
          description: input.description,
          unit: input.unit,
          dsrVersionId: input.dsrVersionId ?? null,
          overheadPct: input.overheadPct ?? 0,
          createdBy: ctx.user.id,
        })
        .returning();

      if (!analysis) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (input.components?.length) {
        await ctx.db.insert(rateComponents).values(
          input.components.map((c, idx) => ({
            rateAnalysisId: analysis.id,
            category: c.category ?? "MATERIAL",
            description: c.description,
            unit: c.unit,
            qty: c.qty,
            ratePaise: c.ratePaise,
            amountPaise: rateComponentAmount(c.qty, c.ratePaise),
            sortOrder: c.sortOrder ?? idx,
          })),
        );
        await recomputeAnalysis(ctx.db as any, analysis.id);
      }

      await writeAudit(ctx.db, { entity: "rate_analysis", entityId: analysis.id, action: "CREATE", actorId: ctx.user.id, after: { code: input.code } });
      return analysis;
    }),

  /** Update header fields (code, description, unit, overheadPct). */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        code: z.string().min(1).max(40).optional(),
        description: z.string().min(1).max(400).optional(),
        unit: z.string().min(1).max(20).optional(),
        dsrVersionId: z.string().uuid().nullable().optional(),
        overheadPct: z.number().min(0).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "rateBooks");
      const { id, ...patch } = input;
      await ctx.db
        .update(rateAnalyses)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(rateAnalyses.id, id));
      return recomputeAnalysis(ctx.db as any, id);
    }),

  /** Add one component line and recompute totals. */
  addComponent: protectedProcedure
    .input(RateComponentCreate)
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "rateBooks");
      const [row] = await ctx.db
        .insert(rateComponents)
        .values({
          rateAnalysisId: input.rateAnalysisId,
          category: input.category ?? "MATERIAL",
          description: input.description,
          unit: input.unit,
          qty: input.qty,
          ratePaise: input.ratePaise,
          amountPaise: rateComponentAmount(input.qty, input.ratePaise),
          sortOrder: input.sortOrder ?? 0,
        })
        .returning();
      await recomputeAnalysis(ctx.db as any, input.rateAnalysisId);
      return row;
    }),

  /** Update a component line and recompute totals. */
  updateComponent: protectedProcedure
    .input(RateComponentUpdate)
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "rateBooks");
      const { id, ...patch } = input;
      const [existing] = await ctx.db
        .select()
        .from(rateComponents)
        .where(eq(rateComponents.id, id));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const qty = patch.qty ?? existing.qty;
      const ratePaise = patch.ratePaise ?? existing.ratePaise;
      await ctx.db
        .update(rateComponents)
        .set({ ...patch, amountPaise: rateComponentAmount(qty, ratePaise) })
        .where(eq(rateComponents.id, id));
      await recomputeAnalysis(ctx.db as any, existing.rateAnalysisId);
      return { id };
    }),

  /** Remove a component line and recompute totals. */
  deleteComponent: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "rateBooks");
      const [row] = await ctx.db
        .select({ rateAnalysisId: rateComponents.rateAnalysisId })
        .from(rateComponents)
        .where(eq(rateComponents.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(rateComponents).where(eq(rateComponents.id, input.id));
      await recomputeAnalysis(ctx.db as any, row.rateAnalysisId);
      return { id: input.id };
    }),

  /** Delete the whole analysis. */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "rateBooks");
      const [row] = await ctx.db
        .select({ status: rateAnalyses.status })
        .from(rateAnalyses)
        .where(eq(rateAnalyses.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status === "PUBLISHED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Published analyses cannot be deleted." });
      }
      await ctx.db.delete(rateAnalyses).where(eq(rateAnalyses.id, input.id));
      return { id: input.id };
    }),

  /**
   * Publish an analysis — pushes a new rate item into the linked rate-book
   * version at the analysedRatePaise, then marks the analysis as PUBLISHED.
   */
  publish: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "rateBooks");
      const [analysis] = await ctx.db
        .select()
        .from(rateAnalyses)
        .where(eq(rateAnalyses.id, input.id));
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      if (!analysis.dsrVersionId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Link this analysis to a rate-book version before publishing." });
      }
      const [versionRow] = await ctx.db
        .select()
        .from(dsrVersions)
        .where(eq(dsrVersions.id, analysis.dsrVersionId));
      if (!versionRow) throw new TRPCError({ code: "NOT_FOUND", message: "Rate-book version not found." });
      assertDsrVersionWritable(versionRow);

      // Upsert by code within this rate-book version.
      const [existing] = await ctx.db
        .select({ id: dsrItems.id })
        .from(dsrItems)
        .where(and(eq(dsrItems.versionId, analysis.dsrVersionId), eq(dsrItems.code, analysis.code)));

      if (existing) {
        await ctx.db
          .update(dsrItems)
          .set({
            description: analysis.description,
            unit: analysis.unit,
            ratePaise: analysis.analysedRatePaise,
          })
          .where(eq(dsrItems.id, existing.id));
      } else {
        await ctx.db.insert(dsrItems).values({
          versionId: analysis.dsrVersionId,
          code: analysis.code,
          description: analysis.description,
          unit: analysis.unit,
          ratePaise: analysis.analysedRatePaise,
        });
      }

      await ctx.db
        .update(rateAnalyses)
        .set({ status: "PUBLISHED", updatedAt: new Date() })
        .where(eq(rateAnalyses.id, input.id));

      await writeAudit(ctx.db, { entity: "rate_analysis", entityId: input.id, action: "PUBLISH", actorId: ctx.user.id, after: { code: analysis.code, dsrVersionId: analysis.dsrVersionId } });
      return { id: input.id, status: "PUBLISHED" };
    }),
});
