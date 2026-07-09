import { withinStorage } from "@esti/contracts";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { orgSettings } from "../db/schema.js";
import { getOrgSettings } from "./settings.js";

/**
 * Thrown when a write would push the firm past its plan's object-store cap.
 * The Fastify error handler maps this to HTTP 413. All uploads funnel through
 * `putObject` in storage.ts, so enforcement lives at that single chokepoint.
 */
export class StorageQuotaExceededError extends Error {
  readonly statusCode = 413;
  constructor(message = "Storage limit reached. Delete or archive files, or add more storage to continue uploading.") {
    super(message);
    this.name = "StorageQuotaExceededError";
  }
}

/** Current running total of object-store bytes used by the firm. */
export async function currentStorageUsed(): Promise<number> {
  return (await getOrgSettings(db)).storageBytesUsed ?? 0;
}

/** Throw {@link StorageQuotaExceededError} if storing `incomingBytes` more would exceed the cap. */
export async function assertStorageAvailable(incomingBytes: number): Promise<void> {
  if (incomingBytes <= 0) return;
  const settings = await getOrgSettings(db);
  if (
    !withinStorage(
      settings.plan,
      settings.storageBytesUsed ?? 0,
      incomingBytes,
      settings.storagePurchasedBytes ?? 0,
    )
  ) {
    throw new StorageQuotaExceededError();
  }
}

/** Atomically adjust the usage counter (clamped at 0). Negative for deletes. */
export async function recordStorageDelta(deltaBytes: number): Promise<void> {
  if (!deltaBytes) return;
  await db
    .update(orgSettings)
    .set({ storageBytesUsed: sql`GREATEST(0, ${orgSettings.storageBytesUsed} + ${deltaBytes})` });
}

/** Overwrite the usage counter with an exact figure (used by recompute). */
export async function setStorageUsed(totalBytes: number): Promise<void> {
  await db.update(orgSettings).set({ storageBytesUsed: Math.max(0, totalBytes) });
}
