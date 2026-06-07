import type { DB } from "../db/index.js";
import { orgSettings } from "../db/schema.js";

/** Read the singleton org-settings row, creating it on first access. */
export async function getOrgSettings(db: DB): Promise<typeof orgSettings.$inferSelect> {
  const [row] = await db.select().from(orgSettings).limit(1);
  if (row) return row;
  const [created] = await db.insert(orgSettings).values({}).returning();
  return created!;
}
