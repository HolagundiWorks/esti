import {
  BUILDING_DSR_VERSION_DESCRIPTION,
  BUILDING_DSR_VERSION_LABEL,
  KA_BUILDING_DSR_REF,
  buildingDsrCatalogItems,
} from "@esti/contracts";
import { and, eq } from "drizzle-orm";
import type { db } from "../db/index.js";
import { dsrItems, dsrVersions } from "../db/schema.js";
import { ensureOllamaAiSettings } from "../lib/ai/ollama-config.js";

type Db = typeof db;

/** Idempotent seed: standard building DSR version + items aligned with takeoff codes. */
export async function ensureBuildingDsrCatalog(
  database: Db,
): Promise<{ versionId: string; itemsSeeded: number; itemsTotal: number }> {
  let [version] = await database
    .select()
    .from(dsrVersions)
    .where(eq(dsrVersions.label, BUILDING_DSR_VERSION_LABEL))
    .limit(1);

  if (!version) {
    await database.update(dsrVersions).set({ active: false });
    [version] = await database
      .insert(dsrVersions)
      .values({
        label: BUILDING_DSR_VERSION_LABEL,
        description: BUILDING_DSR_VERSION_DESCRIPTION,
        source: KA_BUILDING_DSR_REF.source,
        stateCode: KA_BUILDING_DSR_REF.stateCode,
        status: "PUBLISHED",
        active: true,
      })
      .returning();
  } else if (!version.active) {
    await database.update(dsrVersions).set({ active: false });
    await database
      .update(dsrVersions)
      .set({ active: true, description: BUILDING_DSR_VERSION_DESCRIPTION, source: KA_BUILDING_DSR_REF.source, stateCode: KA_BUILDING_DSR_REF.stateCode })
      .where(eq(dsrVersions.id, version.id));
  }

  const catalog = buildingDsrCatalogItems();
  let itemsSeeded = 0;

  for (const item of catalog) {
    const [existing] = await database
      .select({ id: dsrItems.id })
      .from(dsrItems)
      .where(and(eq(dsrItems.versionId, version!.id), eq(dsrItems.code, item.code)))
      .limit(1);
    if (existing) continue;
    await database.insert(dsrItems).values({
      versionId: version!.id,
      code: item.code,
      description: item.description,
      unit: item.unit,
      ratePaise: item.ratePaise,
    });
    itemsSeeded += 1;
  }

  return { versionId: version!.id, itemsSeeded, itemsTotal: catalog.length };
}

/** Enable AI Studio with on-server Ollama defaults. */
export async function ensureAiStudioEnabled(database: Db): Promise<void> {
  await ensureOllamaAiSettings(database);
}
