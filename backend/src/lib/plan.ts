import {
  type LicenseStatus,
  type LicenseView,
  type Plan,
  type PlanFeature,
  type PlanQuota,
  type ResolvedSeats,
  asPlan,
  PLAN_LIMITS,
  planAllows,
  planQuota,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { orgSettings } from "../db/schema.js";
import { env } from "../env.js";
import { resolveSeats, verifyLicense } from "./license.js";
import { panelDerived, verifyPanelToken } from "./panelLicense.js";
import { getOrgSettings } from "./settings.js";

/**
 * Effective licensing state for this install (Phase B). The plan + seat caps are
 * **derived from the cached signed license**, not the owner-set `plan` column.
 *
 * Non-bricking rule: the write-gate (`blocked`) only engages on a *managed* node
 * — one that has a license token, or that points at a hub (`ESTI_HUB_URL`). A
 * vanilla dev/CI install (no token, no hub) is unmanaged: it is never blocked and
 * derives its plan from the legacy `orgSettings.plan` fallback (defaults LITE).
 */
export interface LicenseState {
  status: LicenseStatus;
  plan: Plan;
  seats: ResolvedSeats;
  /** Managed (license present or hub configured) — gate logic applies. */
  managed: boolean;
  /** Mutations should be rejected (node + managed + EXPIRED/UNLICENSED). */
  blocked: boolean;
  firmId: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  graceDaysLeft: number | null;
}

const DAY_MS = 864e5;

export async function licenseState(db: DB): Promise<LicenseState> {
  const row = await getOrgSettings(db);
  // Fold legacy plan codes (CORE/ENTERPRISE → PRO) — PLAN_LIMITS only has
  // current editions, so an unfolded legacy value crashes seat resolution.
  const fallbackPlan = asPlan(row.plan);
  const managed = Boolean(row.licenseToken) || Boolean(env.ESTI_HUB_URL);
  const seatsFor = (plan: Plan): ResolvedSeats => ({
    staff: PLAN_LIMITS[plan].staff,
    accountants: PLAN_LIMITS[plan].accountants,
    hrManagers: PLAN_LIMITS[plan].hrManagers,
  });

  // Accept either the legacy ESTI hub token or a central License Panel token.
  const esti = verifyLicense(row.licenseToken);
  let derived:
    | {
        plan: Plan;
        seats: ResolvedSeats;
        firmId: string | null;
        issuedAtIso: string | null;
        expiresAtIso: string;
        expMs: number;
      }
    | null = null;
  if (esti.ok) {
    derived = {
      plan: esti.payload.plan,
      seats: resolveSeats(esti.payload),
      firmId: esti.payload.firmId,
      issuedAtIso: esti.payload.issuedAt,
      expiresAtIso: esti.payload.exp,
      expMs: new Date(esti.payload.exp).getTime(),
    };
  } else {
    const panel = verifyPanelToken(row.licenseToken);
    if (panel.ok) {
      const d = panelDerived(panel.payload);
      if (d) derived = d;
    }
  }

  if (!derived) {
    // No/invalid token → UNLICENSED. Blocked only on a managed node (e.g. a
    // desktop install that has not activated yet).
    return {
      status: "UNLICENSED",
      plan: fallbackPlan,
      seats: seatsFor(fallbackPlan),
      managed,
      blocked: managed && env.ESTI_ROLE === "node",
      firmId: null,
      issuedAt: null,
      expiresAt: null,
      graceDaysLeft: null,
    };
  }

  const now = Date.now();
  const exp = derived.expMs;
  const graceEnds = exp + env.LICENSE_GRACE_DAYS * DAY_MS;
  let status: LicenseStatus;
  let graceDaysLeft: number | null = null;
  if (now < exp) {
    status = "VALID";
  } else if (now < graceEnds) {
    status = "GRACE";
    graceDaysLeft = Math.ceil((graceEnds - now) / DAY_MS);
  } else {
    status = "EXPIRED";
  }

  return {
    status,
    plan: derived.plan,
    seats: derived.seats,
    managed: true,
    blocked: status === "EXPIRED" && env.ESTI_ROLE === "node",
    firmId: derived.firmId,
    issuedAt: derived.issuedAtIso,
    expiresAt: derived.expiresAtIso,
    graceDaysLeft,
  };
}

/** Should this mutation be rejected because the install's license is lapsed/absent? */
export async function licenseBlocked(db: DB): Promise<boolean> {
  return (await licenseState(db)).blocked;
}

/** The SPA-facing license view (no token/secret leaves the backend). */
export function toLicenseView(s: LicenseState): LicenseView {
  return {
    status: s.status,
    plan: s.plan,
    seats: s.seats,
    firmId: s.firmId,
    issuedAt: s.issuedAt,
    expiresAt: s.expiresAt,
    graceDaysLeft: s.graceDaysLeft,
    blocked: s.blocked,
  };
}

/** The firm's effective subscription edition (license-derived). */
export async function firmPlan(db: DB): Promise<Plan> {
  return (await licenseState(db)).plan;
}

/**
 * Pin `orgSettings.plan` to `FIRM_PLAN` when set — the licence-free standalone
 * mechanism for the desktop (LITE) and self-hosted firm installs, since the plan
 * is no longer owner-toggleable in-app. Idempotent; a verified licence overrides
 * the stored plan at runtime via {@link licenseState}.
 */
export async function applyFirmPlanFromEnv(db: DB): Promise<void> {
  if (!env.FIRM_PLAN) return;
  // Store the folded edition (CORE/ENTERPRISE .env values → PRO) so the DB
  // always holds a current plan code.
  const plan = asPlan(env.FIRM_PLAN);
  const settings = await getOrgSettings(db);
  if (settings.plan === plan) return;
  await db
    .update(orgSettings)
    .set({ plan, updatedAt: new Date() })
    .where(eq(orgSettings.id, settings.id));
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

/** The effective cap for `kind`: license seat overrides for seat kinds, else the plan. */
function effectiveCap(state: LicenseState, kind: PlanQuota): number | null {
  if (kind === "staff") return state.seats.staff;
  if (kind === "accountants") return state.seats.accountants;
  if (kind === "hrManagers") return state.seats.hrManagers;
  return planQuota(state.plan, kind);
}

/** Throw FORBIDDEN if adding one more of `kind` exceeds the effective quota. */
export async function assertQuota(db: DB, kind: PlanQuota, currentCount: number): Promise<void> {
  const state = await licenseState(db);
  const cap = effectiveCap(state, kind);
  if (cap != null && currentCount >= cap) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You have reached your plan's ${QUOTA_LABEL[kind]} limit. Upgrade to add more.`,
    });
  }
}
