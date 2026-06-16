/** ASPRF — Architectural Staff Performance and Recognition Framework. */
import { z } from "zod";

// ─── Performance bands ────────────────────────────────────────────────────────

export type PerformanceBand = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export const PERFORMANCE_BAND_LABEL: Record<PerformanceBand, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
};

export const PERFORMANCE_BAND_TAG: Record<
  PerformanceBand,
  "gray" | "blue" | "warm-gray" | "teal"
> = {
  BRONZE: "gray",
  SILVER: "blue",
  GOLD: "warm-gray",
  PLATINUM: "teal",
};

export function performanceBand(score: number): PerformanceBand | null {
  if (score >= 96) return "PLATINUM";
  if (score >= 91) return "GOLD";
  if (score >= 81) return "SILVER";
  if (score >= 70) return "BRONZE";
  return null;
}

// ─── KPI scores ───────────────────────────────────────────────────────────────

export interface AspRfKpiScores {
  reliability: number;      // 30% weight — commitment + delivery predictability
  quality: number;          // 25% weight — rework rate + drawing accuracy
  clientImpact: number;     // 15% weight — first-pass approvals + revision contribution
  collaboration: number;    // 15% weight — review participation + mentorship
  learning: number;         // 10% weight — training tasks + knowledge contributions
  wellbeing: number | null; // 5% weight — opt-in only
}

/** Weighted composite score (0–100, rounded to 1dp). Wellbeing weight redistributed when opted out. */
export function computeAspRfScore(
  kpi: AspRfKpiScores,
  wellbeingOptIn = false,
): number {
  const wb = wellbeingOptIn && kpi.wellbeing !== null ? kpi.wellbeing * 0.05 : 0;
  const scale = wellbeingOptIn ? 1 : 1 / 0.95;
  const base =
    kpi.reliability * 0.30 +
    kpi.quality * 0.25 +
    kpi.clientImpact * 0.15 +
    kpi.collaboration * 0.15 +
    kpi.learning * 0.10;
  return Math.round((base * scale + wb) * 10) / 10;
}

/** Compare estimated vs logged hours — 100 when actual matches estimate. */
export function computeDeliveryPredictability(
  pairs: { estimatedHours: number; actualHours: number }[],
): number {
  if (pairs.length === 0) return 100;
  const scores = pairs.map(({ estimatedHours, actualHours }) => {
    if (estimatedHours <= 0) return 100;
    const ratio = actualHours / estimatedHours;
    const accuracy = ratio <= 1 ? ratio : 1 / ratio;
    return Math.max(0, Math.min(100, accuracy * 100));
  });
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}

/** Blend on-time commitment with timesheet-based delivery predictability. */
export function computeReliabilityKpi(
  onTimeTasks: number,
  totalTasks: number,
  deliveryPredictability: number,
): number {
  const commitment = totalTasks > 0 ? (onTimeTasks / totalTasks) * 100 : 100;
  return Math.round((commitment * 0.5 + deliveryPredictability * 0.5) * 10) / 10;
}

function clampKpi(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
}

/** Quality — rework rate from internal-error decisions + task completion QA score. */
export function computeQualityKpi(
  internalRevisions: number,
  totalRevisions: number,
  completedTasks: number,
  totalTasks: number,
): number {
  const reworkRate = totalRevisions > 0 ? internalRevisions / totalRevisions : 0;
  const reworkScore = (1 - reworkRate) * 100;
  const qaScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;
  return clampKpi(reworkScore * 0.6 + qaScore * 0.4);
}

/** Client impact — first-pass approval rate on submissions the member issued. */
export function computeClientImpactKpi(
  firstPassApproved: number,
  decidedSubmissions: number,
  clientDrivenDecisions: number,
  totalDecisions: number,
): number {
  const fpRate =
    decidedSubmissions > 0 ? (firstPassApproved / decidedSubmissions) * 100 : 100;
  const clientDrag =
    totalDecisions > 0 ? (clientDrivenDecisions / totalDecisions) * 100 : 0;
  return clampKpi(fpRate * 0.7 + (100 - clientDrag) * 0.3);
}

/** Collaboration — reviewer participation and on-time review completion. */
export function computeCollaborationKpi(
  reviewsCompleted: number,
  reviewsAssigned: number,
  reviewsOnTime: number,
): number {
  if (reviewsAssigned === 0) return 100;
  const participation = (reviewsCompleted / reviewsAssigned) * 100;
  const timeliness =
    reviewsCompleted > 0 ? (reviewsOnTime / reviewsCompleted) * 100 : 100;
  return clampKpi(participation * 0.7 + timeliness * 0.3);
}

/** Learning — share of tasks classified TRAINING (target ≈10% for full score). */
export function computeLearningKpi(trainingTasks: number, totalTasks: number): number {
  if (totalTasks === 0) return 50;
  const ratio = trainingTasks / totalTasks;
  const target = 0.1;
  return clampKpi(ratio >= target ? 100 : (ratio / target) * 100);
}

/** Wellbeing (opt-in) — overdue load and sustained heavy due-day pressure. */
export function computeWellbeingKpi(input: {
  overdueTasks: number;
  openTasks: number;
  heavyDueDays: number;
  windowDays: number;
}): number {
  const { overdueTasks, openTasks, heavyDueDays, windowDays } = input;
  const overduePenalty = openTasks > 0 ? (overdueTasks / openTasks) * 40 : 0;
  const loadPenalty = windowDays > 0 ? (heavyDueDays / windowDays) * 35 : 0;
  return clampKpi(100 - overduePenalty - loadPenalty);
}

/** Build all ASPRF dimension scores from member signals. */
export function buildAspRfKpiScores(signals: {
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  deliveryPredictability: number;
  trainingTasks: number;
  reviewsCompleted: number;
  reviewsAssigned: number;
  reviewsOnTime: number;
  internalRevisions: number;
  totalRevisions: number;
  clientDrivenDecisions: number;
  firstPassApproved: number;
  decidedSubmissions: number;
  overdueTasks: number;
  openTasks: number;
  heavyDueDays: number;
  windowDays: number;
  wellbeingOptIn: boolean;
}): AspRfKpiScores {
  return {
    reliability: computeReliabilityKpi(
      signals.onTimeTasks,
      signals.totalTasks,
      signals.deliveryPredictability,
    ),
    quality: computeQualityKpi(
      signals.internalRevisions,
      signals.totalRevisions,
      signals.completedTasks,
      signals.totalTasks,
    ),
    clientImpact: computeClientImpactKpi(
      signals.firstPassApproved,
      signals.decidedSubmissions,
      signals.clientDrivenDecisions,
      signals.totalRevisions,
    ),
    collaboration: computeCollaborationKpi(
      signals.reviewsCompleted,
      signals.reviewsAssigned,
      signals.reviewsOnTime,
    ),
    learning: computeLearningKpi(signals.trainingTasks, signals.totalTasks),
    wellbeing: signals.wellbeingOptIn
      ? computeWellbeingKpi({
          overdueTasks: signals.overdueTasks,
          openTasks: signals.openTasks,
          heavyDueDays: signals.heavyDueDays,
          windowDays: signals.windowDays,
        })
      : null,
  };
}

// ─── Recognition awards ───────────────────────────────────────────────────────

export type RecognitionAward =
  | "RELIABILITY_CHAMPION"
  | "QUALITY_CHAMPION"
  | "DRAWING_EXCELLENCE"
  | "SITE_HERO"
  | "DESIGN_EXCELLENCE"
  | "MENTOR"
  | "KNOWLEDGE_BUILDER";

export const RECOGNITION_AWARD_LABEL: Record<RecognitionAward, string> = {
  RELIABILITY_CHAMPION: "Reliability Champion",
  QUALITY_CHAMPION: "Quality Champion",
  DRAWING_EXCELLENCE: "Drawing Excellence",
  SITE_HERO: "Site Hero",
  DESIGN_EXCELLENCE: "Design Excellence",
  MENTOR: "Mentor",
  KNOWLEDGE_BUILDER: "Knowledge Builder",
};

export const RECOGNITION_AWARD_TAG: Record<
  RecognitionAward,
  "teal" | "blue" | "green" | "magenta" | "purple" | "cyan"
> = {
  RELIABILITY_CHAMPION: "teal",
  QUALITY_CHAMPION: "blue",
  DRAWING_EXCELLENCE: "cyan",
  SITE_HERO: "green",
  DESIGN_EXCELLENCE: "purple",
  MENTOR: "magenta",
  KNOWLEDGE_BUILDER: "teal",
};

// ─── Reward points ────────────────────────────────────────────────────────────

export const REWARD_POINT_AWARD_TYPE = {
  ON_TIME_DELIVERY: "ON_TIME_DELIVERY",
  ZERO_REWORK: "ZERO_REWORK",
  FIRST_PASS_APPROVAL: "FIRST_PASS_APPROVAL",
  KNOWLEDGE_CONTRIBUTION: "KNOWLEDGE_CONTRIBUTION",
  MENTORSHIP: "MENTORSHIP",
  TRAINING_COMPLETION: "TRAINING_COMPLETION",
  TEAM_BONUS: "TEAM_BONUS",
} as const;

export const REWARD_POINT_VALUES: Record<string, number> = {
  ON_TIME_DELIVERY: 10,
  ZERO_REWORK: 15,
  FIRST_PASS_APPROVAL: 20,
  KNOWLEDGE_CONTRIBUTION: 25,
  MENTORSHIP: 15,
  TRAINING_COMPLETION: 10,
  TEAM_BONUS: 50,
};

export const REWARD_POINT_LABEL: Record<string, string> = {
  ON_TIME_DELIVERY: "On-time delivery",
  ZERO_REWORK: "Zero-rework deliverable",
  FIRST_PASS_APPROVAL: "First-pass approval",
  KNOWLEDGE_CONTRIBUTION: "Knowledge contribution",
  MENTORSHIP: "Mentorship",
  TRAINING_COMPLETION: "Training completion",
  TEAM_BONUS: "Team bonus",
};

export const RewardPointCreate = z.object({
  teamMemberId: z.string().uuid(),
  points: z.number().int().min(1).max(500),
  reason: z.string().min(1).max(500),
  awardType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
});
export type RewardPointCreate = z.infer<typeof RewardPointCreate>;

// ─── ASPRF member score ───────────────────────────────────────────────────────

export interface AspRfMemberScore {
  teamMemberId: string;
  memberName: string;
  memberRole: string;
  score: number;
  band: PerformanceBand | null;
  kpi: AspRfKpiScores;
  totalTasks: number;
  completedOnTime: number;
  overdueCount: number;
  trainingCount: number;
  totalPoints: number;
  wellbeingOptIn: boolean;
}
