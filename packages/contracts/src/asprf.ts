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
