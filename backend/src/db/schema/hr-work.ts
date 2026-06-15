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
  createdById: uuid("created_by_id"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
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
