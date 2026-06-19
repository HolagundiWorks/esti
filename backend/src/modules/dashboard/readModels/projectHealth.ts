import { sql } from "drizzle-orm";
import type { DB } from "../../../db/index.js";

/** Per-project health scores for all active projects. */
export async function getProjectHealth(db: DB) {
  const rows = (await db.execute(sql`
    select
      po.id, po.ref, po.title, po.contract_value_paise,
      (select ph2.label from esti_phase ph2 where ph2.id = po.current_phase_id) as current_phase,
      (select count(*)::int from esti_phase pa where pa.project_id = po.id) as total_phases,
      (select count(*)::int from esti_phase pp
        where pp.project_id = po.id
        and pp.sort_order <= coalesce(
          (select cp.sort_order from esti_phase cp where cp.id = po.current_phase_id), -1
        )) as phases_reached,
      (select count(*)::int from esti_phase ph
        where ph.project_id = po.id
        and ph.sort_order <= coalesce(
          (select cp.sort_order from esti_phase cp where cp.id = po.current_phase_id), -1
        )
        and not exists (
          select 1 from esti_invoice i where i.phase_id = ph.id and i.status <> 'CANCELLED'
        )) as unbilled_phases,
      (select count(*)::int from esti_task t
        where t.project_id = po.id
        and t.status <> 'DONE'
        and t.due_date < current_date) as overdue_tasks,
      (select count(*)::int from esti_invoice i
        where i.project_id = po.id
        and i.status = 'ISSUED'
        and i.date_invoice < current_date - 30) as overdue_invoices,
      (select count(*)::int from esti_approval a
        where a.project_id = po.id
        and a.status = 'SENT'
        and a.sent_date < current_date - 14) as stale_approvals,
      (select count(*)::int from esti_approval a
        where a.project_id = po.id
        and a.status = 'REVISIONS') as revisions_open,
      (select count(*)::int from esti_critical_note cn
        where cn.project_id = po.id
        and cn.status = 'OPEN'
        and cn.priority = 'HIGH') as critical_notes_open
    from esti_projectoffice po
    where po.status = 'ACTIVE'
      and po.archived_at is null
    order by po.ref
  `)) as unknown as {
    id: string; ref: string; title: string; contract_value_paise: number;
    current_phase: string | null; total_phases: number; phases_reached: number;
    unbilled_phases: number; overdue_tasks: number; overdue_invoices: number;
    stale_approvals: number; revisions_open: number; critical_notes_open: number;
  }[];

  return rows.map((r) => {
    let health: "GREEN" | "YELLOW" | "RED" = "GREEN";
    const issues = Number(r.overdue_invoices) + Number(r.stale_approvals) + Number(r.critical_notes_open);
    if (Number(r.overdue_invoices) > 0 || Number(r.overdue_tasks) >= 3 || issues >= 3) {
      health = "RED";
    } else if (Number(r.unbilled_phases) > 0 || Number(r.overdue_tasks) > 0 || Number(r.stale_approvals) > 0 || Number(r.revisions_open) > 0 || Number(r.critical_notes_open) > 0) {
      health = "YELLOW";
    }
    const totalPhases = Number(r.total_phases);
    const reached = Number(r.phases_reached);
    return {
      id: r.id,
      ref: r.ref,
      title: r.title,
      contractValuePaise: Number(r.contract_value_paise),
      currentPhase: r.current_phase,
      progressPct: totalPhases > 0 ? Math.round((reached / totalPhases) * 100) : 0,
      health,
      unbilledPhases: Number(r.unbilled_phases),
      overdueTasks: Number(r.overdue_tasks),
      overdueInvoices: Number(r.overdue_invoices),
      staleApprovals: Number(r.stale_approvals),
      revisionsOpen: Number(r.revisions_open),
      criticalNotesOpen: Number(r.critical_notes_open),
    };
  });
}
