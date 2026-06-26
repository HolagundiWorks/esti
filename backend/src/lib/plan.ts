import { planAllows, withinQuota, type Plan, type PlanFeature, type PlanQuota } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import type { DB } from "../db/index.js";
import { getOrgSettings } from "./settings.js";

/** The firm's subscription edition (single-firm install). */
export async function firmPlan(db: DB): Promise<Plan> {
  const plan = (await getOrgSettings(db)).plan;
  return plan === "CORE" || plan === "ENTERPRISE" ? plan : "LITE";
}

/** Throw FORBIDDEN if the firm's plan does not include `feature`. (Phase 2 gates.) */
export async function assertPlanFeature(db: DB, feature: PlanFeature): Promise<void> {
  if (!planAllows(await firmPlan(db), feature)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This feature is not included in your plan. Upgrade to unlock it.",
    });
  }
}

/**
 * Previously blocked Lite (a fixed pre-seeded workspace) from the create flow.
 * Lite is now self-serve and unlimited on clients/contractors/consultants/
 * projects, so no plan is "fixed" — this is a no-op kept as a seam (call sites
 * unchanged) in case a fixed tier returns. Quotas are still enforced by
 * `assertQuota`.
 */
export async function assertNotFixedPlan(_db: DB): Promise<void> {
  // intentionally no-op — see doc comment.
}

const QUOTA_LABEL: Record<PlanQuota, string> = {
  accountants: "accountant seat",
  hrManagers: "HR manager seat",
  staff: "staff seat",
  clients: "client",
  contractors: "contractor",
  consultants: "consultant",
  projects: "project",
};

/** Throw FORBIDDEN if adding one more of `kind` exceeds the plan quota. */
export async function assertQuota(db: DB, kind: PlanQuota, currentCount: number): Promise<void> {
  if (!withinQuota(await firmPlan(db), kind, currentCount)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You have reached your plan's ${QUOTA_LABEL[kind]} limit. Upgrade to add more.`,
    });
  }
}
