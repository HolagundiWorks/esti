import { ANNUAL_LEAVE_ALLOWANCE_DAYS } from "@esti/contracts";
import { and, eq, gte, sql } from "drizzle-orm";
import type { DB } from "../../../db/index.js";
import { leaves, teamMembers } from "../../../db/schema.js";
import { getOrgSettings } from "../../../lib/settings.js";
import type { DashboardUser } from "./types.js";

/** Per-user header strip: server date + optional leave balance (HR module only). */
export async function getDashboardMe(db: DB, user: DashboardUser) {
  const today = new Date().toISOString().slice(0, 10);
  const settings = await getOrgSettings(db);
  if (!settings.hrEnabled) {
    return { today, fullName: user.fullName, role: user.role, leave: null };
  }
  // Match the login to a team member by email to read their leave balance.
  const [member] = user.email
    ? await db.select().from(teamMembers).where(eq(teamMembers.email, user.email))
    : [];
  let leave: { allowance: number; used: number; remaining: number } | null = null;
  if (member) {
    const yearStart = `${new Date().getUTCFullYear()}-01-01`;
    const [agg] = await db
      .select({ used: sql<string>`coalesce(sum(${leaves.days}), 0)` })
      .from(leaves)
      .where(
        and(
          eq(leaves.teamMemberId, member.id),
          eq(leaves.status, "APPROVED"),
          gte(leaves.fromDate, yearStart),
        ),
      );
    const used = Number(agg?.used ?? 0);
    leave = {
      allowance: ANNUAL_LEAVE_ALLOWANCE_DAYS,
      used,
      remaining: Math.max(0, ANNUAL_LEAVE_ALLOWANCE_DAYS - used),
    };
  }
  return { today, fullName: user.fullName, role: user.role, leave };
}
