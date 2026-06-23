import { eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { dsrItems, dsrVersions } from "../../db/schema.js";

export type EstimateItemSourceKind = "MANUAL" | "DSR_PICK" | "BULK_IMPORT" | "TAKEOFF_IMPORT";

export async function dsrSnapshotForItem(db: DB, dsrItemId?: string | null) {
  if (!dsrItemId) return {};
  const [row] = await db
    .select({
      code: dsrItems.code,
      description: dsrItems.description,
      unit: dsrItems.unit,
      ratePaise: dsrItems.ratePaise,
      versionLabel: dsrVersions.label,
    })
    .from(dsrItems)
    .innerJoin(dsrVersions, eq(dsrVersions.id, dsrItems.versionId))
    .where(eq(dsrItems.id, dsrItemId));
  if (!row) return {};
  return {
    dsrItemCode: row.code,
    dsrItemDescription: row.description,
    dsrVersionLabel: row.versionLabel,
    sourcePayload: {
      dsr: {
        code: row.code,
        description: row.description,
        unit: row.unit,
        ratePaise: row.ratePaise,
        versionLabel: row.versionLabel,
      },
    },
  };
}

