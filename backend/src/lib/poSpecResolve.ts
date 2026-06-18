import type { PoItemInput } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { poItems, specItems, specSheets } from "../db/schema.js";

export type ResolvedPoLine = PoItemInput & {
  amountPaise: number;
  sortOrder: number;
  description: string;
  specItemId: string | null;
  catalogItemId: string | null;
};

/** Resolve PO lines and enforce spec/catalogue links belong to the project. */
export async function resolvePoLines(
  db: DB,
  projectId: string,
  items: PoItemInput[],
): Promise<ResolvedPoLine[]> {
  const specIds = items.map((i) => i.specItemId).filter((id): id is string => !!id);
  const specRows =
    specIds.length > 0
      ? await db
          .select({
            id: specItems.id,
            catalogItemId: specItems.catalogItemId,
            category: specItems.category,
            item: specItems.item,
            make: specItems.make,
            specification: specItems.specification,
            projectId: specSheets.projectId,
          })
          .from(specItems)
          .innerJoin(specSheets, eq(specItems.specSheetId, specSheets.id))
          .where(inArray(specItems.id, specIds))
      : [];
  const specById = new Map(specRows.map((r) => [r.id, r]));

  return items.map((input, index) => {
    const spec = input.specItemId ? specById.get(input.specItemId) : undefined;
    if (input.specItemId && !spec) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Specification row not found" });
    }
    if (spec && spec.projectId !== projectId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Specification row does not belong to this project",
      });
    }

    const catalogItemId = input.catalogItemId ?? spec?.catalogItemId ?? null;
    const description =
      input.description.trim() ||
      [spec?.item, spec?.make].filter(Boolean).join(" — ") ||
      "";

    if (!description) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Each line needs a description or a linked specification row",
      });
    }

    return {
      ...input,
      description,
      specItemId: input.specItemId ?? null,
      catalogItemId,
      amountPaise: Math.round(input.qty * input.ratePaise),
      sortOrder: (index + 1) * 10,
    };
  });
}

/** Load PO line items with spec linkage for display. */
export async function poItemsWithSpec(db: DB, poId: string) {
  return db
    .select({
      id: poItems.id,
      description: poItems.description,
      unit: poItems.unit,
      qty: poItems.qty,
      ratePaise: poItems.ratePaise,
      amountPaise: poItems.amountPaise,
      sortOrder: poItems.sortOrder,
      specItemId: poItems.specItemId,
      catalogItemId: poItems.catalogItemId,
      specItem: specItems.item,
      specCategory: specItems.category,
      specMake: specItems.make,
      specRef: specSheets.ref,
    })
    .from(poItems)
    .leftJoin(specItems, eq(poItems.specItemId, specItems.id))
    .leftJoin(specSheets, eq(specItems.specSheetId, specSheets.id))
    .where(eq(poItems.poId, poId))
    .orderBy(poItems.sortOrder);
}
