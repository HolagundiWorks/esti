import { ProjectBriefUpsertSection } from "@esti/contracts";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  appointments,
  moodBoards,
  permits,
  projectBriefs,
  projectOffices,
  siteAssessments,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import { getProjectById } from "../projectoffice/queries.js";
import { getOrCreateBrief } from "./helpers.js";

export const projectBriefRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await getProjectById(ctx.db, input.projectId);
      const brief = await getOrCreateBrief(ctx.db, input.projectId);

      const [appointment] = await ctx.db
        .select({ scopeSummary: appointments.scopeSummary, status: appointments.status })
        .from(appointments)
        .where(eq(appointments.projectId, input.projectId))
        .limit(1);

      const [latestAssessment] = await ctx.db
        .select({
          overallScore: siteAssessments.overallScore,
          assessmentPhase: siteAssessments.assessmentPhase,
        })
        .from(siteAssessments)
        .where(eq(siteAssessments.projectId, input.projectId))
        .orderBy(desc(siteAssessments.createdAt))
        .limit(1);

      const [permitCount] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(permits)
        .where(eq(permits.projectId, input.projectId));

      const [moodCount] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(moodBoards)
        .where(eq(moodBoards.projectId, input.projectId));

      return {
        ...brief,
        aggregates: {
          appointmentScope: appointment?.scopeSummary ?? null,
          appointmentStatus: appointment?.status ?? null,
          siteAssessmentScore: latestAssessment?.overallScore ?? null,
          siteAssessmentPhase: latestAssessment?.assessmentPhase ?? null,
          permitCount: permitCount?.count ?? 0,
          moodBoardCount: moodCount?.count ?? 0,
        },
      };
    }),

  upsertSection: protectedProcedure.input(ProjectBriefUpsertSection).mutation(async ({ ctx, input }) => {
    await getProjectById(ctx.db, input.projectId);
    await getOrCreateBrief(ctx.db, input.projectId);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    switch (input.section) {
      case "basicInfo":
        patch.basicInfo = input.data;
        break;
      case "projectInfo":
        patch.projectInfo = input.data;
        break;
      case "occupants":
        patch.occupants = input.data;
        break;
      case "designPrefs":
        patch.designPrefs = input.data;
        break;
      case "spaceSchedule":
        patch.spaceSchedule = input.data;
        break;
      case "materials":
        patch.materials = input.data;
        break;
      case "roomDetails":
        patch.roomDetails = input.data;
        break;
      case "assumptions":
        patch.assumptions = input.data.assumptions;
        break;
      case "approval":
        patch.approvalNote = input.data.approvalNote ?? null;
        patch.approvedAt = input.data.approvedAt ?? null;
        break;
    }

    const [row] = await ctx.db
      .update(projectBriefs)
      .set(patch)
      .where(eq(projectBriefs.projectId, input.projectId))
      .returning();

    await writeAudit(ctx.db, {
      entity: "project_brief",
      entityId: row!.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: { section: input.section },
    });

    return row;
  }),

  exportCompiled: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const brief = await getOrCreateBrief(ctx.db, input.projectId);
      const [project] = await ctx.db
        .select({ title: projectOffices.title, ref: projectOffices.ref })
        .from(projectOffices)
        .where(eq(projectOffices.id, input.projectId))
        .limit(1);

      const lines = [
        `# Project design brief — ${project?.ref ?? ""} ${project?.title ?? ""}`,
        "",
        "## Basic information",
        JSON.stringify(brief.basicInfo ?? {}, null, 2),
        "",
        "## Project information",
        JSON.stringify(brief.projectInfo ?? {}, null, 2),
        "",
        "## Occupants",
        JSON.stringify(brief.occupants ?? {}, null, 2),
        "",
        "## Design preferences",
        JSON.stringify(brief.designPrefs ?? {}, null, 2),
        "",
        "## Accommodation schedule",
        JSON.stringify(brief.spaceSchedule ?? [], null, 2),
        "",
        "## Materials",
        JSON.stringify(brief.materials ?? {}, null, 2),
        "",
        "## Assumptions",
        brief.assumptions ?? "",
        "",
        "## Approval",
        brief.approvalNote ?? "",
        brief.approvedAt ? `Approved: ${brief.approvedAt}` : "",
      ];
      return { markdown: lines.join("\n") };
    }),
});
