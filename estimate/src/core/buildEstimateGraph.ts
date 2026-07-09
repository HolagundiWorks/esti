/**
 * Build a React Flow graph from the working estimate model + rate book index.
 * Quantities are read-only on the canvas — they flow from measurements via itemQty.
 */
import type { Edge, Node } from "@xyflow/react";
import type { EstimateModel } from "./model.js";
import type { RateBookIndex } from "./rateBookIndex.js";
import { itemQty } from "./itemQty.js";
import { computeMaterialsFromItems } from "./materialExtract.js";
import { computeAllMembers } from "./bbsCompute.js";
import {
  ESTIMATE_EDGE_TYPES,
  ESTIMATE_NODE_TYPES,
  type EstimateEdgeData,
  type EstimateNodeData,
  type GraphViewMode,
} from "./graphTypes.js";

const COL_W = 260;
const ROW_H = 110;
const MAT_ROW_H = 90;
const BBS_COL_X = 40;
const ITEMS_ORIGIN_X = 320;
const ITEMS_ORIGIN_Y = 40;

export interface EstimateGraph {
  nodes: Node<EstimateNodeData>[];
  edges: Edge<EstimateEdgeData>[];
}

function chapterId(code: string): string {
  return `chapter:${code}`;
}

function itemNodeId(itemId: string): string {
  return `item:${itemId}`;
}

function materialNodeId(code: string): string {
  return `material:${code}`;
}

function bbsNodeId(memberId: string): string {
  return `bbs:${memberId}`;
}

/** Layered layout: chapters → parent items → derived → materials; BBS island left. */
export function buildEstimateGraph(
  model: EstimateModel,
  index: RateBookIndex | null,
  mode: GraphViewMode = "all",
): EstimateGraph {
  if (!index) return { nodes: [], edges: [] };

  const showItems = mode === "all" || mode === "items";
  const showMaterials = mode === "all" || mode === "materials";
  const showBbs = mode === "all" || mode === "bbs";
  const includeItemNodes = showItems || showMaterials;

  const nodes: Node<EstimateNodeData>[] = [];
  const edges: Edge<EstimateEdgeData>[] = [];

  const parents = model.items.filter((it) => !it.derivedFrom);
  const derived = model.items.filter((it) => it.derivedFrom);

  if (showBbs && model.bbs.length > 0) {
    const members = computeAllMembers(model.bbs);
    model.bbs.forEach((row, i) => {
      const computed = members[i];
      nodes.push({
        id: bbsNodeId(row.id),
        type: ESTIMATE_NODE_TYPES.bbsElement,
        position: { x: BBS_COL_X, y: ITEMS_ORIGIN_Y + i * ROW_H },
        data: {
          kind: "bbsElement",
          memberId: row.id,
          ref: row.ref,
          element: row.element,
          totalKg: computed?.totalWeightKg ?? 0,
        },
      });
    });
  }

  if (!includeItemNodes) {
    return { nodes, edges };
  }

  const chapterBuckets = new Map<string, typeof parents>();
  for (const item of parents) {
    const rate = index.rateByCode.get(item.code);
    const chapterCode = rate?.itemCode ?? item.itemCode ?? "misc";
    const list = chapterBuckets.get(chapterCode) ?? [];
    list.push(item);
    chapterBuckets.set(chapterCode, list);
  }

  let chapterRow = 0;
  const parentPositions = new Map<string, { x: number; y: number }>();

  for (const [chapterCode, chapterItems] of chapterBuckets) {
    const work = index.workByCode.get(chapterCode);
    const chapterY = ITEMS_ORIGIN_Y + chapterRow * (ROW_H * 4);
    const chId = chapterId(chapterCode);

    if (showItems) {
      nodes.push({
        id: chId,
        type: ESTIMATE_NODE_TYPES.workChapter,
        position: { x: ITEMS_ORIGIN_X, y: chapterY },
        data: {
          kind: "workChapter",
          code: chapterCode,
          name: work?.name ?? chapterCode,
          discipline: work?.discipline,
          itemCount: chapterItems.length,
        },
      });
    }

    chapterItems.forEach((item, col) => {
      const x = ITEMS_ORIGIN_X + COL_W + col * (COL_W + 24);
      const y = chapterY + ROW_H;
      parentPositions.set(item.id, { x, y });

      nodes.push({
        id: itemNodeId(item.id),
        type: ESTIMATE_NODE_TYPES.rateItem,
        position: { x, y },
        data: {
          kind: "rateItem",
          itemId: item.id,
          code: item.code,
          shortName: item.shortName,
          uom: item.uom,
          qty: itemQty(item),
          ratePaise: item.ratePaise,
          section: item.section ?? index.sectionForItem(index.rateByCode.get(item.code)!),
        },
      });

      if (showItems) {
        edges.push({
          id: `chapter:${chapterCode}->${item.id}`,
          type: ESTIMATE_EDGE_TYPES.chapter,
          source: chId,
          target: itemNodeId(item.id),
          data: { kind: "chapter", workItemCode: chapterCode },
        });

        const rate = index.rateByCode.get(item.code);
        if (rate?.derivations.length) {
          for (const rule of rate.derivations) {
            const childInEstimate = derived.find(
              (d) => d.derivedFrom === item.code && d.code === rule.childItemCode,
            );
            if (!childInEstimate) continue;
            edges.push({
              id: `deriv:${item.code}->${rule.childItemCode}`,
              type: ESTIMATE_EDGE_TYPES.derivation,
              source: itemNodeId(item.id),
              target: itemNodeId(childInEstimate.id),
              data: {
                kind: "derivation",
                rule: rule.rule,
                factor: rule.factor,
                parentCode: item.code,
                childCode: rule.childItemCode,
              },
            });
          }
        }
      }
    });

    chapterRow += 1;
  }

  if (showItems) {
    for (const child of derived) {
      const parent = parents.find((p) => p.code === child.derivedFrom);
      const parentPos = parent ? parentPositions.get(parent.id) : undefined;
      const x = parentPos?.x ?? ITEMS_ORIGIN_X + COL_W;
      const y = (parentPos?.y ?? ITEMS_ORIGIN_Y) + ROW_H;

      nodes.push({
        id: itemNodeId(child.id),
        type: ESTIMATE_NODE_TYPES.derivedItem,
        position: { x, y: y + ROW_H * 0.85 },
        data: {
          kind: "derivedItem",
          itemId: child.id,
          code: child.code,
          shortName: child.shortName,
          uom: child.uom,
          qty: itemQty(child),
          ratePaise: child.ratePaise,
          derivedFrom: child.derivedFrom!,
        },
      });
    }
  }

  if (showMaterials) {
    const materials = computeMaterialsFromItems(model.items, index);
    const maxItemY =
      nodes.length > 0
        ? Math.max(...nodes.map((n) => n.position.y)) + ROW_H * 1.5
        : ITEMS_ORIGIN_Y;

    materials.forEach((mat, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = ITEMS_ORIGIN_X + col * (COL_W + 20);
      const y = maxItemY + row * MAT_ROW_H;

      nodes.push({
        id: materialNodeId(mat.code),
        type: ESTIMATE_NODE_TYPES.material,
        position: { x, y },
        data: {
          kind: "material",
          code: mat.code,
          name: mat.name,
          unit: mat.unit,
          qty: mat.qty,
          fromItems: mat.fromItems,
        },
      });

      for (const rateCode of mat.fromItems) {
        const sourceItem = model.items.find((it) => it.code === rateCode);
        if (!sourceItem) continue;
        const recipes = index.recipesByItem.get(rateCode) ?? [];
        const recipe = recipes.find((r) => r.materialCode === mat.code);
        if (!recipe) continue;

        edges.push({
          id: `recipe:${rateCode}->${mat.code}`,
          type: ESTIMATE_EDGE_TYPES.recipe,
          source: itemNodeId(sourceItem.id),
          target: materialNodeId(mat.code),
          data: {
            kind: "recipe",
            coefficient: recipe.coefficient,
            wastagePct: recipe.wastagePct,
            rateItemCode: rateCode,
            materialCode: mat.code,
          },
        });
      }
    });
  }

  return { nodes, edges };
}
