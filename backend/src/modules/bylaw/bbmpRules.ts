import { BbmpRuleSetCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { bbmpRuleSets } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { loadBbmpRuleCatalogById, catalogForApi } from "../../lib/bbmpRules.js";
import { insertBbmpCatalogRows } from "../../lib/bbmpRulesPersist.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

export const bbmpRulesRouter = router({
  listRuleSets: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(bbmpRuleSets).orderBy(desc(bbmpRuleSets.effectiveDate));
  }),

  activeCatalog: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(bbmpRuleSets)
      .where(and(eq(bbmpRuleSets.status, "PUBLISHED"), eq(bbmpRuleSets.active, true)))
      .orderBy(desc(bbmpRuleSets.effectiveDate))
      .limit(1);
    const ruleSet = rows[0];
    if (!ruleSet) return null;
    const catalog = catalogForApi(await loadBbmpRuleCatalogById(ctx.db, ruleSet.id));
    return {
      ruleSet,
      catalog,
      counts: {
        far: catalog.far.length,
        lowriseSetbacks: catalog.lowriseSetbacks.length,
        highriseSetbacks: catalog.highriseSetbacks.length,
        roadMargins: catalog.roadMargins.length,
        parkingRules: catalog.parkingRules.length,
        solarRules: catalog.solarRules.length,
        secondaryRules: catalog.secondaryRules.length,
        engineConstants: Object.keys(catalog.engineConstants).length,
      },
    };
  }),

  catalogByRuleSetId: protectedProcedure
    .input(z.object({ ruleSetId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return catalogForApi(await loadBbmpRuleCatalogById(ctx.db, input.ruleSetId));
    }),

  createRuleSet: ownerProcedure.input(BbmpRuleSetCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(bbmpRuleSets)
      .values({
        label: input.label,
        effectiveDate: input.effectiveDate,
        status: "DRAFT",
        sourceCitation: input.sourceCitation ?? null,
        notes: input.notes ?? null,
        active: false,
      })
      .returning();
    await insertBbmpCatalogRows(ctx.db, row!.id, input.catalog);
    await writeAudit(ctx.db, {
      entity: "bbmp_rule_set",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  publishRuleSet: ownerProcedure
    .input(z.object({ id: z.string().uuid(), setActive: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(bbmpRuleSets).where(eq(bbmpRuleSets.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (!["DRAFT", "REVIEW"].includes(row.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only DRAFT or REVIEW rule sets can be published" });
      }
      if (input.setActive) {
        await ctx.db
          .update(bbmpRuleSets)
          .set({ active: false })
          .where(and(eq(bbmpRuleSets.active, true), eq(bbmpRuleSets.status, "PUBLISHED")));
      }
      const [updated] = await ctx.db
        .update(bbmpRuleSets)
        .set({
          status: "PUBLISHED",
          active: input.setActive,
        })
        .where(eq(bbmpRuleSets.id, input.id))
        .returning();
      await writeAudit(ctx.db, {
        entity: "bbmp_rule_set",
        entityId: input.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: row,
        after: updated,
      });
      return updated!;
    }),
});
