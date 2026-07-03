import { ApprovalCreate, ApprovalUpdate, ProjectCursorListParams, clampListLimit } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { approvals } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { buildCursorPage, cursorWhere } from "../../lib/cursorPage.js";
import { publishEntity } from "../../lib/sync/publish.js";
import { requireApprovalInProject } from "../../lib/projectScope.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const approvalRouter = router({
  listByProject: protectedProcedure
    .input(ProjectCursorListParams)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(approvals)
        .where(
          and(
            eq(approvals.projectId, input.projectId),
            cursorWhere(input.cursor, approvals.createdAt, approvals.id),
          ),
        )
        .orderBy(desc(approvals.createdAt), desc(approvals.id))
        .limit(clampListLimit(input.limit) + 1);
      return buildCursorPage(rows, input.limit);
    }),

  create: protectedProcedure.input(ApprovalCreate).mutation(async ({ ctx, input }) => {
    await requireApprovalInProject(ctx.db, input.projectId, input.supersedesId);
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
    // Hybrid sync (Phase B): a sent approval is client-facing — publish to the hub.
    if (row!.status !== "DRAFT") await publishEntity(ctx.db, "approval", row!.id);
    return row!;
  }),

  update: protectedProcedure.input(ApprovalUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(approvals).where(eq(approvals.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });
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
      before,
      after: row,
    });
    if (row!.status !== "DRAFT") await publishEntity(ctx.db, "approval", row!.id);
    return row!;
  }),
});
