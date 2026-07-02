import {
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

/**
 * Licensing authority (Phase B) — lives on the **hub** (`ESTI_ROLE=hub`). Each
 * row is one customer-facing activation key mapping to a plan + seat
 * entitlements. The vendor provisions rows when a firm buys a plan; nodes
 * activate against them. (On a `node` install these tables exist but stay empty.)
 */
export const licenses = pgTable("esti_license", {
  id: id(),
  /** The customer-facing activation key the firm enters (e.g. ESTI-XXXX-…). Unique. */
  key: text("key").notNull().unique(),
  /** Hub-assigned canonical firm id carried in the signed token (sync scoping). */
  firmId: uuid("firm_id").notNull().defaultRandom(),
  plan: text("plan", { enum: ["LITE", "CORE", "ENTERPRISE", "PRO"] }).notNull(),
  /** Optional seat overrides (LicenseSeats); `{}` = use plan defaults. */
  seats: jsonb("seats").notNull().default({}),
  status: text("status", { enum: ["ACTIVE", "SUSPENDED", "REVOKED"] })
    .notNull()
    .default("ACTIVE"),
  /** How many distinct installs may activate this key. */
  maxInstalls: integer("max_installs").notNull().default(1),
  /** Hard expiry of the entitlement; null = no expiry. */
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** One bound install per (license, installId); holds the hashed sync bearer. */
export const licenseInstalls = pgTable(
  "esti_license_install",
  {
    id: id(),
    licenseId: uuid("license_id")
      .notNull()
      .references(() => licenses.id, { onDelete: "cascade" }),
    installId: text("install_id").notNull(),
    /** sha256 of the issued sync token (the raw token lives only on the node). */
    syncTokenHash: text("sync_token_hash").notNull(),
    fingerprint: text("fingerprint"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => ({
    uniq: uniqueIndex("esti_license_install_uniq").on(t.licenseId, t.installId),
  }),
);
