/**
 * React Flow node/edge vocabulary for the Estimate data model.
 * Aligns with @esti/contracts: WorkItem → DerivationRule → child items;
 * RateItem → Recipe → Material; BBS MemberInput elements.
 */
import type { DerivationRule, MemberInput } from "@esti/contracts";

/** Registered React Flow node type keys. */
export const ESTIMATE_NODE_TYPES = {
  workChapter: "workChapter",
  rateItem: "rateItem",
  derivedItem: "derivedItem",
  material: "material",
  bbsElement: "bbsElement",
} as const;

export type EstimateNodeType = (typeof ESTIMATE_NODE_TYPES)[keyof typeof ESTIMATE_NODE_TYPES];

/** Registered React Flow edge type keys. */
export const ESTIMATE_EDGE_TYPES = {
  derivation: "derivation",
  recipe: "recipe",
  chapter: "chapter",
} as const;

export type EstimateEdgeType = (typeof ESTIMATE_EDGE_TYPES)[keyof typeof ESTIMATE_EDGE_TYPES];

/** Rate-book work-item chapter (parent grouping for rate lines). */
export interface WorkChapterNodeData extends Record<string, unknown> {
  kind: "workChapter";
  code: string;
  name: string;
  discipline?: string;
  itemCount: number;
}

/** Manual (measured) estimate line — parent in the derivation graph. */
export interface RateItemNodeData extends Record<string, unknown> {
  kind: "rateItem";
  itemId: string;
  code: string;
  shortName: string;
  uom: string;
  qty: number;
  ratePaise: number;
  section?: string;
}

/** Auto-derived child line (read-only in measure UI). */
export interface DerivedItemNodeData extends Record<string, unknown> {
  kind: "derivedItem";
  itemId: string;
  code: string;
  shortName: string;
  uom: string;
  qty: number;
  ratePaise: number;
  derivedFrom: string;
}

/** Procurement material aggregated from recipes × item qty. */
export interface MaterialNodeData extends Record<string, unknown> {
  kind: "material";
  code: string;
  name: string;
  unit: string;
  qty: number;
  fromItems: string[];
}

/** BBS structural member (slab, beam, column, footing). */
export interface BbsElementNodeData extends Record<string, unknown> {
  kind: "bbsElement";
  memberId: string;
  ref?: string;
  element: MemberInput["element"];
  totalKg: number;
}

export type EstimateNodeData =
  | WorkChapterNodeData
  | RateItemNodeData
  | DerivedItemNodeData
  | MaterialNodeData
  | BbsElementNodeData;

/** Parent rate item → derived child (DerivationRule from ESE pack). */
export interface DerivationEdgeData extends Record<string, unknown> {
  kind: "derivation";
  rule: DerivationRule["rule"];
  factor: number;
  parentCode: string;
  childCode: string;
}

/** Rate item → material (RateLibraryRecipe). */
export interface RecipeEdgeData extends Record<string, unknown> {
  kind: "recipe";
  coefficient: number;
  wastagePct: number;
  rateItemCode: string;
  materialCode: string;
}

/** Work chapter → rate item (structural grouping). */
export interface ChapterEdgeData extends Record<string, unknown> {
  kind: "chapter";
  workItemCode: string;
}

export type EstimateEdgeData = DerivationEdgeData | RecipeEdgeData | ChapterEdgeData;

/** Which subgraph layers to render on the canvas. */
export type GraphViewMode = "all" | "items" | "materials" | "bbs";

export function derivationRuleLabel(rule: DerivationRule["rule"], factor: number): string {
  switch (rule) {
    case "FACTOR":
      return factor === 1 ? "×1" : `×${factor}`;
    case "NET_OF_OPENINGS":
      return `net openings ×${factor}`;
    case "PERIMETER_X_HEIGHT":
      return `perim×h ×${factor}`;
    default:
      return rule;
  }
}
