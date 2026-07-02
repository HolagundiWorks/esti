import {
  ComponentManifest,
  ManifestComponent,
  type ComponentManifest as Manifest,
  type ManifestComponent as Component,
  type Plan,
} from "@esti/contracts";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "../../db/client.js";
import { newId } from "../../lib/ids.js";

/**
 * Publish a component release for an edition (build pipeline / platform admin).
 * Deactivates any prior active release for that edition, then inserts the new
 * one as active. Components are validated against the ManifestComponent shape.
 */
export async function publishComponentRelease(input: {
  edition: Plan;
  appVersion: string;
  components: Component[];
}): Promise<{ id: string }> {
  const components = input.components.map((c) => ManifestComponent.parse(c));
  const id = newId("crel");
  await db.transaction(async (tx) => {
    await tx
      .update(schema.componentReleases)
      .set({ active: false })
      .where(and(eq(schema.componentReleases.edition, input.edition), eq(schema.componentReleases.active, true)));
    await tx.insert(schema.componentReleases).values({
      id,
      edition: input.edition,
      appVersion: input.appVersion,
      components,
      active: true,
    });
  });
  return { id };
}

/** Build the current signed-manifest payload for an edition, or null if none published. */
export async function latestManifest(edition: Plan, issuedAtIso: string): Promise<Manifest | null> {
  const [row] = await db
    .select()
    .from(schema.componentReleases)
    .where(and(eq(schema.componentReleases.edition, edition), eq(schema.componentReleases.active, true)))
    .orderBy(desc(schema.componentReleases.createdAt))
    .limit(1);
  if (!row) return null;
  const parsed = ComponentManifest.safeParse({
    schemaVersion: 1,
    edition: row.edition,
    appVersion: row.appVersion,
    issuedAt: issuedAtIso,
    components: row.components,
  });
  return parsed.success ? parsed.data : null;
}

/** List published releases (admin view). */
export async function listComponentReleases() {
  return db
    .select({
      id: schema.componentReleases.id,
      edition: schema.componentReleases.edition,
      appVersion: schema.componentReleases.appVersion,
      active: schema.componentReleases.active,
      createdAt: schema.componentReleases.createdAt,
    })
    .from(schema.componentReleases)
    .orderBy(desc(schema.componentReleases.createdAt));
}
