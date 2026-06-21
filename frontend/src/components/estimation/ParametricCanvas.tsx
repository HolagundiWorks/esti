// Parametric construction estimator — Carbon diagram building blocks.
// Uses @carbon/charts-react CardNode for nodes, Edge + ArrowRightMarker for connectors.
// CSS (cds--cc--*) already imported globally via @carbon/charts-react/styles.css in main.tsx.

import { useMemo, useRef, useState, useEffect } from "react";
import { Button, Theme } from "@carbon/react";
import { Add, Maximize, Minimize, TrashCan, DocumentImport, TableOfContents } from "@carbon/icons-react";
import {
  CardNode,
  Edge,
  ArrowRightMarker,
} from "@carbon/charts-react";
import {
  NODE_SPECS, NODE_W, HEADER_H, PORT_ROW_H, PARAM_ROW_H, PORT_RADIUS,
  inputPortY, outputPortY, nodeHeight, computeAll, makeStarterKit,
  type NodeKind, type NodeState, type WireState, type PortKind,
} from "./paramNodes.js";
import { EstimateLoaderModal } from "./EstimateLoaderModal.js";
import { BoqExportPanel } from "./BoqExportPanel.js";

// ── Port colours — IBM Carbon 14-step categorical data-vis palette ─────────────
const PORT_CLR: Record<PortKind, string> = {
  number: "#8d8d8d",   // cool-grey — scalar
  area:   "#f1c21b",   // Yellow 40 — SQM
  volume: "#6fdc8c",   // Green  30 — CUM
  length: "#be95ff",   // Purple 30 — RM
  weight: "#82cfff",   // Blue   30 — KG
  money:  "#3ddbd9",   // Teal   30 — ₹
};
const UNIT_TAG: Record<PortKind, string> = {
  number: "—", area: "SQM", volume: "CUM", length: "RM", weight: "KG", money: "₹",
};
const PORT_KINDS = Object.keys(PORT_CLR) as PortKind[];

const PALETTE: { kind: NodeKind; label: string }[] = [
  { kind: "number",     label: "Number  (battery)" },
  { kind: "dimension",  label: "Dimension  L × W × H" },
  { kind: "deduction",  label: "Opening / Deduction" },
  { kind: "brick_wall", label: "Brick Wall  CUM" },
  { kind: "concrete",   label: "Concrete  CUM" },
  { kind: "plaster",    label: "Plastering  SQM" },
  { kind: "paint",      label: "Paint  SQM × coats" },
  { kind: "waterproof", label: "Waterproofing  SQM" },
  { kind: "converter",  label: "Unit Converter" },
  { kind: "steel",      label: "Reinforcement  KG" },
  { kind: "boq_line",   label: "BOQ Line  Qty × Rate" },
];

let _seq = 0;
const uid = (pfx = "n") => `${pfx}${Date.now()}_${++_seq}`;

interface Vp { x: number; y: number; z: number }
interface Conn {
  fromNode: string; fromPort: string; fromKind: PortKind;
  fx: number; fy: number; mx: number; my: number;
}

const fmt = (v: number | null | undefined, d = 3) =>
  v == null ? "—" : Number(v).toFixed(d);

function portCanvasPos(
  nodes: NodeState[], nodeId: string, portId: string, side: "in" | "out",
): { x: number; y: number } | null {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const spec  = NODE_SPECS[node.kind];
  const ports = side === "in" ? spec.inputs : spec.outputs;
  const idx   = ports.findIndex((p) => p.id === portId);
  if (idx < 0) return null;
  return {
    x: node.pos.x + (side === "out" ? NODE_W : 0),
    y: node.pos.y + (side === "in" ? inputPortY : outputPortY)(node.kind, idx),
  };
}

// Bezier path — used directly by Carbon Edge's path prop
function bezierPath(fx: number, fy: number, tx: number, ty: number): string {
  const cp = Math.max(60, Math.abs(tx - fx) * 0.45);
  return `M ${fx} ${fy} C ${fx + cp} ${fy}, ${tx - cp} ${ty}, ${tx} ${ty}`;
}

export function ParametricCanvas() {
  const starter           = useMemo(makeStarterKit, []);
  const [nodes, setNodes] = useState<NodeState[]>(starter.nodes);
  const [wires, setWires] = useState<WireState[]>(starter.wires);
  const [vp, setVp]       = useState<Vp>({ x: 40, y: 20, z: 0.85 });
  const [sel, setSel]     = useState<string | null>(null);
  const [palette, showPalette] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [loaderOpen, setLoaderOpen] = useState(false);
  const [boqOpen, setBoqOpen] = useState(false);

  const connRef  = useRef<Conn | null>(null);
  const vpRef    = useRef(vp);
  const nodesRef = useRef(nodes);
  const wiresRef = useRef(wires);
  const [connTick, setConnTick] = useState(0);

  useEffect(() => { vpRef.current    = vp;    }, [vp]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { wiresRef.current = wires; }, [wires]);

  const drag = useRef<{ id: string; ox: number; oy: number; mx: number; my: number } | null>(null);
  const panR = useRef<{ ox: number; oy: number; mx: number; my: number } | null>(null);

  const canvasEl = useRef<HTMLDivElement>(null);
  const wrapEl   = useRef<HTMLDivElement>(null);

  // ── Global mouse handlers (stable — no closure deps) ─────────────────────
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (drag.current) {
        const v  = vpRef.current;
        const dx = (e.clientX - drag.current.mx) / v.z;
        const dy = (e.clientY - drag.current.my) / v.z;
        const id = drag.current.id;
        setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, pos: { x: drag.current!.ox + dx, y: drag.current!.oy + dy } } : n)));
      }
      if (panR.current) {
        const dx = e.clientX - panR.current.mx;
        const dy = e.clientY - panR.current.my;
        setVp((v) => ({ ...v, x: panR.current!.ox + dx, y: panR.current!.oy + dy }));
      }
    }
    function onUp() { drag.current = null; panR.current = null; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const f  = e.deltaY < 0 ? 1.12 : 0.9;
    const r  = canvasEl.current!.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    setVp((v) => {
      const nz = Math.max(0.2, Math.min(3, v.z * f));
      return { x: mx - (mx - v.x) * (nz / v.z), y: my - (my - v.y) * (nz / v.z), z: nz };
    });
  }

  function onCanvasBgDown(e: React.MouseEvent) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      panR.current = { ox: vp.x, oy: vp.y, mx: e.clientX, my: e.clientY };
    }
  }

  function onCanvasBgClick() {
    setSel(null);
    if (connRef.current) { connRef.current = null; setConnTick((t) => t + 1); }
  }

  function onHeaderDown(e: React.MouseEvent, nodeId: string) {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSel(nodeId);
    const node = nodesRef.current.find((n) => n.id === nodeId)!;
    drag.current = { id: nodeId, ox: node.pos.x, oy: node.pos.y, mx: e.clientX, my: e.clientY };
  }

  function onOutPortClick(e: React.MouseEvent, nodeId: string, portId: string, kind: PortKind) {
    e.stopPropagation();
    if (connRef.current?.fromNode === nodeId && connRef.current?.fromPort === portId) {
      connRef.current = null; setConnTick((t) => t + 1); return;
    }
    const pos = portCanvasPos(nodesRef.current, nodeId, portId, "out");
    if (!pos) return;
    connRef.current = { fromNode: nodeId, fromPort: portId, fromKind: kind, fx: pos.x, fy: pos.y, mx: pos.x, my: pos.y };
    setConnTick((t) => t + 1);
  }

  function onInPortClick(e: React.MouseEvent, nodeId: string, portId: string) {
    e.stopPropagation();
    const c = connRef.current;
    if (!c) return;
    if (c.fromNode === nodeId) { connRef.current = null; setConnTick((t) => t + 1); return; }
    const nextWires: WireState[] = [
      ...wiresRef.current.filter((w) => !(w.toNode === nodeId && w.toPort === portId)),
      { id: uid("w"), fromNode: c.fromNode, fromPort: c.fromPort, toNode: nodeId, toPort: portId },
    ];
    wiresRef.current = nextWires;
    setWires(nextWires);
    setNodes((prev) => computeAll(prev, nextWires));
    connRef.current = null; setConnTick((t) => t + 1);
  }

  function onCanvasMove(e: React.MouseEvent) {
    if (!connRef.current) return;
    const r = canvasEl.current?.getBoundingClientRect();
    if (!r) return;
    const v = vpRef.current;
    connRef.current = { ...connRef.current, mx: (e.clientX - r.left - v.x) / v.z, my: (e.clientY - r.top - v.y) / v.z };
    setConnTick((t) => t + 1);
  }

  function deleteWire(wid: string) {
    const next = wiresRef.current.filter((w) => w.id !== wid);
    wiresRef.current = next; setWires(next);
    setNodes((prev) => computeAll(prev, next));
  }

  function updateParam(nodeId: string, paramId: string, val: number) {
    setNodes((prev) => {
      const next = prev.map((n) => n.id === nodeId ? { ...n, params: { ...n.params, [paramId]: val } } : n);
      return computeAll(next, wiresRef.current);
    });
  }

  function addNode(kind: NodeKind) {
    const spec   = NODE_SPECS[kind];
    const params: Record<string, number> = {};
    for (const p of spec.params) params[p.id] = p.defaultValue;
    const cx = (120 - vp.x) / vp.z;
    const cy = (140 - vp.y) / vp.z;
    const n: NodeState = { id: uid("n"), kind, label: spec.label, pos: { x: cx, y: cy }, params, outputs: {} };
    setNodes((prev) => computeAll([...prev, n], wiresRef.current));
    showPalette(false);
  }

  function deleteSelected() {
    if (!sel) return;
    const nextW = wiresRef.current.filter((w) => w.fromNode !== sel && w.toNode !== sel);
    wiresRef.current = nextW; setWires(nextW);
    setNodes((prev) => computeAll(prev.filter((n) => n.id !== sel), nextW));
    setSel(null);
  }

  function handleAddFromEstimate(newNodes: NodeState[], newWires: WireState[]) {
    setNodes((prev) => {
      const merged = [...prev, ...newNodes];
      const allWires = [...wiresRef.current, ...newWires];
      wiresRef.current = allWires; setWires(allWires);
      return computeAll(merged, allWires);
    });
  }

  function resetCanvas() {
    const s = makeStarterKit();
    wiresRef.current = s.wires;
    setNodes(s.nodes); setWires(s.wires); setSel(null);
    connRef.current = null; setConnTick((t) => t + 1);
  }

  const boqNodes = nodes.filter((n) => n.kind === "boq_line");
  const boqTotal = boqNodes.reduce((s, n) => s + (n.outputs.amount ?? 0), 0);

  const conn = connRef.current;

  const wrapStyle: React.CSSProperties = fullscreen
    ? { position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", background: "var(--cds-background)" }
    : { display: "flex", flexDirection: "column", height: "100%", width: "100%", background: "var(--cds-background)", overflow: "hidden" };

  return (
    // g100 dark theme — technical canvas is always dark (VS Code / Figma pattern)
    // style={{ height: "100%" }} makes the Theme wrapper inherit parent height so flex: 1 canvas works
    <Theme theme="g100" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div ref={wrapEl} style={wrapStyle}>

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          padding: "6px 12px",
          background: "var(--cds-layer-01)",
          borderBottom: "1px solid var(--cds-border-subtle-00)",
          flexShrink: 0, position: "relative", width: "100%", boxSizing: "border-box",
        }}>
          <span style={{ color: "var(--cds-text-secondary)", fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>
            Parametric Estimator
          </span>

          {/* Node palette */}
          <div style={{ position: "relative" }}>
            <Button size="sm" kind="primary" renderIcon={Add} onClick={() => showPalette((p) => !p)}>
              Add node
            </Button>
            {palette && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 300,
                background: "var(--cds-layer-02)", border: "1px solid var(--cds-border-subtle-01)",
                minWidth: 240, boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
              }}>
                {PALETTE.map((p) => (
                  <div key={p.kind}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 14px", cursor: "pointer",
                      fontSize: 12, color: "var(--cds-text-primary)",
                      borderBottom: "1px solid var(--cds-border-subtle-00)",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--cds-layer-hover-02)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    onClick={() => addNode(p.kind)}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: NODE_SPECS[p.kind].accent, flexShrink: 0, display: "inline-block" }} />
                    {p.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button size="sm" kind="ghost" onClick={() => setVp({ x: 40, y: 20, z: 0.85 })}>Reset view</Button>
          <Button size="sm" kind="ghost" onClick={resetCanvas}>Reset canvas</Button>
          <Button size="sm" kind="ghost" renderIcon={DocumentImport} onClick={() => setLoaderOpen(true)}>Load estimate</Button>

          {boqNodes.length > 0 && (
            <Button size="sm" kind="ghost" renderIcon={TableOfContents} onClick={() => setBoqOpen(true)}>
              BOQ ({boqNodes.length})
            </Button>
          )}

          <Button size="sm" kind="ghost" renderIcon={fullscreen ? Minimize : Maximize} onClick={() => setFullscreen((f) => !f)} style={{ flexShrink: 0 }}>
            {fullscreen ? "Exit fullscreen" : "Fullscreen"}
          </Button>

          {sel && <Button size="sm" kind="danger--ghost" renderIcon={TrashCan} onClick={deleteSelected}>Delete node</Button>}

          {boqNodes.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {boqNodes.map((n) => (
                <span key={n.id} style={{ fontSize: 11, color: "var(--cds-text-secondary)" }}>
                  <strong style={{ color: "var(--cds-text-primary)" }}>{n.label}</strong>
                  {" · "}{fmt(n.outputs.qty_echo)} × ₹{(n.params.rate ?? 0).toLocaleString("en-IN")}
                  {" = ₹"}{(n.outputs.amount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              ))}
              {boqNodes.length > 1 && (
                <span style={{ fontSize: 13, color: "#6fdc8c", fontWeight: 700 }}>
                  Total ₹{boqTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Connection hint bar ──────────────────────────────────────────── */}
        {conn && (
          <div style={{
            background: "var(--cds-layer-02)",
            borderBottom: `2px solid ${PORT_CLR[conn.fromKind]}`,
            padding: "4px 14px", fontSize: 11, color: PORT_CLR[conn.fromKind],
            flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: PORT_CLR[conn.fromKind] }} />
            Connecting {UNIT_TAG[conn.fromKind]} wire — click a matching input port to connect, or press Escape to cancel
          </div>
        )}

        {/* ── Canvas ────────────────────────────────────────────────────────── */}
        <div
          ref={canvasEl}
          style={{ flex: 1, position: "relative", overflow: "hidden", userSelect: "none" }}
          onWheel={onWheel}
          onMouseMove={onCanvasMove}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Escape") { connRef.current = null; setConnTick((t) => t + 1); }
            if ((e.key === "Delete" || e.key === "Backspace") && sel) deleteSelected();
          }}
          tabIndex={0}
        >
          {/* Carbon g100 dot grid background */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <defs>
              <pattern
                id="pcgrid"
                x={(vp.x % (32 * vp.z) + 32 * vp.z) % (32 * vp.z)}
                y={(vp.y % (32 * vp.z) + 32 * vp.z) % (32 * vp.z)}
                width={32 * vp.z} height={32 * vp.z}
                patternUnits="userSpaceOnUse"
              >
                <circle cx="0" cy="0" r="1" fill="#393939" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="#161616" />
            <rect width="100%" height="100%" fill="url(#pcgrid)" />
          </svg>

          {/* Pan / deselect overlay */}
          <div
            style={{ position: "absolute", inset: 0, cursor: panR.current ? "grabbing" : conn ? "crosshair" : "default" }}
            onMouseDown={onCanvasBgDown}
            onClick={onCanvasBgClick}
          />

          {/* ── Transform layer ──────────────────────────────────────────── */}
          <div style={{ position: "absolute", transform: `translate(${vp.x}px,${vp.y}px) scale(${vp.z})`, transformOrigin: "0 0", width: 0, height: 0 }}>

            {/* ── Wire SVG — Carbon Edge connectors with typed ArrowRightMarkers ── */}
            <svg style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }} width={20000} height={20000}>
              <defs>
                {/* One ArrowRightMarker per port kind — Carbon cds--cc--marker class */}
                {PORT_KINDS.map((kind) => (
                  <ArrowRightMarker
                    key={kind}
                    id={`pc-arrow-${kind}`}
                    color={PORT_CLR[kind]}
                    position="end"
                    width={10}
                    height={10}
                  />
                ))}
              </defs>

              {/* Routed wires — Carbon Edge component (3 overlaid paths: hit area + outer + inner) */}
              {wires.map((w) => {
                const fp = portCanvasPos(nodes, w.fromNode, w.fromPort, "out");
                const tp = portCanvasPos(nodes, w.toNode,   w.toPort,   "in");
                if (!fp || !tp) return null;
                const fromSpec = NODE_SPECS[nodes.find((n) => n.id === w.fromNode)!.kind];
                const port     = fromSpec.outputs.find((p) => p.id === w.fromPort);
                const kind     = (port?.kind ?? "number") as PortKind;
                const clr      = PORT_CLR[kind];
                const d        = bezierPath(fp.x, fp.y, tp.x, tp.y);
                return (
                  <Edge
                    key={w.id}
                    path={d}
                    color={clr}
                    markerEnd={`pc-arrow-${kind}`}
                    // pointerEvents: "all" overrides the SVG's default so Edge is clickable
                    style={{ pointerEvents: "all", cursor: "pointer" }}
                    onClick={() => deleteWire(w.id)}
                  />
                );
              })}

              {/* In-progress connection wire — dashed preview */}
              {conn && (
                <path
                  d={bezierPath(conn.fx, conn.fy, conn.mx, conn.my)}
                  fill="none"
                  stroke={PORT_CLR[conn.fromKind]}
                  strokeWidth={2}
                  strokeDasharray="8 5"
                  opacity={0.7}
                  pointerEvents="none"
                />
              )}
            </svg>

            {/* ── Nodes — Carbon CardNode building blocks ──────────────────── */}
            {nodes.map((node) => {
              const spec     = NODE_SPECS[node.kind];
              const h        = nodeHeight(node.kind);
              const portRows = Math.max(spec.inputs.length, spec.outputs.length, 1);
              const isSel    = sel === node.id;

              return (
                <CardNode
                  key={node.id}
                  // style overrides the CardNode's inline {borderColor, position}
                  // We replicate the CardNode pattern: accent left border + subtle other sides
                  style={{
                    position: "absolute",
                    left: node.pos.x,
                    top: node.pos.y,
                    width: NODE_W,
                    height: h,
                    padding: 0,
                    overflow: "visible",
                    borderLeft: `4px solid ${isSel ? "var(--cds-border-interactive)" : spec.color}`,
                    borderTop: `1px solid ${isSel ? "var(--cds-border-interactive)" : "var(--cds-border-subtle-01)"}`,
                    borderRight: `1px solid ${isSel ? "var(--cds-border-interactive)" : "var(--cds-border-subtle-01)"}`,
                    borderBottom: `1px solid ${isSel ? "var(--cds-border-interactive)" : "var(--cds-border-subtle-01)"}`,
                    boxShadow: isSel
                      ? "0 0 0 1px var(--cds-border-interactive), 0 4px 16px rgba(0,0,0,0.5)"
                      : "0 1px 8px rgba(0,0,0,0.4)",
                  } as React.CSSProperties}
                  onMouseDown={(e) => { (e as React.MouseEvent).stopPropagation(); setSel(node.id); }}
                >
                  {/* ── Node header — coloured category bar ────────────────── */}
                  <div
                    onMouseDown={(e) => onHeaderDown(e as React.MouseEvent, node.id)}
                    style={{
                      height: HEADER_H, background: spec.color,
                      display: "flex", alignItems: "center",
                      padding: "0 10px", cursor: "grab", gap: 6,
                      borderBottom: "1px solid rgba(0,0,0,0.3)",
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: 0.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {node.label}
                    </span>
                    {node.meta?.unit && (
                      <span style={{ fontSize: 9, background: "rgba(0,0,0,0.35)", color: "rgba(255,255,255,0.9)", padding: "1px 5px", fontWeight: 700, letterSpacing: 0.3 }}>
                        {node.meta.unit}
                      </span>
                    )}
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {node.kind.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* ── Port rows ──────────────────────────────────────────── */}
                  {Array.from({ length: portRows }).map((_, ri) => {
                    const inP    = spec.inputs[ri];
                    const outP   = spec.outputs[ri];
                    const rowTop = HEADER_H + ri * PORT_ROW_H;
                    return (
                      <div key={ri} style={{
                        position: "absolute", top: rowTop, left: 0, right: 0, height: PORT_ROW_H,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0 14px",
                        borderBottom: ri < portRows - 1 ? "1px solid var(--cds-border-subtle-00)" : undefined,
                      }}>
                        {inP
                          ? <span style={{ fontSize: 10, color: "var(--cds-text-placeholder)", fontWeight: 500 }}>{inP.label}</span>
                          : <span />}
                        {outP
                          ? <span style={{ fontSize: 10, color: "var(--cds-text-secondary)", fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                              {node.outputs[outP.id] != null ? `${fmt(node.outputs[outP.id])} ${UNIT_TAG[outP.kind]}` : "—"}
                            </span>
                          : <span />}
                      </div>
                    );
                  })}

                  {/* ── Param rows ─────────────────────────────────────────── */}
                  {spec.params.map((param, pi) => {
                    const rowTop = HEADER_H + portRows * PORT_ROW_H + pi * PARAM_ROW_H;
                    const val    = node.params[param.id] ?? param.defaultValue;
                    return (
                      <div key={param.id} style={{
                        position: "absolute", top: rowTop, left: 0, right: 0, height: PARAM_ROW_H,
                        display: "flex", alignItems: "center", padding: "0 10px",
                        borderTop: "1px solid var(--cds-border-subtle-00)", gap: 6,
                      }}>
                        <span style={{ flex: 1, fontSize: 10, color: "var(--cds-text-placeholder)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {param.label}
                        </span>
                        <input
                          type="number" value={val} min={param.min} max={param.max} step={param.step ?? 0.01}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateParam(node.id, param.id, parseFloat(e.target.value) || 0)}
                          style={{
                            width: 68,
                            background: "var(--cds-field-01)",
                            border: "none",
                            borderBottom: "1px solid var(--cds-border-strong-01)",
                            color: "var(--cds-text-primary)",
                            padding: "2px 5px", fontSize: 11,
                            fontFamily: "'IBM Plex Mono', monospace",
                            outline: "none", flexShrink: 0,
                          }}
                        />
                        {param.unit && (
                          <span style={{ fontSize: 9, color: "var(--cds-text-placeholder)", minWidth: 22, textAlign: "right" }}>
                            {param.unit}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* ── Input port dots — left edge ─────────────────────────── */}
                  {spec.inputs.map((port, pi) => {
                    const isCompatible = !!conn && (conn.fromKind === port.kind || conn.fromKind === "number" || port.kind === "number");
                    const HIT = 24;
                    return (
                      <div
                        key={port.id}
                        title={`${port.label} (${UNIT_TAG[port.kind]})`}
                        onClick={(e) => onInPortClick(e, node.id, port.id)}
                        style={{
                          position: "absolute",
                          left: -HIT / 2,
                          top: inputPortY(node.kind, pi) - HIT / 2,
                          width: HIT, height: HIT,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: conn ? "crosshair" : "default",
                          zIndex: 20, pointerEvents: "all",
                        }}
                      >
                        <div style={{
                          width: PORT_RADIUS * 2, height: PORT_RADIUS * 2, borderRadius: "50%",
                          background: PORT_CLR[port.kind],
                          border: isCompatible ? `2px solid #f4f4f4` : `2px solid #161616`,
                          boxShadow: isCompatible ? `0 0 10px ${PORT_CLR[port.kind]}` : "none",
                          transition: "box-shadow 0.12s, border-color 0.12s",
                        }} />
                      </div>
                    );
                  })}

                  {/* ── Output port dots — right edge ───────────────────────── */}
                  {spec.outputs.map((port, pi) => (
                    <div
                      key={port.id}
                      title={`${port.label} (${UNIT_TAG[port.kind]})`}
                      onClick={(e) => onOutPortClick(e, node.id, port.id, port.kind)}
                      style={{
                        position: "absolute",
                        left: NODE_W - 12,
                        top: outputPortY(node.kind, pi) - 12,
                        width: 24, height: 24,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "crosshair", zIndex: 20, pointerEvents: "all",
                      }}
                    >
                      <div style={{
                        width: PORT_RADIUS * 2, height: PORT_RADIUS * 2, borderRadius: "50%",
                        background: PORT_CLR[port.kind],
                        border: (conn?.fromNode === node.id && conn?.fromPort === port.id)
                          ? `2px solid #f4f4f4` : `2px solid #161616`,
                        boxShadow: (conn?.fromNode === node.id && conn?.fromPort === port.id)
                          ? `0 0 10px ${PORT_CLR[port.kind]}` : "none",
                      }} />
                    </div>
                  ))}
                </CardNode>
              );
            })}
          </div>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              pointerEvents: "none", gap: 8,
            }}>
              <p style={{ color: "var(--cds-text-placeholder)", fontSize: 14, margin: 0 }}>
                Canvas is empty — add a node from the toolbar
              </p>
            </div>
          )}

          {/* Wire-type legend — Carbon layer-02 card */}
          <div style={{
            position: "absolute", bottom: 12, right: 12,
            background: "var(--cds-layer-02)",
            border: "1px solid var(--cds-border-subtle-01)",
            padding: "10px 14px", pointerEvents: "none",
          }}>
            <p style={{ fontSize: 9, color: "var(--cds-text-placeholder)", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", margin: "0 0 6px" }}>
              Wire types
            </p>
            {PORT_KINDS.map((k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                {/* Mini arrow marker preview */}
                <svg width={24} height={8} style={{ overflow: "visible" }}>
                  <defs>
                    <marker id={`leg-arrow-${k}`} markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
                      <path d="M0 0 L6 3 L0 6 Z" fill={PORT_CLR[k]} />
                    </marker>
                  </defs>
                  <line x1={0} y1={4} x2={18} y2={4} stroke={PORT_CLR[k]} strokeWidth={1.5} markerEnd={`url(#leg-arrow-${k})`} />
                </svg>
                <span style={{ fontSize: 10, color: "var(--cds-text-secondary)" }}>{UNIT_TAG[k]}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, borderTop: "1px solid var(--cds-border-subtle-00)", paddingTop: 6, fontSize: 9, color: "var(--cds-text-placeholder)", lineHeight: 1.8 }}>
              Drag header to move<br />
              Scroll to zoom · Alt+drag to pan<br />
              Click <span style={{ color: "var(--cds-text-secondary)" }}>○ out</span>{" "}
              then <span style={{ color: "var(--cds-text-secondary)" }}>● in</span> to wire<br />
              Click wire to delete · Esc cancel
            </div>
          </div>
        </div>

        {/* ── Modals ─────────────────────────────────────────────────────────── */}
        <EstimateLoaderModal
          open={loaderOpen}
          onClose={() => setLoaderOpen(false)}
          existingNodes={nodes}
          existingWires={wires}
          onAdd={handleAddFromEstimate}
        />
        {boqOpen && <BoqExportPanel nodes={nodes} onClose={() => setBoqOpen(false)} />}
      </div>
    </Theme>
  );
}
