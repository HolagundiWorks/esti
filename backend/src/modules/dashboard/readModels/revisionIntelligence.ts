import { sql } from "drizzle-orm";
import type { DB } from "../../../db/index.js";

/**
 * Revision Intelligence — firm-wide breakdown of design decisions by source.
 * Drives the Revision Intelligence dashboard tile and revision risk band.
 */
export async function getRevisionIntelligence(db: DB) {
  const [agg] = (await db.execute(sql`
    select
      count(*)::int as total,
      count(*) filter (where revision_source = 'CLIENT_DRIVEN')::int   as client_driven,
      count(*) filter (where revision_source = 'INTERNAL_ERROR')::int  as internal_error,
      count(*) filter (where revision_source = 'TECHNICAL_QUERY')::int as technical_query,
      count(*) filter (where revision_source = 'SCOPE_CHANGE')::int    as scope_change,
      count(*) filter (where revision_category = 'CRITICAL' and state not in ('LOCKED','REJECTED'))::int as open_critical,
      count(*) filter (where revision_category = 'MAJOR'    and state not in ('LOCKED','REJECTED'))::int as open_major
    from esti_decision
  `)) as unknown as [{
    total: number; client_driven: number; internal_error: number;
    technical_query: number; scope_change: number;
    open_critical: number; open_major: number;
  }];

  const total         = Number(agg?.total ?? 0);
  const clientDriven  = Number(agg?.client_driven ?? 0);
  const internalError = Number(agg?.internal_error ?? 0);
  const technicalQuery= Number(agg?.technical_query ?? 0);
  const scopeChange   = Number(agg?.scope_change ?? 0);
  const openCritical  = Number(agg?.open_critical ?? 0);
  const openMajor     = Number(agg?.open_major ?? 0);

  const scopeDriftPct = total > 0 ? Math.round((scopeChange / total) * 100) : 0;
  const healthScore   = total > 0
    ? Math.max(0, Math.round(100 - ((openCritical * 2 + openMajor) / total) * 50))
    : 100;
  const revisionRiskBand: "LOW" | "MEDIUM" | "HIGH" =
    healthScore >= 80 ? "LOW" : healthScore >= 55 ? "MEDIUM" : "HIGH";

  return {
    totalDecisions: total,
    clientDriven,
    internalError,
    technicalQuery,
    scopeChange,
    scopeDriftPct,
    healthScore,
    revisionRiskBand,
  };
}
