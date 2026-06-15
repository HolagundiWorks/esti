import { eq } from "drizzle-orm";
import type { db } from "../db/index.js";
import { specCatalogItems, specCatalogVersions } from "../db/schema.js";

type Db = typeof db;

export type DemoSpecCatalog = {
  versionId: string;
  flooring: string;
  joinery: string;
  facade: string;
  officeFlooring: string;
};

const DEMO_ITEMS = [
  {
    key: "flooring" as const,
    category: "Flooring",
    item: "Living / dining flooring",
    make: "Kajaria / equivalent",
    specification: "1200 x 600 vitrified tile, rectified edges",
    finish: "Warm grey matte",
    remarks: "Confirm final shade with client sample board",
  },
  {
    key: "joinery" as const,
    category: "Joinery",
    item: "Wardrobe shutters",
    make: "Greenlam / Merino",
    specification: "BWR ply carcass with laminate finish",
    finish: "Oak texture with black recessed handle",
    remarks: "Mock-up in master bedroom before bulk execution",
  },
  {
    key: "facade" as const,
    category: "Facade",
    item: "Curtain wall glazing",
    make: "Schüco / AIS equivalent",
    specification: "Double-glazed IGU, 6+12+6mm, low-E coating",
    finish: "Mill-finish aluminium, clear anodised",
    remarks: "Thermal performance certificate required before procurement",
  },
  {
    key: "officeFlooring" as const,
    category: "Flooring",
    item: "Office area flooring",
    make: "Porcelano / equivalent",
    specification: "900 x 900 polished concrete look tile",
    finish: "Light grey, semi-polished",
    remarks: "Confirm final shade with client sample board",
  },
];

/** Idempotent demo specification catalogue for Knowledge Bank → project spec sheets. */
export async function ensureDemoSpecCatalog(database: Db): Promise<DemoSpecCatalog> {
  const [existingVersion] = await database
    .select()
    .from(specCatalogVersions)
    .where(eq(specCatalogVersions.label, "Office standard v1"))
    .limit(1);

  let versionId = existingVersion?.id;
  if (!versionId) {
    await database.update(specCatalogVersions).set({ active: false });
    const [created] = await database
      .insert(specCatalogVersions)
      .values({
        label: "Office standard v1",
        description: "Demo material specification catalogue",
        active: true,
      })
      .returning();
    versionId = created!.id;
  } else if (existingVersion && !existingVersion.active) {
    await database.update(specCatalogVersions).set({ active: false });
    await database
      .update(specCatalogVersions)
      .set({ active: true })
      .where(eq(specCatalogVersions.id, versionId));
  }

  const existingItems = await database
    .select()
    .from(specCatalogItems)
    .where(eq(specCatalogItems.versionId, versionId));

  const ids: Partial<Record<(typeof DEMO_ITEMS)[number]["key"], string>> = {};
  for (const [index, def] of DEMO_ITEMS.entries()) {
    const match = existingItems.find((row) => row.item === def.item);
    if (match) {
      ids[def.key] = match.id;
      continue;
    }
    const [created] = await database
      .insert(specCatalogItems)
      .values({
        versionId,
        category: def.category,
        item: def.item,
        make: def.make,
        specification: def.specification,
        finish: def.finish,
        remarks: def.remarks,
        sortOrder: (index + 1) * 10,
      })
      .returning();
    ids[def.key] = created!.id;
  }

  return {
    versionId,
    flooring: ids.flooring!,
    joinery: ids.joinery!,
    facade: ids.facade!,
    officeFlooring: ids.officeFlooring!,
  };
}

export function catalogSnapshot(
  catalog: DemoSpecCatalog,
  key: keyof Omit<DemoSpecCatalog, "versionId">,
) {
  const def = DEMO_ITEMS.find((row) => row.key === key)!;
  return {
    catalogItemId: catalog[key],
    category: def.category,
    item: def.item,
    make: def.make,
    specification: def.specification,
    finish: def.finish,
    remarks: def.remarks,
  };
}
