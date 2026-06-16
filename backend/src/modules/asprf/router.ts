/**
 * ASPRF — Architectural Staff Performance and Recognition Framework.
 */
import {
  type AspRfMemberScore,
  type PerformanceBand,
  computeAspRfScore,
  performanceBand,
} from "@esti/contracts";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  approvals,
  decisions,
  rewardPoints,
  tasks,
  teamMembers,
  timesheets,
} from "../../db/schema.js";
import { scoreMemberAspRf } from "../../lib/asprfSignals.js";
import { requireHrEnabled } from "../../lib/settings.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const aspRfRouter = router({
  teamScores: protectedProcedure
    .input(z.object({ days: z.number().int().min(7).max(365).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      await requireHrEnabled(ctx.db);
      const days = input?.days ?? 30;
      const since = daysAgo(days);
      const today = new Date().toISOString().slice(0, 10);

      const members = await ctx.db
        .select({
          id: teamMembers.id,
          name: teamMembers.name,
          role: teamMembers.role,
          userId: teamMembers.userId,
          wellbeingOptIn: teamMembers.wellbeingOptIn,
        })
        .from(teamMembers)
        .where(eq(teamMembers.active, true));

      if (members.length === 0) return [];

      const memberIds = members.map((m) => m.id);

      const allTasks = await ctx.db
        .select({
          id: tasks.id,
          assigneeId: tasks.assigneeId,
          reviewerId: tasks.reviewerId,
          status: tasks.status,
          classification: tasks.classification,
          dueDate: tasks.dueDate,
          completedAt: tasks.completedAt,
          estimatedHours: tasks.estimatedHours,
        })
        .from(tasks)
        .where(
          and(
            inArray(tasks.assigneeId, memberIds),
            gte(tasks.createdAt, new Date(since)),
          ),
        );

      const reviewTasks = await ctx.db
        .select({
          id: tasks.id,
          assigneeId: tasks.assigneeId,
          reviewerId: tasks.reviewerId,
          status: tasks.status,
          classification: tasks.classification,
          dueDate: tasks.dueDate,
          completedAt: tasks.completedAt,
          estimatedHours: tasks.estimatedHours,
        })
        .from(tasks)
        .where(
          and(
            inArray(tasks.reviewerId, memberIds),
            gte(tasks.createdAt, new Date(since)),
          ),
        );

      const taskMap = new Map<string, (typeof allTasks)[number]>();
      for (const t of [...allTasks, ...reviewTasks]) taskMap.set(t.id, t);
      const mergedTasks = [...taskMap.values()];

      const allDecisions = await ctx.db
        .select({
          revisionSource: decisions.revisionSource,
          ownerId: decisions.ownerId,
        })
        .from(decisions)
        .where(gte(decisions.createdAt, new Date(since)));

      const allApprovals = await ctx.db
        .select({
          status: approvals.status,
          createdById: approvals.createdById,
          supersedesId: approvals.supersedesId,
          sentDate: approvals.sentDate,
        })
        .from(approvals)
        .where(gte(approvals.createdAt, new Date(since)));

      const taskIds = mergedTasks.map((t) => t.id);
      const hoursRows =
        taskIds.length === 0
          ? []
          : await ctx.db
              .select({
                taskId: timesheets.taskId,
                total: sql<string>`coalesce(sum(${timesheets.hours}), 0)`,
              })
              .from(timesheets)
              .where(inArray(timesheets.taskId, taskIds))
              .groupBy(timesheets.taskId);

      const hoursByTask = new Map(
        hoursRows.filter((r) => r.taskId).map((r) => [r.taskId!, Number(r.total)]),
      );

      const pointsRows = await ctx.db
        .select({
          teamMemberId: rewardPoints.teamMemberId,
          totalPoints: sql<number>`cast(sum(${rewardPoints.points}) as int)`,
        })
        .from(rewardPoints)
        .where(inArray(rewardPoints.teamMemberId, memberIds))
        .groupBy(rewardPoints.teamMemberId);
      const pointsByMember = new Map(pointsRows.map((r) => [r.teamMemberId, r.totalPoints]));

      const scores: AspRfMemberScore[] = members.map((m) => {
        const scored = scoreMemberAspRf({
          ctx: {
            memberId: m.id,
            userId: m.userId,
            wellbeingOptIn: m.wellbeingOptIn,
          },
          today,
          windowDays: days,
          tasks: mergedTasks,
          decisions: allDecisions,
          approvals: allApprovals,
          hoursByTask,
        });

        const score = computeAspRfScore(scored.kpi, m.wellbeingOptIn);
        const band: PerformanceBand | null = performanceBand(score);

        return {
          teamMemberId: m.id,
          memberName: m.name,
          memberRole: m.role,
          score,
          band,
          kpi: scored.kpi,
          totalTasks: scored.totalTasks,
          completedOnTime: scored.completedOnTime,
          overdueCount: scored.overdueCount,
          trainingCount: scored.trainingCount,
          totalPoints: pointsByMember.get(m.id) ?? 0,
          wellbeingOptIn: m.wellbeingOptIn,
        };
      });

      return scores.sort((a, b) => b.score - a.score);
    }),

  myScore: protectedProcedure.query(async ({ ctx }) => {
    await requireHrEnabled(ctx.db);
    const [tm] = await ctx.db
      .select({
        id: teamMembers.id,
        name: teamMembers.name,
        role: teamMembers.role,
        userId: teamMembers.userId,
        wellbeingOptIn: teamMembers.wellbeingOptIn,
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, ctx.user.id));
    if (!tm) return null;

    const since = daysAgo(30);
    const today = new Date().toISOString().slice(0, 10);

    const assigneeTasks = await ctx.db
      .select({
        id: tasks.id,
        assigneeId: tasks.assigneeId,
        reviewerId: tasks.reviewerId,
        status: tasks.status,
        classification: tasks.classification,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        estimatedHours: tasks.estimatedHours,
      })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, tm.id), gte(tasks.createdAt, new Date(since))));

    const reviewTasks = await ctx.db
      .select({
        id: tasks.id,
        assigneeId: tasks.assigneeId,
        reviewerId: tasks.reviewerId,
        status: tasks.status,
        classification: tasks.classification,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        estimatedHours: tasks.estimatedHours,
      })
      .from(tasks)
      .where(and(eq(tasks.reviewerId, tm.id), gte(tasks.createdAt, new Date(since))));

    const taskMap = new Map<string, (typeof assigneeTasks)[number]>();
    for (const t of [...assigneeTasks, ...reviewTasks]) taskMap.set(t.id, t);
    const mergedTasks = [...taskMap.values()];

    const myDecisions = await ctx.db
      .select({
        revisionSource: decisions.revisionSource,
        ownerId: decisions.ownerId,
      })
      .from(decisions)
      .where(and(eq(decisions.ownerId, ctx.user.id), gte(decisions.createdAt, new Date(since))));

    const myApprovals = await ctx.db
      .select({
        status: approvals.status,
        createdById: approvals.createdById,
        supersedesId: approvals.supersedesId,
        sentDate: approvals.sentDate,
      })
      .from(approvals)
      .where(
        and(eq(approvals.createdById, ctx.user.id), gte(approvals.createdAt, new Date(since))),
      );

    const taskIds = mergedTasks.map((t) => t.id);
    const hoursRows =
      taskIds.length === 0
        ? []
        : await ctx.db
            .select({
              taskId: timesheets.taskId,
              total: sql<string>`coalesce(sum(${timesheets.hours}), 0)`,
            })
            .from(timesheets)
            .where(inArray(timesheets.taskId, taskIds))
            .groupBy(timesheets.taskId);

    const hoursByTask = new Map(
      hoursRows.filter((r) => r.taskId).map((r) => [r.taskId!, Number(r.total)]),
    );

    const [pointsRow] = await ctx.db
      .select({ total: sql<number>`cast(sum(${rewardPoints.points}) as int)` })
      .from(rewardPoints)
      .where(eq(rewardPoints.teamMemberId, tm.id));

    const scored = scoreMemberAspRf({
      ctx: {
        memberId: tm.id,
        userId: tm.userId,
        wellbeingOptIn: tm.wellbeingOptIn,
      },
      today,
      windowDays: 30,
      tasks: mergedTasks,
      decisions: myDecisions,
      approvals: myApprovals,
      hoursByTask,
    });

    const score = computeAspRfScore(scored.kpi, tm.wellbeingOptIn);

    return {
      teamMemberId: tm.id,
      memberName: tm.name,
      memberRole: tm.role,
      score,
      band: performanceBand(score),
      kpi: scored.kpi,
      totalTasks: scored.totalTasks,
      completedOnTime: scored.completedOnTime,
      overdueCount: scored.overdueCount,
      trainingCount: scored.trainingCount,
      totalPoints: pointsRow?.total ?? 0,
      wellbeingOptIn: tm.wellbeingOptIn,
    } as AspRfMemberScore;
  }),

  /** Opt in/out of the wellbeing KPI dimension (updates composite weighting). */
  setWellbeingOptIn: protectedProcedure
    .input(z.object({ optIn: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await requireHrEnabled(ctx.db);
      const [tm] = await ctx.db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(eq(teamMembers.userId, ctx.user.id));
      if (!tm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Link your user account to a team member profile first.",
        });
      }
      await ctx.db
        .update(teamMembers)
        .set({ wellbeingOptIn: input.optIn })
        .where(eq(teamMembers.id, tm.id));
      return { wellbeingOptIn: input.optIn };
    }),
});
