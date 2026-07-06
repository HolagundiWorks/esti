import {
  ProjectDnaUpsert,
  computeRiskScore,
  type BudgetMode,
  type DecisionMakers,
  type DesignFlexibility,
  type RevisionTolerance,
  type TimelineCriticality,
  type VastuRequirement,
} from "@esti/contracts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { projectDnas, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const writer = capabilityProcedure("write");

export const projectDnaRouter = router({
  byProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(projectDnas)
        .where(eq(projectDnas.projectId, input.projectId));
      return row ?? null;
    }),

  upsert: writer.input(ProjectDnaUpsert).mutation(async ({ ctx, input }) => {
    const values = {
      budgetMode: input.budgetMode,
      vastuRequirement: input.vastuRequirement,
      designLanguage: input.designLanguage,
      designFlexibility: input.designFlexibility,
      decisionMakers: input.decisionMakers,
      timelineCriticality: input.timelineCriticality,
      materialExpectation: input.materialExpectation,
      revisionTolerance: input.revisionTolerance,
      customNotes: input.customNotes ?? null,
    };
    const [row] = await ctx.db
      .insert(projectDnas)
      .values({ projectId: input.projectId, ...values })
      .onConflictDoUpdate({
        target: projectDnas.projectId,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    // Backlink the DNA onto the project (used by the activation gate).
    await ctx.db
      .update(projectOffices)
      .set({ dnaId: row!.id })
      .where(eq(projectOffices.id, input.projectId));
    await writeAudit(ctx.db, { entity: "project_dna", entityId: row!.id, action: "UPSERT", actorId: ctx.user.id, after: row });
    return row!;
  }),

  /** Deterministic complexity score from the DNA + project jurisdiction (Slice E). */
  riskScore: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [dna] = await ctx.db
        .select()
        .from(projectDnas)
        .where(eq(projectDnas.projectId, input.projectId));
      // No DNA yet is a normal empty state, not an error — return null so the UI
      // simply hides the risk badge instead of raising a "Something went wrong" toast.
      if (!dna) return null;
      const [project] = await ctx.db
        .select({ jurisdiction: projectOffices.jurisdiction })
        .from(projectOffices)
        .where(eq(projectOffices.id, input.projectId));
      return computeRiskScore({
        budgetMode: dna.budgetMode as BudgetMode,
        vastuRequirement: dna.vastuRequirement as VastuRequirement,
        designFlexibility: dna.designFlexibility as DesignFlexibility,
        decisionMakers: dna.decisionMakers as DecisionMakers,
        timelineCriticality: dna.timelineCriticality as TimelineCriticality,
        revisionTolerance: dna.revisionTolerance as RevisionTolerance,
        jurisdiction: project?.jurisdiction ?? null,
      });
    }),
});
