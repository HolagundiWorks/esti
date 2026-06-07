import { ApprovalCreate, ApprovalUpdate } from "@esti/contracts";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { approvals } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const approvalRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(approvals)
        .where(eq(approvals.projectId, input.projectId))
        .orderBy(desc(approvals.createdAt));
    }),

  create: protectedProcedure.input(ApprovalCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(approvals)
      .values({
        projectId: input.projectId,
        entityType: input.entityType,
        title: input.title,
        recipient: input.recipient ?? null,
        channel: input.channel,
        status: input.sentDate ? "SENT" : "DRAFT",
        sentDate: input.sentDate ?? null,
        remarks: input.remarks ?? null,
        supersedesId: input.supersedesId ?? null,
        createdById: ctx.user.id,
      })
      .returning();

    // A new revision retires the one it supersedes.
    if (input.supersedesId) {
      await ctx.db
        .update(approvals)
        .set({ status: "SUPERSEDED" })
        .where(eq(approvals.id, input.supersedesId));
    }

    await writeAudit(ctx.db, {
      entity: "approval",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  update: protectedProcedure.input(ApprovalUpdate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(approvals)
      .set({
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.responseDate !== undefined ? { responseDate: input.responseDate } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
      })
      .where(eq(approvals.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "approval",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row ?? null;
  }),
});
