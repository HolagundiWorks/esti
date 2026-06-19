import { sql } from "drizzle-orm";
import type { DB } from "../../../db/index.js";

/** Financial health: revenue pipeline, ready-to-bill estimate, collections. */
export async function getFinancialHealth(db: DB) {
  // Indian FY starts April 1.
  const now = new Date();
  const fyYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  const fyStart = `${fyYear}-04-01`;

  const [pipeline] = (await db.execute(sql`
    select
      coalesce(sum(contract_value_paise), 0)::bigint             as total_paise,
      coalesce(sum(case when status = 'ACTIVE'   then contract_value_paise else 0 end), 0)::bigint as active_paise,
      coalesce(sum(case when status = 'PROPOSAL' then contract_value_paise else 0 end), 0)::bigint as proposal_paise
    from esti_projectoffice
    where archived_at is null
      and status in ('ACTIVE', 'PROPOSAL')
  `)) as unknown as [{
    total_paise: number; active_paise: number; proposal_paise: number;
  }];

  const [readyToBill] = (await db.execute(sql`
    select coalesce(sum(ph.billing_pct * po.contract_value_paise / 100), 0)::bigint as ready_paise
    from esti_phase ph
    join esti_projectoffice po on ph.project_id = po.id
    where po.status = 'ACTIVE'
      and po.archived_at is null
      and ph.sort_order <= coalesce(
        (select cp.sort_order from esti_phase cp where cp.id = po.current_phase_id), -1
      )
      and not exists (
        select 1 from esti_invoice i
        where i.phase_id = ph.id and i.status <> 'CANCELLED'
      )
  `)) as unknown as [{ ready_paise: number }];

  const [inv] = (await db.execute(sql`
    select
      coalesce(sum(case when status = 'ISSUED' then net_receivable_paise else 0 end), 0)::bigint                                                      as outstanding_paise,
      coalesce(sum(case when status = 'ISSUED' and date_invoice < current_date - 30 then net_receivable_paise else 0 end), 0)::bigint                  as overdue30_paise,
      coalesce(sum(case when status = 'PAID' and date_invoice >= ${fyStart} then net_receivable_paise else 0 end), 0)::bigint                          as collected_fy_paise,
      coalesce(sum(case when status not in ('DRAFT','CANCELLED') then grand_total_paise else 0 end), 0)::bigint                                        as invoiced_total_paise
    from esti_invoice
  `)) as unknown as [{
    outstanding_paise: number; overdue30_paise: number;
    collected_fy_paise: number; invoiced_total_paise: number;
  }];

  return {
    pipelinePaise: Number(pipeline?.total_paise ?? 0),
    activePipelinePaise: Number(pipeline?.active_paise ?? 0),
    proposalPipelinePaise: Number(pipeline?.proposal_paise ?? 0),
    readyToBillPaise: Number(readyToBill?.ready_paise ?? 0),
    outstandingPaise: Number(inv?.outstanding_paise ?? 0),
    overdue30dPaise: Number(inv?.overdue30_paise ?? 0),
    collectedFyPaise: Number(inv?.collected_fy_paise ?? 0),
    invoicedTotalPaise: Number(inv?.invoiced_total_paise ?? 0),
    fyStart,
  };
}
