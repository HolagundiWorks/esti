import { z } from "zod";

/**
 * Subscription editions. A firm-level flag (orgSettings.plan), orthogonal to
 * `can(role, capability)` — capability gates by *person*, plan gates by
 * *subscription*. See docs/esti/PLANS-AND-TIERS.md.
 */
export const Plan = z.enum(["LITE", "CORE", "ENTERPRISE"]);
export type Plan = z.infer<typeof Plan>;

export const PLAN_LABEL: Record<Plan, string> = {
  LITE: "AORMS-Lite",
  CORE: "AORMS-Core",
  ENTERPRISE: "AORMS-Enterprise",
};

const PLAN_RANK: Record<Plan, number> = { LITE: 0, CORE: 1, ENTERPRISE: 2 };

/** Quota caps per plan. `null` = unlimited. */
export interface PlanLimits {
  teamMembers: number | null;
  clients: number | null;
  contractors: number | null;
  consultants: number | null;
  projects: number | null;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  LITE: { teamMembers: 3, clients: 10, contractors: 10, consultants: 5, projects: 5 },
  CORE: { teamMembers: 25, clients: null, contractors: null, consultants: null, projects: null },
  ENTERPRISE: { teamMembers: null, clients: null, contractors: null, consultants: null, projects: null },
};
export type PlanQuota = keyof PlanLimits;

/** Feature flags gated by a minimum plan. */
export const PLAN_FEATURES = [
  "pmc", // construction / Project Management head — incl. tenders/bidding (Core+)
  "costing", // BOQ & measurement window
  "revisionIntelligence",
  // billing (basic, non-GST) and reconciliation (basic bank) are LITE+ — no gate.
  // GST-specific behaviour (CGST/SGST split, SAC, 26AS/AIS/GSTR returns) is gated:
  "gstFiling", // GST / TDS filing abstracts — Core+
  "hr", // HR & payroll
  "performance", // ASPRF / scores / rewards
  "consultantPortal",
  "contractorPortal",
  "ai", // ESTI AI / cognition / LLM / ML
  "esticad", // companion device API
  "auditLog",
  "rateBooks", // rate-book (DSR) library
  "knowledgeBank",
  "sso",
  "apiAccess",
  "multiOffice",
  "whiteLabel",
] as const;
export type PlanFeature = (typeof PLAN_FEATURES)[number];

/** Minimum plan that unlocks each feature. */
const FEATURE_MIN_PLAN: Record<PlanFeature, Plan> = {
  pmc: "CORE",
  costing: "CORE",
  revisionIntelligence: "CORE",
  gstFiling: "CORE",
  hr: "CORE",
  performance: "CORE",
  consultantPortal: "CORE",
  contractorPortal: "CORE",
  ai: "CORE",
  esticad: "CORE",
  auditLog: "CORE",
  rateBooks: "CORE",
  knowledgeBank: "CORE",
  sso: "ENTERPRISE",
  apiAccess: "ENTERPRISE",
  multiOffice: "ENTERPRISE",
  whiteLabel: "ENTERPRISE",
};

function asPlan(plan: Plan | string | null | undefined): Plan {
  return plan === "CORE" || plan === "ENTERPRISE" ? plan : "LITE";
}

/** Does this plan unlock the feature? */
export function planAllows(plan: Plan | string | null | undefined, feature: PlanFeature): boolean {
  return PLAN_RANK[asPlan(plan)] >= PLAN_RANK[FEATURE_MIN_PLAN[feature]];
}

/** The cap for a quota on this plan, or null when unlimited. */
export function planQuota(plan: Plan | string | null | undefined, kind: PlanQuota): number | null {
  return PLAN_LIMITS[asPlan(plan)][kind];
}

/** Can one more of `kind` be added under the plan, given the current count? */
export function withinQuota(
  plan: Plan | string | null | undefined,
  kind: PlanQuota,
  current: number,
): boolean {
  const cap = planQuota(plan, kind);
  return cap == null || current < cap;
}
