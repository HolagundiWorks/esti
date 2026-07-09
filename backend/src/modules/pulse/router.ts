import {
  DependencyCreate,
  MissingParameterCreate,
  MissingParameterResolve,
  PulseActionDecide,
  STANDUP_SESSION_LABEL,
  StandupAnswer,
  StandupRun,
  bandForScore,
  missingParameterStatusForResponse,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  projectOffices,
  pulseActions,
  standupQuestions,
  standupSessions,
  taskDependencies,
  taskMissingParameters,
  tasks,
} from "../../db/schema.js";
import {
  ACTIVE_STATUS,
  decidePulseAction,
  loadPrioritizedTasks,
  proposePulseActions,
  queryPrioritizedTasks,
  reconcileMissingParameters,
  recomputeScores,
  runStandupForProject,
} from "../../lib/pulseEngine.js";
import { writeActivity } from "../../lib/activity.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

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

  /** Module 2 — reconcile AUTO missing-parameter rows against current task state. */
  detect: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => reconcileMissingParameters(ctx.db, { projectId: input.projectId })),

  /** Module 5/6 — recompute priorityScore + confidenceScore and log every change. */
  recompute: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => recomputeScores(ctx.db, { projectId: input.projectId })),

  /**
   * ESTI top-N prioritised tasks — reads stored scores only. Call
   * `refreshTopTasks` to recompute from latest site and task data.
   */
  topTasks: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(10).default(3),
      }),
    )
    .query(async ({ ctx, input }) => queryPrioritizedTasks(ctx.db, input.limit, { projectId: input.projectId })),

  /** Reconcile site signals, recompute scores, and return fresh top-N tasks. */
  refreshTopTasks: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(10).default(3),
      }),
    )
    .mutation(async ({ ctx, input }) => loadPrioritizedTasks(ctx.db, input.limit, { projectId: input.projectId })),

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

  /**
   * Module 3/4 — the standup loop (P-2). Sessions default to AD_HOC when
   * triggered manually; the four daily cycles also run automatically from
   * the server-local scheduler (backend/src/index.ts → runDueStandups).
   */
  standup: router({
    /** Run a standup now for one project — reconciles gaps, then asks one grouped question per task that has any. */
    run: protectedProcedure.input(StandupRun).mutation(async ({ ctx, input }) => {
      const { session, questionCount } = await runStandupForProject(ctx.db, {
        projectId: input.projectId,
        sessionType: input.sessionType,
      });
      await writeActivity(ctx.db, {
        projectId: input.projectId,
        objectType: "project",
        objectId: input.projectId,
        eventType: "pulse.standup_run",
        actorId: ctx.user.id,
        actorName: ctx.user.fullName,
        summary: `${STANDUP_SESSION_LABEL[input.sessionType]} — ${questionCount} question${questionCount === 1 ? "" : "s"} raised`,
        metadata: { sessionType: input.sessionType, questionCount },
      });
      return { session, questionCount };
    }),

    list: protectedProcedure
      .input(z.object({ projectId: z.string().uuid(), limit: z.number().int().min(1).max(100).default(20) }))
      .query(async ({ ctx, input }) => {
        return ctx.db
          .select()
          .from(standupSessions)
          .where(eq(standupSessions.projectId, input.projectId))
          .orderBy(standupSessions.scheduledAt)
          .limit(input.limit);
      }),

    questions: protectedProcedure
      .input(z.object({ standupSessionId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        return ctx.db
          .select({
            id: standupQuestions.id,
            taskId: standupQuestions.taskId,
            taskTitle: tasks.title,
            questionText: standupQuestions.questionText,
            askedTo: standupQuestions.askedTo,
            responseStatus: standupQuestions.responseStatus,
            responseText: standupQuestions.responseText,
            createdAt: standupQuestions.createdAt,
            answeredAt: standupQuestions.answeredAt,
          })
          .from(standupQuestions)
          .innerJoin(tasks, eq(tasks.id, standupQuestions.taskId))
          .where(eq(standupQuestions.standupSessionId, input.standupSessionId));
      }),

    /**
     * Module 4 — answer a standup question. A CONFIRMED/NOT_REQUIRED answer
     * resolves every open missing-parameter gap on that task; other
     * responses leave gaps open but record the update. Recomputes the
     * task's project scores immediately so the change is reflected without
     * waiting for the next cycle.
     */
    answer: protectedProcedure.input(StandupAnswer).mutation(async ({ ctx, input }) => {
      const [question] = await ctx.db.select().from(standupQuestions).where(eq(standupQuestions.id, input.questionId));
      if (!question) throw new TRPCError({ code: "NOT_FOUND" });

      const [updated] = await ctx.db
        .update(standupQuestions)
        .set({ responseStatus: input.responseStatus, responseText: input.responseText ?? null, answeredAt: new Date() })
        .where(eq(standupQuestions.id, input.questionId))
        .returning();

      const resolution = missingParameterStatusForResponse(input.responseStatus);
      if (resolution !== "OPEN") {
        await ctx.db
          .update(taskMissingParameters)
          .set({ status: resolution, resolvedAt: new Date() })
          .where(and(eq(taskMissingParameters.taskId, question.taskId), eq(taskMissingParameters.status, "OPEN")));
      }

      const [task] = await ctx.db.select().from(tasks).where(eq(tasks.id, question.taskId));
      if (task?.projectId) {
        await recomputeScores(ctx.db, { projectId: task.projectId });
        await writeActivity(ctx.db, {
          projectId: task.projectId,
          objectType: "task",
          objectId: task.id,
          eventType: "pulse.standup_answered",
          actorId: ctx.user.id,
          actorName: ctx.user.fullName,
          summary: `Standup question answered on "${task.title}": ${input.responseStatus}`,
          metadata: { responseStatus: input.responseStatus, responseText: input.responseText },
        });
      }

      return updated ?? null;
    }),

    close: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const [row] = await ctx.db
          .update(standupSessions)
          .set({ status: "COMPLETED", completedAt: new Date() })
          .where(eq(standupSessions.id, input.id))
          .returning();
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }),
  }),

  /**
   * Module 8 Stage 3 — the approval-based action agent. `propose` only
   * ever inserts PROPOSED rows; `decide` is the sole path to APPROVED/
   * REJECTED/EXECUTED, and an APPROVED decision is the only way anything
   * here writes to a task or a standup question.
   */
  actions: router({
    /** Sweep for overdue escalations and blocked/needs-review follow-ups. */
    propose: protectedProcedure
      .input(z.object({ hoursThreshold: z.number().int().min(1).max(240).optional() }).optional())
      .mutation(async ({ ctx, input }) => proposePulseActions(ctx.db, { hoursThreshold: input?.hoursThreshold })),

    list: protectedProcedure
      .input(
        z.object({
          projectId: z.string().uuid().optional(),
          status: z.enum(["PROPOSED", "APPROVED", "REJECTED", "EXECUTED"]).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const filters = [];
        if (input.status) filters.push(eq(pulseActions.status, input.status));
        if (input.projectId) {
          const projectTasks = await ctx.db.select({ id: tasks.id }).from(tasks).where(eq(tasks.projectId, input.projectId));
          const ids = projectTasks.map((t) => t.id);
          if (ids.length === 0) return [];
          filters.push(inArray(pulseActions.taskId, ids));
        }
        return ctx.db
          .select()
          .from(pulseActions)
          .where(filters.length ? and(...filters) : undefined)
          .orderBy(desc(pulseActions.createdAt));
      }),

    /** The sole write path — an APPROVED decision executes the action; REJECTED just records it. */
    decide: protectedProcedure.input(PulseActionDecide).mutation(async ({ ctx, input }) => {
      try {
        return await decidePulseAction(ctx.db, { id: input.id, decision: input.decision, decidedById: ctx.user.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not decide pulse action";
        throw new TRPCError({ code: message.includes("not found") ? "NOT_FOUND" : "BAD_REQUEST", message });
      }
    }),
  }),
});
