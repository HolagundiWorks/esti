import { DsrImportRow } from "@esti/contracts";
import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { dsrItems } from "../../db/schema.js";

/** Insert or replace rate-book items on a version (merge by code unless replace). */
export async function applyDsrImport(
  db: DB,
  versionId: string,
  rows: DsrImportRow[],
  replace: boolean,
): Promise<number> {
  if (replace) {
    await db.delete(dsrItems).where(eq(dsrItems.versionId, versionId));
  } else if (rows.length > 0) {
    const codes = rows.map((r) => r.code);
    await db
      .delete(dsrItems)
      .where(and(eq(dsrItems.versionId, versionId), inArray(dsrItems.code, codes)));
  }
  if (rows.length === 0) return 0;
  await db.insert(dsrItems).values(
    rows.map((row) => ({
      versionId,
      code: row.code,
      description: row.description,
      unit: row.unit,
      ratePaise: row.ratePaise,
    })),
  );
  return rows.length;
}

/** Clone all items from one rate-book version to another. */
export async function copyDsrItems(db: DB, fromVersionId: string, toVersionId: string): Promise<number> {
  const source = await db.select().from(dsrItems).where(eq(dsrItems.versionId, fromVersionId));
  if (source.length === 0) return 0;
  await db.insert(dsrItems).values(
    source.map((item) => ({
      versionId: toVersionId,
      code: item.code,
      description: item.description,
      unit: item.unit,
      ratePaise: item.ratePaise,
    })),
  );
  return source.length;
}
