import { ImpactAssessmentInput, PortalSubmissionKind, PortalSubmissionStatus } from "@esti/contracts";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { clients, drawings, portalSubmissions, projectOffices, users } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { addMessage, listMessages } from "../../lib/submissionThread.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

/**
 * Staff-facing inbox for client-portal submissions (acknowledgements, change
 * requests, feedback). Lets the firm triage OPEN items to ACKNOWLEDGED /
 * RESOLVED / DECLINED and record a response note the client can read back.
 */
export const clientRequestsRouter = router({
  /** Office-wide list, newest first; optional project / status / kind filters. */
  list: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().uuid().optional(),
          status: PortalSubmissionStatus.optional(),
          kind: PortalSubmissionKind.optional(),
          openOnly: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const filters = [
        input?.projectId ? eq(portalSubmissions.projectId, input.projectId) : undefined,
        input?.status ? eq(portalSubmissions.status, input.status) : undefined,
        input?.kind ? eq(portalSubmissions.kind, input.kind) : undefined,
        input?.openOnly ? eq(portalSubmissions.status, "OPEN") : undefined,
      ].filter(Boolean);

      const attnUser = users;
      return ctx.db
        .select({
          id: portalSubmissions.id,
          projectId: portalSubmissions.projectId,
          projectRef: projectOffices.ref,
          projectTitle: projectOffices.title,
          clientName: clients.name,
          kind: portalSubmissions.kind,
          objectType: portalSubmissions.objectType,
          subject: portalSubmissions.subject,
          body: portalSubmissions.body,
          rating: portalSubmissions.rating,
          status: portalSubmissions.status,
          responseNote: portalSubmissions.responseNote,
          revisionCategory: portalSubmissions.revisionCategory,
          attentionToId: portalSubmissions.attentionToId,
          affectsCosting: portalSubmissions.affectsCosting,
          affectsTimeline: portalSubmissions.affectsTimeline,
          isBillable: portalSubmissions.isBillable,
          architectComment: portalSubmissions.architectComment,
          refDrawingRef: drawings.ref,
          refDrawingTitle: drawings.title,
          submittedBy: attnUser.fullName,
          createdAt: portalSubmissions.createdAt,
        })
        .from(portalSubmissions)
        .innerJoin(projectOffices, eq(projectOffices.id, portalSubmissions.projectId))
        .leftJoin(clients, eq(clients.id, portalSubmissions.clientId))
        .leftJoin(attnUser, eq(attnUser.id, portalSubmissions.submittedById))
        .leftJoin(drawings, eq(drawings.id, portalSubmissions.refDrawingId))
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(portalSubmissions.createdAt));
    }),

  /** Count of still-open submissions (for a dashboard / nav badge). */
  openCount: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ id: portalSubmissions.id })
      .from(portalSubmissions)
      .where(eq(portalSubmissions.status, "OPEN"));
    return rows.length;
  }),

  /** Read the firm↔client conversation thread on a submission. */
  thread: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => listMessages(ctx.db, { portalSubmissionId: input.id })),

  /** Post a firm reply on a client submission. */
  reply: protectedProcedure
    .input(z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ projectId: portalSubmissions.projectId, subject: portalSubmissions.subject })
        .from(portalSubmissions)
        .where(eq(portalSubmissions.id, input.id));
      if (!row) throw new Error("Submission not found");
      await addMessage(ctx.db, { portalSubmissionId: input.id },
        { id: ctx.user.id, name: ctx.user.fullName, side: "FIRM" }, input.body);
      await writeActivity(ctx.db, {
        projectId: row.projectId, objectType: "portal_submission", objectId: input.id,
        eventType: "portal.firm_reply", actorId: ctx.user.id, actorName: ctx.user.fullName,
        visibility: "ALL", summary: `Firm replied on: ${row.subject}`,
      });
      return { ok: true as const };
    }),

  /** Send impact assessment to client for a CHANGE_REQUEST submission. */
  sendImpactAssessment: protectedProcedure
    .input(ImpactAssessmentInput)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ id: portalSubmissions.id, projectId: portalSubmissions.projectId, subject: portalSubmissions.subject })
        .from(portalSubmissions)
        .where(eq(portalSubmissions.id, input.submissionId));
      if (!row) throw new Error("Submission not found");
      await ctx.db
        .update(portalSubmissions)
        .set({
          affectsCosting: input.affectsCosting,
          affectsTimeline: input.affectsTimeline,
          isBillable: input.isBillable,
          architectComment: input.architectComment ?? null,
          status: "IMPACT_SENT",
          updatedAt: new Date(),
        })
        .where(eq(portalSubmissions.id, input.submissionId));
      if (input.architectComment) {
        await addMessage(ctx.db, { portalSubmissionId: input.submissionId },
          { id: ctx.user.id, name: ctx.user.fullName, side: "FIRM" }, input.architectComment);
      }
      await writeActivity(ctx.db, {
        projectId: row.projectId,
        objectType: "portal_submission",
        objectId: input.submissionId,
        eventType: "portal.impact_sent",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        visibility: "ALL",
        summary: `Impact assessment sent to client for: ${row.subject}`,
        metadata: { affectsCosting: input.affectsCosting, affectsTimeline: input.affectsTimeline, isBillable: input.isBillable },
      });
      return { ok: true as const };
    }),

  /** Triage a submission: set status and optionally record a response note. */
  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: PortalSubmissionStatus,
        responseNote: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ id: portalSubmissions.id, projectId: portalSubmissions.projectId, subject: portalSubmissions.subject })
        .from(portalSubmissions)
        .where(eq(portalSubmissions.id, input.id));
      if (!row) throw new Error("Submission not found");

      await ctx.db
        .update(portalSubmissions)
        .set({
          status: input.status,
          responseNote: input.responseNote ?? null,
          updatedAt: new Date(),
        })
        .where(eq(portalSubmissions.id, input.id));

      await writeActivity(ctx.db, {
        projectId: row.projectId,
        objectType: "portal_submission",
        objectId: input.id,
        eventType: "portal.triaged",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        visibility: "ALL",
        summary: `Firm marked client submission "${row.subject}" as ${input.status}`,
        metadata: { status: input.status, responseNote: input.responseNote ?? null },
      });
      return { ok: true as const };
    }),
});
