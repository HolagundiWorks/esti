import { computeSiteDrawingIntelligence } from "@esti/contracts";
import { sql } from "drizzle-orm";
import type { DB } from "../../db/index.js";

/**
 * Technical Intelligence — site query rate vs issued drawings, repeat queries,
 * and drawing clarity score (Phase 5 Site & Drawing Intelligence).
 */
export async function getTechnicalIntelligence(db: DB) {
  const [agg] = (await db.execute(sql`
    select
      count(*)::int as total,
      count(*) filter (where revision_source = 'INTERNAL_ERROR')::int  as internal_errors,
      count(*) filter (where revision_source = 'TECHNICAL_QUERY')::int as technical_queries
    from esti_decision
  `)) as unknown as [{ total: number; internal_errors: number; technical_queries: number }];

  const [drawRow] = (await db.execute(sql`
    select
      count(*)::int as total,
      count(*) filter (where issue_pdf_status = 'READY' and is_current = true)::int as issued
    from esti_drawing
  `)) as unknown as [{ total: number; issued: number }];

  const queryRows = (await db.execute(sql`
    select linked_object_id, count(*)::int as qcount
    from esti_decision
    where revision_source = 'TECHNICAL_QUERY'
      and linked_object_type = 'drawing'
      and linked_object_id is not null
    group by linked_object_id
  `)) as unknown as { linked_object_id: string; qcount: number }[];

  const queriedDrawings = queryRows.length;
  const repeatQueryDrawings = queryRows.filter((r) => Number(r.qcount) >= 2).length;

  return computeSiteDrawingIntelligence({
    totalDrawings: Number(drawRow?.total ?? 0),
    issuedDrawings: Number(drawRow?.issued ?? 0),
    internalErrors: Number(agg?.internal_errors ?? 0),
    techQueries: Number(agg?.technical_queries ?? 0),
    queriedDrawings,
    repeatQueryDrawings,
    totalDecisions: Number(agg?.total ?? 0),
  });
}
