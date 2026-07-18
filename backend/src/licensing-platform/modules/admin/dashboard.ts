import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db, schema } from "../../db/client.js";
import { platformAdminProcedure, router } from "../../trpc/trpc.js";
import { pendingRequestCount } from "../request/service.js";

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
});
