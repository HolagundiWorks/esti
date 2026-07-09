import { type NodeProps } from "@xyflow/react";
import type { BbsElementNodeData } from "../../../core/graphTypes.js";

const ELEMENT_LABEL: Record<BbsElementNodeData["element"], string> = {
  SLAB: "Slab",
  BEAM: "Beam",
  COLUMN: "Column",
  FOOTING: "Footing",
};

export function BbsElementNode({ data, selected }: NodeProps) {
  const d = data as BbsElementNodeData;
  return (
    <div className={`est-flow-node est-flow-node--bbs${selected ? " est-flow-node--selected" : ""}`}>
      <p className="est-flow-node__eyebrow">BBS element</p>
      <p className="est-flow-node__code">{ELEMENT_LABEL[d.element]}</p>
      <p className="est-flow-node__title">{d.ref || d.memberId}</p>
      <p className="est-flow-node__meta">{d.totalKg.toLocaleString("en-IN")} kg steel</p>
    </div>
  );
}
