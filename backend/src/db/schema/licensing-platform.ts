// HCW License Manager schema (internalised into AORMS 2026-06-28 from the former
// holagundi-license-panel sibling). Tables are hlp_-prefixed. Kept OUT of the
// schema/index.ts barrel — its `accounts`/`licenses` const names collide with
// ESTI's; the licensing modules import tables from here directly.
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * HCW License Manager schema. Multi-product, multi-org licensing.
 * Tables are prefixed `hlp_`. Ids are app-generated opaque strings (see ids.ts).
 * See docs/esti/HCW-LICENSE-MANAGER.md.
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
    /** Base32 TOTP secret — null = 2FA off; set = an authenticator code is required at login. */
    totpSecret: text("totp_secret"),
    isPlatformAdmin: boolean("is_platform_admin").default(false).notNull(),
    /** Set once the person proves control of their email (verification link). Null = unverified. */
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    /** One-shot email-verification token (hashed) + its expiry. Cleared on success. */
    emailVerifyToken: text("email_verify_token"),
    emailVerifyExpires: timestamp("email_verify_expires", { withTimezone: true }),
    /** ACTIVE | SUSPENDED | DELETED — licence manager controls suspend/delete. */
    status: text("status").notNull().default("ACTIVE"),
    /** Standard signup profile (firm, contact, location, COA/GSTIN). */
    profile: jsonb("profile").$type<Record<string, unknown>>().default({}).notNull(),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
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
    /** Which AORMS workspace this company runs — STUDIO | CONSULTANCY (chosen at creation). */
    workspaceType: text("workspace_type").notNull().default("STUDIO"),
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
    /**
     * Unified account type (U-3b) — STAFF/COMPANY/CLIENT/CONSULTANT/CONTRACTOR,
     * mirroring the linked esti_user row's derived `userType()`. Null until a
     * node syncs it via POST /v1/sync-membership (see AORMS-IDENTITY.md §11).
     * Distinct from `role` above, which is this hub membership's own OWNER/MEMBER
     * admin level, not the firm-side classification.
     */
    accountType: text("account_type"),
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
    code: text("code").notNull(), // AORMS / LXOS / COCO / CAD
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

/**
 * Portable certification earned by a **person** (keyed to `hlp_account.public_id`,
 * the AORMS-U handle). Visible across every company the person joins; the record
 * stays owned by the individual.
 */
export const certifications = pgTable(
  "hlp_certification",
  {
    id: text("id").primaryKey(),
    accountPublicId: text("account_public_id").notNull(),
    title: text("title").notNull(),
    issuer: text("issuer"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    evidenceKey: text("evidence_key"),
    status: text("status").notNull().default("ACTIVE"), // ACTIVE | REVOKED
    createdAt,
  },
  (t) => ({ accountIdx: index("hlp_certification_account_idx").on(t.accountPublicId) }),
);

/** Portable growth / learning signal accruing to a person (ASPRF, LXOS, …). */
export const growthEvents = pgTable(
  "hlp_growth_event",
  {
    id: text("id").primaryKey(),
    accountPublicId: text("account_public_id").notNull(),
    kind: text("kind").notNull(),
    value: jsonb("value").$type<Record<string, unknown>>().default({}).notNull(),
    /** The company (AORMS-C) the signal came from, when relevant. */
    orgPublicId: text("org_public_id"),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ accountIdx: index("hlp_growth_event_account_idx").on(t.accountPublicId) }),
);

/**
 * A self-serve plan request: a person asks for a tier (LITE/CORE/ENTERPRISE); a
 * platform admin fulfils it from the portal (creates the licence + mails the key).
 */
export const planRequests = pgTable(
  "hlp_plan_request",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    orgId: text("org_id").references(() => organizations.id),
    email: text("email").notNull(),
    productCode: text("product_code").notNull().default("AORMS"),
    planCode: text("plan_code").notNull(), // LITE | CORE | ENTERPRISE
    status: text("status").notNull().default("PENDING"), // PENDING | FULFILLED | REJECTED
    note: text("note"),
    licenseId: text("license_id").references(() => licenses.id),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt,
  },
  (t) => ({
    statusIdx: index("hlp_plan_request_status_idx").on(t.status),
    accountIdx: index("hlp_plan_request_account_idx").on(t.accountId),
  }),
);

/** Per-product machine keys for the Product License API (`/v1`). */
export const apiKeys = pgTable(
  "hlp_api_key",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    /**
     * Optional org binding. When set, the key may only act for this organization
     * on the identity endpoints (`/v1/verify-identity`, `/v1/sync-membership`) —
     * it can't read or mutate another customer's membership by asserting a
     * different company/person handle. Null = legacy product-wide key (the
     * activation/validate endpoints scope themselves via the license key anyway).
     */
    orgId: text("org_id").references(() => organizations.id),
    keyHash: text("key_hash").notNull(),
    label: text("label").notNull(),
    status: text("status").notNull().default("ACTIVE"), // ApiKeyStatus
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt,
  },
  (t) => ({ keyHashIdx: uniqueIndex("hlp_api_key_hash_idx").on(t.keyHash) }),
);

/**
 * P7 — metered usage snapshot reported by a product node for one licensed org
 * in one calendar month. The platform-admin dashboard aggregates these rows
 * across tenants; the co-located singleton `esti_orgsettings` remains the
 * fallback when no reports exist yet.
 */
export const usageReports = pgTable(
  "hlp_usage_report",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    /** First calendar day of the reported month (UTC date). */
    periodStart: date("period_start").notNull(),
    storageUsedBytes: bigint("storage_used_bytes", { mode: "number" }).notNull().default(0),
    storageQuotaBytes: bigint("storage_quota_bytes", { mode: "number" }).notNull().default(0),
    storagePurchasedBytes: bigint("storage_purchased_bytes", { mode: "number" })
      .notNull()
      .default(0),
    aiTokensThisMonth: integer("ai_tokens_this_month").notNull().default(0),
    reportedAt: timestamp("reported_at", { withTimezone: true }).defaultNow().notNull(),
    /** P7.2 manual India invoice export — stamped when usage is billed offline. */
    billedAt: timestamp("billed_at", { withTimezone: true }),
    billedBy: text("billed_by"),
    billingNote: text("billing_note"),
  },
  (t) => ({
    orgProductPeriodIdx: uniqueIndex("hlp_usage_report_org_product_period_idx").on(
      t.orgId,
      t.productId,
      t.periodStart,
    ),
    periodIdx: index("hlp_usage_report_period_idx").on(t.periodStart),
  }),
);

/**
 * A published desktop component set for an edition — what the Manager pulls and
 * verifies. The build pipeline publishes a row per (edition, appVersion) with
 * each artifact's URL + SHA-256; `/v1/manifest` serves the latest `active` row
 * for the caller's edition, signed. `components` is a ManifestComponent[].
 */
export const componentReleases = pgTable(
  "hlp_component_release",
  {
    id: text("id").primaryKey(),
    edition: text("edition", { enum: ["LITE", "PRO", "ENTERPRISE"] }).notNull(),
    appVersion: text("app_version").notNull(),
    components: jsonb("components").$type<unknown[]>().notNull().default([]),
    /** The latest active release per edition is the one served; older rows kept for history. */
    active: boolean("active").notNull().default(true),
    createdAt,
  },
  (t) => ({ editionActiveIdx: index("hlp_component_release_edition_active_idx").on(t.edition, t.active) }),
);
