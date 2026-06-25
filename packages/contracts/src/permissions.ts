import { z } from "zod";

/**
 * Fixed seniority tiers for internal office staff.
 *
 * Display hierarchy (document-aligned, L1 = highest):
 *   L1 — Executive : Owners, Directors, Stakeholders      → OWNER
 *   L2 — Management: Partners, Finance & HR leads          → PARTNER
 *   L3 — Technical : Architects, Engineers, Project Mgrs  → SENIOR, ASSOCIATE
 *   L4 — Execution : Interns, Juniors, Site Supervisors   → VIEWER
 *
 * Internal rank (code-level, higher = more access):
 *   OWNER       100 — Everything including firm / user admin
 *   PARTNER      80 — Financial ops, HR, invoices, fees, reports
 *   ACCOUNTANT   80 — Finance only: invoices, fees, cash book, GST/TDS filing
 *   HR_MANAGER   80 — People only: HR, payroll, leaves, salary
 *   SENIOR       60 — Projects, invoice drafting, drawings, tasks
 *   ASSOCIATE    40 — Projects, tasks, drawings (no invoices/fees)
 *   VIEWER       20 — Read-only across all modules
 *
 * ACCOUNTANT and HR_MANAGER are *functional* roles — their capabilities are an
 * explicit allow-list (see ROLE_CAPABILITIES), not the pure seniority rank, so
 * each holds only its own domain (finance vs. people), unlike PARTNER which
 * holds both. Portal roles (CLIENT, CONSULTANT) are external and rank 0.
 */
export const StaffRole = z.enum([
  "OWNER",
  "PARTNER",
  "ACCOUNTANT",
  "HR_MANAGER",
  "SENIOR",
  "ASSOCIATE",
  "VIEWER",
]);
export type StaffRole = z.infer<typeof StaffRole>;

/** Every role that can sign into the office workspace (vs. the portals). */
export const STAFF_ROLES: readonly StaffRole[] = StaffRole.options;

/** Seniority-tier general staff (the "users" seat bucket). Excludes OWNER and the functional roles. */
export const GENERAL_STAFF_ROLES = ["PARTNER", "SENIOR", "ASSOCIATE", "VIEWER"] as const;

/** Functional single-domain roles (their own seat buckets on Core). */
export const FUNCTIONAL_STAFF_ROLES = ["ACCOUNTANT", "HR_MANAGER"] as const;

/** Roles an owner may assign when creating/editing a staff login (not OWNER). */
export const ASSIGNABLE_STAFF_ROLES = [
  "PARTNER",
  "ACCOUNTANT",
  "HR_MANAGER",
  "SENIOR",
  "ASSOCIATE",
  "VIEWER",
] as const;

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: "Owner / Director",
  PARTNER: "Partner / Finance & HR Lead",
  ACCOUNTANT: "Accountant / Finance",
  HR_MANAGER: "HR Manager",
  SENIOR: "Senior / Project Lead",
  ASSOCIATE: "Associate / Professional",
  VIEWER: "Junior / Intern",
};

/**
 * Seniority rank. Higher number = more access.
 * Portal roles rank 0 — no workspace access.
 */
export const ROLE_RANK: Record<string, number> = {
  OWNER: 100,
  PARTNER: 80,
  ACCOUNTANT: 80, // management-level for rank comparisons; actual grants are an allow-list
  HR_MANAGER: 80, // management-level for rank comparisons; actual grants are an allow-list
  SENIOR: 60,
  ASSOCIATE: 40,
  VIEWER: 20,
  CONSULTANT: 40, // legacy internal staff (external collaborator portal uses rank 0)
  CLIENT: 0,
};

export type Capability =
  | "workspace:view"   // see the office workspace at all (any staff)
  | "write"            // create/update operational records
  | "project:financials" // view project budget / expense data (L3+)
  | "invoice:manage"   // draft + issue invoices (L2+)
  | "invoice:delete"   // delete a draft/cancelled invoice
  | "fees:manage"      // view + edit fee proposals
  | "finance:ops"      // company cash book, reconciliation, vendor financials (L2+)
  | "project:delete"   // delete a whole project
  | "hr:manage"        // team + HR + payroll operations (L2+)
  | "reports:view"     // GST/TDS filing abstracts (L2+)
  | "cost:approve"     // approve cost deviations / variation orders (L2+)
  | "firm:admin"       // firm profile, users, module toggles (L1 only)
  | "salary:view"      // view team salary and payslip amounts (L1 only)
  | "tenders:view";    // view tenders list and documents (L3+)

/**
 * Minimum seniority rank required for each capability.
 *
 * Mapping to document L-levels:
 *   rank 20  → L4 Execution
 *   rank 40  → L3 Technical (Associate)
 *   rank 60  → L3 Technical Lead (Senior)
 *   rank 80  → L2 Management (Partner) — financial + HR operations
 *   rank 100 → L1 Executive (Owner)    — full firm governance
 */
const MIN_RANK: Record<Capability, number> = {
  "workspace:view":      20,  // L5+: any staff
  write:                 40,  // L4+: associate and above
  "project:financials":  40,  // L4+: project budget / expense view
  "invoice:manage":      80,  // L2+: partner and above — invoices are financial instruments
  "invoice:delete":      80,  // L2+: partner and above
  "fees:manage":         80,  // L2+: partner and above
  "finance:ops":         80,  // L2+: company cash book, reconciliation, vendor financials
  "project:delete":      80,  // L2+: partner and above
  "hr:manage":           80,  // L2+: partner and above (HR, payroll, leaves)
  "reports:view":        80,  // L2+: GST/TDS filing abstracts
  "cost:approve":        80,  // L2+: sign off cost deviations + variation orders
  "firm:admin":         100,  // L1 only: owner / director
  "salary:view":        100,  // L1 only: gross/net salary amounts, payslip ₹ values
  "tenders:view":        60,  // L3+: senior and above may view tenders
};

/**
 * Functional roles whose capabilities are an explicit allow-list rather than the
 * pure seniority rank. Each holds only its own domain — ACCOUNTANT the finance
 * side, HR_MANAGER the people side — so neither leaks into the other even though
 * both sit at management rank (80).
 */
const ROLE_CAPABILITIES: Partial<Record<string, readonly Capability[]>> = {
  ACCOUNTANT: [
    "workspace:view",
    "write",
    "project:financials",
    "invoice:manage",
    "invoice:delete",
    "fees:manage",
    "finance:ops",
    "reports:view",
    "cost:approve",
  ],
  HR_MANAGER: ["workspace:view", "write", "hr:manage", "salary:view"],
};

/** Whether a role grants a capability. Unknown roles get nothing. */
export function can(role: string | null | undefined, cap: Capability): boolean {
  if (!role) return false;
  const explicit = ROLE_CAPABILITIES[role];
  if (explicit) return explicit.includes(cap);
  return (ROLE_RANK[role] ?? 0) >= MIN_RANK[cap];
}

/** True for any role that belongs in the office workspace (staff ladder). */
export function isStaffRole(role: string | null | undefined): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

/**
 * Internal access level (1 = lowest/Viewer, 5 = highest/Owner).
 * Note: the public display hierarchy inverts this — see STAFF_LEVEL_LABEL in hr-profile.ts.
 */
export type AccessLevel = 1 | 2 | 3 | 4 | 5;

export type ExternalAccessClass = "CLIENT" | "CONSULTANT" | "CONTRACTOR";

/**
 * Human-facing labels aligned with the dashboard access hierarchy document.
 * Internal ranks 1–5 map to document L4–L1 (inverted scale).
 */
export const ACCESS_LEVEL_LABEL: Record<AccessLevel, string> = {
  1: "L4 — Execution (view only)",
  2: "L3 — Technical",
  3: "L3 — Technical Lead",
  4: "L2 — Management",
  5: "L1 — Executive",
};

const RANK_TO_LEVEL: Record<number, AccessLevel> = {
  20: 1,
  40: 2,
  60: 3,
  80: 4,
  100: 5,
};

/** Map staff role rank to internal level 1–5. Portal roles and unknown roles return null. */
export function accessLevelForRole(
  role: string | null | undefined,
  scope?: { consultantId?: string | null; clientId?: string | null },
): AccessLevel | null {
  if (!role) return null;
  if (role === "CLIENT") return null;
  if (role === "CONSULTANT" && scope?.consultantId) return null;
  const rank = ROLE_RANK[role];
  if (rank == null) return null;
  return RANK_TO_LEVEL[rank] ?? null;
}

/** External portal class for non-staff logins. */
export function externalClassForUser(user: {
  role: string;
  clientId?: string | null;
  consultantId?: string | null;
  contractorId?: string | null;
}): ExternalAccessClass | null {
  if (user.role === "CLIENT" && user.clientId) return "CLIENT";
  if (user.role === "CONSULTANT" && user.consultantId) return "CONSULTANT";
  if (user.role === "CONTRACTOR" && user.contractorId) return "CONTRACTOR";
  return null;
}

/** Minimum internal access level required for a capability. */
export function minLevelForCapability(cap: Capability): AccessLevel {
  const rank = MIN_RANK[cap];
  return RANK_TO_LEVEL[rank] ?? 1;
}

/** Display label for Users admin — e.g. "L2 — Management" or "External — Client". */
export function accessLabelForUser(user: {
  role: string;
  clientId?: string | null;
  consultantId?: string | null;
  contractorId?: string | null;
}): string {
  const external = externalClassForUser(user);
  if (external === "CLIENT") return "External — Client";
  if (external === "CONSULTANT") return "External — Consultant";
  if (external === "CONTRACTOR") return "External — Contractor";
  const level = accessLevelForRole(user.role, user);
  if (level) return ACCESS_LEVEL_LABEL[level];
  if (user.role === "CONSULTANT") return ACCESS_LEVEL_LABEL[2];
  return user.role;
}
