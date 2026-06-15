import { eq } from "drizzle-orm";
import {
  DEMO_BEAM_230x600_M25,
  steelFlowCatalogToPersisted,
} from "@esti/contracts";
import type { db } from "../db/index.js";
import { structuralElementTemplates } from "../db/schema.js";

type Db = typeof db;

/** Idempotent demo SteelFlow catalogue — beam 230×600 M25 with L/4 extra bars. */
export async function ensureDemoSteelFlowCatalog(database: Db): Promise<string | null> {
  const [existing] = await database
    .select({ id: structuralElementTemplates.id })
    .from(structuralElementTemplates)
    .where(eq(structuralElementTemplates.code, DEMO_BEAM_230x600_M25.code))
    .limit(1);
  if (existing) return existing.id;

  const persisted = steelFlowCatalogToPersisted(DEMO_BEAM_230x600_M25);
  const [row] = await database
    .insert(structuralElementTemplates)
    .values({
      code: DEMO_BEAM_230x600_M25.code,
      name: DEMO_BEAM_230x600_M25.name,
      family: DEMO_BEAM_230x600_M25.elementType,
      type: `${DEMO_BEAM_230x600_M25.widthMm}x${DEMO_BEAM_230x600_M25.depthMm}`,
      version: DEMO_BEAM_230x600_M25.version,
      status: "PUBLISHED",
      description: DEMO_BEAM_230x600_M25.description ?? null,
      geometry: persisted.geometry,
      reinforcement: persisted.reinforcement,
      sourceCitation: DEMO_BEAM_230x600_M25.sourceCitation ?? null,
      publishedAt: new Date(),
    })
    .returning();
  return row!.id;
}
