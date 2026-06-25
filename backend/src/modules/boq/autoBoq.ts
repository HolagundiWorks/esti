import { estimateItemAmount, evalFormula, type FormulaKey } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import {
  componentRelated,
  components,
  dsrItems,
  estimateComponents,
  estimateItems,
  rateAnalyses,
} from "../../db/schema.js";

type ComponentRow = typeof components.$inferSelect;

/** Quantity from a formula; 0 when required inputs are missing, so the
 * generated line still appears for the user to complete. */
function safeQty(formulaKey: string, params: Record<string, number>): number {
  try {
    return evalFormula(formulaKey as FormulaKey, params);
  } catch {
    return 0;
  }
}

/** Resolve a component's unit rate (paise) from its declared rate source. */
async function resolveComponentRate(db: DB, component: ComponentRow): Promise<number> {
  if (component.rateSource === "RATE_BOOK" && component.dsrItemId) {
    const [d] = await db
      .select({ r: dsrItems.ratePaise })
      .from(dsrItems)
      .where(eq(dsrItems.id, component.dsrItemId));
    return d?.r ?? 0;
  }
  if (component.rateSource === "RATE_ANALYSIS" && component.rateAnalysisId) {
    const [a] = await db
      .select({ r: rateAnalyses.analysedRatePaise })
      .from(rateAnalyses)
      .where(eq(rateAnalyses.id, component.rateAnalysisId));
    return a?.r ?? 0;
  }
  return 0; // MANUAL — user fills the rate on the generated line.
}

/** Insert one component instance + its auto-BOQ line; returns the new ids. */
async function placeComponent(
  db: DB,
  args: {
    estimateId: string;
    component: ComponentRow;
    qty: number;
    formulaKey: string;
    params: Record<string, number>;
    costHead?: string | null;
    designItemId?: string | null;
    sortOrder: number;
  },
): Promise<{ estimateComponentId: string; itemId: string }> {
  const ratePaise = await resolveComponentRate(db, args.component);
  const [ec] = await db
    .insert(estimateComponents)
    .values({
      estimateId: args.estimateId,
      componentId: args.component.id,
      designItemId: args.designItemId ?? null,
      params: args.params,
      qtyFormulaKey: args.formulaKey,
      computedQty: args.qty,
      uom: args.component.uom,
      costHead: args.costHead ?? null,
      sortOrder: args.sortOrder,
    })
    .returning();
  const amountPaise = estimateItemAmount(args.qty, ratePaise, 0);
  const [item] = await db
    .insert(estimateItems)
    .values({
      estimateId: args.estimateId,
      sourceKind: "COMPONENT",
      description: args.component.name,
      unit: args.component.uom,
      qty: args.qty,
      ratePaise,
      itemLeadPct: 0,
      amountPaise,
      calculationType: "COMPONENT",
      costHead: args.costHead ?? null,
      componentId: args.component.id,
      estimateComponentId: ec!.id,
      sortOrder: args.sortOrder,
    })
    .returning();
  return { estimateComponentId: ec!.id, itemId: item!.id };
}

/**
 * Expand a component (and, optionally, its related-item templates) into the
 * estimate as `sourceKind="COMPONENT"` lines — the auto-BOQ. Quantities come
 * from the deterministic formula registry; rates from the component's rate
 * source. The caller is responsible for recomputing the estimate afterwards.
 */
export async function expandComponentToEstimate(
  db: DB,
  input: {
    estimateId: string;
    componentId: string;
    designItemId?: string | null;
    params: Record<string, number>;
    costHead?: string | undefined;
    includeRelated: boolean;
    sortOrder: number;
  },
): Promise<{ estimateComponentId: string; itemIds: string[] }> {
  const [component] = await db.select().from(components).where(eq(components.id, input.componentId));
  if (!component) throw new TRPCError({ code: "NOT_FOUND", message: "Component not found." });

  const parent = await placeComponent(db, {
    estimateId: input.estimateId,
    component,
    qty: safeQty(component.formulaKey, input.params),
    formulaKey: component.formulaKey,
    params: input.params,
    costHead: input.costHead ?? null,
    designItemId: input.designItemId ?? null,
    sortOrder: input.sortOrder,
  });

  const itemIds = [parent.itemId];

  if (input.includeRelated) {
    const rels = await db
      .select()
      .from(componentRelated)
      .where(eq(componentRelated.parentComponentId, component.id))
      .orderBy(asc(componentRelated.sequence));
    let seq = input.sortOrder;
    for (const rel of rels) {
      const [child] = await db.select().from(components).where(eq(components.id, rel.childComponentId));
      if (!child) continue;
      const formulaKey = rel.ratioFormulaKey ?? child.formulaKey;
      const childQty = Number((safeQty(formulaKey, input.params) * rel.qtyFactor).toFixed(4));
      seq += 1;
      const placed = await placeComponent(db, {
        estimateId: input.estimateId,
        component: child,
        qty: childQty,
        formulaKey,
        params: input.params,
        costHead: input.costHead ?? null,
        designItemId: input.designItemId ?? null,
        sortOrder: seq,
      });
      itemIds.push(placed.itemId);
    }
  }

  return { estimateComponentId: parent.estimateComponentId, itemIds };
}

/** Remove a component instance and the auto-BOQ line it generated. Returns the
 * estimate id so the caller can recompute. */
export async function removeEstimateComponent(db: DB, estimateComponentId: string): Promise<string | null> {
  const [ec] = await db
    .select({ estimateId: estimateComponents.estimateId })
    .from(estimateComponents)
    .where(eq(estimateComponents.id, estimateComponentId));
  if (!ec) return null;
  await db.delete(estimateItems).where(eq(estimateItems.estimateComponentId, estimateComponentId));
  await db.delete(estimateComponents).where(eq(estimateComponents.id, estimateComponentId));
  return ec.estimateId;
}
