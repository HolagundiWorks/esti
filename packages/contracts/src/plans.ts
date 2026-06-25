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

/**
 * Quota caps per plan. `null` = unlimited.
 *
 * Staff seats are split by function. The single OWNER (admin) is pinned
 * separately and never counted here:
 *   - `accountants` — ACCOUNTANT logins
 *   - `hrManagers`  — HR_MANAGER logins
 *   - `staff`       — general seniority-tier logins (PARTNER/SENIOR/ASSOCIATE/VIEWER)
 */
export interface PlanLimits {
  accountants: number | null;
  hrManagers: number | null;
  staff: number | null;
  clients: number | null;
  contractors: number | null;
  consultants: number | null;
  projects: number | null;
  /** Total object-store usage cap, in bytes. `null` = unlimited. */
  storageBytes: number | null;
}

/** 5 GB, the AORMS-Lite storage cap. */
export const LITE_STORAGE_BYTES = 5 * 1024 * 1024 * 1024;
/** 200 GB, the AORMS-Core storage cap. */
export const CORE_STORAGE_BYTES = 200 * 1024 * 1024 * 1024;

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  LITE: {
    // Lite admins create up to 3 general staff logins directly (no functional
    // accountant/HR seats). Clients, contractors, consultants and projects stay
    // a fixed, pre-seeded set the admin activates rather than adds to.
    accountants: 0,
    hrManagers: 0,
    staff: 3,
    clients: 5,
    contractors: 5,
    consultants: 5,
    projects: 5,
    storageBytes: LITE_STORAGE_BYTES,
  },
  CORE: {
    // 1 admin (OWNER, pinned) + 1 accountant + 1 HR + 10 general staff.
    accountants: 1,
    hrManagers: 1,
    staff: 10,
    clients: null,
    contractors: null,
    consultants: null,
    projects: null,
    storageBytes: CORE_STORAGE_BYTES,
  },
  ENTERPRISE: {
    accountants: null,
    hrManagers: null,
    staff: null,
    clients: null,
    contractors: null,
    consultants: null,
    projects: null,
    storageBytes: null,
  },
};
/** Count-based quotas (storageBytes is enforced separately via `withinStorage`). */
export type PlanQuota =
  | "accountants"
  | "hrManagers"
  | "staff"
  | "clients"
  | "contractors"
  | "consultants"
  | "projects";

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
  contractorPortal: "LITE", // Lite gets a view-only contractor portal; writes gated to Core+

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

/** The object-store cap for this plan, in bytes, or null when unlimited. */
export function storageCapBytes(plan: Plan | string | null | undefined): number | null {
  return PLAN_LIMITS[asPlan(plan)].storageBytes;
}

/** Would storing `incomingBytes` more keep the firm within its storage cap? */
export function withinStorage(
  plan: Plan | string | null | undefined,
  usedBytes: number,
  incomingBytes: number,
): boolean {
  const cap = storageCapBytes(plan);
  return cap == null || usedBytes + incomingBytes <= cap;
}
