import {
  type HrLockReason,
  type OrgMode,
  HR_LOCK_REASON_LABEL,
  TEAM_ROLES,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import type { DB } from "../db/index.js";
import {
  assignments,
  attendance,
  hrArchives,
  leaves,
  orgSettings,
  projectOffices,
  rewardPoints,
  tasks,
  teamMembers,
  users,
} from "../db/schema.js";
import { getOrgSettings } from "./settings.js";

const PRINCIPAL_ROLE = TEAM_ROLES.PRINCIPAL;

export type HrModuleSnapshot = {
  archivedAt: string;
  teamMembers: Array<{
    id: string;
    name: string;
    role: string;
    email: string | null;
    active: boolean;
    userId: string | null;
  }>;
  assignments: Array<{
    id: string;
    projectId: string;
    teamMemberId: string;
    role: string;
  }>;
  taskAttribution: Array<{
    id: string;
    projectId: string;
    assigneeId: string | null;
    assignee: string | null;
    reviewerId: string | null;
  }>;
  counts: {
    attendance: number;
    leaves: number;
    rewardPoints: number;
  };
};

export type HrModuleAssessment = {
  orgMode: OrgMode;
  hrEnabled: boolean;
  locked: boolean;
  lockReasons: HrLockReason[];
  counts: {
    activeTeamMembers: number;
    attendance: number;
    leaves: number;
    rewardPoints: number;
    assignmentMembers: number;
  };
  latestArchive: { id: string; createdAt: Date; tasksRemapped: number; membersArchived: number } | null;
};

/** Whether the optional Team & HR module is enabled. */
export async function isHrEnabled(db: DB): Promise<boolean> {
  return (await getOrgSettings(db)).hrEnabled;
}

/**
 * Resolve the principal architect team member — used when HR is off (solo mode).
 * Prefers: role contains "principal" → linked OWNER user → earliest active member.
 */
export async function resolvePrincipalMember(db: DB): Promise<typeof teamMembers.$inferSelect> {
  const [byRole] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.active, true), ilike(teamMembers.role, "%principal%")))
    .orderBy(asc(teamMembers.dateJoined))
    .limit(1);
  if (byRole) return byRole;

  const [ownerUser] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.role, "OWNER"))
    .limit(1);

  if (ownerUser) {
    const [linked] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, ownerUser.id), eq(teamMembers.active, true)))
      .limit(1);
    if (linked) return linked;

    if (ownerUser.email) {
      const [byOwnerEmail] = await db
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.active, true), eq(teamMembers.email, ownerUser.email)))
        .limit(1);
      if (byOwnerEmail) return byOwnerEmail;
    }
  }

  const [fallback] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.active, true))
    .orderBy(asc(teamMembers.dateJoined))
    .limit(1);
  if (fallback) return fallback;

  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message:
      "No team member record found for the principal architect. Add a principal in Team before disabling Team & HR, or re-run the demo seed.",
  });
}

/** Ensure the principal has a project assignment so task assignee validation passes. */
export async function ensurePrincipalProjectAssignment(
  db: DB,
  projectId: string,
  principalId: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(and(eq(assignments.projectId, projectId), eq(assignments.teamMemberId, principalId)))
    .limit(1);
  if (existing) return;
  await db.insert(assignments).values({
    projectId,
    teamMemberId: principalId,
    role: PRINCIPAL_ROLE,
  });
}

/**
 * When Team & HR is turned off: reassign all tasks to the principal architect and
 * ensure each project has a principal assignment row.
 */
export async function applySoloHrMode(db: DB): Promise<{ tasksUpdated: number; projectsTouched: number }> {
  const principal = await resolvePrincipalMember(db);

  const projectRows = await db.select({ id: projectOffices.id }).from(projectOffices);
  for (const p of projectRows) {
    await ensurePrincipalProjectAssignment(db, p.id, principal.id);
  }

  const updated = await db
    .update(tasks)
    .set({
      assigneeId: principal.id,
      assignee: principal.name,
      reviewerId: null,
    })
    .where(
      or(
        sql`${tasks.assigneeId} IS DISTINCT FROM ${principal.id}`,
        sql`${tasks.assignee} IS DISTINCT FROM ${principal.name}`,
        sql`${tasks.reviewerId} IS NOT NULL`,
      ),
    )
    .returning({ id: tasks.id });

  return { tasksUpdated: updated.length, projectsTouched: projectRows.length };
}

/** Solo-mode task assignee — always the principal architect. */
export async function resolveSoloTaskAssignee(
  db: DB,
  projectId: string,
): Promise<{ assigneeId: string; assignee: string }> {
  const principal = await resolvePrincipalMember(db);
  await ensurePrincipalProjectAssignment(db, projectId, principal.id);
  return { assigneeId: principal.id, assignee: principal.name };
}

async function countTable(
  db: DB,
  table: typeof attendance | typeof leaves | typeof rewardPoints,
): Promise<number> {
  const [row] = await db.select({ n: count() }).from(table);
  return Number(row?.n ?? 0);
}

async function countDistinctAssignmentMembers(db: DB): Promise<number> {
  const rows = await db
    .select({ teamMemberId: assignments.teamMemberId })
    .from(assignments)
    .groupBy(assignments.teamMemberId);
  return rows.length;
}

/** Assess whether studio HR data requires an archive before disabling the module. */
export async function assessHrModule(db: DB): Promise<HrModuleAssessment> {
  const settings = await getOrgSettings(db);
  const orgMode = (settings.orgMode === "STUDIO" ? "STUDIO" : "SOLO") as OrgMode;

  const [memberRow] = await db
    .select({ n: count() })
    .from(teamMembers)
    .where(eq(teamMembers.active, true));

  const counts = {
    activeTeamMembers: Number(memberRow?.n ?? 0),
    attendance: await countTable(db, attendance),
    leaves: await countTable(db, leaves),
    rewardPoints: await countTable(db, rewardPoints),
    assignmentMembers: await countDistinctAssignmentMembers(db),
  };

  const lockReasons: HrLockReason[] = [];
  if (counts.activeTeamMembers > 1) lockReasons.push("MULTIPLE_TEAM_MEMBERS");
  if (counts.attendance > 0) lockReasons.push("ATTENDANCE");
  if (counts.leaves > 0) lockReasons.push("LEAVES");
  if (counts.rewardPoints > 0) lockReasons.push("REWARD_POINTS");
  if (counts.assignmentMembers > 1) lockReasons.push("MULTI_PERSON_ASSIGNMENTS");

  const [latest] = await db
    .select({
      id: hrArchives.id,
      createdAt: hrArchives.createdAt,
      tasksRemapped: hrArchives.tasksRemapped,
      membersArchived: hrArchives.membersArchived,
    })
    .from(hrArchives)
    .orderBy(desc(hrArchives.createdAt))
    .limit(1);

  return {
    orgMode,
    hrEnabled: settings.hrEnabled,
    locked: lockReasons.length > 0,
    lockReasons,
    counts,
    latestArchive: latest ?? null,
  };
}

export function formatHrLockMessage(reasons: HrLockReason[]): string {
  const labels = reasons.map((r) => HR_LOCK_REASON_LABEL[r]);
  return `Team & HR cannot be turned off while ${labels.join("; ")}. Run the archive workflow to map active work to the principal and preserve a read-only snapshot.`;
}

/** Build an immutable JSON snapshot of team-module data before archive. */
export async function buildHrModuleSnapshot(db: DB): Promise<HrModuleSnapshot> {
  const members = await db.select().from(teamMembers);
  const assignmentRows = await db.select().from(assignments);
  const taskRows = await db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      assigneeId: tasks.assigneeId,
      assignee: tasks.assignee,
      reviewerId: tasks.reviewerId,
    })
    .from(tasks);

  return {
    archivedAt: new Date().toISOString(),
    teamMembers: members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      email: m.email,
      active: m.active,
      userId: m.userId,
    })),
    assignments: assignmentRows.map((a) => ({
      id: a.id,
      projectId: a.projectId,
      teamMemberId: a.teamMemberId,
      role: a.role,
    })),
    taskAttribution: taskRows
      .filter((t): t is typeof t & { projectId: string } => t.projectId != null)
      .map((t) => ({
        id: t.id,
        projectId: t.projectId,
        assigneeId: t.assigneeId,
        assignee: t.assignee,
        reviewerId: t.reviewerId,
      })),
    counts: {
      attendance: await countTable(db, attendance),
      leaves: await countTable(db, leaves),
      rewardPoints: await countTable(db, rewardPoints),
    },
  };
}

/**
 * Archive the Team & HR module for a studio that has operational team data.
 * Snapshots roster + attribution, remaps open tasks to principal, deactivates
 * non-principal members, and sets org to solo mode.
 */
export async function archiveTeamModule(
  db: DB,
  actorId: string,
  reason?: string,
): Promise<{
  archiveId: string;
  tasksRemapped: number;
  membersArchived: number;
  projectsTouched: number;
}> {
  const assessment = await assessHrModule(db);
  if (!assessment.hrEnabled) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Team & HR is already disabled." });
  }
  if (!assessment.locked) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No team-module records require archiving. Use the simple disable action instead.",
    });
  }

  const snapshot = await buildHrModuleSnapshot(db);
  const principal = await resolvePrincipalMember(db);
  const soloSummary = await applySoloHrMode(db);

  const deactivated = await db
    .update(teamMembers)
    .set({ active: false })
    .where(and(eq(teamMembers.active, true), ne(teamMembers.id, principal.id)))
    .returning({ id: teamMembers.id });

  const settings = await getOrgSettings(db);
  await db
    .update(orgSettings)
    .set({ hrEnabled: false, orgMode: "SOLO" })
    .where(eq(orgSettings.id, settings.id));

  const [archive] = await db
    .insert(hrArchives)
    .values({
      createdById: actorId,
      reason: reason ?? null,
      snapshot,
      tasksRemapped: soloSummary.tasksUpdated,
      membersArchived: deactivated.length,
    })
    .returning();

  return {
    archiveId: archive!.id,
    tasksRemapped: soloSummary.tasksUpdated,
    membersArchived: deactivated.length,
    projectsTouched: soloSummary.projectsTouched,
  };
}

/** Re-enable studio mode — restores archived team members from the latest snapshot. */
export async function enableStudioHrMode(db: DB): Promise<{ membersReactivated: number }> {
  const settings = await getOrgSettings(db);
  if (settings.hrEnabled) {
    return { membersReactivated: 0 };
  }

  const [latest] = await db
    .select({ snapshot: hrArchives.snapshot })
    .from(hrArchives)
    .orderBy(desc(hrArchives.createdAt))
    .limit(1);

  let membersReactivated = 0;
  if (latest?.snapshot) {
    const snap = latest.snapshot as HrModuleSnapshot;
    for (const m of snap.teamMembers) {
      if (!m.active) continue;
      await db.update(teamMembers).set({ active: true }).where(eq(teamMembers.id, m.id));
      membersReactivated += 1;
    }
  }

  await db
    .update(orgSettings)
    .set({ hrEnabled: true, orgMode: "STUDIO" })
    .where(eq(orgSettings.id, settings.id));

  return { membersReactivated };
}

/** Disable HR when no archive is required (greenfield solo or empty team module). */
export async function disableHrModuleSimple(
  db: DB,
): Promise<{ tasksUpdated: number; projectsTouched: number } | null> {
  const assessment = await assessHrModule(db);
  if (!assessment.hrEnabled) return null;
  if (assessment.locked) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: formatHrLockMessage(assessment.lockReasons),
    });
  }

  const soloSummary = await applySoloHrMode(db);
  const settings = await getOrgSettings(db);
  await db
    .update(orgSettings)
    .set({ hrEnabled: false, orgMode: "SOLO" })
    .where(eq(orgSettings.id, settings.id));

  return soloSummary;
}

/** List archive records (newest first) for read-only history in Company settings. */
export async function listHrArchives(db: DB, limit = 10) {
  return db
    .select({
      id: hrArchives.id,
      createdAt: hrArchives.createdAt,
      reason: hrArchives.reason,
      tasksRemapped: hrArchives.tasksRemapped,
      membersArchived: hrArchives.membersArchived,
    })
    .from(hrArchives)
    .orderBy(desc(hrArchives.createdAt))
    .limit(limit);
}
