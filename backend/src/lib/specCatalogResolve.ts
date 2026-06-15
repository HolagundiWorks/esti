import type { SpecItemInput } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { inArray } from "drizzle-orm";
import type { db } from "../db/index.js";
import { specCatalogItems } from "../db/schema.js";

type Db = typeof db;

type ResolvedSpecItem = {
  catalogItemId: string | null;
  category: string | null;
  item: string;
  make: string | null;
  specification: string | null;
  finish: string | null;
  remarks: string | null;
  sortOrder: number;
};

export async function resolveSpecSheetItems(
  db: Db,
  items: SpecItemInput[],
): Promise<ResolvedSpecItem[]> {
  const catalogIds = items
    .map((row) => row.catalogItemId)
    .filter((id): id is string => !!id);
  const catalogRows =
    catalogIds.length > 0
      ? await db
          .select()
          .from(specCatalogItems)
          .where(inArray(specCatalogItems.id, catalogIds))
      : [];
  const byId = new Map(catalogRows.map((row) => [row.id, row]));

  return items.map((input, index) => {
    const catalog = input.catalogItemId
      ? byId.get(input.catalogItemId)
      : undefined;
    if (input.catalogItemId && !catalog) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Catalogue item not found: ${input.catalogItemId}`,
      });
    }
    const item = (input.item?.trim() || catalog?.item || "").trim();
    if (!item) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Each row needs an item name or catalogue reference",
      });
    }
    return {
      catalogItemId: input.catalogItemId ?? null,
      category: input.category ?? catalog?.category ?? null,
      item,
      make: input.make ?? catalog?.make ?? null,
      specification: input.specification ?? catalog?.specification ?? null,
      finish: input.finish ?? catalog?.finish ?? null,
      remarks: input.remarks ?? catalog?.remarks ?? null,
      sortOrder: (index + 1) * 10,
    };
  });
}
