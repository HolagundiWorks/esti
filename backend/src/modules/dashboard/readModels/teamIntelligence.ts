import { sql } from "drizzle-orm";
import type { DB } from "../../../db/index.js";
import { getOrgSettings } from "../../../lib/settings.js";

/** Team capacity signals: per-assignee task load (HR module only). */
export async function getTeamIntelligence(db: DB) {
  const settings = await getOrgSettings(db);
  if (!settings.hrEnabled) return [];

  const rows = (await db.execute(sql`
    select
      t.assignee,
      count(*)::int                                                                                                as total_open,
      count(case when t.due_date < current_date then 1 end)::int                                                  as overdue_count,
      count(case when t.priority = 'HIGH' then 1 end)::int                                                        as high_priority_count,
      (array_agg(t.id order by
        case when t.due_date < current_date then 0 else 1 end,
        case when t.priority = 'HIGH' then 0 else 1 end,
        t.due_date asc nulls last,
        t.created_at desc
      ))[1] as focus_task_id,
      (array_agg(t.title order by
        case when t.due_date < current_date then 0 else 1 end,
        case when t.priority = 'HIGH' then 0 else 1 end,
        t.due_date asc nulls last,
        t.created_at desc
      ))[1] as focus_task_title,
      (array_agg(t.project_id order by
        case when t.due_date < current_date then 0 else 1 end,
        case when t.priority = 'HIGH' then 0 else 1 end,
        t.due_date asc nulls last,
        t.created_at desc
      ))[1] as focus_project_id
    from esti_task t
    where t.status <> 'DONE'
      and t.assignee is not null
      and t.assignee <> ''
    group by t.assignee
    order by overdue_count desc, total_open desc
    limit 20
  `)) as unknown as {
    assignee: string; total_open: number; overdue_count: number; high_priority_count: number;
    focus_task_id: string | null; focus_task_title: string | null; focus_project_id: string | null;
  }[];

  return rows.map((r) => {
    const totalOpen = Number(r.total_open);
    const overdue = Number(r.overdue_count);
    let capacity: "HEALTHY" | "BUSY" | "OVERLOADED" = "HEALTHY";
    if (overdue >= 3 || totalOpen >= 10) capacity = "OVERLOADED";
    else if (overdue >= 1 || totalOpen >= 5) capacity = "BUSY";
    return {
      assignee: r.assignee,
      totalOpen,
      overdueCount: overdue,
      highPriorityCount: Number(r.high_priority_count),
      focusTaskId: r.focus_task_id,
      focusTaskTitle: r.focus_task_title,
      focusProjectId: r.focus_project_id,
      capacity,
    };
  });
}
