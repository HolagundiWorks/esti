import { buildAspRfKpiScores, computeDeliveryPredictability } from "@esti/contracts";

export type MemberTaskRow = {
  id: string;
  assigneeId: string | null;
  reviewerId: string | null;
  status: string;
  classification: string | null;
  dueDate: string | null;
  completedAt: Date | null;
  estimatedHours: string | null;
};

export type MemberDecisionRow = {
  revisionSource: string | null;
  ownerId: string | null;
};

export type MemberApprovalRow = {
  status: string;
  createdById: string | null;
  supersedesId: string | null;
  sentDate: string | null;
};

export type MemberContext = {
  memberId: string;
  userId: string | null;
  wellbeingOptIn: boolean;
};

export function deliveryPairs(
  memberTasks: MemberTaskRow[],
  hoursByTask: Map<string, number>,
): { estimatedHours: number; actualHours: number }[] {
  return memberTasks
    .filter((t) => t.status === "DONE" && t.estimatedHours)
    .map((t) => ({
      estimatedHours: Number(t.estimatedHours),
      actualHours: hoursByTask.get(t.id) ?? 0,
    }))
    .filter((p) => p.estimatedHours > 0);
}

function countHeavyDueDays(tasks: MemberTaskRow[]): number {
  const byDate = new Map<string, number>();
  for (const t of tasks) {
    if (!t.dueDate || t.status === "DONE") continue;
    byDate.set(t.dueDate, (byDate.get(t.dueDate) ?? 0) + 1);
  }
  let heavy = 0;
  for (const n of byDate.values()) {
    if (n >= 6) heavy++;
  }
  return heavy;
}

function approvalStats(approvals: MemberApprovalRow[], userId: string | null) {
  if (!userId) return { firstPassApproved: 0, decidedSubmissions: 0 };
  const mine = approvals.filter((a) => a.createdById === userId && a.sentDate);
  const roots = mine.filter((a) => !a.supersedesId);
  const firstPassApproved = roots.filter((a) => a.status === "APPROVED").length;
  const decidedSubmissions = roots.filter((a) =>
    ["APPROVED", "REJECTED", "REVISIONS"].includes(a.status),
  ).length;
  return { firstPassApproved, decidedSubmissions };
}

/** Derive ASPRF KPI scores for one team member over the scoring window. */
export function scoreMemberAspRf(input: {
  ctx: MemberContext;
  today: string;
  windowDays: number;
  tasks: MemberTaskRow[];
  decisions: MemberDecisionRow[];
  approvals: MemberApprovalRow[];
  hoursByTask: Map<string, number>;
}) {
  const { ctx, today, windowDays, tasks, decisions, approvals, hoursByTask } = input;
  const myTasks = tasks.filter((t) => t.assigneeId === ctx.memberId);
  const myReviews = tasks.filter((t) => t.reviewerId === ctx.memberId);
  const myDecisions = ctx.userId
    ? decisions.filter((d) => d.ownerId === ctx.userId)
    : [];

  const totalTasks = myTasks.length;
  const completedTasks = myTasks.filter((t) => t.status === "DONE").length;
  const openTasks = myTasks.filter((t) => t.status !== "DONE").length;
  const onTimeTasks = myTasks.filter(
    (t) =>
      t.status === "DONE" &&
      (!t.dueDate ||
        (t.completedAt &&
          new Date(t.completedAt) <= new Date(`${t.dueDate}T23:59:59Z`))),
  ).length;
  const overdueTasks = myTasks.filter(
    (t) => t.dueDate && t.dueDate < today && t.status !== "DONE",
  ).length;
  const trainingTasks = myTasks.filter((t) => t.classification === "TRAINING").length;

  const reviewsAssigned = myReviews.length;
  const reviewsCompleted = myReviews.filter((t) => t.status === "DONE").length;
  const reviewsOnTime = myReviews.filter(
    (t) =>
      t.status === "DONE" &&
      (!t.dueDate ||
        (t.completedAt &&
          new Date(t.completedAt) <= new Date(`${t.dueDate}T23:59:59Z`))),
  ).length;

  const internalRevisions = myDecisions.filter(
    (d) => d.revisionSource === "INTERNAL_ERROR",
  ).length;
  const clientDrivenDecisions = myDecisions.filter(
    (d) => d.revisionSource === "CLIENT_DRIVEN",
  ).length;
  const totalRevisions = myDecisions.length;

  const { firstPassApproved, decidedSubmissions } = approvalStats(approvals, ctx.userId);

  const kpi = buildAspRfKpiScores({
    totalTasks,
    completedTasks,
    onTimeTasks,
    deliveryPredictability: computeDeliveryPredictability(
      deliveryPairs(myTasks, hoursByTask),
    ),
    trainingTasks,
    reviewsCompleted,
    reviewsAssigned,
    reviewsOnTime,
    internalRevisions,
    totalRevisions,
    clientDrivenDecisions,
    firstPassApproved,
    decidedSubmissions,
    overdueTasks,
    openTasks,
    heavyDueDays: countHeavyDueDays(myTasks),
    windowDays,
    wellbeingOptIn: ctx.wellbeingOptIn,
  });

  return {
    kpi,
    totalTasks,
    completedOnTime: onTimeTasks,
    overdueCount: overdueTasks,
    trainingCount: trainingTasks,
  };
}
