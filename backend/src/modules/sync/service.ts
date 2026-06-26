import { createHash } from "node:crypto";
import { type SyncEntity, type SyncIngestBody } from "@esti/contracts";
import { and, desc, eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { licenseInstalls, licenses, syncRecords } from "../../db/schema.js";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** Resolve a node's raw sync bearer to the hub-assigned firm id, or null. */
export async function firmFromSyncToken(db: DB, bearer: string | undefined): Promise<string | null> {
  if (!bearer) return null;
  const [row] = await db
    .select({ firmId: licenses.firmId })
    .from(licenseInstalls)
    .innerJoin(licenses, eq(licenses.id, licenseInstalls.licenseId))
    .where(eq(licenseInstalls.syncTokenHash, sha256(bearer)))
    .limit(1);
  return row?.firmId ?? null;
}

/** Upsert (or delete) a published record into the per-firm hub store. Returns the remote id. */
export async function ingestRecord(db: DB, firmId: string, body: SyncIngestBody): Promise<string> {
  const where = and(
    eq(syncRecords.firmId, firmId),
    eq(syncRecords.entity, body.entity),
    eq(syncRecords.entityId, body.entityId),
  );

  if (body.op === "DELETE") {
    await db.delete(syncRecords).where(where);
    return "";
  }

  const [existing] = await db.select({ id: syncRecords.id }).from(syncRecords).where(where).limit(1);
  if (existing) {
    await db
      .update(syncRecords)
      .set({ payload: body.payload, fileKeys: body.fileKeys, updatedAt: new Date() })
      .where(eq(syncRecords.id, existing.id));
    return existing.id;
  }
  const [created] = await db
    .insert(syncRecords)
    .values({
      firmId,
      entity: body.entity,
      entityId: body.entityId,
      payload: body.payload,
      fileKeys: body.fileKeys,
    })
    .returning({ id: syncRecords.id });
  return created!.id;
}

/**
 * Read published records for one firm (the seam the hub portals filter on). On a
 * `node` install `firmId` is a constant so behaviour matches today; on the hub it
 * isolates each firm's published data. Portals further filter `payload` by
 * clientId/consultantId/contractorId.
 */
export async function publishedForFirm(db: DB, firmId: string, entity?: SyncEntity) {
  const where = entity
    ? and(eq(syncRecords.firmId, firmId), eq(syncRecords.entity, entity))
    : eq(syncRecords.firmId, firmId);
  return db.select().from(syncRecords).where(where).orderBy(desc(syncRecords.updatedAt));
}
