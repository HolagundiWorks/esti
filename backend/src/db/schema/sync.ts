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
 * Hybrid sync (Phase B, B-SYNC).
 *
 * `esti_sync_outbox` (node) — a transactional outbox: finalize/issue mutations
 * enqueue a record here; a drainer pushes each to the hub and marks it SYNCED.
 *
 * `esti_sync_record` (hub) — the per-firm store of published records the external
 * portals are served from. Keyed by (firm_id, entity, entity_id).
 */
export const syncOutbox = pgTable("esti_sync_outbox", {
  id: id(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  op: text("op").notNull().default("UPSERT"),
  payload: jsonb("payload").notNull().default({}),
  fileKeys: jsonb("file_keys").notNull().default([]),
  state: text("state").notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  remoteId: text("remote_id"),
  createdAt: createdAt(),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
});

export const syncRecords = pgTable(
  "esti_sync_record",
  {
    id: id(),
    firmId: uuid("firm_id").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    payload: jsonb("payload").notNull().default({}),
    fileKeys: jsonb("file_keys").notNull().default([]),
    updatedAt: updatedAt(),
    createdAt: createdAt(),
  },
  (t) => ({
    uniq: uniqueIndex("esti_sync_record_uniq").on(t.firmId, t.entity, t.entityId),
  }),
);
