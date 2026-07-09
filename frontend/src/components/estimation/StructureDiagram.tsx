import { Box, Typography } from "@mui/material";
import type { CmsStructureClass } from "@esti/contracts";
import { STRUCTURE_CLASS_LABEL } from "./constants.js";

export type DiagramElement = {
  id: string;
  code: string;
  description: string;
  structureClass: string | null;
  parentElementId: string | null;
  dependsOnElementId: string | null;
  locationName: string | null;
  bbsElement: string | null;
};

type NodePos = { x: number; y: number; w: number; h: number };

function laneX(structureClass: string | null, laneWidth: number): number {
  const idx = structureClass === "SUBSTRUCTURE" ? 0 : structureClass === "SUPERSTRUCTURE" ? 1 : 2;
  return 24 + idx * (laneWidth + 32);
}

/** ER-style structure diagram — elements as nodes, dependencies as edges. */
export function StructureDiagram({
  elements,
  selectedId,
  onSelect,
}: {
  elements: DiagramElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const laneWidth = 220;
  const nodeH = 52;
  const gapY = 16;
  const lanes: CmsStructureClass[] = ["SUBSTRUCTURE", "SUPERSTRUCTURE", "FINISHES"];

  const byLane = new Map<string, DiagramElement[]>();
  for (const el of elements) {
    const key = el.structureClass ?? "SUPERSTRUCTURE";
    if (!byLane.has(key)) byLane.set(key, []);
    byLane.get(key)!.push(el);
  }

  const positions = new Map<string, NodePos>();
  let maxY = 80;
  for (const lane of lanes) {
    const list = byLane.get(lane) ?? [];
    list.forEach((el, i) => {
      const y = 72 + i * (nodeH + gapY);
      positions.set(el.id, { x: laneX(lane, laneWidth), y, w: laneWidth, h: nodeH });
      maxY = Math.max(maxY, y + nodeH + 40);
    });
  }

  const width = laneX("FINISHES", laneWidth) + laneWidth + 24;
  const height = maxY;

  const edges: { from: NodePos; to: NodePos; dashed?: boolean }[] = [];
  for (const el of elements) {
    const from = positions.get(el.id);
    if (!from) continue;
    const parentId = el.dependsOnElementId ?? el.parentElementId;
    if (!parentId) continue;
    const to = positions.get(parentId);
    if (!to) continue;
    edges.push({
      from: { ...from, x: from.x + from.w / 2, y: from.y },
      to: { ...to, x: to.x + to.w / 2, y: to.y + to.h },
      dashed: !!el.dependsOnElementId,
    });
  }

  return (
    <Box
      sx={{
        overflow: "auto",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.paper",
        minHeight: 360,
      }}
    >
      <svg width={width} height={height} role="img" aria-label="Structure relationship diagram">
        {lanes.map((lane) => (
          <g key={lane}>
            <rect
              x={laneX(lane, laneWidth) - 8}
              y={48}
              width={laneWidth + 16}
              height={height - 56}
              fill="var(--cds-layer-accent-01, rgba(0,0,0,0.02))"
              rx={8}
            />
            <text
              x={laneX(lane, laneWidth) + laneWidth / 2}
              y={32}
              textAnchor="middle"
              fontSize={12}
              fill="currentColor"
              opacity={0.7}
            >
              {STRUCTURE_CLASS_LABEL[lane]}
            </text>
          </g>
        ))}

        {edges.map((e, i) => (
          <line
            key={i}
            x1={e.from.x}
            y1={e.from.y}
            x2={e.to.x}
            y2={e.to.y}
            stroke="var(--cds-border-subtle-01, #c6c6c6)"
            strokeWidth={1.5}
            strokeDasharray={e.dashed ? "4 3" : undefined}
            markerEnd="url(#arrow)"
          />
        ))}
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--cds-border-subtle-01, #8d8d8d)" />
          </marker>
        </defs>

        {elements.map((el) => {
          const pos = positions.get(el.id);
          if (!pos) return null;
          const selected = el.id === selectedId;
          return (
            <g
              key={el.id}
              style={{ cursor: "pointer" }}
              onClick={() => onSelect(el.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") onSelect(el.id);
              }}
            >
              <rect
                x={pos.x}
                y={pos.y}
                width={pos.w}
                height={pos.h}
                rx={6}
                fill={selected ? "var(--cds-layer-selected-01, #e0e0e0)" : "var(--cds-layer-01, #fff)"}
                stroke={selected ? "var(--cds-border-interactive, #0f62fe)" : "var(--cds-border-subtle-01, #e0e0e0)"}
                strokeWidth={selected ? 2 : 1}
              />
              <text x={pos.x + 10} y={pos.y + 20} fontSize={11} fontWeight={600} fill="currentColor">
                {el.code}
              </text>
              <text x={pos.x + 10} y={pos.y + 38} fontSize={10} fill="currentColor" opacity={0.75}>
                {el.description.length > 28 ? `${el.description.slice(0, 26)}…` : el.description}
              </text>
              {el.bbsElement && (
                <text x={pos.x + pos.w - 8} y={pos.y + 20} fontSize={9} textAnchor="end" fill="currentColor" opacity={0.6}>
                  {el.bbsElement}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {elements.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
          Add locations and elements to build the structure model.
        </Typography>
      )}
    </Box>
  );
}
