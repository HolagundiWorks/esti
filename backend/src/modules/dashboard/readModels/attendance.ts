import { count, eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { attendance, teamMembers } from "../../db/schema.js";
import { getOrgSettings } from "../../lib/settings.js";

/** Team attendance summary for today (HR module only). */
export async function getTeamAttendanceToday(db: DB) {
  const settings = await getOrgSettings(db);
  if (!settings.hrEnabled) {
    return { headcount: 0, marked: 0, present: 0, absent: 0, wfh: 0, onLeave: 0 };
  }
  const today = new Date().toISOString().slice(0, 10);
  const [head] = await db
    .select({ n: count() })
    .from(teamMembers)
    .where(eq(teamMembers.active, true));
  const headcount = Number(head?.n ?? 0);

  const rows = await db
    .select({ status: attendance.status })
    .from(attendance)
    .where(eq(attendance.attendanceDate, today));

  let present = 0;
  let absent = 0;
  let wfh = 0;
  let onLeave = 0;
  for (const r of rows) {
    if (r.status === "PRESENT" || r.status === "HALF_DAY") present += 1;
    else if (r.status === "ABSENT") absent += 1;
    else if (r.status === "WFH") wfh += 1;
    else if (r.status === "ON_LEAVE") onLeave += 1;
  }

  return {
    headcount,
    marked: rows.length,
    present,
    absent,
    wfh,
    onLeave,
  };
}
