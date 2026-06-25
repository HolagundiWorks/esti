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
 * Throw FORBIDDEN on the fixed-workspace (LITE) plan, which ships a pre-seeded
 * set of users, clients, contractors and projects that the admin activates
 * rather than adds to. CORE/ENTERPRISE are self-serve and pass through.
 */
export async function assertNotFixedPlan(db: DB): Promise<void> {
  if ((await firmPlan(db)) === "LITE") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Your Lite workspace has a fixed set of users, clients, contractors and projects — activate an existing record instead of adding a new one.",
    });
  }
}

/** Throw FORBIDDEN if adding one more of `kind` exceeds the plan quota. */
export async function assertQuota(db: DB, kind: PlanQuota, currentCount: number): Promise<void> {
  if (!withinQuota(await firmPlan(db), kind, currentCount)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You have reached your plan's ${kind} limit. Upgrade to add more.`,
    });
  }
}
