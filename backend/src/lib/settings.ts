import { TRPCError } from "@trpc/server";
import type { DB } from "../db/index.js";
import { orgSettings } from "../db/schema.js";

/** Read the singleton org-settings row, creating it on first access. */
export async function getOrgSettings(db: DB): Promise<typeof orgSettings.$inferSelect> {
  const [row] = await db.select().from(orgSettings).limit(1);
  if (row) {
    if (!row.hrEnabled || row.orgMode !== "STUDIO") {
      const [updated] = await db
        .update(orgSettings)
        .set({ hrEnabled: true, orgMode: "STUDIO", updatedAt: new Date() })
        .returning();
      return updated!;
    }
    return row;
  }
  const [created] = await db.insert(orgSettings).values({ hrEnabled: true, orgMode: "STUDIO" }).returning();
  return created!;
}

/** Guard write paths in the optional HR module — reject if it is toggled off. */
export async function requireHrEnabled(db: DB): Promise<void> {
  const s = await getOrgSettings(db);
  if (!s.hrEnabled)
    throw new TRPCError({ code: "FORBIDDEN", message: "Team & HR module is disabled" });
}

/** Guard PMC module paths — reject if firm PMC is toggled off. */
export async function requirePmcEnabled(db: DB): Promise<void> {
  const s = await getOrgSettings(db);
  if (!s.pmcEnabled)
    throw new TRPCError({ code: "FORBIDDEN", message: "PMC module is disabled" });
}

/** Ensure project has PMC enabled (firm PMC must also be on). */
export async function assertProjectPmcEnabled(db: DB, projectId: string): Promise<void> {
  await requirePmcEnabled(db);
  const { projectOffices } = await import("../db/schema.js");
  const { eq } = await import("drizzle-orm");
  const [row] = await db
    .select({ pmcEnabled: projectOffices.pmcEnabled })
    .from(projectOffices)
    .where(eq(projectOffices.id, projectId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  if (!row.pmcEnabled)
    throw new TRPCError({ code: "FORBIDDEN", message: "PMC is not enabled for this project" });
}
