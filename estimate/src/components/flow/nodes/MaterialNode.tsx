import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MaterialNodeData } from "../../../core/graphTypes.js";

export function MaterialNode({ data, selected }: NodeProps) {
  const d = data as MaterialNodeData;
  return (
    <div className={`est-flow-node est-flow-node--material${selected ? " est-flow-node--selected" : ""}`}>
      <Handle type="target" position={Position.Top} className="est-flow-handle" />
      <p className="est-flow-node__eyebrow">Material</p>
      <p className="est-flow-node__code">{d.code}</p>
      <p className="est-flow-node__title">{d.name}</p>
      <p className="est-flow-node__meta">
        {d.qty.toLocaleString("en-IN")} {d.unit}
      </p>
      {d.fromItems.length > 0 ? (
        <p className="est-flow-node__hint">← {d.fromItems.join(", ")}</p>
      ) : null}
    </div>
  );
}
