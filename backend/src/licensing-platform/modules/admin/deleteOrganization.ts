import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../../db/client.js";

/** Permanently remove a company/workspace from the licensing platform. */
export async function deleteOrganization(orgId: string, _actor: string): Promise<void> {
  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .limit(1);
  if (!org) throw new Error("not_found");

  const licenses = await db
    .select({ id: schema.licenses.id })
    .from(schema.licenses)
    .where(eq(schema.licenses.orgId, orgId));
  const licenseIds = licenses.map((l) => l.id);

  if (licenseIds.length) {
    await db.delete(schema.devices).where(inArray(schema.devices.licenseId, licenseIds));
    await db.delete(schema.licenseSeats).where(inArray(schema.licenseSeats.licenseId, licenseIds));
    await db.delete(schema.licenseEvents).where(inArray(schema.licenseEvents.licenseId, licenseIds));
    await db.delete(schema.licenses).where(eq(schema.licenses.orgId, orgId));
  }

  await db
    .update(schema.apiKeys)
    .set({ status: "REVOKED" })
    .where(eq(schema.apiKeys.orgId, orgId));
  await db
    .update(schema.planRequests)
    .set({ orgId: null })
    .where(eq(schema.planRequests.orgId, orgId));
  await db.delete(schema.orgMembers).where(eq(schema.orgMembers.orgId, orgId));
  await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId));
}
