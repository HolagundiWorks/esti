import { ESTIMATE_EDGE_TYPES } from "../../core/graphTypes.js";
import { EstimateEdge } from "./EstimateEdge.js";

/** React Flow edge type registry — keys must match ESTIMATE_EDGE_TYPES. */
export const estimateEdgeTypes = {
  [ESTIMATE_EDGE_TYPES.derivation]: EstimateEdge,
  [ESTIMATE_EDGE_TYPES.recipe]: EstimateEdge,
  [ESTIMATE_EDGE_TYPES.chapter]: EstimateEdge,
};
