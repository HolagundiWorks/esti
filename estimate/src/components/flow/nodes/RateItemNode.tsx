import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { RateItemNodeData } from "../../../core/graphTypes.js";
import { inr } from "../../../lib/download.js";

export function RateItemNode({ data, selected }: NodeProps) {
  const d = data as RateItemNodeData;
  return (
    <div className={`est-flow-node est-flow-node--rate${selected ? " est-flow-node--selected" : ""}`}>
      <Handle type="target" position={Position.Top} className="est-flow-handle" />
      <Handle type="source" position={Position.Bottom} className="est-flow-handle" />
      <p className="est-flow-node__eyebrow">Rate item</p>
      <p className="est-flow-node__code">{d.code}</p>
      <p className="est-flow-node__title">{d.shortName}</p>
      <p className="est-flow-node__meta">
        {d.qty.toLocaleString("en-IN")} {d.uom} · {inr(d.ratePaise)}
      </p>
      {d.section ? <p className="est-flow-node__hint">{d.section}</p> : null}
    </div>
  );
}
