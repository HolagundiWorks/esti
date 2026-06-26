import { users } from "./org-auth.js";
import { projectOffices } from "./project.js";
import {
  bigint,
  boolean,
  createdAt,
  date,
  doublePrecision,
  id,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  updatedAt,
  uuid,
} from "./_helpers.js";

/** Office staff register (optional HR module). */
export const teamMembers = pgTable("esti_teammember", {
  id: id(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  employmentType: text("employment_type").notNull(),
  email: text("email"),
  phone: text("phone"),
  monthlySalaryPaise: bigint("monthly_salary_paise", { mode: "number" })
    .notNull()
    .default(0),
  dateJoined: date("date_joined"),
  active: boolean("active").notNull().default(true),
  /** Links this team member to their ESTI user account (enables "my tasks"). */
  userId: uuid("user_id").references(() => users.id),
  /** Shown on leave-impact alerts only — not full HR/payroll data. */
  backupContactName: text("backup_contact_name"),
  backupContactPhone: text("backup_contact_phone"),
  /** When true, ASPRF composite includes the wellbeing dimension (opt-in). */
  wellbeingOptIn: boolean("wellbeing_opt_in").notNull().default(false),
  /** Display-facing staff grade: L1 (Principal) – L4 (Junior/Support). */
  staffLevel: text("staff_level"),
  /** Free-text job title shown on ID card / HR profile, e.g. "Senior Architect". */
  jobTitle: text("job_title"),
  createdAt: createdAt(),
});

/** Per-project staff assignment — includes the site in-charge. */
export const assignments = pgTable("esti_assignment", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  teamMemberId: uuid("team_member_id")
    .notNull()
    .references(() => teamMembers.id),
  role: text("role").notNull(),
  createdAt: createdAt(),
});

/** Reusable named team — a group of office staff that can be staffed onto a project in one action. */
export const teams = pgTable("esti_team", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/** Membership join — which staff belong to a team. */
export const teamMemberships = pgTable(
  "esti_team_membership",
  {
    id: id(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    teamMemberId: uuid("team_member_id")
      .notNull()
      .references(() => teamMembers.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => ({
    uq: uniqueIndex("esti_team_membership_uq").on(t.teamId, t.teamMemberId),
  }),
);

/** Staff leave records (optional HR module). */
export const leaves = pgTable("esti_leave", {
  id: id(),
  teamMemberId: uuid("team_member_id")
    .notNull()
    .references(() => teamMembers.id),
  type: text("type").notNull(),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  days: doublePrecision("days").notNull().default(0),
  reason: text("reason"),
  status: text("status").notNull().default("REQUESTED"),
  createdAt: createdAt(),
});

/** Monthly payslips (optional HR module). One per member per month. */
export const payslips = pgTable(
  "esti_payslip",
  {
    id: id(),
    teamMemberId: uuid("team_member_id")
      .notNull()
      .references(() => teamMembers.id),
    month: text("month").notNull(), // YYYY-MM
    grossPaise: bigint("gross_paise", { mode: "number" }).notNull().default(0),
    deductionsPaise: bigint("deductions_paise", { mode: "number" })
      .notNull()
      .default(0),
    netPaise: bigint("net_paise", { mode: "number" }).notNull().default(0),
    paid: boolean("paid").notNull().default(false),
    paidDate: date("paid_date"),
    notes: text("notes"),
    pdfKey: text("pdf_key"),
    pdfStatus: text("pdf_status").notNull().default("NONE"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    uq: uniqueIndex("esti_payslip_member_month").on(t.teamMemberId, t.month),
  }),
);

/** Office / project tasks. */
export const tasks = pgTable("esti_task", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: uuid("project_id").references(() => projectOffices.id),
  /** Legacy display-name cache — updated whenever assigneeId changes. */
  assignee: text("assignee"),
  /** FK to the assigned team member (replaces text assignee for lookups). */
  assigneeId: uuid("assignee_id").references(() => teamMembers.id),
  /** FK to the reviewing team member. */
  reviewerId: uuid("reviewer_id").references(() => teamMembers.id),
  /** Blocking dependency: this task is blocked until the referenced task is DONE. */
  dependsOnId: uuid("depends_on_id"),
  /** ASPRF task classification: BILLABLE | NON_BILLABLE | TRAINING | COLLABORATION | PERSONAL */
  classification: text("classification"),
  /** ASPRF architectural work category: DESIGN_COMMUNICATION | DESIGN_DEVELOPMENT | TECHNICAL_PRODUCTION | CONSTRUCTION_SUPPORT */
  workType: text("work_type"),
  /** Anti-gaming difficulty coefficient 1–5 (default 3) for ASPRF scoring weight. */
  difficultyCoefficient: smallint("difficulty_coefficient").default(3),
  estimatedHours: numeric("estimated_hours", { precision: 6, scale: 2 }),
  status: text("status").notNull().default("TODO"),
  priority: text("priority").notNull().default("MEDIUM"),
  dueDate: date("due_date"),
  startDate: date("start_date"),
  createdById: uuid("created_by_id"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  /** True when a blocking dependency has been unresolved for >48h. Cleared when dependency resolves. */
  interventionRequired: boolean("intervention_required").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** @deprecated Removed from product — use attendance register instead. */
export const timesheets = pgTable("esti_timesheet", {
  id: id(),
  teamMemberId: uuid("team_member_id")
    .notNull()
    .references(() => teamMembers.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projectOffices.id, { onDelete: "set null" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  entryDate: date("entry_date").notNull(),
  hours: numeric("hours", { precision: 5, scale: 2 }).notNull().default("0"),
  billable: boolean("billable").notNull().default(false),
  description: text("description"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** @deprecated Removed from product — use attendance register instead. */
export const dailyUpdates = pgTable("esti_daily_update", {
  id: id(),
  teamMemberId: uuid("team_member_id")
    .notNull()
    .references(() => teamMembers.id, { onDelete: "cascade" }),
  updateDate: date("update_date").notNull(),
  completed: text("completed"),
  inProgress: text("in_progress"),
  blockers: text("blockers"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Daily staff attendance — present / absent / half-day / WFH (architecture office register). */
export const attendance = pgTable(
  "esti_attendance",
  {
    id: id(),
    teamMemberId: uuid("team_member_id")
      .notNull()
      .references(() => teamMembers.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date").notNull(),
    status: text("status").notNull().default("PRESENT"),
    notes: text("notes"),
    markedById: uuid("marked_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    uq: uniqueIndex("esti_attendance_member_date_uq").on(t.teamMemberId, t.attendanceDate),
  }),
);

/** Reward points ledger for ASPRF recognition. */
export const rewardPoints = pgTable("esti_reward_point", {
  id: id(),
  teamMemberId: uuid("team_member_id")
    .notNull()
    .references(() => teamMembers.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  awardType: text("award_type"),
  referenceId: uuid("reference_id"),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/** Personal details vault — one-to-one with esti_teammember. */
export const hrProfiles = pgTable("esti_hr_profile", {
  id: id(),
  memberId: uuid("member_id")
    .notNull()
    .unique()
    .references(() => teamMembers.id, { onDelete: "cascade" }),
  // Personal
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  nationality: text("nationality").notNull().default("Indian"),
  // Government IDs
  aadhaarNumber: text("aadhaar_number"),
  panNumber: text("pan_number"),
  passportNumber: text("passport_number"),
  passportExpiry: date("passport_expiry"),
  passportCountry: text("passport_country").default("India"),
  voterId: text("voter_id"),
  drivingLicence: text("driving_licence"),
  // Addresses
  permanentAddress: jsonb("permanent_address"),
  currentAddress: jsonb("current_address"),
  sameAddress: boolean("same_address").notNull().default(false),
  // Communication
  personalEmail: text("personal_email"),
  personalPhone: text("personal_phone"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactRelation: text("emergency_contact_relation"),
  emergencyContactPhone: text("emergency_contact_phone"),
  // Payroll / financial
  bankAccountNumber: text("bank_account_number"),
  bankIfsc: text("bank_ifsc"),
  bankName: text("bank_name"),
  bankBranch: text("bank_branch"),
  pfUan: text("pf_uan"),
  esicNumber: text("esic_number"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Document scans and certificates attached to a staff member. */
export const hrDocuments = pgTable("esti_hr_document", {
  id: id(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => teamMembers.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  documentName: text("document_name").notNull(),
  s3Key: text("s3_key"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: createdAt(),
});

/** Job application pipeline — entry point before team member is created. */
export const jobApplications = pgTable("esti_job_application", {
  id: id(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  appliedRole: text("applied_role").notNull(),
  experienceYears: numeric("experience_years", { precision: 4, scale: 1 }),
  currentEmployer: text("current_employer"),
  currentSalaryPaise: bigint("current_salary_paise", { mode: "number" }),
  expectedSalaryPaise: bigint("expected_salary_paise", { mode: "number" }),
  resumeKey: text("resume_key"),
  portfolioUrl: text("portfolio_url"),
  status: text("status").notNull().default("APPLIED"),
  notes: text("notes"),
  handledBy: uuid("handled_by").references(() => users.id),
  memberId: uuid("member_id").references(() => teamMembers.id),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
  statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
