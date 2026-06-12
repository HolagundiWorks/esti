import {
  RuleVersionCreate,
  RuleVersionData,
  SiteInputs,
  runAllEngines,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { bylaws, ruleVersions, siteAssessments } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

// ─── Rule version management ────────────────────────────────────────────────

export const ruleVersionRouter = router({
  list: protectedProcedure
    .input(z.object({ state: z.string().optional(), district: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.select().from(ruleVersions).orderBy(desc(ruleVersions.effectiveDate));
      if (input?.state) return rows.filter((r) => r.state === input.state);
      return rows;
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(ruleVersions).where(eq(ruleVersions.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  create: ownerProcedure.input(RuleVersionCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(ruleVersions)
      .values({
        state: input.state,
        district: input.district,
        authority: input.authority,
        buildingUse: input.buildingUse,
        effectiveDate: input.effectiveDate,
        sourceCitation: input.sourceCitation ?? null,
        data: input.data,
        notes: input.notes ?? null,
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "rule_version", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  submitForReview: ownerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(ruleVersions).where(eq(ruleVersions.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status !== "DRAFT") throw new TRPCError({ code: "BAD_REQUEST", message: "Only DRAFT versions can be submitted for review" });
      const [updated] = await ctx.db.update(ruleVersions).set({ status: "REVIEW" }).where(eq(ruleVersions.id, input.id)).returning();
      await writeAudit(ctx.db, { entity: "rule_version", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, before: row, after: updated });
      return updated!;
    }),

  publish: ownerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(ruleVersions).where(eq(ruleVersions.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (!["DRAFT", "REVIEW"].includes(row.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only DRAFT or REVIEW versions can be published" });
      }
      // Supersede any existing published versions for the same jurisdiction + building_use.
      const existing = await ctx.db
        .select({ id: ruleVersions.id })
        .from(ruleVersions)
        .where(
          and(
            eq(ruleVersions.state, row.state),
            eq(ruleVersions.district, row.district),
            eq(ruleVersions.authority, row.authority),
            eq(ruleVersions.buildingUse, row.buildingUse),
            eq(ruleVersions.status, "PUBLISHED"),
          ),
        );
      if (existing.length) {
        await ctx.db
          .update(ruleVersions)
          .set({ status: "SUPERSEDED", supersededById: input.id })
          .where(inArray(ruleVersions.id, existing.map((r) => r.id)));
      }
      const [updated] = await ctx.db
        .update(ruleVersions)
        .set({ status: "PUBLISHED", publishedAt: new Date(), reviewedById: ctx.user.id })
        .where(eq(ruleVersions.id, input.id))
        .returning();
      await writeAudit(ctx.db, { entity: "rule_version", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, before: row, after: updated });
      return updated!;
    }),
});

// ─── Site assessment ─────────────────────────────────────────────────────────

export const siteAssessmentRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(siteAssessments)
        .where(eq(siteAssessments.projectId, input.projectId))
        .orderBy(desc(siteAssessments.createdAt));
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(siteAssessments).where(eq(siteAssessments.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  run: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        ruleVersionId: z.string().uuid(),
        siteInputs: SiteInputs,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [rv] = await ctx.db.select().from(ruleVersions).where(eq(ruleVersions.id, input.ruleVersionId));
      if (!rv) throw new TRPCError({ code: "NOT_FOUND", message: "Rule version not found" });
      if (rv.status !== "PUBLISHED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only published rule versions can be used for assessments" });
      }

      // Auto-detect existing permit docs from the project's bylaw records.
      const permitRows = await ctx.db.select({ parameter: bylaws.parameter }).from(bylaws).where(eq(bylaws.projectId, input.projectId));
      const existingPermitIds = permitRows.map((p) => p.parameter);

      const data = RuleVersionData.parse(rv.data);
      const result = runAllEngines(input.siteInputs, data, existingPermitIds);

      const [row] = await ctx.db
        .insert(siteAssessments)
        .values({
          projectId: input.projectId,
          ruleVersionId: input.ruleVersionId,
          status: "DRAFT",
          siteInputs: input.siteInputs,
          devControl: result.devControl,
          basement: result.basement ?? null,
          sustainability: result.sustainability,
          approvalReadiness: result.approvalReadiness,
          overallScore: result.overallScore,
          createdById: ctx.user.id,
        })
        .returning();
      await writeAudit(ctx.db, { entity: "site_assessment", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
      return row!;
    }),

  issue: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(siteAssessments).where(eq(siteAssessments.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.status === "ISSUED") throw new TRPCError({ code: "BAD_REQUEST", message: "Already issued" });
      const [updated] = await ctx.db
        .update(siteAssessments)
        .set({ status: "ISSUED", issuedAt: new Date() })
        .where(eq(siteAssessments.id, input.id))
        .returning();
      await writeAudit(ctx.db, { entity: "site_assessment", entityId: input.id, action: "UPDATE", actorId: ctx.user.id, before: row, after: updated });
      return updated!;
    }),
});
