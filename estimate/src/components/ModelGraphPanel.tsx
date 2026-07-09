import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ContentSwitcher, Stack, Switch, Tag, Tile } from "@carbon/react";
import { useEffect, useMemo, useState } from "react";
import { buildEstimateGraph } from "../core/buildEstimateGraph.js";
import type { EstimateNodeData, GraphViewMode } from "../core/graphTypes.js";
import { useStore } from "../store.js";
import { estimateEdgeTypes } from "./flow/estimateEdgeTypes.js";
import { estimateNodeTypes } from "./flow/estimateNodeTypes.js";

const VIEW_MODES: { key: GraphViewMode; label: string }[] = [
  { key: "all", label: "All layers" },
  { key: "items", label: "Items & derivations" },
  { key: "materials", label: "Recipes & materials" },
  { key: "bbs", label: "BBS elements" },
];

/** React Flow canvas — read-only view of the estimate data model. */
export function ModelGraphPanel() {
  const model = useStore((s) => s.model);
  const index = useStore((s) => s.rateBookIndex);
  const [mode, setMode] = useState<GraphViewMode>("all");
  const [selected, setSelected] = useState<Node<EstimateNodeData> | null>(null);

  const graph = useMemo(() => buildEstimateGraph(model, index, mode), [model, index, mode]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setSelected(null);
  }, [graph, setNodes, setEdges]);

  if (!index) {
    return (
      <Tile>
        <p className="est-help">Load a rate book to open the data model graph.</p>
      </Tile>
    );
  }

  const hasContent = model.items.length > 0 || model.bbs.length > 0;

  return (
    <Stack gap={5}>
      <Tile className="est-graph-intro">
        <p className="est-help">
          Visual map of your estimate: <strong>chapters</strong> group rate items;{" "}
          <strong>derivation</strong> edges follow ESE rules (brick → plaster);{" "}
          <strong>recipe</strong> edges roll up materials from measured quantities.
          Quantities update when you edit measurements — the graph is read-only.
        </p>
        <ContentSwitcher
          size="sm"
          selectedIndex={VIEW_MODES.findIndex((m) => m.key === mode)}
          onChange={({ index }) => setMode(VIEW_MODES[index ?? 0]!.key)}
        >
          {VIEW_MODES.map((m) => (
            <Switch key={m.key} name={m.key} text={m.label} />
          ))}
        </ContentSwitcher>
      </Tile>

      {!hasContent ? (
        <Tile>
          <p className="est-help">Add rate items or BBS members to populate the graph.</p>
        </Tile>
      ) : (
        <div className="est-graph-shell">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={estimateNodeTypes}
            edgeTypes={estimateEdgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={1.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            onNodeClick={(_e, node) => setSelected(node as Node<EstimateNodeData>)}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} />
            <Controls showInteractive={false} />
            <MiniMap nodeStrokeWidth={2} pannable zoomable className="est-graph-minimap" />
            <Panel position="top-right" className="est-graph-legend">
              <Tag type="blue" size="sm">Rate item</Tag>
              <Tag type="cyan" size="sm">Derived</Tag>
              <Tag type="teal" size="sm">Material</Tag>
              <Tag type="purple" size="sm">BBS</Tag>
            </Panel>
          </ReactFlow>
        </div>
      )}

      {selected ? (
        <Tile>
          <p className="est-help">
            Selected: <strong>{selected.data.kind}</strong>
            {"code" in selected.data ? ` · ${selected.data.code}` : ""}
            {"shortName" in selected.data && selected.data.shortName
              ? ` — ${selected.data.shortName}`
              : ""}
            {"name" in selected.data && selected.data.name ? ` — ${selected.data.name}` : ""}
            {"qty" in selected.data ? ` · qty ${selected.data.qty}` : ""}
          </p>
        </Tile>
      ) : null}
    </Stack>
  );
}
