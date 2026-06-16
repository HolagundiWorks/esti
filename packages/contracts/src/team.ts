import { z } from "zod";

/**
 * Team & HR (optional module, gated by orgSettings.hrEnabled). Office staff —
 * distinct from sub-consultants — plus per-project assignments incl. the site
 * in-charge.
 */
export const TEAM_ROLES = {
  PRINCIPAL: "Principal architect",
  ARCHITECT: "Architect",
  JR_ARCHITECT: "Junior architect",
  DRAFTSMAN: "Draughtsperson",
  SITE_ENGINEER: "Site engineer",
  SITE_SUPERVISOR: "Site supervisor",
  INTERIOR: "Interior designer",
  ADMIN: "Admin",
  ACCOUNTS: "Accounts",
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
