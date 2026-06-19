import { sql } from "drizzle-orm";
import type { DB } from "../../../db/index.js";

/** Per-client intelligence signals: approval lag, revision frequency, payment age. */
export async function getClientIntelligence(db: DB) {
  const rows = (await db.execute(sql`
    select
      c.id, c.name,
      count(distinct po.id)::int as active_projects,
      -- Outstanding invoice age (oldest ISSUED invoice in days)
      coalesce(max(case when inv.status = 'ISSUED' then (current_date - inv.date_invoice)::int else 0 end), 0) as oldest_invoice_days,
      coalesce(sum(case when inv.status = 'ISSUED' then inv.net_receivable_paise else 0 end), 0)::bigint as outstanding_paise,
      -- Average approval response time (SENT→APPROVED/REJECTED)
      coalesce(avg(case when a.status in ('APPROVED', 'REJECTED') and a.sent_date is not null and a.response_date is not null
        then (a.response_date::date - a.sent_date::date)::int else null end)::numeric, 0)::int as avg_approval_days,
      -- Revision requests count (REVISIONS status)
      count(case when a.status = 'REVISIONS' then 1 end)::int as revision_requests
    from esti_client c
    join esti_projectoffice po on po.client_id = c.id and po.status = 'ACTIVE' and po.archived_at is null
    left join esti_invoice inv on inv.project_id = po.id
    left join esti_approval a on a.project_id = po.id
    group by c.id, c.name
    having count(distinct po.id) > 0
    order by oldest_invoice_days desc, c.name
    limit 20
  `)) as unknown as {
    id: string; name: string; active_projects: number;
    oldest_invoice_days: number; outstanding_paise: number;
    avg_approval_days: number; revision_requests: number;
  }[];

  return rows.map((r) => {
    let risk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    const oldestDays = Number(r.oldest_invoice_days);
    const revisions = Number(r.revision_requests);
    const approvalDays = Number(r.avg_approval_days);
    if (oldestDays > 60 || revisions >= 4 || approvalDays > 21) risk = "HIGH";
    else if (oldestDays > 30 || revisions >= 2 || approvalDays > 10) risk = "MEDIUM";
    return {
      id: r.id,
      name: r.name,
      activeProjects: Number(r.active_projects),
      oldestInvoiceDays: oldestDays,
      outstandingPaise: Number(r.outstanding_paise),
      avgApprovalDays: approvalDays,
      revisionRequests: revisions,
      risk,
    };
  });
}
