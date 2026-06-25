import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { projectBriefs, projectOffices } from "../../db/schema.js";

export async function getOrCreateBrief(db: DB, projectId: string) {
  const [existing] = await db
    .select()
    .from(projectBriefs)
    .where(eq(projectBriefs.projectId, projectId))
    .limit(1);
  if (existing) return existing;

  const [project] = await db
    .select()
    .from(projectOffices)
    .where(eq(projectOffices.id, projectId))
    .limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

  const basicInfo = {
    siteAddress: project.siteAddress ?? undefined,
    plotSize: project.siteAreaSqm ? `${project.siteAreaSqm} sq m` : undefined,
  };
  const projectInfo = {
    intendedUse: project.projectType,
    tentativeStart: project.dateStart ?? undefined,
    budgetNote: project.contractValuePaise
      ? `Contract value ₹${(project.contractValuePaise / 100).toLocaleString("en-IN")}`
      : undefined,
  };

  const [created] = await db
    .insert(projectBriefs)
    .values({
      projectId,
      basicInfo,
      projectInfo,
      occupants: { household: [] },
      designPrefs: {},
      spaceSchedule: [],
      materials: {},
      roomDetails: [],
    })
    .returning();
  return created!;
}
