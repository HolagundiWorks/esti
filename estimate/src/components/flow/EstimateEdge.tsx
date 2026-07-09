import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import {
  derivationRuleLabel,
  type DerivationEdgeData,
  type RecipeEdgeData,
} from "../../core/graphTypes.js";

type LabeledEdgeData = DerivationEdgeData | RecipeEdgeData;

export function EstimateEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    style,
    markerEnd,
  } = props;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const edgeData = data as LabeledEdgeData | undefined;

  const label =
    edgeData?.kind === "derivation"
      ? derivationRuleLabel(edgeData.rule, edgeData.factor)
      : edgeData?.kind === "recipe"
        ? `×${edgeData.coefficient}${edgeData.wastagePct ? ` +${edgeData.wastagePct}%` : ""}`
        : "";

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className={`est-flow-edge-label est-flow-edge-label--${edgeData?.kind ?? "default"}`}
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
