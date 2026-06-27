import {
  DesignItemInput,
  DesignItemUpdate,
  EstimateComponentCreate,
  EstimateFreezeInput,
  EstimateStage,
  type DerivedMaterial,
  type FormulaKey,
  PRESET_EXPRESSION,
  type RuleSetNode,
  aggregateMaterials,
  collectMaterials,
  deriveRuleSet,
  estimateItemAmount,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import {
  componentRelated,
  components,
  estimateComponents,
  estimateItems,
  estimateVersions,
  estimates,
} from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { assertPlanFeature } from "../../lib/plan.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";
import { expandComponentToEstimate, removeEstimateComponent } from "./autoBoq.js";
import { recomputeEstimate } from "./recomputeEstimate.js";

/** Statuses in which an estimate's lines may still be edited. */
const EDITABLE_STATUSES = new Set(["DRAFT", "UNDER_REVIEW", "EXECUTION_DETAILING"]);

async function assertEditable(db: DB, estimateId: string) {
  const [est] = await db
    .select({ status: estimates.status })
    .from(estimates)
    .where(eq(estimates.id, estimateId));
  if (!est) throw new TRPCError({ code: "NOT_FOUND" });
  if (!EDITABLE_STATUSES.has(est.status)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This estimate is frozen — revise it to edit." });
  }
}

type ComponentRow = typeof components.$inferSelect;

/**
 * Build the RuleSet graph reachable from a root component (BFS over dependency
 * edges) for the pure derivation engine. Legacy components fall back to their
 * preset expression; legacy edges to a ratio-formula or `quantity × factor`.
 */
async function buildRuleSetRegistry(
  db: DB,
  rootId: string,
  includeDependencies: boolean,
): Promise<{ rootCode: string; registry: Map<string, RuleSetNode> }> {
  const byId = new Map<string, ComponentRow>();
  const edgesByParent = new Map<string, (typeof componentRelated.$inferSelect)[]>();
  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (byId.has(id)) continue;
    const [comp] = await db.select().from(components).where(eq(components.id, id));
    if (!comp) continue;
    byId.set(id, comp);
    if (!includeDependencies) continue;
    const edges = await db
      .select()
      .from(componentRelated)
      .where(eq(componentRelated.parentComponentId, id))
      .orderBy(asc(componentRelated.sequence));
    edgesByParent.set(id, edges);
    for (const e of edges) queue.push(e.childComponentId);
  }
  const root = byId.get(rootId);
  if (!root) throw new TRPCError({ code: "NOT_FOUND", message: "RuleSet not found." });

  const registry = new Map<string, RuleSetNode>();
  for (const [id, comp] of byId) {
    const edges = edgesByParent.get(id) ?? [];
    registry.set(comp.code, {
      code: comp.code,
      name: comp.name,
      uom: comp.uom,
      quantityFormula: comp.quantityFormula ?? PRESET_EXPRESSION[comp.formulaKey as FormulaKey] ?? "0",
      boqSplitters: Array.isArray(comp.boqSplitters)
        ? (comp.boqSplitters as RuleSetNode["boqSplitters"])
        : [],
      materialSplitters: Array.isArray(comp.materialSplitters)
        ? (comp.materialSplitters as RuleSetNode["materialSplitters"])
        : [],
      dependencies: edges
        .map((e) => ({
          childCode: byId.get(e.childComponentId)?.code ?? "",
          quantityFormula:
            e.quantityFormula ??
            (e.ratioFormulaKey
              ? PRESET_EXPRESSION[e.ratioFormulaKey as FormulaKey]
              : `quantity * ${e.qtyFactor}`),
          sequence: e.sequence,
        }))
        .filter((d) => d.childCode),
    });
  }
  return { rootCode: root.code, registry };
}

/**
 * Normalise a design line into the flat (qty, rate, lead) shape the recompute
 * engine understands. LUMPSUM/NON_MODELED collapse to qty 1 × amount; PERCENTAGE
 * carries pct + basis and is valued during recompute.
 */
function normaliseDesignLine(input: {
  calculationType: DesignItemInput["calculationType"];
  qty: number;
  ratePaise: number;
  itemLeadPct: number;
  pct?: number | null;
  basis?: DesignItemInput["basis"];
}) {
  switch (input.calculationType) {
    case "LUMPSUM":
    case "NON_MODELED":
      return { qty: 1, ratePaise: input.ratePaise, itemLeadPct: 0, pct: null, basisSelector: {} };
    case "PERCENTAGE":
      return {
        qty: 0,
        ratePaise: 0,
        itemLeadPct: 0,
        pct: input.pct ?? 0,
        basisSelector: input.basis ?? { kind: "SUBTOTAL" as const },
      };
    default: // RATE_BOOK / AREA_RATE / COMPONENT
      return {
        qty: input.qty,
        ratePaise: input.ratePaise,
        itemLeadPct: input.itemLeadPct,
        pct: null,
        basisSelector: {},
      };
  }
}

export const designEstimateRouter = router({
  /** Switch an estimate between design-stage and execution-stage working. */
  setStage: protectedProcedure
    .input(z.object({ id: z.string().uuid(), stage: EstimateStage }))
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      await assertEditable(ctx.db, input.id);
      const [before] = await ctx.db
        .select({ stage: estimates.stage })
        .from(estimates)
        .where(eq(estimates.id, input.id));
      await ctx.db.update(estimates).set({ stage: input.stage }).where(eq(estimates.id, input.id));
      await writeAudit(ctx.db, {
        entity: "estimate",
        entityId: input.id,
        action: "STAGE_CHANGE",
        actorId: ctx.user.id,
        before: { stage: before?.stage },
        after: { stage: input.stage },
      });
      return { ok: true };
    }),

  /** Add a design-stage line (cost head + calculation type + confidence). */
  addItem: protectedProcedure.input(DesignItemInput).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    await assertEditable(ctx.db, input.estimateId);
    const n = normaliseDesignLine(input);
    const amountPaise = estimateItemAmount(n.qty, n.ratePaise, n.itemLeadPct);
    const [row] = await ctx.db
      .insert(estimateItems)
      .values({
        estimateId: input.estimateId,
        sourceKind: "MANUAL",
        description: input.description,
        unit: input.unit,
        qty: n.qty,
        ratePaise: n.ratePaise,
        itemLeadPct: n.itemLeadPct,
        amountPaise,
        costHead: input.costHead,
        calculationType: input.calculationType,
        confidence: input.confidence,
        pct: n.pct,
        basisSelector: n.basisSelector,
        sortOrder: input.sortOrder,
      })
      .returning();
    await recomputeEstimate(ctx.db, input.estimateId);
    await writeAudit(ctx.db, {
      entity: "estimateitem",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { calculationType: input.calculationType, costHead: input.costHead },
    });
    return row!;
  }),

  /** Edit a design-stage line. */
  updateItem: protectedProcedure.input(DesignItemUpdate).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const [item] = await ctx.db.select().from(estimateItems).where(eq(estimateItems.id, input.id));
    if (!item) throw new TRPCError({ code: "NOT_FOUND" });
    await assertEditable(ctx.db, item.estimateId);
    const calculationType = input.calculationType ?? item.calculationType;
    const n = normaliseDesignLine({
      calculationType: calculationType as DesignItemInput["calculationType"],
      qty: input.qty ?? item.qty,
      ratePaise: input.ratePaise ?? item.ratePaise,
      itemLeadPct: input.itemLeadPct ?? item.itemLeadPct,
      pct: input.pct ?? item.pct,
      basis: input.basis ?? (item.basisSelector as DesignItemInput["basis"]),
    });
    await ctx.db
      .update(estimateItems)
      .set({
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.costHead !== undefined ? { costHead: input.costHead } : {}),
        ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        calculationType,
        qty: n.qty,
        ratePaise: n.ratePaise,
        itemLeadPct: n.itemLeadPct,
        pct: n.pct,
        basisSelector: n.basisSelector,
        amountPaise: estimateItemAmount(n.qty, n.ratePaise, n.itemLeadPct),
      })
      .where(eq(estimateItems.id, input.id));
    await recomputeEstimate(ctx.db, item.estimateId);
    return { ok: true };
  }),

  /** Freeze the current estimate into an immutable version snapshot. */
  freeze: protectedProcedure.input(EstimateFreezeInput).mutation(async ({ ctx, input }) => {
    await assertPlanFeature(ctx.db, "costing");
    const [est] = await ctx.db.select().from(estimates).where(eq(estimates.id, input.estimateId));
    if (!est) throw new TRPCError({ code: "NOT_FOUND" });
    if (!EDITABLE_STATUSES.has(est.status)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Estimate is already frozen." });
    }
    const items = await ctx.db
      .select()
      .from(estimateItems)
      .where(eq(estimateItems.estimateId, input.estimateId))
      .orderBy(asc(estimateItems.sortOrder), asc(estimateItems.createdAt));
    const nextStatus = est.stage === "EXECUTION" ? "EXECUTION_FROZEN" : "DESIGN_FROZEN";
    const [version] = await ctx.db
      .insert(estimateVersions)
      .values({
        estimateId: est.id,
        versionNo: est.versionNo ?? 1,
        stage: est.stage,
        status: nextStatus,
        subtotalPaise: est.subtotalPaise,
        totalPaise: est.totalPaise,
        snapshot: { estimate: est, items },
        note: input.note ?? null,
        frozenBy: ctx.user.id,
      })
      .returning();
    await ctx.db.update(estimates).set({ status: nextStatus }).where(eq(estimates.id, est.id));
    await writeAudit(ctx.db, {
      entity: "estimate",
      entityId: est.id,
      action: "FREEZE",
      actorId: ctx.user.id,
      after: { versionNo: version!.versionNo, status: nextStatus, totalPaise: est.totalPaise },
    });
    return version!;
  }),

  /** Immutable freeze history for an estimate (newest first). */
  versions: protectedProcedure
    .input(z.object({ estimateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(estimateVersions)
        .where(eq(estimateVersions.estimateId, input.estimateId))
        .orderBy(desc(estimateVersions.versionNo), desc(estimateVersions.frozenAt));
    }),

  // --- Component execution detail (auto-BOQ) --------------------------------

  /** Component instances placed on an estimate. */
  listComponents: protectedProcedure
    .input(z.object({ estimateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(estimateComponents)
        .where(eq(estimateComponents.estimateId, input.estimateId))
        .orderBy(asc(estimateComponents.sortOrder), asc(estimateComponents.createdAt));
    }),

  /** Place a component (+ related templates) and expand it into auto-BOQ lines. */
  addComponent: protectedProcedure
    .input(EstimateComponentCreate)
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      await assertEditable(ctx.db, input.estimateId);
      const result = await expandComponentToEstimate(ctx.db, {
        estimateId: input.estimateId,
        componentId: input.componentId,
        designItemId: input.designItemId ?? null,
        params: input.params,
        costHead: input.costHead,
        includeRelated: input.includeRelated,
        sortOrder: input.sortOrder,
      });
      await recomputeEstimate(ctx.db, input.estimateId);
      await writeAudit(ctx.db, {
        entity: "estimate",
        entityId: input.estimateId,
        action: "COMPONENT_EXPAND",
        actorId: ctx.user.id,
        after: { componentId: input.componentId, lineCount: result.itemIds.length },
      });
      return result;
    }),

  /** Remove a component instance and the auto-BOQ line it generated. */
  removeComponent: protectedProcedure
    .input(z.object({ estimateComponentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      const [ec] = await ctx.db
        .select({ estimateId: estimateComponents.estimateId })
        .from(estimateComponents)
        .where(eq(estimateComponents.id, input.estimateComponentId));
      if (!ec) return { ok: true };
      await assertEditable(ctx.db, ec.estimateId);
      await removeEstimateComponent(ctx.db, input.estimateComponentId);
      await recomputeEstimate(ctx.db, ec.estimateId);
      return { ok: true };
    }),

  /**
   * Live RuleSet derivation preview (no persistence): primary quantity → BOQ
   * splitters → material splitters → dependency chain. Powers the operator's
   * "enter once, see everything derived" execution panel.
   */
  derivePreview: protectedProcedure
    .input(
      z.object({
        componentId: z.string().uuid(),
        params: z.record(z.string(), z.number()).default({}),
        includeDependencies: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      const { rootCode, registry } = await buildRuleSetRegistry(
        ctx.db,
        input.componentId,
        input.includeDependencies,
      );
      try {
        return deriveRuleSet(rootCode, input.params, registry);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Could not derive — complete the inputs.",
        });
      }
    }),

  /**
   * Aggregated material requirements derived from the placed RuleSets on this
   * estimate (parent + dependency-chain material splitters), summed by material
   * + unit — the procurement-facing rollup.
   */
  materialForecast: protectedProcedure
    .input(z.object({ estimateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPlanFeature(ctx.db, "costing");
      const placed = await ctx.db
        .select()
        .from(estimateComponents)
        .where(eq(estimateComponents.estimateId, input.estimateId));
      const all: DerivedMaterial[] = [];
      for (const p of placed) {
        try {
          const { rootCode, registry } = await buildRuleSetRegistry(ctx.db, p.componentId, true);
          const tree = deriveRuleSet(rootCode, (p.params ?? {}) as Record<string, number>, registry);
          all.push(...collectMaterials(tree));
        } catch {
          // Skip a placement whose RuleSet inputs are incomplete.
        }
      }
      return aggregateMaterials(all);
    }),
});
