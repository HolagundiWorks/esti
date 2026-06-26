import { z } from "zod";

/**
 * Hybrid sync (Phase B, B-SYNC). A **node** publishes finalized records outward to
 * the **hub**, which stores them per-firm so the external portals can serve them.
 * Transport is a transactional outbox on the node + an authenticated ingest on the hub.
 */

/** Publishable entity kinds (each keyed by its existing "finalized" status). */
export const SyncEntity = z.enum([
  "drawing", // status READY
  "transmittal", // dateIssued set
  "invoice", // ISSUED / PAID
  "approval", // != DRAFT
  "tender", // AWARDED
  "runningBill", // approved-measurement-sent onward
  "inspection", // ISSUED
  "siteVisit", // CONFIRMED
  "siteReference", // frozen feasibility + programme snapshot
]);
export type SyncEntity = z.infer<typeof SyncEntity>;

export const SyncOp = z.enum(["UPSERT", "DELETE"]);
export type SyncOp = z.infer<typeof SyncOp>;

export const SyncState = z.enum(["PENDING", "SYNCED", "FAILED"]);
export type SyncState = z.infer<typeof SyncState>;

/** The body a node POSTs to the hub `/api/sync/ingest` for one record. */
export const SyncIngestBody = z.object({
  entity: SyncEntity,
  entityId: z.string().min(1),
  op: SyncOp.default("UPSERT"),
  payload: z.record(z.unknown()).default({}),
  fileKeys: z.array(z.string()).default([]),
});
export type SyncIngestBody = z.infer<typeof SyncIngestBody>;

/** Outbox counts surfaced to the office UI. */
export const SyncStatusView = z.object({
  pending: z.number().int(),
  synced: z.number().int(),
  failed: z.number().int(),
  hubConfigured: z.boolean(),
});
export type SyncStatusView = z.infer<typeof SyncStatusView>;
