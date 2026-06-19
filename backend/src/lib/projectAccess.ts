import { can } from "@esti/contracts";
import { eq, inArray } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { assignments, projectOffices, teamMembers } from "../db/schema.js";

/** Partner+ sees all projects; others see assigned projects or those they created. */
export async function accessibleProjectIds(
  db: DB,
  user: { id: string; role: string },
): Promise<string[] | null> {
  if (can(user.role, "project:delete")) return null;

  const [member] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  const assignedProjectIds = member
    ? await db
        .select({ projectId: assignments.projectId })
        .from(assignments)
        .where(eq(assignments.teamMemberId, member.id))
    : [];

  const ids = new Set<string>(assignedProjectIds.map((r) => r.projectId));

  const created = await db
    .select({ id: projectOffices.id })
    .from(projectOffices)
    .where(eq(projectOffices.createdById, user.id));
  for (const row of created) ids.add(row.id);

  return [...ids];
}

export async function projectAccessFilter(
  db: DB,
  user: { id: string; role: string },
): Promise<ReturnType<typeof inArray> | undefined> {
  const ids = await accessibleProjectIds(db, user);
  if (ids === null) return undefined;
  if (ids.length === 0) return inArray(projectOffices.id, ["00000000-0000-0000-0000-000000000000"]);
  return inArray(projectOffices.id, ids);
}
