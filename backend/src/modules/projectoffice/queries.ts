import { ListParams, can } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { projectLogs, projectOffices } from "../../db/schema.js";

type AuthUser = { id: string; role: string };

export async function listProjects(db: DB, input: ListParams) {
  const where = and(
    isNull(projectOffices.archivedAt),
    input.search ? ilike(projectOffices.title, `%${input.search}%`) : undefined,
    input.status ? eq(projectOffices.status, input.status) : undefined,
  );
  return db
    .select()
    .from(projectOffices)
    .where(where)
    .orderBy(desc(projectOffices.createdAt))
    .limit(input.limit)
    .offset(input.offset);
}

export async function getProjectById(db: DB, id: string) {
  const rows = await db
    .select()
    .from(projectOffices)
    .where(and(eq(projectOffices.id, id), isNull(projectOffices.archivedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listArchivedProjects(db: DB, user: AuthUser) {
  if (!can(user.role, "project:delete")) throw new TRPCError({ code: "FORBIDDEN" });
  return db
    .select()
    .from(projectOffices)
    .where(and(isNotNull(projectOffices.archivedAt), isNull(projectOffices.purgedAt)))
    .orderBy(desc(projectOffices.archivedAt));
}

export async function listProjectLogs(db: DB, projectId: string) {
  return db
    .select()
    .from(projectLogs)
    .where(eq(projectLogs.projectId, projectId))
    .orderBy(desc(projectLogs.createdAt));
}

export const projectByIdInput = z.object({ id: z.string().uuid() });
export const projectLogsInput = z.object({ projectId: z.string().uuid() });
