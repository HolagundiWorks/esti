import {
  Button,
  Checkbox,
  InlineLoading,
  Modal,
  Select,
  SelectItem,
  Stack,
  Tag,
} from "@carbon/react";
import { useState } from "react";
import { trpc } from "../../lib/trpc.js";
import {
  NODE_SPECS,
  UNIT_TO_PORT_KIND,
  type NodeState,
  type PortKind,
  type WireState,
} from "./paramNodes.js";

const uid = (pfx = "n") =>
  `${pfx}${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

interface Props {
  open: boolean;
  onClose: () => void;
  existingNodes: NodeState[];
  existingWires: WireState[];
  onAdd: (newNodes: NodeState[], newWires: WireState[]) => void;
}

function fmtRate(paise: number) {
  const r = paise / 100;
  return r.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function EstimateLoaderModal({
  open, onClose, existingNodes, existingWires, onAdd,
}: Props) {
  const [projectId, setProjectId] = useState("");
  const [estimateId, setEstimateId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 }, { enabled: open });
  const estimatesQ = trpc.estimates.listByProject.useQuery(
    { projectId },
    { enabled: open && !!projectId },
  );
  const itemsQ = trpc.estimates.items.useQuery(
    { estimateId },
    { enabled: open && !!estimateId },
  );

  const projects = (projectsQ.data as { id: string; title: string }[] | undefined) ?? [];
  const estimates = estimatesQ.data ?? [];
  const items = itemsQ.data ?? [];

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(items.map((i) => i.id)) : new Set());
  }

  function handleAdd() {
    const chosen = items.filter((i) => selected.has(i.id));
    if (chosen.length === 0) return;

    // Find rightmost x of existing nodes for placement column
    const maxX = existingNodes.reduce((mx, n) => Math.max(mx, n.pos.x), 60);
    const startX = maxX + 320;
    const startY = 80;

    const newNodes: NodeState[] = [];
    const newWires: WireState[] = [];

    chosen.forEach((item, idx) => {
      const unit = item.unit?.toUpperCase() ?? "NOS";
      const portKind: PortKind = UNIT_TO_PORT_KIND[unit] ?? "number";
      const nodeId = uid("boq");

      const node: NodeState = {
        id: nodeId,
        kind: "boq_line",
        label: item.description.length > 28
          ? item.description.slice(0, 26) + "…"
          : item.description,
        pos: { x: startX, y: startY + idx * 170 },
        params: { rate: Math.max(1, Math.round(item.ratePaise / 100)) },
        outputs: {},
        meta: {
          unit,
          description: item.description,
          estimateItemId: item.id,
          estimateId,
          projectId,
          ratePaise: item.ratePaise,
        },
      };
      newNodes.push(node);

      // Auto-connect: find canvas nodes with an output of matching kind
      // that are not already wired to an input of a boq_line for that kind
      const wiredSources = new Set(
        existingWires
          .filter((w) => {
            const toNode = existingNodes.find((n) => n.id === w.toNode);
            return toNode?.kind === "boq_line";
          })
          .map((w) => `${w.fromNode}:${w.fromPort}`),
      );

      const candidates = existingNodes.flatMap((n) => {
        const spec = NODE_SPECS[n.kind];
        return spec.outputs
          .filter((p) => p.kind === portKind && !wiredSources.has(`${n.id}:${p.id}`))
          .map((p) => ({ node: n, port: p }));
      });

      if (candidates.length === 1) {
        const match = candidates[0]!;
        const srcNode = match.node;
        const outPort = match.port;
        newWires.push({
          id: uid("w"),
          fromNode: srcNode.id,
          fromPort: outPort.id,
          toNode: nodeId,
          toPort: "quantity",
        });
        wiredSources.add(`${srcNode.id}:${outPort.id}`);
      }
    });

    onAdd(newNodes, newWires);
    setSelected(new Set());
    setEstimateId("");
    onClose();
  }

  return (
    <Modal
      open={open}
      modalHeading="Load from estimate"
      primaryButtonText={`Add ${selected.size > 0 ? selected.size : ""} item${selected.size !== 1 ? "s" : ""} to canvas`}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={selected.size === 0}
      onRequestClose={() => { onClose(); setSelected(new Set()); }}
      onRequestSubmit={handleAdd}
      size="md"
    >
      <Stack gap={5} style={{ marginBottom: 24 }}>
        <Select
          id="el-project"
          labelText="Project"
          value={projectId}
          onChange={(e) => { setProjectId(e.target.value); setEstimateId(""); setSelected(new Set()); }}
        >
          <SelectItem value="" text="— Select project —" />
          {(Array.isArray(projects) ? projects : []).map((p: { id: string; title: string }) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>

        {projectId && (
          <Select
            id="el-estimate"
            labelText="Estimate"
            value={estimateId}
            onChange={(e) => { setEstimateId(e.target.value); setSelected(new Set()); }}
            disabled={estimatesQ.isLoading}
          >
            <SelectItem value="" text="— Select estimate —" />
            {estimates.map((e: { id: string; ref: string; title: string; status: string }) => (
              <SelectItem key={e.id} value={e.id} text={`${e.ref} — ${e.title}`} />
            ))}
          </Select>
        )}

        {estimateId && itemsQ.isLoading && <InlineLoading description="Loading items…" />}

        {estimateId && !itemsQ.isLoading && items.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--cds-text-secondary)" }}>No items in this estimate.</p>
        )}

        {items.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <Checkbox
                id="el-all"
                labelText="Select all"
                checked={selected.size === items.length}
                indeterminate={selected.size > 0 && selected.size < items.length}
                onChange={(_e, { checked }) => toggleAll(checked)}
              />
              <span style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                {items.length} items
              </span>
            </div>
            <div style={{
              maxHeight: 340, overflowY: "auto",
              border: "1px solid var(--cds-border-subtle-01)",
              borderRadius: 4,
            }}>
              {items.map((item: {
                id: string; description: string; unit: string;
                qty: number; ratePaise: number; amountPaise: number;
              }) => (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", cursor: "pointer",
                    borderBottom: "1px solid var(--cds-border-subtle-00)",
                    background: selected.has(item.id) ? "var(--cds-layer-selected)" : "transparent",
                  }}
                >
                  <Checkbox
                    id={`el-item-${item.id}`}
                    labelText=""
                    hideLabel
                    checked={selected.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, margin: 0, color: "var(--cds-text-primary)" }}>
                      {item.description}
                    </p>
                    <p style={{ fontSize: 11, margin: 0, color: "var(--cds-text-secondary)", marginTop: 2 }}>
                      ₹{fmtRate(item.ratePaise)} / {item.unit}
                    </p>
                  </div>
                  <Tag size="sm" type="gray">{item.unit}</Tag>
                </div>
              ))}
            </div>
          </div>
        )}
      </Stack>
    </Modal>
  );
}
