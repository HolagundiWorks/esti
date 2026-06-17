import { estimateTotals } from "@esti/contracts";
import { eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { estimateItems, estimates } from "../../db/schema.js";

/** Recompute and persist an estimate's subtotal/total from its items + lead. */
export async function recomputeEstimate(db: DB, estimateId: string) {
  const [est] = await db.select().from(estimates).where(eq(estimates.id, estimateId));
  if (!est) return;
  const items = await db.select().from(estimateItems).where(eq(estimateItems.estimateId, estimateId));
  const { subtotalPaise, totalPaise } = estimateTotals(
    items.map((i) => ({ qty: i.qty, ratePaise: i.ratePaise, itemLeadPct: i.itemLeadPct })),
    est.leadPct,
  );
  await db.update(estimates).set({ subtotalPaise, totalPaise }).where(eq(estimates.id, estimateId));
}
