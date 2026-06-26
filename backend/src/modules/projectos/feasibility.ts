import { randomBytes } from "node:crypto";
import { FeasibilityGenerate, type FeasibilitySnapshot } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { feasibilityReports, preProjectAssessments, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { firmPayload } from "../../lib/firm.js";
import { enqueueJob } from "../../lib/redis.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

export const feasibilityRouter = router({
  /** Latest feasibility report for a project (for the polled PDF status). */
  byProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(feasibilityReports)
        .where(eq(feasibilityReports.projectId, input.projectId))
        .orderBy(desc(feasibilityReports.createdAt))
        .limit(1);
      return row ?? null;
    }),

  /**
   * Snapshot the current assessment into a feasibility report and enqueue the
   * PDF render (mirrors the cost-report pattern — the worker prints straight
   * from the stored snapshot). A fresh shareToken enables an anonymous link.
   */
  generate: capabilityProcedure("write")
    .input(FeasibilityGenerate)
    .mutation(async ({ ctx, input }) => {
      const [assessment] = await ctx.db
        .select()
        .from(preProjectAssessments)
        .where(eq(preProjectAssessments.projectId, input.projectId));
      if (!assessment)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Record a pre-project assessment first." });

      const [project] = await ctx.db
        .select({ ref: projectOffices.ref, title: projectOffices.title })
        .from(projectOffices)
        .where(eq(projectOffices.id, input.projectId));
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const now = new Date();
      const snapshot: FeasibilitySnapshot = {
        projectRef: project.ref,
        projectTitle: project.title,
        siteAreaSqm: assessment.siteAreaSqm,
        permissibleFarArea: assessment.permissibleFarArea,
        setbackBuildableArea: assessment.setbackBuildableArea,
        actualGroundCoverage: assessment.actualGroundCoverage,
        possibleFloors: assessment.possibleFloors,
        superBuiltupArea: assessment.superBuiltupArea,
        estimatedProjectCostPaise: assessment.estimatedProjectCostPaise,
        constructionRatePaise: assessment.constructionRatePaise,
        estimatedTimeline: input.estimatedTimeline ?? null,
        compliancePct: input.compliancePct ?? null,
        breakdown: (assessment.breakdown as Record<string, number> | null) ?? null,
        generatedAt: now.toISOString(),
      };

      const [row] = await ctx.db
        .insert(feasibilityReports)
        .values({
          projectId: input.projectId,
          assessmentId: assessment.id,
          snapshot,
          generatedAt: now,
          shareToken: randomBytes(16).toString("hex"),
          pdfStatus: "PENDING",
          createdById: ctx.user.id,
        })
        .returning();
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await enqueueJob(
        "render_pdf",
        { target: "feasibility_report", id: row.id, firm: await firmPayload(ctx.db) },
        ctx.requestId,
      );
      await writeAudit(ctx.db, { entity: "feasibility_report", entityId: row.id, action: "GENERATE_PDF", actorId: ctx.user.id });
      return { ok: true as const, shareToken: row.shareToken };
    }),
});
