import { z } from "zod";

/**
 * Fixed seniority tiers for internal office staff (ADR: access model).
 * Owner > Partner > Senior > Associate > Viewer. The two portal roles
 * (CONSULTANT collaborator, CLIENT) live outside this ladder.
 *
 *   Owner     — everything, incl. firm + user administration
 *   Partner   — everything except firm/user admin (incl. invoices, fees, HR)
 *   Senior    — projects, invoices (draft/issue), drawings, tasks
 *   Associate — projects, tasks, drawings (no invoices/fees)
 *   Viewer    — read-only
 */
export const StaffRole = z.enum(["OWNER", "PARTNER", "SENIOR", "ASSOCIATE", "VIEWER"]);
export type StaffRole = z.infer<typeof StaffRole>;

/** Every role that can sign into the office workspace (vs. the portals). */
export const STAFF_ROLES: readonly StaffRole[] = StaffRole.options;

/** Roles an owner may assign when creating/editing a staff login (not OWNER). */
export const ASSIGNABLE_STAFF_ROLES = ["PARTNER", "SENIOR", "ASSOCIATE", "VIEWER"] as const;

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: "Owner",
  PARTNER: "Partner",
  SENIOR: "Senior",
  ASSOCIATE: "Associate",
  VIEWER: "Viewer",
};

/**
 * Seniority rank. Legacy internal CONSULTANT staff (consultantId null) map to
 * Associate-level access for backward compatibility. Portal roles rank 0.
 */
export const ROLE_RANK: Record<string, number> = {
  OWNER: 100,
  PARTNER: 80,
  SENIOR: 60,
  ASSOCIATE: 40,
  VIEWER: 20,
  CONSULTANT: 40, // legacy internal staff
  CLIENT: 0,
};

export type Capability =
  | "workspace:view" // see the office workspace at all
  | "write" // create/update operational records (not Viewer)
  | "invoice:manage" // create / issue invoices
  | "invoice:delete" // delete a draft/cancelled invoice
  | "fees:manage" // view + edit fee proposals
  | "project:delete" // delete a whole project
  | "hr:manage" // team + HR + payroll
  | "reports:view" // GST/TDS filing abstracts
  | "firm:admin"; // firm profile, users, demo/purge

/** Minimum seniority rank required for each capability. */
const MIN_RANK: Record<Capability, number> = {
  "workspace:view": 20, // any staff
  write: 40, // associate and up
  "invoice:manage": 60, // senior and up
  "invoice:delete": 80, // partner and up
  "fees:manage": 80, // partner and up
  "project:delete": 80, // partner and up
  "hr:manage": 80, // partner and up
  "reports:view": 80, // partner and up
  "firm:admin": 100, // owner only
};

/** Whether a role grants a capability. Unknown roles get nothing. */
export function can(role: string | null | undefined, cap: Capability): boolean {
  if (!role) return false;
  return (ROLE_RANK[role] ?? 0) >= MIN_RANK[cap];
}

/** True for any role that belongs in the office workspace (staff ladder). */
export function isStaffRole(role: string | null | undefined): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}
