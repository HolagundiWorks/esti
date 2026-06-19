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
      count(case when t.priority = 'HIGH' then 1 end)::int                                                        as high_priority_count
    from esti_task t
    where t.status <> 'DONE'
      and t.assignee is not null
      and t.assignee <> ''
    group by t.assignee
    order by overdue_count desc, total_open desc
    limit 20
  `)) as unknown as {
    assignee: string; total_open: number; overdue_count: number; high_priority_count: number;
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
      capacity,
    };
  });
}
