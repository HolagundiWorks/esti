import { TRPCError } from "@trpc/server";
import type { DB } from "../db/index.js";
import { orgSettings } from "../db/schema.js";

/** Read the singleton org-settings row, creating it on first access. */
export async function getOrgSettings(db: DB): Promise<typeof orgSettings.$inferSelect> {
  const [row] = await db.select().from(orgSettings).limit(1);
  if (row) return row;
  const [created] = await db.insert(orgSettings).values({}).returning();
  return created!;
}

/** Guard write paths in the optional HR module — reject if it is toggled off. */
export async function requireHrEnabled(db: DB): Promise<void> {
  const s = await getOrgSettings(db);
  if (!s.hrEnabled)
    throw new TRPCError({ code: "FORBIDDEN", message: "Team & HR module is disabled" });
}
