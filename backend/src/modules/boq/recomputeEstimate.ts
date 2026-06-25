import { estimateItemAmount, percentageLineAmount, type BasisSelector } from "@esti/contracts";
import { eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { estimateItems, estimates } from "../../db/schema.js";

/**
 * Recompute and persist an estimate's item amounts + subtotal/total.
 *
 * Non-percentage lines (RATE_BOOK/AREA_RATE/COMPONENT/LUMPSUM/NON_MODELED):
 *   amount = qty × rate × (1 + item lead%).
 * PERCENTAGE lines: amount = pct × basis, where the basis is drawn only from
 *   non-percentage lines (so the result is deterministic and order-independent
 *   — no percentage-of-percentage). Flat estimates with no calc-type metadata
 *   behave exactly as before (every line is RATE_BOOK).
 */
export async function recomputeEstimate(db: DB, estimateId: string) {
  const [est] = await db.select().from(estimates).where(eq(estimates.id, estimateId));
  if (!est) return;
  const items = await db
    .select()
    .from(estimateItems)
    .where(eq(estimateItems.estimateId, estimateId));

  // 1. Base amounts for every non-percentage line.
  const baseAmounts = new Map<string, number>();
  for (const i of items) {
    if (i.calculationType !== "PERCENTAGE") {
      baseAmounts.set(i.id, estimateItemAmount(i.qty, i.ratePaise, i.itemLeadPct));
    }
  }

  // 2. Resolve each line's final amount, persisting any change.
  let subtotalPaise = 0;
  for (const i of items) {
    const amountPaise =
      i.calculationType === "PERCENTAGE"
        ? percentageLineAmount(basisAmount(i.basisSelector, items, baseAmounts), i.pct ?? 0)
        : (baseAmounts.get(i.id) ?? 0);
    if (amountPaise !== i.amountPaise) {
      await db.update(estimateItems).set({ amountPaise }).where(eq(estimateItems.id, i.id));
    }
    subtotalPaise += amountPaise;
  }

  const totalPaise = Math.round(subtotalPaise * (1 + est.leadPct / 100));
  await db.update(estimates).set({ subtotalPaise, totalPaise }).where(eq(estimates.id, estimateId));
}

/** Sum of base amounts a PERCENTAGE line is computed against. */
function basisAmount(
  selector: unknown,
  items: { id: string; costHead: string | null }[],
  baseAmounts: Map<string, number>,
): number {
  const sel = (selector ?? {}) as Partial<BasisSelector>;
  if (sel.kind === "COST_HEAD" && sel.costHead) {
    return items
      .filter((i) => i.costHead === sel.costHead)
      .reduce((s, i) => s + (baseAmounts.get(i.id) ?? 0), 0);
  }
  if (sel.kind === "ITEMS" && Array.isArray(sel.itemIds)) {
    const ids = new Set(sel.itemIds);
    return items.filter((i) => ids.has(i.id)).reduce((s, i) => s + (baseAmounts.get(i.id) ?? 0), 0);
  }
  // SUBTOTAL (default): all non-percentage lines.
  let sum = 0;
  for (const v of baseAmounts.values()) sum += v;
  return sum;
}
