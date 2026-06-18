import {
  ConstructionKind,
  ConstructionRespond,
  ConstructionStatus,
  clampListLimit,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  contractorSubmissions,
  contractors,
  projectOffices,
  users,
} from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { addMessage, listMessages } from "../../lib/submissionThread.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

/** Staff inbox for contractor construction coordination (Phase 7). */
export const constructionRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().uuid().optional(),
          status: ConstructionStatus.optional(),
          kind: ConstructionKind.optional(),
          openOnly: z.boolean().optional(),
          limit: z.number().int().min(1).max(500).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const filters = [
        input?.projectId ? eq(contractorSubmissions.projectId, input.projectId) : undefined,
        input?.status ? eq(contractorSubmissions.status, input.status) : undefined,
        input?.kind ? eq(contractorSubmissions.kind, input.kind) : undefined,
        input?.openOnly ? eq(contractorSubmissions.status, "OPEN") : undefined,
      ].filter(Boolean);

      return ctx.db
        .select({
          id: contractorSubmissions.id,
          projectId: contractorSubmissions.projectId,
          projectRef: projectOffices.ref,
          projectTitle: projectOffices.title,
          contractorName: contractors.name,
          kind: contractorSubmissions.kind,
          subject: contractorSubmissions.subject,
          body: contractorSubmissions.body,
          status: contractorSubmissions.status,
          responseNote: contractorSubmissions.responseNote,
          fileName: contractorSubmissions.fileName,
          submittedBy: users.fullName,
          createdAt: contractorSubmissions.createdAt,
        })
        .from(contractorSubmissions)
        .innerJoin(projectOffices, eq(projectOffices.id, contractorSubmissions.projectId))
        .innerJoin(contractors, eq(contractors.id, contractorSubmissions.contractorId))
        .leftJoin(users, eq(users.id, contractorSubmissions.submittedById))
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(contractorSubmissions.createdAt))
        .limit(clampListLimit(input?.limit));
    }),

  openCount: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ id: contractorSubmissions.id })
      .from(contractorSubmissions)
      .where(eq(contractorSubmissions.status, "OPEN"));
    return rows.length;
  }),

  messages: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => listMessages(ctx.db, { contractorSubmissionId: input.id })),

  respond: manage.input(ConstructionRespond).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select()
      .from(contractorSubmissions)
      .where(eq(contractorSubmissions.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });

    await ctx.db
      .update(contractorSubmissions)
      .set({
        status: input.status,
        responseNote: input.responseNote ?? row.responseNote,
        updatedAt: new Date(),
      })
      .where(eq(contractorSubmissions.id, input.id));

    if (input.responseNote?.trim()) {
      await addMessage(
        ctx.db,
        { contractorSubmissionId: input.id },
        { id: ctx.user.id, name: ctx.user.fullName, side: "FIRM" },
        input.responseNote.trim(),
      );
    }

    await writeActivity(ctx.db, {
      projectId: row.projectId,
      objectType: "contractor_submission",
      objectId: row.id,
      eventType: "construction.responded",
      actorId: ctx.user.id,
      actorName: ctx.user.fullName,
      visibility: "STAFF",
      summary: `Construction ${row.kind} ${input.status.toLowerCase()}: ${row.subject}`,
    });

    return { ok: true as const };
  }),
});
