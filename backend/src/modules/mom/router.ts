import { MomActionCreate, MomCreate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { momActions, moms, projectOffices, tasks } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { recordDocumentIssue } from "../../lib/documentIssue.js";
import { nextRef } from "../../lib/numbering.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

export const momRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(moms)
        .where(eq(moms.projectId, input.projectId))
        .orderBy(desc(moms.createdAt)),
    ),

  byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(moms).where(eq(moms.id, input.id));
    if (!row) return null;
    const actions = await ctx.db
      .select()
      .from(momActions)
      .where(eq(momActions.momId, input.id))
      .orderBy(asc(momActions.sortOrder), asc(momActions.createdAt));
    return { ...row, actions };
  }),

  create: protectedProcedure.input(MomCreate).mutation(async ({ ctx, input }) => {
    const { ref } = await nextRef(ctx.db, "mom", "MOM");
    const [row] = await ctx.db
      .insert(moms)
      .values({
        ref,
        projectId: input.projectId,
        title: input.title,
        meetingDate: input.meetingDate ?? null,
        venue: input.venue ?? null,
        attendees: input.attendees ?? null,
        minutes: input.minutes ?? "",
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "mom",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        meetingDate: z.string().date().optional(),
        venue: z.string().max(300).optional(),
        attendees: z.string().max(2000).optional(),
        minutes: z.string().max(50000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(moms).where(eq(moms.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      if (before.status === "ISSUED") throw new TRPCError({ code: "BAD_REQUEST", message: "Issued MOM is locked" });
      const { id, ...patch } = input;
      const [row] = await ctx.db.update(moms).set(patch).where(eq(moms.id, id)).returning();
      await writeAudit(ctx.db, {
        entity: "mom",
        entityId: id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before,
        after: row,
      });
      return row!;
    }),

  addAction: protectedProcedure.input(MomActionCreate).mutation(async ({ ctx, input }) => {
    const [mom] = await ctx.db.select().from(moms).where(eq(moms.id, input.momId));
    if (!mom) throw new TRPCError({ code: "NOT_FOUND" });
    const [row] = await ctx.db
      .insert(momActions)
      .values({
        momId: input.momId,
        description: input.description,
        assigneeName: input.assigneeName ?? null,
        dueDate: input.dueDate ?? null,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "mom_action",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  convertActionToTask: protectedProcedure
    .input(z.object({ actionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [action] = await ctx.db.select().from(momActions).where(eq(momActions.id, input.actionId));
      if (!action) throw new TRPCError({ code: "NOT_FOUND" });
      if (action.taskId) throw new TRPCError({ code: "BAD_REQUEST", message: "Action already linked to a task" });
      const [mom] = await ctx.db.select().from(moms).where(eq(moms.id, action.momId));
      if (!mom) throw new TRPCError({ code: "NOT_FOUND" });

      const [task] = await ctx.db
        .insert(tasks)
        .values({
          title: action.description.slice(0, 200),
          description: `From MOM ${mom.ref}`,
          projectId: mom.projectId,
          assignee: action.assigneeName ?? null,
          status: "TODO",
          priority: "MEDIUM",
          dueDate: action.dueDate ?? null,
        })
        .returning();

      await ctx.db
        .update(momActions)
        .set({ taskId: task!.id, status: "OPEN" })
        .where(eq(momActions.id, input.actionId));

      await writeActivity(ctx.db, {
        projectId: mom.projectId,
        objectType: "TASK",
        objectId: task!.id,
        eventType: "task.created_from_mom",
        actorId: ctx.user.id,
        summary: `Task from MOM action: ${action.description.slice(0, 80)}`,
        visibility: "STAFF",
      });

      await writeAudit(ctx.db, {
        entity: "mom_action",
        entityId: input.actionId,
        action: "CONVERT_TASK",
        actorId: ctx.user.id,
        after: { taskId: task!.id },
      });
      return task!;
    }),

  issue: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(moms).where(eq(moms.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    const [updated] = await ctx.db
      .update(moms)
      .set({ status: "ISSUED" })
      .where(eq(moms.id, input.id))
      .returning();
    await recordDocumentIssue(ctx.db, {
      entityType: "MOM",
      entityId: row.id,
      projectId: row.projectId,
      ref: row.ref,
      versionNo: row.versionNo,
      issuedById: ctx.user.id,
    });
    await writeAudit(ctx.db, {
      entity: "mom",
      entityId: input.id,
      action: "ISSUE",
      actorId: ctx.user.id,
      before: { status: row.status },
      after: { status: updated!.status },
    });
    return updated!;
  }),

  remove: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.select().from(moms).where(eq(moms.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    if (row.status === "ISSUED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Issued MOM cannot be deleted" });
    }
    await ctx.db.delete(momActions).where(eq(momActions.momId, input.id));
    await ctx.db.delete(moms).where(eq(moms.id, input.id));
    await writeAudit(ctx.db, {
      entity: "mom",
      entityId: input.id,
      action: "DELETE",
      actorId: ctx.user.id,
      before: row,
    });
    return { ok: true };
  }),
});
