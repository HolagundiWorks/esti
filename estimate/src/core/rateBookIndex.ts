/**
 * In-memory index over a RateLibraryPack for fast lookup while estimating.
 */
import type {
  RateLibraryMaterial,
  RateLibraryPack,
  RateLibraryRateItem,
  RateLibraryRecipe,
  RateLibraryWorkItem,
} from "@esti/contracts";

export interface RateBookIndex {
  pack: RateLibraryPack;
  rateByCode: Map<string, RateLibraryRateItem>;
  workByCode: Map<string, RateLibraryWorkItem>;
  materialByCode: Map<string, RateLibraryMaterial>;
  recipesByItem: Map<string, RateLibraryRecipe[]>;
  /** Discipline / chapter name from work items (parent grouping). */
  sectionForItem: (rateItem: RateLibraryRateItem) => string;
}

export function indexRateBook(pack: RateLibraryPack): RateBookIndex {
  const rateByCode = new Map(pack.rateItems.map((r) => [r.code, r]));
  const workByCode = new Map(pack.workItems.map((w) => [w.code, w]));
  const materialByCode = new Map(pack.materials.map((m) => [m.code, m]));
  const recipesByItem = new Map<string, RateLibraryRecipe[]>();
  for (const recipe of pack.recipes) {
    const list = recipesByItem.get(recipe.rateItemCode) ?? [];
    list.push(recipe);
    recipesByItem.set(recipe.rateItemCode, list);
  }

  const sectionForItem = (rateItem: RateLibraryRateItem): string => {
    const parent = workByCode.get(rateItem.itemCode);
    if (parent?.discipline) return parent.discipline;
    if (parent?.name) return parent.name.replace(/:$/, "").trim();
    // Fall back: chapter from code prefix (e.g. "4.1.2" → "4")
    const top = rateItem.code.split(".")[0];
    const topWork = workByCode.get(top ?? "");
    if (topWork?.discipline) return topWork.discipline;
    if (topWork?.name) return topWork.name.replace(/:$/, "").trim();
    return rateItem.itemCode;
  };

  return { pack, rateByCode, workByCode, materialByCode, recipesByItem, sectionForItem };
}

export interface RateSearchHit {
  rate: RateLibraryRateItem;
  section: string;
}

/** Search rate items by code, short name, or specification text. */
export function searchRateItems(index: RateBookIndex, query: string, limit = 40): RateSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: RateSearchHit[] = [];
  for (const rate of index.pack.rateItems) {
    const hay = `${rate.code} ${rate.shortName} ${rate.specification ?? ""}`.toLowerCase();
    if (!hay.includes(q)) continue;
    hits.push({ rate, section: index.sectionForItem(rate) });
    if (hits.length >= limit) break;
  }
  return hits;
}
