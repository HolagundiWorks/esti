// Holagundi licensing platform schema (merged into AORMS 2026-06-28). Tables are
// hlp_-prefixed. Kept OUT of the schema/index.ts barrel — its `accounts`/`licenses`
// const names collide with ESTI's; the licensing modules import tables from here directly.
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Holagundi License Panel schema. Multi-product, multi-org licensing.
 * Tables are prefixed `hlp_`. Ids are app-generated opaque strings (see ids.ts).
 */

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/** A person (signs in with Google). Platform admins run the panel. */
export const accounts = pgTable(
  "hlp_account",
  {
    id: text("id").primaryKey(),
    /** Portable personal identity — AORMS-U-XXXX. Never changes; certs/growth key to it. */
    publicId: text("public_id"),
    googleSub: text("google_sub"),
    email: text("email").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    passwordHash: text("password_hash"),
    isPlatformAdmin: boolean("is_platform_admin").default(false).notNull(),
    createdAt,
    updatedAt,
  },
  (t) => ({
    emailIdx: uniqueIndex("hlp_account_email_idx").on(t.email),
    googleSubIdx: uniqueIndex("hlp_account_google_sub_idx").on(t.googleSub),
    publicIdIdx: uniqueIndex("hlp_account_public_id_idx").on(t.publicId),
  }),
);

/** A customer organization that holds product licenses. */
export const organizations = pgTable(
  "hlp_organization",
  {
    id: text("id").primaryKey(),
    /** Company handle — AORMS-C-XXXX. Stable, human-quotable; used for Step-1 login resolution. */
    publicId: text("public_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    /** Optional company login domain (e.g. acme.in) — Step-1 tenant resolution. Unique when set. */
    loginDomain: text("login_domain"),
    /** Optional alternate Step-1 handle (a company contact email). */
    loginEmail: text("login_email"),
    billingEmail: text("billing_email"),
    ownerAccountId: text("owner_account_id").references(() => accounts.id),
    createdAt,
    updatedAt,
  },
  (t) => ({
    slugIdx: uniqueIndex("hlp_organization_slug_idx").on(t.slug),
    publicIdIdx: uniqueIndex("hlp_organization_public_id_idx").on(t.publicId),
    loginDomainIdx: uniqueIndex("hlp_organization_login_domain_idx").on(t.loginDomain),
  }),
);

/** Account ↔ organization membership + role. */
export const orgMembers = pgTable(
  "hlp_org_member",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    role: text("role").notNull(), // OrgRole
    /** Activation lifecycle: INVITED → ACTIVE → LEFT. Only ACTIVE may sign in. */
    status: text("status").notNull().default("ACTIVE"),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    leftAt: timestamp("left_at", { withTimezone: true }),
    createdAt,
  },
  (t) => ({ memberIdx: uniqueIndex("hlp_org_member_idx").on(t.orgId, t.accountId) }),
);

/** A product: an installable app or a metered API. */
export const products = pgTable(
  "hlp_product",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(), // AORMS / LEOS / COCO / CAD
    name: text("name").notNull(),
    kind: text("kind").notNull(), // ProductKind APP|API
    createdAt,
  },
  (t) => ({ codeIdx: uniqueIndex("hlp_product_code_idx").on(t.code) }),
);

/** A plan/tier within a product. Limits are `null` = unlimited. */
export const plans = pgTable(
  "hlp_plan",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    code: text("code").notNull(), // LITE / CORE / ENTERPRISE / FOUNDATION / ...
    name: text("name").notNull(),
    seats: integer("seats"),
    deviceLimit: integer("device_limit"),
    meterLimit: integer("meter_limit"),
    meterUnit: text("meter_unit").notNull().default("seats"), // MeterUnit
    featureCodes: jsonb("feature_codes").$type<string[]>().default([]).notNull(),
    createdAt,
  },
  (t) => ({ planIdx: uniqueIndex("hlp_plan_idx").on(t.productId, t.code) }),
);

/** An organization's entitlement to a product on a plan. */
export const licenses = pgTable(
  "hlp_license",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id),
    key: text("key").notNull(), // customer-facing license key
    status: text("status").notNull().default("ACTIVE"), // LicenseStatus
    seats: integer("seats"),
    deviceLimit: integer("device_limit"),
    meterLimit: integer("meter_limit"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt,
    updatedAt,
  },
  (t) => ({ keyIdx: uniqueIndex("hlp_license_key_idx").on(t.key) }),
);

/** Seat assignments against a license (by account or pending email). */
export const licenseSeats = pgTable("hlp_license_seat", {
  id: text("id").primaryKey(),
  licenseId: text("license_id")
    .notNull()
    .references(() => licenses.id),
  accountId: text("account_id").references(() => accounts.id),
  email: text("email"),
  role: text("role"),
  createdAt,
});

/** A device activated against a license. */
export const devices = pgTable(
  "hlp_device",
  {
    id: text("id").primaryKey(),
    licenseId: text("license_id")
      .notNull()
      .references(() => licenses.id),
    deviceId: text("device_id").notNull(), // product-supplied stable id
    fingerprint: text("fingerprint"),
    name: text("name"),
    status: text("status").notNull().default("ACTIVE"), // DeviceStatus
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    syncTokenHash: text("sync_token_hash"),
    createdAt,
  },
  (t) => ({ deviceIdx: uniqueIndex("hlp_device_idx").on(t.licenseId, t.deviceId) }),
);

/** Per-license feature override (on top of the plan's feature set). */
export const featureFlags = pgTable(
  "hlp_feature_flag",
  {
    id: text("id").primaryKey(),
    licenseId: text("license_id")
      .notNull()
      .references(() => licenses.id),
    featureCode: text("feature_code").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt,
  },
  (t) => ({ flagIdx: uniqueIndex("hlp_feature_flag_idx").on(t.licenseId, t.featureCode) }),
);

/** Immutable license-event audit trail. */
export const licenseEvents = pgTable("hlp_license_event", {
  id: text("id").primaryKey(),
  licenseId: text("license_id")
    .notNull()
    .references(() => licenses.id),
  type: text("type").notNull(), // LicenseEventType
  actor: text("actor"), // account email or product code
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
});

/** Per-product machine keys for the Product License API (`/v1`). */
export const apiKeys = pgTable(
  "hlp_api_key",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    keyHash: text("key_hash").notNull(),
    label: text("label").notNull(),
    status: text("status").notNull().default("ACTIVE"), // ApiKeyStatus
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt,
  },
  (t) => ({ keyHashIdx: uniqueIndex("hlp_api_key_hash_idx").on(t.keyHash) }),
);
