import { ESTIMATE_NODE_TYPES } from "../../core/graphTypes.js";
import { BbsElementNode } from "./nodes/BbsElementNode.js";
import { DerivedItemNode } from "./nodes/DerivedItemNode.js";
import { MaterialNode } from "./nodes/MaterialNode.js";
import { RateItemNode } from "./nodes/RateItemNode.js";
import { WorkChapterNode } from "./nodes/WorkChapterNode.js";

/** React Flow node type registry — keys must match ESTIMATE_NODE_TYPES. */
export const estimateNodeTypes = {
  [ESTIMATE_NODE_TYPES.workChapter]: WorkChapterNode,
  [ESTIMATE_NODE_TYPES.rateItem]: RateItemNode,
  [ESTIMATE_NODE_TYPES.derivedItem]: DerivedItemNode,
  [ESTIMATE_NODE_TYPES.material]: MaterialNode,
  [ESTIMATE_NODE_TYPES.bbsElement]: BbsElementNode,
};
