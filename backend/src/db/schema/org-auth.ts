import {
  boolean,
  createdAt,
  id,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  updatedAt,
  uuid,
} from "./_helpers.js";

/** Single-row org settings — feature toggles (e.g. the optional HR module). */
export const orgSettings = pgTable("esti_orgsettings", {
  id: id(),
  /** SOLO = one-person practice; STUDIO = multi-person team module. */
  orgMode: text("org_mode").notNull().default("SOLO"),
  hrEnabled: boolean("hr_enabled").notNull().default(false),
  /** Owner-configured alert thresholds — see EscalationSettings in @esti/contracts. */
  escalationSettings: jsonb("escalation_settings")
    .notNull()
    .default({
      staleApprovalDays: 7,
      followUpLeadDays: 0,
      taskOverdueDays: 3,
      digestEnabled: true,
      leaveHorizonDays: 7,
    }),
  // Module-group switches (default on) controlling whole nav areas.
  financialEnabled: boolean("financial_enabled").notNull().default(true),
  projectEnabled: boolean("project_enabled").notNull().default(true),
  adminEnabled: boolean("admin_enabled").notNull().default(true),
  updatedAt: updatedAt(),
});

/** Immutable snapshot when the Team & HR module is archived (studio → solo transition). */
export const hrArchives = pgTable("esti_hr_archive", {
  id: id(),
  createdById: uuid("created_by_id").references(() => users.id),
  reason: text("reason"),
  snapshot: jsonb("snapshot").notNull(),
  tasksRemapped: integer("tasks_remapped").notNull().default(0),
  membersArchived: integer("members_archived").notNull().default(0),
  createdAt: createdAt(),
});

/** Single-row editable firm profile (ADR-12). Solo architect details inline. */
export const firm = pgTable("esti_firm", {
  id: id(),
  companyName: text("company_name")
    .notNull()
    .default("Holagundi Consulting Works"),
  firmType: text("firm_type").notNull().default("SOLO"),
  logoKey: text("logo_key"),
  gstType: text("gst_type").notNull().default("REGULAR"),
  gstin: text("gstin"),
  tdsApplicableDefault: boolean("tds_applicable_default")
    .notNull()
    .default(true),
  architectName: text("architect_name"),
  coaRegNo: text("coa_reg_no"),
  pan: text("pan"),
  email: text("email"),
  phone1Type: text("phone1_type"),
  phone1: text("phone1"),
  phone2Type: text("phone2_type"),
  phone2: text("phone2"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  pincode: text("pincode"),
  district: text("district"),
  state: text("state"),
  updatedAt: updatedAt(),
});

/** Partners in a partnership firm (includes DIN). */
export const partners = pgTable("esti_partner", {
  id: id(),
  name: text("name").notNull(),
  coaRegNo: text("coa_reg_no"),
  pan: text("pan"),
  din: text("din"),
  email: text("email"),
  phone1Type: text("phone1_type"),
  phone1: text("phone1"),
  phone2Type: text("phone2_type"),
  phone2: text("phone2"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  pincode: text("pincode"),
  district: text("district"),
  state: text("state"),
  createdAt: createdAt(),
});

export const users = pgTable("esti_user", {
  id: id(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role", {
    enum: [
      "OWNER",
      "PARTNER",
      "SENIOR",
      "ASSOCIATE",
      "VIEWER",
      "CONSULTANT",
      "CLIENT",
    ],
  })
    .notNull()
    .default("ASSOCIATE"),
  passwordHash: text("password_hash"), // null for magic-link-only client users
  totpSecret: text("totp_secret"),
  disabled: boolean("disabled").notNull().default(false),
  // Portal users (role CLIENT) are scoped to a single client record.
  clientId: uuid("client_id"),
  // Collaborator users (role CONSULTANT + this set) are scoped to a consultant.
  consultantId: uuid("consultant_id"),
  // Per-user dashboard layout (react-grid-layout items); null = default layout.
  dashboardLayout: jsonb("dashboard_layout"),
  // Read-mostly demo accounts: blocked from uploads and credential changes.
  isDemo: boolean("is_demo").notNull().default(false),
  /** Secret token for iCal/Google Calendar workload subscription (rotate to revoke). */
  calendarFeedToken: text("calendar_feed_token"),
  createdAt: createdAt(),
});

export const sessions = pgTable("esti_session", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const clients = pgTable("esti_client", {
  id: id(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["INDIVIDUAL", "COMPANY"] })
    .notNull()
    .default("INDIVIDUAL"),
  gstin: text("gstin"),
  pan: text("pan"),
  state: text("state"),
  city: text("city"),
  email: text("email"),
  phone: text("phone"),
  createdAt: createdAt(),
});

/** Gap-free per-(scope, financial year) sequences. See ARCHITECTURE ADR-06. */
export const sequences = pgTable(
  "esti_sequence",
  {
    id: id(),
    scope: text("scope").notNull(),
    fy: text("fy").notNull(),
    lastValue: integer("last_value").notNull().default(0),
  },
  (t) => ({ uq: uniqueIndex("esti_sequence_scope_fy").on(t.scope, t.fy) }),
);

/** Append-only audit log. See ARCHITECTURE ADR-09. */
export const audit = pgTable("esti_audit", {
  id: id(),
  entity: text("entity").notNull(),
  entityId: uuid("entity_id"),
  action: text("action").notNull(),
  actorId: uuid("actor_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: createdAt(),
});
