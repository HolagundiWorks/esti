import { z } from "zod";

/**
 * Subscription editions. A firm-level flag (orgSettings.plan), orthogonal to
 * `can(role, capability)` — capability gates by *person*, plan gates by
 * *subscription*. See docs/esti/PLANS-AND-TIERS.md.
 */
export const Plan = z.enum(["LITE", "PRO", "ENTERPRISE"]);
export type Plan = z.infer<typeof Plan>;

export const PLAN_LABEL: Record<Plan, string> = {
  // The free edition is branded "Community" (unified with the offline Community
  // appliance). The internal enum value stays `LITE` for DB / licence-token compat.
  LITE: "AORMS Community",
  PRO: "AORMS-Pro",
  ENTERPRISE: "AORMS-Enterprise",
};

const PLAN_RANK: Record<Plan, number> = { LITE: 0, PRO: 1, ENTERPRISE: 2 };

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

/** 10 GB, the AORMS-Pro cloud storage cap (mirrored to the desktop app). */
export const PRO_STORAGE_BYTES = 10 * 1024 * 1024 * 1024;

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  LITE: {
    // Lite admins create up to 3 general staff logins directly (no functional
    // accountant/HR seats — upgrade to Pro for those roles). Clients,
    // contractors, consultants and projects are unlimited (the normal create flow).
    // Lite is local-first (the offline Community appliance) — files live on the
    // user's own machine, so there is no cloud object-store cap to enforce.
    accountants: 0,
    hrManagers: 0,
    staff: 3,
    clients: null,
    contractors: null,
    consultants: null,
    projects: null,
    storageBytes: null,
  },
  PRO: {
    // Pro is the full cloud edition. Seats are unlimited (a licence token may
    // still constrain them via its `seats` field — see panelLicense.ts). Cloud
    // object storage is capped at 10 GB (mirrored to the desktop app); firms can
    // buy add-on storage (orgSettings.storagePurchasedBytes lifts the cap), or
    // archive closed projects to a package file to reclaim space. BYOS lives in
    // Enterprise.
    accountants: null,
    hrManagers: null,
    staff: null,
    clients: null,
    contractors: null,
    consultants: null,
    projects: null,
    storageBytes: PRO_STORAGE_BYTES,
  },
  ENTERPRISE: {
    // Enterprise is Pro plus bring-your-own-storage (NAS / S3), configured
    // on-premises by an AORMS admin — so the object store is the firm's own and
    // uncapped here. Everything Pro unlocks, Enterprise unlocks too (rank ≥ PRO).
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

/**
 * @deprecated Lite is local-first and no longer carries a cloud storage cap.
 * Retained so older imports keep compiling; not referenced by enforcement.
 */
export const LITE_STORAGE_BYTES = 5 * 1024 * 1024 * 1024;
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
  "aiByoApi", // bring-your-own AI provider (OpenAI-compatible cloud) — Enterprise
  "byos", // bring-your-own-storage (NAS / S3-compatible) — Core+
  "esticad", // companion device API
  "auditLog",
  "knowledgeBank",
  "sso",
  "apiAccess",
  "multiOffice",
  "whiteLabel",
] as const;
export type PlanFeature = (typeof PLAN_FEATURES)[number];

/**
 * Minimum plan that unlocks each feature. With the two-edition model everything
 * beyond Lite's basics lives in Pro (the former Core + Enterprise merged), so
 * every gated feature is PRO — only the view-only contractor portal is LITE+.
 */
const FEATURE_MIN_PLAN: Record<PlanFeature, Plan> = {
  pmc: "PRO",
  costing: "PRO",
  revisionIntelligence: "PRO",
  gstFiling: "PRO",
  hr: "PRO",
  performance: "PRO",
  consultantPortal: "PRO",
  contractorPortal: "LITE", // Lite gets a view-only contractor portal; writes gated to Pro

  ai: "PRO",
  aiByoApi: "PRO", // bring-your-own AI provider — a per-licence flag within Pro
  byos: "ENTERPRISE", // bring-your-own-storage (NAS / S3) — Enterprise, set up on-prem by an AORMS admin
  esticad: "PRO",
  auditLog: "PRO",
  knowledgeBank: "PRO",
  sso: "PRO",
  apiAccess: "PRO",
  multiOffice: "PRO",
  whiteLabel: "PRO",
};

/**
 * Coerce any plan string to a current edition. `ENTERPRISE` and `PRO` are
 * first-class tiers; the legacy `CORE` code folds onto `PRO` so old licence
 * tokens and `.env` FIRM_PLAN values keep working. Anything unknown → LITE.
 */
export function asPlan(plan: Plan | string | null | undefined): Plan {
  if (plan === "ENTERPRISE") return "ENTERPRISE";
  if (plan === "PRO" || plan === "CORE") return "PRO";
  return "LITE";
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

/**
 * The object-store cap for this plan, in bytes, or null when unlimited.
 * `purchasedBytes` is add-on storage the firm has bought — it lifts a finite cap
 * (Pro) and is a no-op on unlimited plans (Lite local / Enterprise BYOS).
 */
export function storageCapBytes(
  plan: Plan | string | null | undefined,
  purchasedBytes = 0,
): number | null {
  const base = PLAN_LIMITS[asPlan(plan)].storageBytes;
  return base == null ? null : base + Math.max(0, purchasedBytes);
}

/** Would storing `incomingBytes` more keep the firm within its (add-on-adjusted) storage cap? */
export function withinStorage(
  plan: Plan | string | null | undefined,
  usedBytes: number,
  incomingBytes: number,
  purchasedBytes = 0,
): boolean {
  const cap = storageCapBytes(plan, purchasedBytes);
  return cap == null || usedBytes + incomingBytes <= cap;
}
