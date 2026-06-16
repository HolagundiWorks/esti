import { eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { LANDING_VISITS_KEY, siteMetrics } from "../../db/schema/marketing.js";

function isMissingMetricsTable(err: unknown): boolean {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: string }).code)
      : "";
  return code === "42P01";
}

/** Returns null when the metrics table is not migrated yet (older deployments). */
export async function tryGetLandingVisitCount(db: DB): Promise<number | null> {
  try {
    return await getLandingVisitCount(db);
  } catch (err) {
    if (isMissingMetricsTable(err)) return null;
    throw err;
  }
}

export async function getLandingVisitCount(db: DB): Promise<number> {
  const [row] = await db
    .select({ value: siteMetrics.value })
    .from(siteMetrics)
    .where(eq(siteMetrics.key, LANDING_VISITS_KEY));
  return row?.value ?? 0;
}

export async function incrementLandingVisitCount(db: DB): Promise<number> {
  const [row] = await db
    .select({ value: siteMetrics.value })
    .from(siteMetrics)
    .where(eq(siteMetrics.key, LANDING_VISITS_KEY));

  if (!row) {
    const [inserted] = await db
      .insert(siteMetrics)
      .values({ key: LANDING_VISITS_KEY, value: 1 })
      .returning({ value: siteMetrics.value });
    return inserted?.value ?? 1;
  }

  const [updated] = await db
    .update(siteMetrics)
    .set({ value: row.value + 1 })
    .where(eq(siteMetrics.key, LANDING_VISITS_KEY))
    .returning({ value: siteMetrics.value });
  return updated?.value ?? row.value + 1;
}
