import { ConsultantSubmitInput } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { activities, consultantSubmissions, drawings, engagements, phases, projectOffices } from "../../db/schema.js";
import type { DB } from "../../db/index.js";
import { writeActivity } from "../../lib/activity.js";
import { getFirm } from "../../lib/firm.js";
import { presignedGet } from "../../lib/storage.js";
import { collaboratorProcedure, router } from "../../trpc/trpc.js";

/**
 * Project-scoped collaborator portal for an external consultant. Every query is
 * limited to projects the consultant is engaged on (esti_engagement).
 */
export const collaboratorRouter = router({
  /** Firm name + logo for portal header branding. */
  branding: collaboratorProcedure.query(async ({ ctx }) => {
    const f = await getFirm(ctx.db);
    const logoUrl = f.logoKey ? await presignedGet(f.logoKey).catch(() => null) : null;
    return { companyName: f.companyName, logoUrl };
  }),

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
          id: phases.id,
          code: phases.code,
          label: phases.label,
          billingPct: phases.billingPct,
          sortOrder: phases.sortOrder,
        })
        .from(phases)
        .where(eq(phases.projectId, input.projectId))
        .orderBy(asc(phases.sortOrder));
      const currentSortOrder = phaseRows.find((p) => p.id === project!.currentPhaseId)?.sortOrder ?? -1;

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
        phases: phaseRows.map((ph) => ({
          code: ph.code,
          label: ph.label,
          billingPct: ph.billingPct,
          status: ph.sortOrder < currentSortOrder ? "Complete"
            : ph.id === project!.currentPhaseId ? "Active"
            : "Pending",
        })),
        drawings: drawingRows,
      };
    }),

  /** This consultant's own submissions for a project (read-back of their writes). */
  mySubmissions: collaboratorProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertEngaged(ctx, input.projectId);
      return ctx.db
        .select({
          id: consultantSubmissions.id,
          kind: consultantSubmissions.kind,
          subject: consultantSubmissions.subject,
          body: consultantSubmissions.body,
          status: consultantSubmissions.status,
          responseNote: consultantSubmissions.responseNote,
          createdAt: consultantSubmissions.createdAt,
        })
        .from(consultantSubmissions)
        .where(eq(consultantSubmissions.projectId, input.projectId))
        .orderBy(desc(consultantSubmissions.createdAt));
    }),

  /** Project activity timeline — only records explicitly shared with collaborators. */
  activityFeed: collaboratorProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertEngaged(ctx, input.projectId);
      return ctx.db
        .select({
          id: activities.id,
          eventType: activities.eventType,
          summary: activities.summary,
          actorName: activities.actorName,
          createdAt: activities.createdAt,
        })
        .from(activities)
        .where(and(eq(activities.projectId, input.projectId), eq(activities.visibility, "ALL")))
        .orderBy(desc(activities.createdAt))
        .limit(50);
    }),

  /** Raise a deliverable, RFI or note against an engaged project. */
  submit: collaboratorProcedure
    .input(ConsultantSubmitInput)
    .mutation(async ({ ctx, input }) => {
      await assertEngaged(ctx, input.projectId);
      const [created] = await ctx.db
        .insert(consultantSubmissions)
        .values({
          projectId: input.projectId,
          consultantId: ctx.user.consultantId,
          kind: input.kind,
          objectType: input.objectType ?? null,
          objectId: input.objectId ?? null,
          subject: input.subject,
          body: input.body ?? null,
          submittedById: ctx.user.id,
        })
        .returning({ id: consultantSubmissions.id });

      const verb = input.kind === "RFI" ? "raised an RFI"
        : input.kind === "DELIVERABLE" ? "submitted a deliverable"
        : "added a note";
      await writeActivity(ctx.db, {
        projectId: input.projectId,
        objectType: "consultant_submission",
        objectId: created!.id,
        eventType: `consultant.${input.kind.toLowerCase()}`,
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        visibility: "ALL",
        summary: `Consultant ${verb}: ${input.subject}`,
        metadata: { kind: input.kind },
      });
      return { ok: true as const, id: created!.id };
    }),
});

/** Throw NOT_FOUND unless the consultant is engaged on this project. */
async function assertEngaged(
  ctx: { db: DB; user: { consultantId: string } },
  projectId: string,
): Promise<void> {
  const [engagement] = await ctx.db
    .select({ id: engagements.id })
    .from(engagements)
    .where(and(eq(engagements.projectId, projectId), eq(engagements.consultantId, ctx.user.consultantId)));
  if (!engagement) throw new TRPCError({ code: "NOT_FOUND" });
}
