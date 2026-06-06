/**
 * ESTI AORMS schema (PostgreSQL). Single firm, single tenant — no tenant column.
 * Money columns are bigint paise. See docs/esti/ARCHITECTURE.md.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`);

export const users = pgTable("esti_user", {
  id: id(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ["OWNER", "CONSULTANT", "CLIENT"] }).notNull().default("CONSULTANT"),
  passwordHash: text("password_hash"), // null for magic-link-only client users
  totpSecret: text("totp_secret"),
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
  kind: text("kind", { enum: ["INDIVIDUAL", "COMPANY"] }).notNull().default("INDIVIDUAL"),
  gstin: text("gstin"),
  pan: text("pan"),
  state: text("state"),
  city: text("city"),
  email: text("email"),
  phone: text("phone"),
  createdAt: createdAt(),
});

export const projectOffices = pgTable("esti_projectoffice", {
  id: id(),
  ref: text("ref").notNull().unique(),
  title: text("title").notNull(),
  projectType: text("project_type").notNull(),
  jurisdiction: text("jurisdiction").notNull().default("OTHER"),
  status: text("status").notNull().default("ENQUIRY"),
  clientId: uuid("client_id").references(() => clients.id),
  state: text("state"),
  district: text("district"),
  city: text("city"),
  pin: text("pin"),
  contractValuePaise: bigint("contract_value_paise", { mode: "number" }).notNull().default(0),
  dateStart: date("date_start"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const phases = pgTable("esti_phase", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectOffices.id),
  code: text("code").notNull(),
  label: text("label").notNull(),
  billingPct: integer("billing_pct").notNull().default(0),
  status: text("status").notNull().default("NOT_STARTED"),
  datePlanned: date("date_planned"),
  dateActual: date("date_actual"),
  sortOrder: integer("sort_order").notNull().default(0),
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

export type ProjectOfficeRow = typeof projectOffices.$inferSelect;
