/**
 * P7 — upsert a monthly usage snapshot for a licensed org+product.
 */
import { and, eq } from "drizzle-orm";
import { db, schema } from "../../db/client.js";
import { newId } from "../../lib/ids.js";
import { usagePeriodStart } from "./usageReports.js";

export type UpsertUsageReportInput = {
  orgId: string;
  productId: string;
  periodStart?: string;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  storagePurchasedBytes: number;
  aiTokensThisMonth: number;
};

export async function upsertUsageReport(input: UpsertUsageReportInput) {
  const periodStart = input.periodStart ?? usagePeriodStart();
  const [existing] = await db
    .select({ id: schema.usageReports.id })
    .from(schema.usageReports)
    .where(
      and(
        eq(schema.usageReports.orgId, input.orgId),
        eq(schema.usageReports.productId, input.productId),
        eq(schema.usageReports.periodStart, periodStart),
      ),
    )
    .limit(1);

  const values = {
    storageUsedBytes: input.storageUsedBytes,
    storageQuotaBytes: input.storageQuotaBytes,
    storagePurchasedBytes: input.storagePurchasedBytes,
    aiTokensThisMonth: input.aiTokensThisMonth,
    reportedAt: new Date(),
  };

  if (existing) {
    const [row] = await db
      .update(schema.usageReports)
      .set(values)
      .where(eq(schema.usageReports.id, existing.id))
      .returning();
    return row!;
  }

  const [row] = await db
    .insert(schema.usageReports)
    .values({
      id: newId("usg"),
      orgId: input.orgId,
      productId: input.productId,
      periodStart,
      ...values,
    })
    .returning();
  return row!;
}
