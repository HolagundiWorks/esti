import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { WorkChapterNodeData } from "../../../core/graphTypes.js";

export function WorkChapterNode({ data, selected }: NodeProps) {
  const d = data as WorkChapterNodeData;
  return (
    <div className={`est-flow-node est-flow-node--chapter${selected ? " est-flow-node--selected" : ""}`}>
      <Handle type="source" position={Position.Bottom} className="est-flow-handle" />
      <p className="est-flow-node__eyebrow">Chapter</p>
      <p className="est-flow-node__code">{d.code}</p>
      <p className="est-flow-node__title">{d.name}</p>
      {d.discipline ? <p className="est-flow-node__meta">{d.discipline}</p> : null}
      <p className="est-flow-node__qty">{d.itemCount} rate line{d.itemCount === 1 ? "" : "s"}</p>
    </div>
  );
}
