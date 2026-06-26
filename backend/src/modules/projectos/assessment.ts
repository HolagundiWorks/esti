import { PreProjectAssessmentUpsert, computeAssessment } from "@esti/contracts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { preProjectAssessments, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const writer = capabilityProcedure("write");

export const assessmentRouter = router({
  byProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(preProjectAssessments)
        .where(eq(preProjectAssessments.projectId, input.projectId));
      return row ?? null;
    }),

  /**
   * Upsert the assessment. All derived figures (site area, FAR area, setback
   * envelope, ground coverage, floors, super-builtup, estimated cost) are
   * recomputed server-side from the operator inputs so the stored row is always
   * internally consistent.
   */
  upsert: writer.input(PreProjectAssessmentUpsert).mutation(async ({ ctx, input }) => {
    const d = computeAssessment(input);
    const values = {
      siteLength: input.siteLength ?? null,
      siteWidth: input.siteWidth ?? null,
      manualArea: input.manualArea ?? null,
      siteAreaSqm: d.siteAreaSqm,
      farFactor: input.farFactor,
      permissibleFarArea: d.permissibleFarArea,
      frontSetback: input.frontSetback,
      rearSetback: input.rearSetback,
      leftSetback: input.leftSetback,
      rightSetback: input.rightSetback,
      setbackBuildableArea: d.setbackBuildableArea,
      groundCoveragePct: input.groundCoveragePct,
      coverageArea: d.coverageArea,
      actualGroundCoverage: d.actualGroundCoverage,
      possibleFloors: d.possibleFloors,
      superBuiltupFactor: input.superBuiltupFactor,
      superBuiltupArea: d.superBuiltupArea,
      constructionRatePaise: input.constructionRatePaise,
      estimatedProjectCostPaise: d.estimatedProjectCostPaise,
      breakdown: input.breakdown ?? null,
    };
    const [row] = await ctx.db
      .insert(preProjectAssessments)
      .values({ projectId: input.projectId, ...values })
      .onConflictDoUpdate({
        target: preProjectAssessments.projectId,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    await ctx.db
      .update(projectOffices)
      .set({ assessmentId: row!.id })
      .where(eq(projectOffices.id, input.projectId));
    await writeAudit(ctx.db, { entity: "pre_project_assessment", entityId: row!.id, action: "UPSERT", actorId: ctx.user.id, after: row });
    return row!;
  }),
});
