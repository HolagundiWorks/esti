import { TaskCreate, TaskUpdate } from "@esti/contracts";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { projectOffices, tasks } from "../../db/schema.js";
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
    const [row] = await ctx.db
      .insert(tasks)
      .values({
        title: input.title,
        description: input.description ?? null,
        projectId: input.projectId ?? null,
        assignee: input.assignee ?? null,
        priority: input.priority,
        dueDate: input.dueDate ?? null,
        createdById: ctx.user.id,
      })
      .returning();
    return row!;
  }),

  update: protectedProcedure.input(TaskUpdate).mutation(async ({ ctx, input }) => {
    const completedAt =
      input.status === "DONE" ? new Date() : input.status !== undefined ? null : undefined;
    const [row] = await ctx.db
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
    return row ?? null;
  }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(tasks).where(eq(tasks.id, input.id));
      return { ok: true };
    }),
});
