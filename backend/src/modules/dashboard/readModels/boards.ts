import { and, count, eq, isNull, sql } from "drizzle-orm";
import type { DB } from "../../../db/index.js";
import {
  contractorSubmissions,
  invoices,
  leaves,
  projectOffices,
  tasks,
  tenders,
} from "../../../db/schema.js";
import { getOrgSettings } from "../../../lib/settings.js";

/** Aggregations for the dashboard board widgets. */
export async function getDashboardBoards(db: DB) {
  const today = new Date().toISOString().slice(0, 10);
  const settings = await getOrgSettings(db);
  const hrEnabled = settings.hrEnabled;

  const byType = await db
    .select({ type: projectOffices.projectType, n: count() })
    .from(projectOffices)
    .where(isNull(projectOffices.archivedAt))
    .groupBy(projectOffices.projectType);

  // Distribution by current stage across all active projects.
  const phaseRows = (await db.execute(sql`
    select ph.code, ph.label, count(*)::int as n
    from esti_phase ph
    join esti_projectoffice po on ph.id = po.current_phase_id
    where po.status = 'ACTIVE' and po.archived_at is null
    group by ph.code, ph.label
    order by min(ph.sort_order)
  `)) as unknown as { code: string; label: string; n: number }[];

  const [leaveRow] = hrEnabled
    ? await db
        .select({ n: sql<string>`count(distinct ${leaves.teamMemberId})` })
        .from(leaves)
        .where(and(eq(leaves.status, "APPROVED"), sql`${today} between ${leaves.fromDate} and ${leaves.toDate}`))
    : [{ n: "0" }];

  const [taskTodayRow] = await db
    .select({ n: count() })
    .from(tasks)
    .where(and(sql`${tasks.status} <> 'DONE'`, sql`${tasks.dueDate} is not null and ${tasks.dueDate} <= ${today}`));

  const [openTendersRow] = await db
    .select({ n: count() })
    .from(tenders)
    .where(eq(tenders.status, "OPEN"));

  const [constructionOpenRow] = await db
    .select({ n: count() })
    .from(contractorSubmissions)
    .where(eq(contractorSubmissions.status, "OPEN"));

  const tenderDueSoon = (await db.execute(sql`
    select t.id, t.title, t.due_date, po.ref as project_ref, po.id as project_id
    from esti_tender t
    join esti_projectoffice po on po.id = t.project_id
    where t.status = 'OPEN'
      and t.due_date is not null
      and t.due_date <= current_date + 7
    order by t.due_date asc
    limit 8
  `)) as unknown as {
    id: string;
    title: string;
    due_date: string;
    project_ref: string;
    project_id: string;
  }[];

  const workload = hrEnabled
    ? await db
        .select({ assignee: tasks.assignee, n: count() })
        .from(tasks)
        .where(and(sql`${tasks.status} <> 'DONE'`, sql`${tasks.assignee} is not null and ${tasks.assignee} <> ''`))
        .groupBy(tasks.assignee)
        .orderBy(sql`count(*) desc`)
        .limit(8)
    : [];

  const wlWeekly = hrEnabled
    ? ((await db.execute(sql`
    select t.assignee,
           extract(dow from t.due_date)::int as dow,
           count(*)::int as n
    from esti_task t
    where t.status <> 'DONE'
      and t.assignee is not null and t.assignee <> ''
      and t.due_date is not null
    group by t.assignee, dow
    order by t.assignee, dow
  `)) as unknown as { assignee: string; dow: number; n: number }[])
    : [];

  const wlDaily = hrEnabled
    ? ((await db.execute(sql`
    select t.assignee,
           t.due_date::text as day,
           count(*)::int as n
    from esti_task t
    where t.status <> 'DONE'
      and t.assignee is not null and t.assignee <> ''
      and t.due_date is not null
      and t.due_date between current_date and current_date + 13
    group by t.assignee, t.due_date
    order by t.assignee, t.due_date
  `)) as unknown as { assignee: string; day: string; n: number }[])
    : [];

  const dailyLoad = hrEnabled
    ? ((await db.execute(sql`
    select t.assignee, count(*)::int as n
    from esti_task t
    where t.status <> 'DONE'
      and t.assignee is not null and t.assignee <> ''
      and t.due_date = current_date
    group by t.assignee
    order by n desc
  `)) as unknown as { assignee: string; n: number }[])
    : [];

  // Receivables aging: outstanding (ISSUED) net amount bucketed by invoice age.
  const [aging] = await db
    .select({
      d0_30: sql<string>`coalesce(sum(case when ${invoices.dateInvoice} >= current_date - 30 then ${invoices.netReceivablePaise} else 0 end), 0)`,
      d31_60: sql<string>`coalesce(sum(case when ${invoices.dateInvoice} < current_date - 30 and ${invoices.dateInvoice} >= current_date - 60 then ${invoices.netReceivablePaise} else 0 end), 0)`,
      d60p: sql<string>`coalesce(sum(case when ${invoices.dateInvoice} < current_date - 60 or ${invoices.dateInvoice} is null then ${invoices.netReceivablePaise} else 0 end), 0)`,
    })
    .from(invoices)
    .where(eq(invoices.status, "ISSUED"));

  return {
    byType: byType.map((r) => ({ type: r.type, count: Number(r.n) })),
    byPhase: phaseRows.map((r) => ({ code: r.code, label: r.label, count: Number(r.n) })),
    onLeaveToday: Number(leaveRow?.n ?? 0),
    tasksDueToday: Number(taskTodayRow?.n ?? 0),
    workload: workload.map((r) => ({ assignee: r.assignee ?? "—", count: Number(r.n) })),
    workloadWeekly: wlWeekly.map((r) => ({ assignee: r.assignee, dow: Number(r.dow), count: Number(r.n) })),
    workloadDaily: wlDaily.map((r) => ({ assignee: r.assignee, day: r.day, count: Number(r.n) })),
    dailyLoad: dailyLoad.map((r) => ({ assignee: r.assignee, count: Number(r.n) })),
    receivablesAging: {
      d0_30: Number(aging?.d0_30 ?? 0),
      d31_60: Number(aging?.d31_60 ?? 0),
      d60p: Number(aging?.d60p ?? 0),
    },
    openTenders: Number(openTendersRow?.n ?? 0),
    constructionOpen: Number(constructionOpenRow?.n ?? 0),
    tenderDueSoon: tenderDueSoon.map((r) => ({
      id: r.id,
      title: r.title,
      dueDate: r.due_date,
      projectRef: r.project_ref,
      projectId: r.project_id,
    })),
  };
}
