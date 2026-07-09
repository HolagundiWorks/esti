import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DerivedItemNodeData } from "../../../core/graphTypes.js";
import { inr } from "../../../lib/download.js";

export function DerivedItemNode({ data, selected }: NodeProps) {
  const d = data as DerivedItemNodeData;
  return (
    <div className={`est-flow-node est-flow-node--derived${selected ? " est-flow-node--selected" : ""}`}>
      <Handle type="target" position={Position.Top} className="est-flow-handle" />
      <Handle type="source" position={Position.Bottom} className="est-flow-handle" />
      <p className="est-flow-node__eyebrow">Derived</p>
      <p className="est-flow-node__code">{d.code}</p>
      <p className="est-flow-node__title">{d.shortName}</p>
      <p className="est-flow-node__meta">
        {d.qty.toLocaleString("en-IN")} {d.uom} · {inr(d.ratePaise)}
      </p>
      <p className="est-flow-node__hint">from {d.derivedFrom}</p>
    </div>
  );
}
