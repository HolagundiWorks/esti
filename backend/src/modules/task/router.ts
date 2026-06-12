import { TaskCreate, TaskListParams, TaskUpdate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { assignments, projectOffices, tasks, teamMembers } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

const withProject = {
  id: tasks.id,
  title: tasks.title,
  description: tasks.description,
  projectId: tasks.projectId,
  projectRef: projectOffices.ref,
  projectTitle: projectOffices.title,
  assignee: tasks.assignee,
  assigneeId: tasks.assigneeId,
  reviewerId: tasks.reviewerId,
  dependsOnId: tasks.dependsOnId,
  classification: tasks.classification,
  status: tasks.status,
  priority: tasks.priority,
  dueDate: tasks.dueDate,
  createdAt: tasks.createdAt,
};

export const taskRouter = router({
  list: protectedProcedure
    .input(TaskListParams.optional())
    .query(async ({ ctx, input }) => {
      const filters: ReturnType<typeof eq>[] = [];
      if (input?.openOnly) filters.push(eq(tasks.status, "TODO"));
      if (input?.status) filters.push(eq(tasks.status, input.status));
      if (input?.priority) filters.push(eq(tasks.priority, input.priority));
      if (input?.projectId) filters.push(eq(tasks.projectId, input.projectId));

      if (input?.myTasks) {
        // Resolve current user's team member id.
        const [tm] = await ctx.db
          .select({ id: teamMembers.id })
          .from(teamMembers)
          .where(eq(teamMembers.userId, ctx.user.id));
        if (tm) {
          filters.push(eq(tasks.assigneeId, tm.id));
        } else {
          // User has no team member profile — return empty.
          return [];
        }
      }

      const base = ctx.db
        .select(withProject)
        .from(tasks)
        .leftJoin(projectOffices, eq(projectOffices.id, tasks.projectId));

      return filters.length
        ? base.where(and(...filters)).orderBy(desc(tasks.createdAt))
        : base.orderBy(desc(tasks.createdAt));
    }),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select(withProject)
        .from(tasks)
        .leftJoin(projectOffices, eq(projectOffices.id, tasks.projectId))
        .where(eq(tasks.projectId, input.projectId))
        .orderBy(desc(tasks.createdAt));
    }),

  create: protectedProcedure.input(TaskCreate).mutation(async ({ ctx, input }) => {
    if (input.assigneeId) {
      const [check] = await ctx.db
        .select({ id: assignments.id })
        .from(assignments)
        .where(and(eq(assignments.projectId, input.projectId), eq(assignments.teamMemberId, input.assigneeId)));
      if (!check) throw new TRPCError({ code: "BAD_REQUEST", message: "Assignee must be a member of the project team" });
    }
    if (input.reviewerId) {
      const [check] = await ctx.db
        .select({ id: assignments.id })
        .from(assignments)
        .where(and(eq(assignments.projectId, input.projectId), eq(assignments.teamMemberId, input.reviewerId)));
      if (!check) throw new TRPCError({ code: "BAD_REQUEST", message: "Reviewer must be a member of the project team" });
    }
    const assigneeName = input.assigneeId
      ? await ctx.db.select({ name: teamMembers.name }).from(teamMembers).where(eq(teamMembers.id, input.assigneeId)).then((r) => r[0]?.name ?? null)
      : null;

    const row = await ctx.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(tasks)
        .values({
          title: input.title,
          description: input.description ?? null,
          projectId: input.projectId,
          assigneeId: input.assigneeId ?? null,
          assignee: assigneeName,
          reviewerId: input.reviewerId ?? null,
          dependsOnId: input.dependsOnId ?? null,
          classification: input.classification ?? null,
          priority: input.priority,
          dueDate: input.dueDate ?? null,
          createdById: ctx.user.id,
        })
        .returning();
      await writeActivity(tx, {
        projectId: input.projectId,
        objectType: "task",
        objectId: created!.id,
        eventType: "task.created",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `Task created: ${created!.title}`,
        metadata: {
          title: created!.title,
          assignee: created!.assignee,
          assigneeId: created!.assigneeId,
          priority: created!.priority,
          dueDate: created!.dueDate,
          classification: created!.classification,
        },
      });
      await writeAudit(tx, {
        entity: "task",
        entityId: created!.id,
        action: "CREATE",
        actorId: ctx.user.id,
        after: created,
      });
      return created!;
    });
    return row;
  }),

  update: protectedProcedure.input(TaskUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db.select().from(tasks).where(eq(tasks.id, input.id));
    if (!before) throw new TRPCError({ code: "NOT_FOUND" });

    if (input.assigneeId && before.projectId) {
      const [check] = await ctx.db
        .select({ id: assignments.id })
        .from(assignments)
        .where(and(eq(assignments.projectId, before.projectId), eq(assignments.teamMemberId, input.assigneeId)));
      if (!check) throw new TRPCError({ code: "BAD_REQUEST", message: "Assignee must be a member of the project team" });
    }
    if (input.reviewerId && before.projectId) {
      const [check] = await ctx.db
        .select({ id: assignments.id })
        .from(assignments)
        .where(and(eq(assignments.projectId, before.projectId), eq(assignments.teamMemberId, input.reviewerId)));
      if (!check) throw new TRPCError({ code: "BAD_REQUEST", message: "Reviewer must be a member of the project team" });
    }

    let assigneeName: string | null | undefined = undefined;
    if (input.assigneeId !== undefined) {
      assigneeName = input.assigneeId
        ? await ctx.db.select({ name: teamMembers.name }).from(teamMembers).where(eq(teamMembers.id, input.assigneeId)).then((r) => r[0]?.name ?? null)
        : null;
    }

    const completedAt =
      input.status === "DONE" ? new Date() : input.status !== undefined ? null : undefined;

    const row = await ctx.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(tasks)
        .set({
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId, assignee: assigneeName } : {}),
          ...(input.reviewerId !== undefined ? { reviewerId: input.reviewerId } : {}),
          ...(input.dependsOnId !== undefined ? { dependsOnId: input.dependsOnId } : {}),
          ...(input.classification !== undefined ? { classification: input.classification } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
          ...(completedAt !== undefined ? { completedAt } : {}),
        })
        .where(eq(tasks.id, input.id))
        .returning();
      await writeActivity(tx, {
        projectId: updated!.projectId,
        objectType: "task",
        objectId: updated!.id,
        eventType: input.status ? `task.${input.status.toLowerCase()}` : "task.updated",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `Task updated: ${updated!.title}`,
        metadata: {
          before: {
            title: before.title,
            assignee: before.assignee,
            assigneeId: before.assigneeId,
            status: before.status,
            priority: before.priority,
            dueDate: before.dueDate,
          },
          after: {
            title: updated!.title,
            assignee: updated!.assignee,
            assigneeId: updated!.assigneeId,
            status: updated!.status,
            priority: updated!.priority,
            dueDate: updated!.dueDate,
            completedAt: updated!.completedAt,
          },
        },
      });
      await writeAudit(tx, {
        entity: "task",
        entityId: input.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before,
        after: updated,
      });
      return updated!;
    });
    return row;
  }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(tasks).where(eq(tasks.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.transaction(async (tx) => {
        await tx.delete(tasks).where(eq(tasks.id, input.id));
        await writeActivity(tx, {
          projectId: before.projectId,
          objectType: "task",
          objectId: before.id,
          eventType: "task.deleted",
          actorId: ctx.user.id,
          actorName: ctx.user.fullName,
          summary: `Task deleted: ${before.title}`,
          metadata: {
            title: before.title,
            assignee: before.assignee,
            status: before.status,
            priority: before.priority,
            dueDate: before.dueDate,
          },
        });
        await writeAudit(tx, {
          entity: "task",
          entityId: input.id,
          action: "DELETE",
          actorId: ctx.user.id,
          before,
        });
      });
      return { ok: true };
    }),
});
