/**
 * ASPRF — Architectural Staff Performance and Recognition Framework.
 * Computes rolling 30-day KPI scores from tasks, decisions, and approvals.
 */
import {
  type AspRfKpiScores,
  type AspRfMemberScore,
  type PerformanceBand,
  computeAspRfScore,
  performanceBand,
} from "@esti/contracts";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  approvals,
  decisions,
  rewardPoints,
  tasks,
  teamMembers,
} from "../../db/schema.js";
import { requireHrEnabled } from "../../lib/settings.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

/** ISO date string N days before today. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Clamp a 0–100 score. */
function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
}

/** Compute ASPRF KPI scores from raw signal counts. */
function buildKpi(signals: {
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  overdueTasks: number;
  trainingTasks: number;
  billableHours: number;
  totalHours: number;
  reviewsParticipated: number;
  reviewsTotal: number;
  internalRevisions: number;
  totalRevisions: number;
  firstPassApprovals: number;
  totalApprovals: number;
}): AspRfKpiScores {
  const {
    totalTasks,
    completedTasks,
    onTimeTasks,
    trainingTasks,
    reviewsParticipated,
    reviewsTotal,
    internalRevisions,
    totalRevisions,
    firstPassApprovals,
    totalApprovals,
  } = signals;

  // Reliability: commitment (on-time / assigned) + delivery predictability
  const commitmentRate = totalTasks > 0 ? onTimeTasks / totalTasks : 1;
  const reliability = clamp(commitmentRate * 100);

  // Quality: drawing accuracy (1 - internal error rate) weighted with task completion
  const errorRate = totalRevisions > 0 ? internalRevisions / totalRevisions : 0;
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 1;
  const quality = clamp((1 - errorRate) * 60 + completionRate * 40);

  // Client Impact: first-pass approval rate
  const fpRate = totalApprovals > 0 ? firstPassApprovals / totalApprovals : 1;
  const clientImpact = clamp(fpRate * 100);

  // Collaboration: review participation rate
  const reviewRate = reviewsTotal > 0 ? reviewsParticipated / reviewsTotal : 1;
  const collaboration = clamp(reviewRate * 100);

  // Learning: training task ratio (TRAINING classification)
  const trainingRate = totalTasks > 0 ? trainingTasks / Math.max(totalTasks, 10) : 0;
  const learning = clamp(Math.min(trainingRate * 5, 1) * 100);

  return {
    reliability,
    quality,
    clientImpact,
    collaboration,
    learning,
    wellbeing: null,
  };
}

export const aspRfRouter = router({
  /** 30-day rolling score for all active team members. */
  teamScores: protectedProcedure
    .input(z.object({ days: z.number().int().min(7).max(365).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      await requireHrEnabled(ctx.db);
      const days = input?.days ?? 30;
      const since = daysAgo(days);
      const today = new Date().toISOString().slice(0, 10);

      // All active team members
      const members = await ctx.db
        .select({ id: teamMembers.id, name: teamMembers.name, role: teamMembers.role })
        .from(teamMembers)
        .where(eq(teamMembers.active, true));

      if (members.length === 0) return [];

      const memberIds = members.map((m) => m.id);

      // Tasks assigned to each member (created in window)
      const allTasks = await ctx.db
        .select({
          id: tasks.id,
          assigneeId: tasks.assigneeId,
          reviewerId: tasks.reviewerId,
          status: tasks.status,
          classification: tasks.classification,
          dueDate: tasks.dueDate,
          completedAt: tasks.completedAt,
          createdAt: tasks.createdAt,
        })
        .from(tasks)
        .where(and(
          inArray(tasks.assigneeId, memberIds),
          gte(tasks.createdAt, new Date(since)),
        ));

      // Decisions in window (for revision signals)
      const allDecisions = await ctx.db
        .select({
          revisionSource: decisions.revisionSource,
        })
        .from(decisions)
        .where(gte(decisions.createdAt, new Date(since)));

      const totalRevisions = allDecisions.length;
      const internalRevisions = allDecisions.filter(
        (d) => d.revisionSource === "INTERNAL_ERROR",
      ).length;

      // Approvals (first-pass: approved without prior rejection)
      const allApprovals = await ctx.db
        .select({ status: approvals.status })
        .from(approvals)
        .where(and(
          eq(approvals.status, "APPROVED"),
          gte(approvals.createdAt, new Date(since)),
        ));

      // Reward points total per member
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
        const myTasks = allTasks.filter((t) => t.assigneeId === m.id);
        const myReviews = allTasks.filter((t) => t.reviewerId === m.id);

        const totalTasks = myTasks.length;
        const completedTasks = myTasks.filter((t) => t.status === "DONE").length;
        const onTimeTasks = myTasks.filter(
          (t) => t.status === "DONE" && (!t.dueDate || (t.completedAt && new Date(t.completedAt) <= new Date(t.dueDate + "T23:59:59Z"))),
        ).length;
        const overdueTasks = myTasks.filter(
          (t) => t.dueDate && t.dueDate < today && t.status !== "DONE",
        ).length;
        const trainingTasks = myTasks.filter((t) => t.classification === "TRAINING").length;

        const reviewsParticipated = myReviews.filter((t) => t.status === "DONE").length;
        const reviewsTotal = myReviews.length;

        const kpi = buildKpi({
          totalTasks,
          completedTasks,
          onTimeTasks,
          overdueTasks,
          trainingTasks,
          billableHours: 0,
          totalHours: 0,
          reviewsParticipated,
          reviewsTotal,
          internalRevisions,
          totalRevisions,
          firstPassApprovals: allApprovals.length,
          totalApprovals: allApprovals.length || 1,
        });

        const score = computeAspRfScore(kpi, false);
        const band: PerformanceBand | null = performanceBand(score);

        return {
          teamMemberId: m.id,
          memberName: m.name,
          memberRole: m.role,
          score,
          band,
          kpi,
          totalTasks,
          completedOnTime: onTimeTasks,
          overdueCount: overdueTasks,
          trainingCount: trainingTasks,
          totalPoints: pointsByMember.get(m.id) ?? 0,
          wellbeingOptIn: false,
        };
      });

      return scores.sort((a, b) => b.score - a.score);
    }),

  /** 30-day score for the calling user's team member profile. */
  myScore: protectedProcedure
    .query(async ({ ctx }) => {
      await requireHrEnabled(ctx.db);
      const [tm] = await ctx.db
        .select({ id: teamMembers.id, name: teamMembers.name, role: teamMembers.role })
        .from(teamMembers)
        .where(eq(teamMembers.userId, ctx.user.id));
      if (!tm) return null;

      const since = daysAgo(30);
      const today = new Date().toISOString().slice(0, 10);

      const myTasks = await ctx.db
        .select({
          status: tasks.status, classification: tasks.classification,
          dueDate: tasks.dueDate, completedAt: tasks.completedAt,
        })
        .from(tasks)
        .where(and(eq(tasks.assigneeId, tm.id), gte(tasks.createdAt, new Date(since))));

      const [pointsRow] = await ctx.db
        .select({ total: sql<number>`cast(sum(${rewardPoints.points}) as int)` })
        .from(rewardPoints)
        .where(eq(rewardPoints.teamMemberId, tm.id));

      const totalTasks = myTasks.length;
      const completedTasks = myTasks.filter((t) => t.status === "DONE").length;
      const onTimeTasks = myTasks.filter(
        (t) => t.status === "DONE" && (!t.dueDate || (t.completedAt && new Date(t.completedAt) <= new Date(t.dueDate + "T23:59:59Z"))),
      ).length;
      const overdueTasks = myTasks.filter(
        (t) => t.dueDate && t.dueDate < today && t.status !== "DONE",
      ).length;
      const trainingTasks = myTasks.filter((t) => t.classification === "TRAINING").length;

      const kpi = buildKpi({
        totalTasks, completedTasks, onTimeTasks, overdueTasks, trainingTasks,
        billableHours: 0, totalHours: 0, reviewsParticipated: 0, reviewsTotal: 0,
        internalRevisions: 0, totalRevisions: 1, firstPassApprovals: 1, totalApprovals: 1,
      });
      const score = computeAspRfScore(kpi, false);

      return {
        teamMemberId: tm.id,
        memberName: tm.name,
        memberRole: tm.role,
        score,
        band: performanceBand(score),
        kpi,
        totalTasks,
        completedOnTime: onTimeTasks,
        overdueCount: overdueTasks,
        trainingCount: trainingTasks,
        totalPoints: pointsRow?.total ?? 0,
        wellbeingOptIn: false,
      } as AspRfMemberScore;
    }),
});
