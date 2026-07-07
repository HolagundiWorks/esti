import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Source document kinds accepted by the ingestion pipeline. */
export const eseKinds: readonly string[] = ["DSR", "DAR", "SPEC", "NBC", "BYLAW"];
/** Pipeline stages a source moves through. */
export const eseStatuses: readonly string[] = ["UPLOADED", "CONVERTED", "ANALYZED", "REVIEWED", "PUBLISHED"];
/** Published pack types (mirror the EsePack discriminant in @esti/contracts). */
export const eachPackType: readonly string[] = ["RATE_LIBRARY", "BYLAW_RULES"];

/** KB-team users (the only ESE users). Default admin seeded from env at deploy. */
export const eseUsers = pgTable("ese_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("kbteam"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * An ingestion source — one uploaded PWD workbook / NBC / bylaw document, tracked
 * through the pipeline: UPLOADED → CONVERTED (pdf→md) → ANALYZED (Ollama) →
 * REVIEWED (kb team) → PUBLISHED (pack emitted).
 */
export const eseSources = pgTable("ese_source", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(), // DSR | DAR | SPEC | NBC | BYLAW
  authority: text("authority").notNull(), // CPWD | KAR-PWD | TN-PWD | MH-PWD | AP-PWD | NBC-2016 | …
  year: integer("year").notNull(),
  fileKey: text("file_key").notNull(), // stored PDF/markdown
  status: text("status").notNull().default("UPLOADED"),
  markdown: text("markdown"), // after pdf→md + formatting
  extracted: jsonb("extracted"), // Ollama structured output (pre-review)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A published, immutable pack edition (Rate Library or Bylaw Rules). */
export const esePacks = pgTable("ese_pack", {
  id: uuid("id").primaryKey().defaultRandom(),
  packType: text("pack_type").notNull(), // RATE_LIBRARY | BYLAW_RULES
  edition: text("edition").notNull().unique(), // CPWD-DSR-2023
  checksum: text("checksum").notNull(),
  payload: jsonb("payload").notNull(), // the full EsePack JSON
  publishedById: uuid("published_by_id").references(() => eseUsers.id),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
});
