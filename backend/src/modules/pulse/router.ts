import {
  AUTO_MISSING_PARAMETER_TYPES,
  DependencyCreate,
  MissingParameterCreate,
  MissingParameterResolve,
  bandForScore,
  computeConfidenceScore,
  computeTaskPriority,
  detectMissingParameters,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { projectOffices, taskDependencies, taskMissingParameters, taskPriorityLogs, tasks } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

const ACTIVE_STATUS = and(ne(tasks.status, "DONE"), ne(tasks.status, "CANCELLED"));

/** True when a task has at least one OPEN, BLOCKS-type dependency on a task that isn't DONE. */
async function unresolvedBlockingTaskIds(db: DB, taskIds: string[]) {
  if (taskIds.length === 0) return new Set<string>();
  const rows = await db
    .select({
      taskId: taskDependencies.taskId,
      dependsOnStatus: tasks.status,
    })
    .from(taskDependencies)
    .innerJoin(tasks, eq(tasks.id, taskDependencies.dependsOnTaskId))
    .where(
      and(
        inArray(taskDependencies.taskId, taskIds),
        eq(taskDependencies.dependencyType, "BLOCKS"),
        eq(taskDependencies.status, "OPEN"),
      ),
    );
  const blocked = new Set<string>();
  for (const r of rows) {
    if (r.dependsOnStatus !== "DONE") blocked.add(r.taskId);
  }
  return blocked;
}

export const pulseRouter = router({
  dependencies: router({
    /** The dependency graph edges for one task — what it depends on. */
    list: protectedProcedure
      .input(z.object({ taskId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        return ctx.db
          .select({
            id: taskDependencies.id,
            taskId: taskDependencies.taskId,
            dependsOnTaskId: taskDependencies.dependsOnTaskId,
            dependsOnTitle: tasks.title,
            dependsOnStatus: tasks.status,
            dependencyType: taskDependencies.dependencyType,
            status: taskDependencies.status,
            createdAt: taskDependencies.createdAt,
          })
          .from(taskDependencies)
          .innerJoin(tasks, eq(tasks.id, taskDependencies.dependsOnTaskId))
          .where(eq(taskDependencies.taskId, input.taskId));
      }),

    add: protectedProcedure.input(DependencyCreate).mutation(async ({ ctx, input }) => {
      if (input.taskId === input.dependsOnTaskId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A task cannot depend on itself" });
      }
      const [task, dependsOn] = await Promise.all([
        ctx.db.select().from(tasks).where(eq(tasks.id, input.taskId)).then((r) => r[0]),
        ctx.db.select().from(tasks).where(eq(tasks.id, input.dependsOnTaskId)).then((r) => r[0]),
      ]);
      if (!task || !dependsOn) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

      const [row] = await ctx.db
        .insert(taskDependencies)
        .values({
          taskId: input.taskId,
          dependsOnTaskId: input.dependsOnTaskId,
          dependencyType: input.dependencyType,
        })
        .onConflictDoNothing()
        .returning();

      await writeActivity(ctx.db, {
        projectId: task.projectId,
        objectType: "task",
        objectId: task.id,
        eventType: "task.dependency_added",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `"${task.title}" now depends on "${dependsOn.title}"`,
        metadata: { dependsOnTaskId: input.dependsOnTaskId, dependencyType: input.dependencyType },
      });
      return row ?? null;
    }),

    remove: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const [row] = await ctx.db.select().from(taskDependencies).where(eq(taskDependencies.id, input.id));
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        await ctx.db.delete(taskDependencies).where(eq(taskDependencies.id, input.id));
        return { ok: true };
      }),

    resolve: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const [row] = await ctx.db
          .update(taskDependencies)
          .set({ status: "RESOLVED" })
          .where(eq(taskDependencies.id, input.id))
          .returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }),
  }),

  missingParameters: router({
    list: protectedProcedure
      .input(
        z.object({
          taskId: z.string().uuid().optional(),
          projectId: z.string().uuid().optional(),
          status: z.enum(["OPEN", "CONFIRMED", "NOT_REQUIRED"]).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const filters = [];
        if (input.taskId) filters.push(eq(taskMissingParameters.taskId, input.taskId));
        if (input.status) filters.push(eq(taskMissingParameters.status, input.status));
        if (input.projectId) {
          const projectTasks = await ctx.db
            .select({ id: tasks.id })
            .from(tasks)
            .where(eq(tasks.projectId, input.projectId));
          const ids = projectTasks.map((t) => t.id);
          if (ids.length === 0) return [];
          filters.push(inArray(taskMissingParameters.taskId, ids));
        }
        return ctx.db
          .select()
          .from(taskMissingParameters)
          .where(filters.length ? and(...filters) : undefined);
      }),

    /** Manually record a business-context gap (Module 4: Team Question Loop). */
    add: protectedProcedure.input(MissingParameterCreate).mutation(async ({ ctx, input }) => {
      const [task] = await ctx.db.select().from(tasks).where(eq(tasks.id, input.taskId));
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

      const [row] = await ctx.db
        .insert(taskMissingParameters)
        .values({
          taskId: input.taskId,
          parameterType: input.parameterType,
          description: input.description ?? null,
          assignedTo: input.assignedTo ?? null,
        })
        .returning();

      await writeActivity(ctx.db, {
        projectId: task.projectId,
        objectType: "task",
        objectId: task.id,
        eventType: "task.missing_parameter_raised",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `Missing parameter raised on "${task.title}": ${input.parameterType}`,
        metadata: { parameterType: input.parameterType },
      });
      return row;
    }),

    resolve: protectedProcedure.input(MissingParameterResolve).mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(taskMissingParameters)
        .set({ status: input.status, resolvedAt: new Date() })
        .where(eq(taskMissingParameters.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      const [task] = await ctx.db.select().from(tasks).where(eq(tasks.id, row.taskId));
      if (task) {
        await writeActivity(ctx.db, {
          projectId: task.projectId,
          objectType: "task",
          objectId: task.id,
          eventType: "task.missing_parameter_resolved",
          actorId: ctx.user.id,
          actorName: ctx.user.fullName,
          summary: `Missing parameter resolved on "${task.title}": ${row.parameterType} → ${input.status}`,
          metadata: { parameterType: row.parameterType, status: input.status, responseText: input.responseText },
        });
      }
      return row;
    }),
  }),

  /**
   * Module 2 — reconcile AUTO missing-parameter rows against current task
   * state: raise newly-detected gaps, auto-close AUTO rows whose condition no
   * longer holds. MANUAL rows (client approval, site measurement, …) are
   * never touched here — only a human resolves those.
   */
  detect: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      const filters = [ACTIVE_STATUS];
      if (input.projectId) filters.push(eq(tasks.projectId, input.projectId));
      const active = await ctx.db
        .select({
          id: tasks.id,
          status: tasks.status,
          dueDate: tasks.dueDate,
          assigneeId: tasks.assigneeId,
          updatedAt: tasks.updatedAt,
        })
        .from(tasks)
        .where(and(...filters));

      const taskIds = active.map((t) => t.id);
      const blockedIds = await unresolvedBlockingTaskIds(ctx.db, taskIds);

      const existing = taskIds.length
        ? await ctx.db
            .select()
            .from(taskMissingParameters)
            .where(and(inArray(taskMissingParameters.taskId, taskIds), eq(taskMissingParameters.status, "OPEN")))
        : [];
      const existingByTask = new Map<string, typeof existing>();
      for (const row of existing) {
        const list = existingByTask.get(row.taskId) ?? [];
        list.push(row);
        existingByTask.set(row.taskId, list);
      }

      let raised = 0;
      let closed = 0;
      for (const t of active) {
        const openForTask = existingByTask.get(t.id) ?? [];
        const openAutoTypes = new Set(
          openForTask
            .filter((r) => (AUTO_MISSING_PARAMETER_TYPES as readonly string[]).includes(r.parameterType))
            .map((r) => r.parameterType),
        );
        const hasAnyMissingParameter = openForTask.length > 0;

        const detected = detectMissingParameters({
          status: t.status,
          dueDate: t.dueDate,
          assigneeId: t.assigneeId,
          updatedAt: t.updatedAt,
          hasUnresolvedBlockingDependency: blockedIds.has(t.id),
          hasAnyMissingParameter,
        });
        const detectedSet = new Set<string>(detected);

        const toRaise = detected.filter((type) => !openAutoTypes.has(type));
        if (toRaise.length) {
          await ctx.db.insert(taskMissingParameters).values(
            toRaise.map((parameterType) => ({ taskId: t.id, parameterType })),
          );
          raised += toRaise.length;
        }

        const toClose = openForTask.filter(
          (r) =>
            (AUTO_MISSING_PARAMETER_TYPES as readonly string[]).includes(r.parameterType) &&
            !detectedSet.has(r.parameterType),
        );
        if (toClose.length) {
          await ctx.db
            .update(taskMissingParameters)
            .set({ status: "NOT_REQUIRED", resolvedAt: new Date() })
            .where(
              inArray(
                taskMissingParameters.id,
                toClose.map((r) => r.id),
              ),
            );
          closed += toClose.length;
        }
      }

      return { scanned: active.length, raised, closed };
    }),

  /**
   * Module 5/6 — recompute priorityScore + confidenceScore for active tasks
   * and log every change (Module 5: auditable priority log). Deterministic,
   * no LLM. Run `detect` first so open-parameter counts are current.
   */
  recompute: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      const filters = [ACTIVE_STATUS];
      if (input.projectId) filters.push(eq(tasks.projectId, input.projectId));
      const active = await ctx.db
        .select({
          id: tasks.id,
          status: tasks.status,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          assigneeId: tasks.assigneeId,
          workType: tasks.workType,
          interventionRequired: tasks.interventionRequired,
          priorityScore: tasks.priorityScore,
          confidenceScore: tasks.confidenceScore,
          updatedAt: tasks.updatedAt,
        })
        .from(tasks)
        .where(and(...filters));

      const taskIds = active.map((t) => t.id);
      const blockedIds = await unresolvedBlockingTaskIds(ctx.db, taskIds);

      const openParams = taskIds.length
        ? await ctx.db
            .select({ taskId: taskMissingParameters.taskId })
            .from(taskMissingParameters)
            .where(and(inArray(taskMissingParameters.taskId, taskIds), eq(taskMissingParameters.status, "OPEN")))
        : [];
      const openCountByTask = new Map<string, number>();
      for (const r of openParams) {
        openCountByTask.set(r.taskId, (openCountByTask.get(r.taskId) ?? 0) + 1);
      }

      let updated = 0;
      for (const t of active) {
        const newPriorityScore = computeTaskPriority(t);
        const daysSinceUpdate = (Date.now() - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        const newConfidenceScore = computeConfidenceScore({
          status: t.status,
          openMissingParameterCount: openCountByTask.get(t.id) ?? 0,
          hasUnresolvedBlockingDependency: blockedIds.has(t.id),
          hasAssignee: !!t.assigneeId,
          hasDueDate: !!t.dueDate,
          daysSinceUpdate,
        });

        if (newPriorityScore === t.priorityScore && newConfidenceScore === t.confidenceScore) continue;

        await ctx.db
          .update(tasks)
          .set({ priorityScore: newPriorityScore, confidenceScore: newConfidenceScore })
          .where(eq(tasks.id, t.id));
        await ctx.db.insert(taskPriorityLogs).values({
          taskId: t.id,
          oldPriorityScore: t.priorityScore,
          newPriorityScore,
          oldConfidenceScore: t.confidenceScore,
          newConfidenceScore,
          reason: "pulse.recompute",
        });
        updated++;
      }

      return { scanned: active.length, updated };
    }),

  /** Today's queue, banded by consequence — supersedes tasks.todayQueue for Pulse consumers. */
  queue: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional(), limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const filters = [ACTIVE_STATUS];
      if (input.projectId) filters.push(eq(tasks.projectId, input.projectId));
      const rows = await ctx.db
        .select({
          id: tasks.id,
          title: tasks.title,
          projectId: tasks.projectId,
          projectRef: projectOffices.ref,
          projectTitle: projectOffices.title,
          status: tasks.status,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          priorityScore: tasks.priorityScore,
          confidenceScore: tasks.confidenceScore,
        })
        .from(tasks)
        .leftJoin(projectOffices, eq(projectOffices.id, tasks.projectId))
        .where(and(...filters))
        .orderBy(tasks.priorityScore)
        .limit(input.limit);

      return rows
        .map((r) => ({ ...r, band: bandForScore(r.priorityScore) }))
        .sort((a, b) => b.priorityScore - a.priorityScore);
    }),
});
