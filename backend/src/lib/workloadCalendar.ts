import {
  buildIcsFeed,
  type IcsEvent,
  type WorkloadCalendarScope,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { DB } from "../db/index.js";
import { projectOffices, tasks, teamMembers, users } from "../db/schema.js";

const OFFICE_SCOPE_ROLES = new Set(["OWNER", "PARTNER", "SENIOR"]);

export async function ensureCalendarFeedToken(db: DB, userId: string): Promise<string> {
  const [row] = await db
    .select({ token: users.calendarFeedToken })
    .from(users)
    .where(eq(users.id, userId));
  if (row?.token) return row.token;

  const token = randomBytes(24).toString("hex");
  await db.update(users).set({ calendarFeedToken: token }).where(eq(users.id, userId));
  return token;
}

export async function rotateCalendarFeedToken(db: DB, userId: string): Promise<string> {
  const token = randomBytes(24).toString("hex");
  await db.update(users).set({ calendarFeedToken: token }).where(eq(users.id, userId));
  return token;
}

export function parseCalendarScope(raw: string | undefined): WorkloadCalendarScope {
  return raw === "office" ? "office" : "mine";
}

export async function userForCalendarToken(db: DB, token: string) {
  const [user] = await db
    .select({
      id: users.id,
      role: users.role,
      fullName: users.fullName,
      disabled: users.disabled,
    })
    .from(users)
    .where(eq(users.calendarFeedToken, token));
  if (!user || user.disabled) return null;
  if (user.role === "CLIENT" || user.role === "CONSULTANT") return null;
  return user;
}

async function teamMemberForUser(db: DB, userId: string) {
  const [tm] = await db
    .select({ id: teamMembers.id, name: teamMembers.name })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));
  return tm ?? null;
}

/** Load open tasks with due dates for the workload ICS feed. */
export async function loadWorkloadEvents(
  db: DB,
  userId: string,
  userRole: string,
  scope: WorkloadCalendarScope,
): Promise<IcsEvent[]> {
  if (scope === "office" && !OFFICE_SCOPE_ROLES.has(userRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Office workload calendar requires Partner or above.",
    });
  }

  const tm = await teamMemberForUser(db, userId);
  const filters = [
    isNotNull(tasks.dueDate),
    sql`${tasks.status} <> 'DONE'`,
  ];

  if (scope === "mine") {
    if (!tm) return [];
    filters.push(
      or(eq(tasks.assigneeId, tm.id), eq(tasks.assignee, tm.name))!,
    );
  }

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      status: tasks.status,
      priority: tasks.priority,
      assignee: tasks.assignee,
      projectRef: projectOffices.ref,
      projectTitle: projectOffices.title,
    })
    .from(tasks)
    .leftJoin(projectOffices, eq(projectOffices.id, tasks.projectId))
    .where(and(...filters))
    .orderBy(tasks.dueDate);

  return rows
    .filter((r) => r.dueDate)
    .map((r) => {
      const prefix = r.projectRef ? `[${r.projectRef}] ` : "";
      const parts = [
        `Status: ${r.status}`,
        `Priority: ${r.priority}`,
        r.assignee ? `Assignee: ${r.assignee}` : null,
        r.projectTitle ? `Project: ${r.projectTitle}` : null,
      ].filter(Boolean);

      return {
        uid: `esti-task-${r.id}@aorms.in`,
        date: String(r.dueDate),
        summary: `${prefix}${r.title}`,
        description: parts.join("\n"),
      };
    });
}

export async function buildWorkloadIcs(
  db: DB,
  userId: string,
  userRole: string,
  userName: string,
  scope: WorkloadCalendarScope,
): Promise<string> {
  const events = await loadWorkloadEvents(db, userId, userRole, scope);
  const calName =
    scope === "office"
      ? "ESTI AORMS — Office workload"
      : `ESTI AORMS — ${userName} tasks`;
  return buildIcsFeed(events, calName);
}

export function calendarFeedPath(token: string, scope: WorkloadCalendarScope): string {
  const q = scope === "office" ? "?scope=office" : "";
  return `/calendar/workload/${token}.ics${q}`;
}
