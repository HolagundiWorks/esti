import { z } from "zod";

/**
 * Team & HR (optional module, gated by orgSettings.hrEnabled). Office staff —
 * distinct from sub-consultants — plus per-project assignments incl. the site
 * in-charge.
 */
export const TEAM_ROLES = {
  // Current-generation role codes
  PRINCIPAL_ARCHITECT: "Principal Architect",
  ASSOCIATE_PARTNER: "Associate Partner",
  SENIOR_ARCHITECT: "Senior Architect",
  PROJECT_MANAGER: "Project Manager",
  ARCHITECT: "Architect",
  SITE_SUPERVISOR: "Site Supervisor",
  ENGINEER: "Engineer",
  INTERN: "Intern / Trainee",
  ADMIN: "Admin / Support",
  ACCOUNTS: "Accounts / Finance",
  // Legacy codes (kept for backward compatibility)
  PRINCIPAL: "Principal Architect",
  JR_ARCHITECT: "Jr Architect",
  PROJECT_LEAD: "Project Lead",
  DRAFTSMAN: "Draughtsperson",
  SITE_ENGINEER: "Site Engineer",
  INTERIOR: "Interior Designer",
  OTHER: "Other",
} as const;
export type TeamRoleCode = keyof typeof TEAM_ROLES;
export const TeamRole = z.enum(Object.keys(TEAM_ROLES) as [TeamRoleCode, ...TeamRoleCode[]]);

export const EMPLOYMENT_TYPES = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  INTERN: "Intern",
  CONTRACT: "Contract",
} as const;
export type EmploymentTypeCode = keyof typeof EMPLOYMENT_TYPES;
export const EmploymentType = z.enum(
  Object.keys(EMPLOYMENT_TYPES) as [EmploymentTypeCode, ...EmploymentTypeCode[]],
);

export const TeamMemberCreate = z.object({
  name: z.string().min(1).max(200),
  role: TeamRole,
  employmentType: EmploymentType,
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  backupContactName: z.string().max(120).optional(),
  backupContactPhone: z.string().max(40).optional(),
  monthlySalaryPaise: z.number().int().nonnegative().default(0),
  dateJoined: z.string().nullable().optional(),
});
export type TeamMemberCreate = z.infer<typeof TeamMemberCreate>;

export const TeamMemberUpdate = z.object({
  id: z.string().uuid(),
  monthlySalaryPaise: z.number().int().nonnegative().optional(),
  role: TeamRole.optional(),
  active: z.boolean().optional(),
  backupContactName: z.string().max(120).nullable().optional(),
  backupContactPhone: z.string().max(40).nullable().optional(),
  /** Display-facing staff grade L1–L4 (see HR-PROFILE-SYSTEM.md). */
  staffLevel: z.enum(["L1", "L2", "L3", "L4"]).nullable().optional(),
  /** Free-text job title e.g. "Senior Architect". */
  jobTitle: z.string().max(120).nullable().optional(),
});
export type TeamMemberUpdate = z.infer<typeof TeamMemberUpdate>;

/** Per-project assignment roles. SITE_INCHARGE is the site-incharge record. */
export const ASSIGNMENT_ROLES = {
  SITE_INCHARGE: "Site in-charge",
  PROJECT_LEAD: "Project lead",
  DESIGN: "Design",
  DRAFTING: "Drafting",
  SUPPORT: "Support",
} as const;
export type AssignmentRoleCode = keyof typeof ASSIGNMENT_ROLES;
export const AssignmentRole = z.enum(
  Object.keys(ASSIGNMENT_ROLES) as [AssignmentRoleCode, ...AssignmentRoleCode[]],
);

export const AssignmentCreate = z.object({
  projectId: z.string().uuid(),
  teamMemberId: z.string().uuid(),
  role: AssignmentRole,
});
export type AssignmentCreate = z.infer<typeof AssignmentCreate>;

/**
 * Reusable named team — a group of office staff. Selecting a team onto a project
 * staffs all its members at once (see assignments.assignTeam).
 */
export const TeamCreate = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string().uuid()).default([]),
});
export type TeamCreate = z.infer<typeof TeamCreate>;

export const TeamUpdate = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  active: z.boolean().optional(),
  /** When provided, replaces the team's full membership set. */
  memberIds: z.array(z.string().uuid()).optional(),
});
export type TeamUpdate = z.infer<typeof TeamUpdate>;

/** Staff every active member of a team onto a project in one action. */
export const AssignTeamToProject = z.object({
  projectId: z.string().uuid(),
  teamId: z.string().uuid(),
  /** Project role applied to each newly-created assignment. */
  role: AssignmentRole.default("SUPPORT"),
});
export type AssignTeamToProject = z.infer<typeof AssignTeamToProject>;
