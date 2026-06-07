import { type FirmProfile, GstSystem } from "@esti/contracts";
import type { DB } from "../db/index.js";
import { firm, partners } from "../db/schema.js";

/** Read the singleton firm row, creating it (with sensible defaults) on first use. */
export async function getFirm(db: DB): Promise<typeof firm.$inferSelect> {
  const [row] = await db.select().from(firm).limit(1);
  if (row) return row;
  const [created] = await db.insert(firm).values({}).returning();
  return created!;
}

/** The firm's active GST system, used as the invoice default (ADR-12). */
export async function firmGstSystem(db: DB): Promise<GstSystem> {
  const f = await getFirm(db);
  return (f.gstType as GstSystem) ?? GstSystem.REGULAR;
}

/**
 * Build the firm block the Python worker stamps on documents from the editable
 * profile (falls back to the first partner's COA for a partnership).
 */
export async function firmPayload(db: DB): Promise<FirmProfile> {
  const f = await getFirm(db);
  let coaRegNo = f.coaRegNo ?? "";
  if (!coaRegNo && f.firmType === "PARTNERSHIP") {
    const [p] = await db.select().from(partners).limit(1);
    coaRegNo = p?.coaRegNo ?? "";
  }
  const cityState = [f.city, f.state, f.pincode].filter(Boolean).join(" ");
  const addressLines = [f.addressLine1, f.addressLine2, cityState].filter(
    (l): l is string => !!l && l.length > 0,
  );
  const phone = [f.phone1, f.phone2].filter(Boolean).join(" · ");
  return {
    legalName: f.companyName,
    tradeName: f.companyName,
    coaRegNo,
    gstin: f.gstin ?? "",
    pan: f.pan ?? "",
    state: f.state ?? "",
    addressLines: addressLines.length ? addressLines : ["—"],
    email: f.email ?? "",
    phone,
  };
}
