import { ConsultantAssignInput, ConsultantSubmissionKind, ConsultantSubmissionStatus } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { consultants, consultantSubmissions, engagements, projectOffices, users } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { addMessage, listMessages } from "../../lib/submissionThread.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

/**
 * Staff-facing inbox for consultant collaborator-portal submissions
 * (deliverables, RFIs, notes). Lets the firm triage OPEN items and record a
 * response note the consultant can read back.
 */
export const consultantRequestsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().uuid().optional(),
          status: ConsultantSubmissionStatus.optional(),
          kind: ConsultantSubmissionKind.optional(),
          openOnly: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const filters = [
        input?.projectId ? eq(consultantSubmissions.projectId, input.projectId) : undefined,
        input?.status ? eq(consultantSubmissions.status, input.status) : undefined,
        input?.kind ? eq(consultantSubmissions.kind, input.kind) : undefined,
        input?.openOnly ? eq(consultantSubmissions.status, "OPEN") : undefined,
      ].filter(Boolean);

      return ctx.db
        .select({
          id: consultantSubmissions.id,
          projectId: consultantSubmissions.projectId,
          projectRef: projectOffices.ref,
          projectTitle: projectOffices.title,
          consultantName: consultants.name,
          kind: consultantSubmissions.kind,
          objectType: consultantSubmissions.objectType,
          subject: consultantSubmissions.subject,
          body: consultantSubmissions.body,
          status: consultantSubmissions.status,
          responseNote: consultantSubmissions.responseNote,
          submittedBy: users.fullName,
          createdAt: consultantSubmissions.createdAt,
        })
        .from(consultantSubmissions)
        .innerJoin(projectOffices, eq(projectOffices.id, consultantSubmissions.projectId))
        .leftJoin(consultants, eq(consultants.id, consultantSubmissions.consultantId))
        .leftJoin(users, eq(users.id, consultantSubmissions.submittedById))
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(consultantSubmissions.createdAt));
    }),

  openCount: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ id: consultantSubmissions.id })
      .from(consultantSubmissions)
      .where(eq(consultantSubmissions.status, "OPEN"));
    return rows.length;
  }),

  /** Assign a task to a consultant engaged on the project. */
  assign: protectedProcedure
    .input(ConsultantAssignInput)
    .mutation(async ({ ctx, input }) => {
      // The consultant must be engaged on the project before a task can be assigned.
      const [eng] = await ctx.db
        .select({ id: engagements.id })
        .from(engagements)
        .where(and(eq(engagements.projectId, input.projectId), eq(engagements.consultantId, input.consultantId)));
      if (!eng) throw new TRPCError({ code: "BAD_REQUEST", message: "That consultant is not engaged on this project." });

      const [created] = await ctx.db
        .insert(consultantSubmissions)
        .values({
          projectId: input.projectId,
          consultantId: input.consultantId,
          kind: "TASK",
          subject: input.subject,
          body: input.body ?? null,
          submittedById: ctx.user.id,
        })
        .returning({ id: consultantSubmissions.id });

      await writeActivity(ctx.db, {
        projectId: input.projectId,
        objectType: "consultant_submission",
        objectId: created!.id,
        eventType: "consultant.task_assigned",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        visibility: "ALL",
        summary: `Firm assigned a task to the consultant: ${input.subject}`,
      });
      return { ok: true as const, id: created!.id };
    }),

  /** Read the firm↔consultant conversation thread on a submission. */
  thread: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => listMessages(ctx.db, { consultantSubmissionId: input.id })),

  /** Post a firm reply on a consultant submission. */
  reply: protectedProcedure
    .input(z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ projectId: consultantSubmissions.projectId, subject: consultantSubmissions.subject })
        .from(consultantSubmissions)
        .where(eq(consultantSubmissions.id, input.id));
      if (!row) throw new Error("Submission not found");
      await addMessage(ctx.db, { consultantSubmissionId: input.id },
        { id: ctx.user.id, name: ctx.user.fullName, side: "FIRM" }, input.body);
      await writeActivity(ctx.db, {
        projectId: row.projectId, objectType: "consultant_submission", objectId: input.id,
        eventType: "consultant.firm_reply", actorId: ctx.user.id, actorName: ctx.user.fullName,
        visibility: "ALL", summary: `Firm replied on: ${row.subject}`,
      });
      return { ok: true as const };
    }),

  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: ConsultantSubmissionStatus,
        responseNote: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ id: consultantSubmissions.id, projectId: consultantSubmissions.projectId, subject: consultantSubmissions.subject })
        .from(consultantSubmissions)
        .where(eq(consultantSubmissions.id, input.id));
      if (!row) throw new Error("Submission not found");

      await ctx.db
        .update(consultantSubmissions)
        .set({ status: input.status, responseNote: input.responseNote ?? null, updatedAt: new Date() })
        .where(eq(consultantSubmissions.id, input.id));

      await writeActivity(ctx.db, {
        projectId: row.projectId,
        objectType: "consultant_submission",
        objectId: input.id,
        eventType: "consultant.triaged",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        visibility: "ALL",
        summary: `Firm marked consultant submission "${row.subject}" as ${input.status}`,
        metadata: { status: input.status, responseNote: input.responseNote ?? null },
      });
      return { ok: true as const };
    }),
});
