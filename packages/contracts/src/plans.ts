import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 2026-07 PIVOT: single product, ACTIVE/SUSPENDED licence.
// All existing firms migrate to ACTIVE and get the full feature set (PRO).
// The Plan tiers (LITE / PRO / ENTERPRISE) are DEPRECATED — retained only so
// existing DB rows, licence tokens, and call-sites keep compiling during the
// transition. New code reads `LicenceStatus` instead.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Operational licence status — the only gate that matters going forward.
 * ACTIVE  = full workspace access.
 * SUSPENDED = account suspended (non-payment or admin action).
 */
export const LicenceStatus = z.enum(["ACTIVE", "SUSPENDED"]);
export type LicenceStatus = z.infer<typeof LicenceStatus>;

// ─── DEPRECATED tier enum — kept for DB/token back-compat only ───────────────

/**
 * @deprecated Tiers removed 2026-07. Use `LicenceStatus` instead.
 * Kept as a compile-time shim so old call-sites don't break.
 */
export const Plan = z.enum(["LITE", "PRO", "ENTERPRISE"]);
/** @deprecated */
export type Plan = z.infer<typeof Plan>;

/** @deprecated */
export const PLAN_LABEL: Record<Plan, string> = {
  LITE: "AORMS",
  PRO: "AORMS",
  ENTERPRISE: "AORMS",
};

const PLAN_RANK: Record<Plan, number> = { LITE: 0, PRO: 1, ENTERPRISE: 2 };

/**
 * 5 GiB — default storage quota for every new account (2026-07).
 */
export const DEFAULT_STORAGE_BYTES = 5 * 1024 * 1024 * 1024;

/**
 * @deprecated Old Pro storage cap. Retained for migration references.
 */
export const PRO_STORAGE_BYTES = 10 * 1024 * 1024 * 1024;

/** @deprecated */
export const LITE_STORAGE_BYTES = DEFAULT_STORAGE_BYTES;

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

/**
 * @deprecated PLAN_LIMITS no longer drives feature access. Retained so
 * `planQuota` / `withinQuota` call-sites compile; every value returns null
 * (unlimited) or the default 5 GiB storage cap.
 */
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  LITE: {
    accountants: null, hrManagers: null, staff: null,
    clients: null, contractors: null, consultants: null, projects: null,
    storageBytes: DEFAULT_STORAGE_BYTES,
  },
  PRO: {
    accountants: null, hrManagers: null, staff: null,
    clients: null, contractors: null, consultants: null, projects: null,
    storageBytes: DEFAULT_STORAGE_BYTES,
  },
  ENTERPRISE: {
    accountants: null, hrManagers: null, staff: null,
    clients: null, contractors: null, consultants: null, projects: null,
    storageBytes: null,
  },
};

/** @deprecated */
export const PLAN_FEATURES = [
  "pmc", "costing", "revisionIntelligence", "gstFiling", "hr",
  "performance", "consultantPortal", "contractorPortal",
  "ai", "aiByoApi", "byos", "esticad", "auditLog", "knowledgeBank",
  "sso", "apiAccess", "multiOffice", "whiteLabel",
] as const;
/** @deprecated */
export type PlanFeature = (typeof PLAN_FEATURES)[number];

/** @deprecated — every active account now gets the full feature set. */
const FEATURE_MIN_PLAN: Record<PlanFeature, Plan> = {
  pmc: "LITE", costing: "LITE", revisionIntelligence: "LITE", gstFiling: "LITE",
  hr: "LITE", performance: "LITE", consultantPortal: "LITE", contractorPortal: "LITE",
  ai: "LITE", aiByoApi: "LITE", byos: "LITE", esticad: "LITE", auditLog: "LITE",
  knowledgeBank: "LITE", sso: "LITE", apiAccess: "LITE", multiOffice: "LITE",
  whiteLabel: "LITE",
};

/**
 * @deprecated Shim for back-compat. Always returns `'PRO'` so that all
 * `planAllows()` checks pass and all features are unlocked for every ACTIVE
 * account. Remove call-sites gradually; new code should check `LicenceStatus`.
 */
export function asPlan(_plan?: Plan | string | null): Plan {
  return "PRO";
}

/**
 * @deprecated Always returns `true` — all features unlocked for ACTIVE accounts.
 * Retained so existing call-sites compile without changes.
 */
export function planAllows(
  _plan: Plan | string | null | undefined,
  _feature: PlanFeature,
): boolean {
  return true;
}

/** @deprecated Returns `null` (unlimited) for all seat kinds. */
export type PlanQuota =
  | "accountants" | "hrManagers" | "staff"
  | "clients" | "contractors" | "consultants" | "projects";

/** @deprecated All quotas are now unlimited (returns `null`). */
export function planQuota(
  _plan: Plan | string | null | undefined,
  _kind: PlanQuota,
): number | null {
  return null;
}

/** @deprecated Always returns `true` — no seat caps. */
export function withinQuota(
  _plan: Plan | string | null | undefined,
  _kind: PlanQuota,
  _current: number,
): boolean {
  return true;
}

/**
 * Storage cap for this account: `DEFAULT_STORAGE_BYTES` (5 GiB) + any
 * purchased add-on bytes, or `null` for uncapped BYOS installs.
 */
export function storageCapBytes(
  _plan: Plan | string | null | undefined,
  purchasedBytes = 0,
): number | null {
  const base = DEFAULT_STORAGE_BYTES;
  return base + Math.max(0, purchasedBytes);
}

/** Would storing `incomingBytes` more keep the firm within its storage cap? */
export function withinStorage(
  plan: Plan | string | null | undefined,
  usedBytes: number,
  incomingBytes: number,
  purchasedBytes = 0,
): boolean {
  const cap = storageCapBytes(plan, purchasedBytes);
  return cap == null || usedBytes + incomingBytes <= cap;
}
