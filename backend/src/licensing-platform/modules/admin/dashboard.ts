import { DEFAULT_STORAGE_BYTES } from "@esti/contracts";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db, schema } from "../../db/client.js";
import { orgSettings } from "../../../db/schema.js";
import { platformAdminProcedure, router } from "../../trpc/trpc.js";
import { pendingRequestCount } from "../request/service.js";
import { aggregateUsageReports, usagePeriodStart } from "./usageReports.js";
import { upsertUsageReport } from "./upsertUsageReport.js";

const LICENSE_STATUSES = ["ACTIVE", "TRIAL", "SUSPENDED", "REVOKED", "EXPIRED"] as const;

/** License-manager dashboard — KPI overview for the platform-admin console landing page. */
export const dashboardRouter = router({
  overview: platformAdminProcedure.query(async () => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalLicensesRow] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.licenses);
    const [totalOrgsRow] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.organizations);
    const [activeDevicesRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.devices)
      .where(eq(schema.devices.status, "ACTIVE"));
    const [newThisMonthRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.licenses)
      .where(gte(schema.licenses.createdAt, monthStart));
    const [unlicensedOrgsRow] = await db
      .select({ n: sql<number>`count(distinct ${schema.organizations.id})::int` })
      .from(schema.organizations)
      .leftJoin(schema.licenses, eq(schema.licenses.orgId, schema.organizations.id))
      .where(isNull(schema.licenses.id));

    const statusRows = await db
      .select({ status: schema.licenses.status, n: sql<number>`count(*)::int` })
      .from(schema.licenses)
      .groupBy(schema.licenses.status);
    const byStatus = Object.fromEntries(LICENSE_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    for (const r of statusRows) byStatus[r.status] = r.n;

    const byProduct = await db
      .select({ code: schema.products.code, name: schema.products.name, n: sql<number>`count(*)::int` })
      .from(schema.licenses)
      .innerJoin(schema.products, eq(schema.products.id, schema.licenses.productId))
      .groupBy(schema.products.code, schema.products.name)
      .orderBy(desc(sql`count(*)`));

    const expiringSoon = await db
      .select({
        id: schema.licenses.id,
        key: schema.licenses.key,
        status: schema.licenses.status,
        expiresAt: schema.licenses.expiresAt,
        orgName: schema.organizations.name,
        productCode: schema.products.code,
      })
      .from(schema.licenses)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.licenses.orgId))
      .innerJoin(schema.products, eq(schema.products.id, schema.licenses.productId))
      .where(
        and(
          sql`${schema.licenses.status} in ('ACTIVE', 'TRIAL')`,
          gte(schema.licenses.expiresAt, now),
          lte(schema.licenses.expiresAt, in30Days),
        ),
      )
      .orderBy(schema.licenses.expiresAt)
      .limit(10);

    const recentEvents = await db
      .select({
        id: schema.licenseEvents.id,
        type: schema.licenseEvents.type,
        actor: schema.licenseEvents.actor,
        at: schema.licenseEvents.at,
        licenseKey: schema.licenses.key,
        orgName: schema.organizations.name,
      })
      .from(schema.licenseEvents)
      .innerJoin(schema.licenses, eq(schema.licenses.id, schema.licenseEvents.licenseId))
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.licenses.orgId))
      .orderBy(desc(schema.licenseEvents.at))
      .limit(10);

    return {
      totalLicenses: totalLicensesRow?.n ?? 0,
      totalOrgs: totalOrgsRow?.n ?? 0,
      activeDevices: activeDevicesRow?.n ?? 0,
      newThisMonth: newThisMonthRow?.n ?? 0,
      unlicensedOrgs: unlicensedOrgsRow?.n ?? 0,
      pendingRequests: await pendingRequestCount(),
      byStatus,
      byProduct,
      expiringSoon,
      recentEvents,
    };
  }),

  /**
   * P7.1+ — metered usage for the platform-admin dashboard.
   *
   * Prefers aggregated `hlp_usage_report` rows for the current UTC month
   * (multi-tenant). Falls back to the co-located `esti_orgsettings` singleton
   * when no nodes have reported yet, and self-reports that singleton into
   * `hlp_usage_report` when a matching ACTIVE license exists on this install.
   */
  usage: platformAdminProcedure.query(async () => {
    const periodStart = usagePeriodStart();
    const reportRows = await db
      .select({
        orgId: schema.usageReports.orgId,
        orgName: schema.organizations.name,
        productCode: schema.products.code,
        periodStart: schema.usageReports.periodStart,
        storageUsedBytes: schema.usageReports.storageUsedBytes,
        storageQuotaBytes: schema.usageReports.storageQuotaBytes,
        storagePurchasedBytes: schema.usageReports.storagePurchasedBytes,
        aiTokensThisMonth: schema.usageReports.aiTokensThisMonth,
        reportedAt: schema.usageReports.reportedAt,
      })
      .from(schema.usageReports)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.usageReports.orgId))
      .innerJoin(schema.products, eq(schema.products.id, schema.usageReports.productId))
      .where(eq(schema.usageReports.periodStart, periodStart));

    const [local] = await db
      .select({
        storageBytesUsed: orgSettings.storageBytesUsed,
        storagePurchasedBytes: orgSettings.storagePurchasedBytes,
        aiTokensThisMonth: orgSettings.aiTokensThisMonth,
        aiTokensMonthStart: orgSettings.aiTokensMonthStart,
        licenceStatus: orgSettings.licenceStatus,
      })
      .from(orgSettings)
      .limit(1);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const localTokens =
      local?.aiTokensMonthStart && local.aiTokensMonthStart >= monthStart
        ? local.aiTokensThisMonth
        : 0;
    const localPurchased = Math.max(0, local?.storagePurchasedBytes ?? 0);
    const localUsage = local
      ? {
          storageUsedBytes: local.storageBytesUsed,
          storageQuotaBytes: DEFAULT_STORAGE_BYTES + localPurchased,
          storagePurchasedBytes: localPurchased,
          aiTokensThisMonth: localTokens,
          aiTokensMonthStart: local.aiTokensMonthStart,
          licenceStatus: local.licenceStatus,
        }
      : null;

    // Self-report this install when we have a local counter and an ACTIVE license
    // for a product on some org — keeps the table warm on single-box hubs.
    if (localUsage && reportRows.length === 0) {
      const [lic] = await db
        .select({
          orgId: schema.licenses.orgId,
          productId: schema.licenses.productId,
        })
        .from(schema.licenses)
        .where(sql`${schema.licenses.status} in ('ACTIVE', 'TRIAL')`)
        .limit(1);
      if (lic) {
        await upsertUsageReport({
          orgId: lic.orgId,
          productId: lic.productId,
          periodStart,
          storageUsedBytes: localUsage.storageUsedBytes,
          storageQuotaBytes: localUsage.storageQuotaBytes,
          storagePurchasedBytes: localUsage.storagePurchasedBytes,
          aiTokensThisMonth: localUsage.aiTokensThisMonth,
        });
        // Re-read so the response includes the just-written row.
        const refreshed = await db
          .select({
            orgId: schema.usageReports.orgId,
            orgName: schema.organizations.name,
            productCode: schema.products.code,
            periodStart: schema.usageReports.periodStart,
            storageUsedBytes: schema.usageReports.storageUsedBytes,
            storageQuotaBytes: schema.usageReports.storageQuotaBytes,
            storagePurchasedBytes: schema.usageReports.storagePurchasedBytes,
            aiTokensThisMonth: schema.usageReports.aiTokensThisMonth,
            reportedAt: schema.usageReports.reportedAt,
          })
          .from(schema.usageReports)
          .innerJoin(schema.organizations, eq(schema.organizations.id, schema.usageReports.orgId))
          .innerJoin(schema.products, eq(schema.products.id, schema.usageReports.productId))
          .where(eq(schema.usageReports.periodStart, periodStart));
        if (refreshed.length > 0) {
          const agg = aggregateUsageReports(refreshed);
          return {
            source: "reports" as const,
            periodStart,
            storageUsedBytes: agg.storageUsedBytes,
            storageQuotaBytes: agg.storageQuotaBytes,
            storagePurchasedBytes: agg.storagePurchasedBytes,
            aiTokensThisMonth: agg.aiTokensThisMonth,
            aiTokensMonthStart: localUsage.aiTokensMonthStart,
            licenceStatus: localUsage.licenceStatus,
            reportedOrgCount: agg.reportedOrgCount,
            reports: agg.reports,
            local: localUsage,
          };
        }
      }
    }

    if (reportRows.length > 0) {
      const agg = aggregateUsageReports(reportRows);
      return {
        source: "reports" as const,
        periodStart,
        storageUsedBytes: agg.storageUsedBytes,
        storageQuotaBytes: agg.storageQuotaBytes,
        storagePurchasedBytes: agg.storagePurchasedBytes,
        aiTokensThisMonth: agg.aiTokensThisMonth,
        aiTokensMonthStart: localUsage?.aiTokensMonthStart ?? null,
        licenceStatus: localUsage?.licenceStatus ?? null,
        reportedOrgCount: agg.reportedOrgCount,
        reports: agg.reports,
        local: localUsage,
      };
    }

    if (!localUsage) return null;
    return {
      source: "local" as const,
      periodStart,
      storageUsedBytes: localUsage.storageUsedBytes,
      storageQuotaBytes: localUsage.storageQuotaBytes,
      storagePurchasedBytes: localUsage.storagePurchasedBytes,
      aiTokensThisMonth: localUsage.aiTokensThisMonth,
      aiTokensMonthStart: localUsage.aiTokensMonthStart,
      licenceStatus: localUsage.licenceStatus,
      reportedOrgCount: 0,
      reports: [] as ReturnType<typeof aggregateUsageReports>["reports"],
      local: localUsage,
    };
  }),
});
