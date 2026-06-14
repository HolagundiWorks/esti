import { ConsultantSubmissionKind, ConsultantSubmissionStatus } from "@esti/contracts";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { consultants, consultantSubmissions, projectOffices, users } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
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
