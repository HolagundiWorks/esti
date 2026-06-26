import {
  ProjectListParams,
  TaskCreate,
  TaskListParams,
  TaskUpdate,
  TaskWorkType,
  clampListLimit,
  computeTaskPriority,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNotNull, ne } from "drizzle-orm";
import { z } from "zod";
import { assignments, projectOffices, tasks, teamMembers } from "../../db/schema.js";
import { writeActivity } from "../../lib/activity.js";
import { writeAudit } from "../../lib/audit.js";
import { isHrEnabled, resolveSoloTaskAssignee } from "../../lib/hrMode.js";
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
  workType: tasks.workType,
  difficultyCoefficient: tasks.difficultyCoefficient,
  estimatedHours: tasks.estimatedHours,
  status: tasks.status,
  priority: tasks.priority,
  dueDate: tasks.dueDate,
  completedAt: tasks.completedAt,
  interventionRequired: tasks.interventionRequired,
  priorityScore: tasks.priorityScore,
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

      if (input?.workType) filters.push(eq(tasks.workType, input.workType));
      if (input?.classification) filters.push(eq(tasks.classification, input.classification));
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
        ? base.where(and(...filters)).orderBy(desc(tasks.createdAt)).limit(clampListLimit(input?.limit))
        : base.orderBy(desc(tasks.createdAt)).limit(clampListLimit(input?.limit));
    }),

  listByProject: protectedProcedure
    .input(ProjectListParams)
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select(withProject)
        .from(tasks)
        .leftJoin(projectOffices, eq(projectOffices.id, tasks.projectId))
        .where(eq(tasks.projectId, input.projectId))
        .orderBy(desc(tasks.createdAt))
        .limit(clampListLimit(input.limit));
    }),

  create: protectedProcedure.input(TaskCreate).mutation(async ({ ctx, input }) => {
    const hrOn = await isHrEnabled(ctx.db);
    let assigneeId = input.assigneeId ?? null;
    let assigneeName: string | null = null;

    if (!hrOn) {
      const solo = await resolveSoloTaskAssignee(ctx.db, input.projectId);
      assigneeId = solo.assigneeId;
      assigneeName = solo.assignee;
    } else {
      if (assigneeId) {
        const [check] = await ctx.db
          .select({ id: assignments.id })
          .from(assignments)
          .where(
            and(eq(assignments.projectId, input.projectId), eq(assignments.teamMemberId, assigneeId)),
          );
        if (!check)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Assignee must be a member of the project team",
          });
      }
      assigneeName = assigneeId
        ? await ctx.db
            .select({ name: teamMembers.name })
            .from(teamMembers)
            .where(eq(teamMembers.id, assigneeId))
            .then((r) => r[0]?.name ?? null)
        : null;
    }

    if (input.reviewerId && hrOn) {
      const [check] = await ctx.db
        .select({ id: assignments.id })
        .from(assignments)
        .where(and(eq(assignments.projectId, input.projectId), eq(assignments.teamMemberId, input.reviewerId)));
      if (!check) throw new TRPCError({ code: "BAD_REQUEST", message: "Reviewer must be a member of the project team" });
    }

    const row = await ctx.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(tasks)
        .values({
          title: input.title,
          description: input.description ?? null,
          projectId: input.projectId,
          assigneeId,
          assignee: assigneeName,
          reviewerId: hrOn ? (input.reviewerId ?? null) : null,
          dependsOnId: input.dependsOnId ?? null,
          classification: input.classification ?? null,
          workType: input.workType ?? null,
          difficultyCoefficient: input.difficultyCoefficient ?? 3,
          estimatedHours: input.estimatedHours !== undefined ? String(input.estimatedHours) : null,
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

    const hrOn = await isHrEnabled(ctx.db);
    let assigneeId = input.assigneeId;
    let assigneeName: string | null | undefined = undefined;

    if (!hrOn && before.projectId) {
      const solo = await resolveSoloTaskAssignee(ctx.db, before.projectId);
      assigneeId = solo.assigneeId;
      assigneeName = solo.assignee;
    } else if (input.assigneeId != null && before.projectId) {
      const [check] = await ctx.db
        .select({ id: assignments.id })
        .from(assignments)
        .where(and(eq(assignments.projectId, before.projectId), eq(assignments.teamMemberId, input.assigneeId)));
      if (!check) throw new TRPCError({ code: "BAD_REQUEST", message: "Assignee must be a member of the project team" });
    }
    if (input.reviewerId && before.projectId && hrOn) {
      const [check] = await ctx.db
        .select({ id: assignments.id })
        .from(assignments)
        .where(and(eq(assignments.projectId, before.projectId), eq(assignments.teamMemberId, input.reviewerId)));
      if (!check) throw new TRPCError({ code: "BAD_REQUEST", message: "Reviewer must be a member of the project team" });
    }

    if (input.assigneeId !== undefined && hrOn) {
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
          ...(assigneeId !== undefined || (!hrOn && before.projectId)
            ? { assigneeId: assigneeId ?? null, assignee: assigneeName ?? undefined }
            : {}),
          ...(input.reviewerId !== undefined ? { reviewerId: hrOn ? input.reviewerId : null } : {}),
          ...(input.dependsOnId !== undefined ? { dependsOnId: input.dependsOnId } : {}),
          ...(input.classification !== undefined ? { classification: input.classification } : {}),
          ...(input.workType !== undefined ? { workType: input.workType } : {}),
          ...(input.difficultyCoefficient !== undefined ? { difficultyCoefficient: input.difficultyCoefficient } : {}),
          ...(input.estimatedHours !== undefined ? { estimatedHours: input.estimatedHours !== null ? String(input.estimatedHours) : null } : {}),
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

  /**
   * Scan all active tasks with blocking dependencies. Mark interventionRequired=true
   * on tasks whose dependency has been unresolved for >48 hours. Clear the flag on
   * tasks whose dependency is now DONE. Returns the count flagged.
   */
  flagInterventions: protectedProcedure.mutation(async ({ ctx }) => {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // All tasks that have a dependency and are not themselves done/cancelled.
    const active = await ctx.db
      .select({ id: tasks.id, dependsOnId: tasks.dependsOnId, updatedAt: tasks.updatedAt })
      .from(tasks)
      .where(
        and(
          isNotNull(tasks.dependsOnId),
          ne(tasks.status, "DONE"),
          ne(tasks.status, "CANCELLED"),
        ),
      );

    let flagged = 0;
    for (const t of active) {
      if (!t.dependsOnId) continue;
      const [dep] = await ctx.db
        .select({ status: tasks.status })
        .from(tasks)
        .where(eq(tasks.id, t.dependsOnId));
      const depDone = dep?.status === "DONE";
      if (depDone) {
        // Clear intervention flag when dependency resolves.
        await ctx.db
          .update(tasks)
          .set({ interventionRequired: false, updatedAt: new Date() })
          .where(and(eq(tasks.id, t.id), eq(tasks.interventionRequired, true)));
      } else if (!depDone && t.updatedAt && t.updatedAt < cutoff) {
        // Flag tasks whose dependency has been blocking for >48h.
        const [updated] = await ctx.db
          .update(tasks)
          .set({ interventionRequired: true, updatedAt: new Date() })
          .where(and(eq(tasks.id, t.id), eq(tasks.interventionRequired, false)))
          .returning({ id: tasks.id });
        if (updated) flagged++;
      }
    }
    return { flagged };
  }),

  /** Recompute and store priorityScore for all active tasks using computeTaskPriority(). */
  computeScores: protectedProcedure.mutation(async ({ ctx }) => {
    const active = await ctx.db
      .select({
        id: tasks.id,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        interventionRequired: tasks.interventionRequired,
        workType: tasks.workType,
        status: tasks.status,
      })
      .from(tasks)
      .where(and(ne(tasks.status, "DONE"), ne(tasks.status, "CANCELLED")));

    let updated = 0;
    for (const t of active) {
      const score = computeTaskPriority(t);
      await ctx.db.update(tasks).set({ priorityScore: score }).where(eq(tasks.id, t.id));
      updated++;
    }
    return { updated };
  }),

  /** Top 20 active tasks ordered by priorityScore descending — the 'Today's Work Queue'. */
  todayQueue: protectedProcedure
    .input(z.object({ myTasks: z.boolean().default(false), limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const base = ctx.db
        .select(withProject)
        .from(tasks)
        .leftJoin(projectOffices, eq(projectOffices.id, tasks.projectId));

      const filters: ReturnType<typeof eq>[] = [
        ne(tasks.status, "DONE"),
        ne(tasks.status, "CANCELLED"),
      ];

      if (input.myTasks) {
        const [tm] = await ctx.db
          .select({ id: teamMembers.id })
          .from(teamMembers)
          .where(eq(teamMembers.userId, ctx.user.id));
        if (tm) filters.push(eq(tasks.assigneeId, tm.id));
        else return [];
      }

      return base
        .where(and(...filters))
        .orderBy(desc(tasks.priorityScore), asc(tasks.dueDate))
        .limit(input.limit);
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
