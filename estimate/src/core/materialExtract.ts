/**
 * Derive procurement material lines from measured items × rate-book recipes.
 */
import { takeoffMaterials } from "@esti/contracts";
import type { MaterialLine, WorkItem } from "./model.js";
import type { RateBookIndex } from "./rateBookIndex.js";
import { itemQty } from "./itemQty.js";

export interface ComputedMaterial extends MaterialLine {
  /** Rate item codes that contributed to this material line. */
  fromItems: string[];
}

/** Aggregate material take-off across all estimate lines using pack recipes. */
export function computeMaterialsFromItems(
  items: WorkItem[],
  index: RateBookIndex | null,
): ComputedMaterial[] {
  if (!index) return [];

  const agg = new Map<
    string,
    { qty: number; fromItems: Set<string> }
  >();

  for (const item of items) {
    const recipes = index.recipesByItem.get(item.code);
    if (!recipes?.length) continue;
    const qty = itemQty(item);
    if (qty <= 0) continue;
    const lines = takeoffMaterials(
      qty,
      recipes.map((r) => ({
        materialCode: r.materialCode,
        coefficient: r.coefficient,
        wastagePct: r.wastagePct,
      })),
    );
    for (const line of lines) {
      const cur = agg.get(line.materialCode) ?? { qty: 0, fromItems: new Set() };
      cur.qty += line.qty;
      cur.fromItems.add(item.code);
      agg.set(line.materialCode, cur);
    }
  }

  return [...agg.entries()].map(([code, v]) => {
    const mat = index.materialByCode.get(code);
    return {
      id: code,
      code,
      name: mat?.name ?? code,
      unit: mat?.unit ?? "",
      qty: Math.round(v.qty * 1000) / 1000,
      ratePaise: mat?.ratePaise,
      fromItems: [...v.fromItems],
    };
  });
}
