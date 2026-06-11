import { TaskCreate, TaskUpdate } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
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
  status: tasks.status,
  priority: tasks.priority,
  dueDate: tasks.dueDate,
  createdAt: tasks.createdAt,
};

export const taskRouter = router({
  /** All tasks (optionally only open). */
  list: protectedProcedure
    .input(z.object({ openOnly: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      const base = ctx.db
        .select(withProject)
        .from(tasks)
        .leftJoin(projectOffices, eq(projectOffices.id, tasks.projectId));
      const rows = input?.openOnly
        ? await base.where(eq(tasks.status, "TODO")).orderBy(desc(tasks.createdAt))
        : await base.orderBy(desc(tasks.createdAt));
      return rows;
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
    // The assignee, if set, must be a member of this project's team.
    if (input.assignee) {
      const team = await ctx.db
        .select({ name: teamMembers.name })
        .from(assignments)
        .innerJoin(teamMembers, eq(teamMembers.id, assignments.teamMemberId))
        .where(eq(assignments.projectId, input.projectId));
      if (!team.some((m) => m.name === input.assignee)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assignee must be a member of the project team",
        });
      }
    }
    const row = await ctx.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(tasks)
        .values({
          title: input.title,
          description: input.description ?? null,
          projectId: input.projectId,
          assignee: input.assignee ?? null,
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
        metadata: { title: created!.title, assignee: created!.assignee, priority: created!.priority, dueDate: created!.dueDate },
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
    const completedAt =
      input.status === "DONE" ? new Date() : input.status !== undefined ? null : undefined;
    const row = await ctx.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(tasks)
        .set({
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.assignee !== undefined ? { assignee: input.assignee } : {}),
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
            description: before.description,
            assignee: before.assignee,
            status: before.status,
            priority: before.priority,
            dueDate: before.dueDate,
          },
          after: {
            title: updated!.title,
            description: updated!.description,
            assignee: updated!.assignee,
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
