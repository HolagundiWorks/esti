import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { approvals, drawings, phases, projectOffices } from "../db/schema.js";
import type { DB } from "../db/index.js";

function invalid(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

export function requireMatchingProjectClient(
  projectClientId: string | null,
  clientId?: string,
): void {
  if (clientId && projectClientId !== clientId) {
    invalid("Client does not belong to the selected project");
  }
}

export function requireAllScopedIds(
  requestedIds: string[],
  matchedIds: string[],
  message: string,
): void {
  const requested = new Set(requestedIds);
  const matched = new Set(matchedIds);
  if (requested.size !== matched.size || [...requested].some((id) => !matched.has(id))) {
    invalid(message);
  }
}

export async function requireProject(db: DB, projectId: string) {
  const [project] = await db
    .select({ id: projectOffices.id, clientId: projectOffices.clientId })
    .from(projectOffices)
    .where(eq(projectOffices.id, projectId));
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  return project;
}

export async function requireInvoiceScope(
  db: DB,
  input: { projectId: string; clientId?: string; phaseId?: string },
): Promise<void> {
  const project = await requireProject(db, input.projectId);
  requireMatchingProjectClient(project.clientId, input.clientId);
  if (input.phaseId) {
    const [phase] = await db
      .select({ id: phases.id })
      .from(phases)
      .where(and(eq(phases.id, input.phaseId), eq(phases.projectId, input.projectId)));
    if (!phase) invalid("Phase does not belong to the selected project");
  }
}

export async function requireDrawingsInProject(
  db: DB,
  projectId: string,
  drawingIds: string[],
): Promise<void> {
  await requireProject(db, projectId);
  const uniqueIds = [...new Set(drawingIds)];
  if (uniqueIds.length === 0) return;
  const rows = await db
    .select({ id: drawings.id })
    .from(drawings)
    .where(and(inArray(drawings.id, uniqueIds), eq(drawings.projectId, projectId)));
  requireAllScopedIds(
    uniqueIds,
    rows.map((row) => row.id),
    "A transmittal drawing belongs to another project or does not exist",
  );
}

export async function requireApprovalInProject(
  db: DB,
  projectId: string,
  approvalId?: string | null,
): Promise<void> {
  await requireProject(db, projectId);
  if (!approvalId) return;
  const [approval] = await db
    .select({ id: approvals.id })
    .from(approvals)
    .where(and(eq(approvals.id, approvalId), eq(approvals.projectId, projectId)));
  if (!approval) invalid("Superseded approval belongs to another project or does not exist");
}
