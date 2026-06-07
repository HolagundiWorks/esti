import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { drawings, engagements, phases, projectOffices } from "../../db/schema.js";
import { collaboratorProcedure, router } from "../../trpc/trpc.js";

/**
 * Project-scoped collaborator portal for an external consultant. Every query is
 * limited to projects the consultant is engaged on (esti_engagement).
 */
export const collaboratorRouter = router({
  myProjects: collaboratorProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: projectOffices.id,
        ref: projectOffices.ref,
        title: projectOffices.title,
        status: projectOffices.status,
        engagementRole: engagements.scope,
        agreedFeePaise: engagements.agreedFeePaise,
        paidPaise: engagements.paidPaise,
        engagementStatus: engagements.status,
      })
      .from(engagements)
      .innerJoin(projectOffices, eq(projectOffices.id, engagements.projectId))
      .where(eq(engagements.consultantId, ctx.user.consultantId))
      .orderBy(desc(engagements.createdAt));
  }),

  projectDetail: collaboratorProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Authorisation: the consultant must be engaged on this project.
      const [engagement] = await ctx.db
        .select()
        .from(engagements)
        .where(
          and(
            eq(engagements.projectId, input.projectId),
            eq(engagements.consultantId, ctx.user.consultantId),
          ),
        );
      if (!engagement) throw new TRPCError({ code: "NOT_FOUND" });

      const [project] = await ctx.db
        .select()
        .from(projectOffices)
        .where(eq(projectOffices.id, input.projectId));

      const phaseRows = await ctx.db
        .select({
          code: phases.code,
          label: phases.label,
          billingPct: phases.billingPct,
          status: phases.status,
        })
        .from(phases)
        .where(eq(phases.projectId, input.projectId))
        .orderBy(asc(phases.sortOrder));

      const drawingRows = await ctx.db
        .select({ ref: drawings.ref, title: drawings.title })
        .from(drawings)
        .where(and(eq(drawings.projectId, input.projectId), eq(drawings.status, "READY")))
        .orderBy(desc(drawings.createdAt));

      return {
        project: {
          ref: project!.ref,
          title: project!.title,
          status: project!.status,
          projectType: project!.projectType,
          jurisdiction: project!.jurisdiction,
        },
        engagement: {
          scope: engagement.scope,
          agreedFeePaise: engagement.agreedFeePaise,
          paidPaise: engagement.paidPaise,
          status: engagement.status,
        },
        phases: phaseRows,
        drawings: drawingRows,
      };
    }),
});
