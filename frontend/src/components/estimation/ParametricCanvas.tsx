// Grasshopper-style parametric construction estimator
// Nodes are batteries with typed ports; wires carry computed values.

import { useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@carbon/react";
import { Add, Maximize, Minimize, TrashCan } from "@carbon/icons-react";
import {
  NODE_SPECS, NODE_W, HEADER_H, PORT_ROW_H, PARAM_ROW_H, PORT_RADIUS,
  inputPortY, outputPortY, nodeHeight, computeAll, makeStarterKit,
  type NodeKind, type NodeState, type WireState, type PortKind,
} from "./paramNodes.js";

// ── Port colours (kind → CSS colour) ─────────────────────────────────────────
const PORT_CLR: Record<PortKind, string> = {
  number: "#a8a8a8",
  area:   "#ffd580",
  volume: "#6fdc8c",
  length: "#be95ff",
  weight: "#82cfff",
  money:  "#a7f3d0",
};
const UNIT_TAG: Record<PortKind, string> = {
  number: "—", area: "SQM", volume: "CUM", length: "RM", weight: "KG", money: "₹",
};

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
  fx: number; fy: number;
  mx: number; my: number;
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

export function ParametricCanvas() {
  const starter           = useMemo(makeStarterKit, []);
  const [nodes, setNodes] = useState<NodeState[]>(starter.nodes);
  const [wires, setWires] = useState<WireState[]>(starter.wires);
  const [vp, setVp]       = useState<Vp>({ x: 40, y: 20, z: 0.85 });
  const [sel, setSel]     = useState<string | null>(null);
  const [palette, showPalette] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // ── ALL mutable interaction state lives in refs — no stale closures ──────
  // conn ref is the SOURCE OF TRUTH; React state is only for re-renders
  const connRef  = useRef<Conn | null>(null);
  const vpRef    = useRef(vp);
  const nodesRef = useRef(nodes);
  const wiresRef = useRef(wires);
  // keep React state in sync with refs so SVG re-renders
  const [connTick, setConnTick] = useState(0); // bump to re-render wire overlay

  useEffect(() => { vpRef.current    = vp;    }, [vp]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { wiresRef.current = wires; }, [wires]);

  // Drag state: entirely in refs (no state update on every pixel)
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
        const np = { x: drag.current.ox + dx, y: drag.current.oy + dy };
        setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, pos: np } : n)));
      }
      if (panR.current) {
        const dx = e.clientX - panR.current.mx;
        const dy = e.clientY - panR.current.my;
        setVp((v) => ({ ...v, x: panR.current!.ox + dx, y: panR.current!.oy + dy }));
      }
      if (connRef.current) {
        const r = canvasEl.current?.getBoundingClientRect();
        if (!r) return;
        const v = vpRef.current;
        connRef.current = {
          ...connRef.current,
          mx: (e.clientX - r.left - v.x) / v.z,
          my: (e.clientY - r.top  - v.y) / v.z,
        };
        setConnTick((t) => t + 1); // trigger re-render for wire overlay
      }
    }
    function onUp(e: MouseEvent) {
      drag.current = null;
      panR.current = null;
      // Cancel an in-progress connection if released on non-port area
      if (e.button === 0 && connRef.current) {
        const t = e.target as HTMLElement;
        // data-port-in="1" marks valid drop targets — anything else cancels
        if (!t.getAttribute("data-port-in")) {
          connRef.current = null;
          setConnTick((t2) => t2 + 1);
        }
      }
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, []); // stable — uses refs only

  // ── Zoom ─────────────────────────────────────────────────────────────────
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

  // ── Canvas background — pan or deselect ──────────────────────────────────
  function onCanvasBgDown(e: React.MouseEvent) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      panR.current = { ox: vp.x, oy: vp.y, mx: e.clientX, my: e.clientY };
    } else if (e.button === 0) {
      setSel(null);
      // Cancel any in-progress connection
      if (connRef.current) { connRef.current = null; setConnTick((t) => t + 1); }
    }
  }

  // ── Node header drag ──────────────────────────────────────────────────────
  function onHeaderDown(e: React.MouseEvent, nodeId: string) {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSel(nodeId);
    const node = nodesRef.current.find((n) => n.id === nodeId)!;
    drag.current = { id: nodeId, ox: node.pos.x, oy: node.pos.y, mx: e.clientX, my: e.clientY };
  }

  // ── Output port — START connection ────────────────────────────────────────
  // CRITICAL: update connRef synchronously so mousemove works immediately
  function onOutPortDown(e: React.MouseEvent, nodeId: string, portId: string, kind: PortKind) {
    e.preventDefault();
    e.stopPropagation();
    const pos = portCanvasPos(nodesRef.current, nodeId, portId, "out");
    if (!pos) return;
    const newConn: Conn = {
      fromNode: nodeId, fromPort: portId, fromKind: kind,
      fx: pos.x, fy: pos.y, mx: pos.x, my: pos.y,
    };
    connRef.current = newConn; // SYNCHRONOUS — must precede setConnTick
    setConnTick((t) => t + 1);
  }

  // ── Input port — COMPLETE connection ─────────────────────────────────────
  // CRITICAL: read connRef.current (not stale React state)
  function onInPortUp(e: React.MouseEvent, nodeId: string, portId: string) {
    e.stopPropagation();
    const c = connRef.current; // always latest
    if (!c) return;
    if (c.fromNode === nodeId) {
      connRef.current = null;
      setConnTick((t) => t + 1);
      return;
    }
    const nextWires: WireState[] = [
      ...wiresRef.current.filter((w) => !(w.toNode === nodeId && w.toPort === portId)),
      { id: uid("w"), fromNode: c.fromNode, fromPort: c.fromPort, toNode: nodeId, toPort: portId },
    ];
    wiresRef.current = nextWires;
    setWires(nextWires);
    setNodes((prev) => computeAll(prev, nextWires));
    connRef.current = null;
    setConnTick((t) => t + 1);
  }

  // ── Delete wire ───────────────────────────────────────────────────────────
  function deleteWire(wid: string) {
    const next = wiresRef.current.filter((w) => w.id !== wid);
    wiresRef.current = next;
    setWires(next);
    setNodes((prev) => computeAll(prev, next));
  }

  // ── Update param ──────────────────────────────────────────────────────────
  function updateParam(nodeId: string, paramId: string, val: number) {
    setNodes((prev) => {
      const next = prev.map((n) =>
        n.id === nodeId ? { ...n, params: { ...n.params, [paramId]: val } } : n,
      );
      return computeAll(next, wiresRef.current);
    });
  }

  // ── Add node from palette ─────────────────────────────────────────────────
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

  // ── Delete selected node ──────────────────────────────────────────────────
  function deleteSelected() {
    if (!sel) return;
    const nextW = wiresRef.current.filter((w) => w.fromNode !== sel && w.toNode !== sel);
    wiresRef.current = nextW;
    setWires(nextW);
    setNodes((prev) => computeAll(prev.filter((n) => n.id !== sel), nextW));
    setSel(null);
  }

  // ── Reset canvas ──────────────────────────────────────────────────────────
  function resetCanvas() {
    const s = makeStarterKit();
    wiresRef.current = s.wires;
    setNodes(s.nodes); setWires(s.wires); setSel(null);
    connRef.current = null; setConnTick((t) => t + 1);
  }

  // ── BOQ summary ────────────────────────────────────────────────────────────
  const boqNodes = nodes.filter((n) => n.kind === "boq_line");
  const boqTotal = boqNodes.reduce((s, n) => s + (n.outputs.amount ?? 0), 0);

  // ── Bezier path ────────────────────────────────────────────────────────────
  function bezier(fx: number, fy: number, tx: number, ty: number) {
    const cp = Math.max(60, Math.abs(tx - fx) * 0.45);
    return `M ${fx} ${fy} C ${fx + cp} ${fy}, ${tx - cp} ${ty}, ${tx} ${ty}`;
  }

  // Read current conn from ref for SVG rendering (driven by connTick)
  const conn = connRef.current;

  // ── Wrapper style: fixed overlay when fullscreen ──────────────────────────
  const wrapStyle: React.CSSProperties = fullscreen
    ? { position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", background: "#101010" }
    : { display: "flex", flexDirection: "column", height: "100%", width: "100%", background: "#101010", overflow: "hidden" };

  return (
    <div ref={wrapEl} style={wrapStyle}>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        padding: "6px 12px", background: "#1c1c1c", borderBottom: "1px solid #2e2e2e", flexShrink: 0,
        position: "relative", width: "100%", boxSizing: "border-box",
      }}>
        <span style={{ color: "#c6c6c6", fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>
          Parametric Estimator
        </span>

        {/* Palette */}
        <div style={{ position: "relative" }}>
          <Button size="sm" kind="primary" renderIcon={Add} onClick={() => showPalette((p) => !p)}>
            Add node
          </Button>
          {palette && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 300,
              background: "#262626", border: "1px solid #525252", borderRadius: 4,
              minWidth: 240, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}>
              {PALETTE.map((p) => (
                <div key={p.kind}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", cursor: "pointer", fontSize: 12, color: "#f4f4f4" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#333"; }}
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

        <Button size="sm" kind="ghost" onClick={() => setVp({ x: 40, y: 20, z: 0.85 })}
          style={{ color: "#8d8d8d" }}>Reset view</Button>
        <Button size="sm" kind="ghost" onClick={resetCanvas}
          style={{ color: "#8d8d8d" }}>Reset canvas</Button>

        {sel && (
          <Button size="sm" kind="danger--ghost" renderIcon={TrashCan} onClick={deleteSelected}>
            Delete node
          </Button>
        )}

        {/* BOQ summary */}
        {boqNodes.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {boqNodes.map((n) => (
              <span key={n.id} style={{ fontSize: 11, color: "#a7f3d0" }}>
                <strong>{n.label}</strong>
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

        {/* Fullscreen — absolutely placed to avoid breaking flex layout */}
        <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}>
          <Button
            size="sm" kind="ghost"
            renderIcon={fullscreen ? Minimize : Maximize}
            iconDescription={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            hasIconOnly
            onClick={() => setFullscreen((f) => !f)}
            style={{ color: "#8d8d8d" }}
          />
        </div>
      </div>

      {/* ── Hint bar when connecting ────────────────────────────────────── */}
      {conn && (
        <div style={{
          background: `${NODE_SPECS[nodes.find((n) => n.id === conn.fromNode)?.kind ?? "dimension"]?.color ?? "#444"}33`,
          borderBottom: `1px solid ${PORT_CLR[conn.fromKind]}`,
          padding: "4px 14px", fontSize: 11, color: PORT_CLR[conn.fromKind], flexShrink: 0,
          display: "flex", alignItems: "center", gap: 8,
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
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "Escape") { connRef.current = null; setConnTick((t) => t + 1); }
          if ((e.key === "Delete" || e.key === "Backspace") && sel) deleteSelected();
        }}
        tabIndex={0}
      >
        {/* Dot grid — mousedown here pans/deselects */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        >
          <defs>
            <pattern
              id="pcgrid"
              x={(vp.x % (32 * vp.z) + 32 * vp.z) % (32 * vp.z)}
              y={(vp.y % (32 * vp.z) + 32 * vp.z) % (32 * vp.z)}
              width={32 * vp.z} height={32 * vp.z}
              patternUnits="userSpaceOnUse"
            >
              <circle cx="0" cy="0" r="0.9" fill="#242424" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="#141414" />
          <rect width="100%" height="100%" fill="url(#pcgrid)" />
        </svg>
        {/* Invisible clickable overlay for canvas pan/deselect */}
        <div
          style={{ position: "absolute", inset: 0, cursor: panR.current ? "grabbing" : conn ? "crosshair" : "default" }}
          onMouseDown={onCanvasBgDown}
        />

        {/* ── Transform layer ────────────────────────────────────────────── */}
        <div style={{
          position: "absolute",
          transform: `translate(${vp.x}px,${vp.y}px) scale(${vp.z})`,
          transformOrigin: "0 0",
          width: 0, height: 0,
        }}>

          {/* Wire SVG */}
          <svg style={{ position: "absolute", top: 0, left: 0, overflow: "visible", pointerEvents: "none" }} width={0} height={0}>
            {wires.map((w) => {
              const fp = portCanvasPos(nodes, w.fromNode, w.fromPort, "out");
              const tp = portCanvasPos(nodes, w.toNode,   w.toPort,   "in");
              if (!fp || !tp) return null;
              const fromSpec = NODE_SPECS[nodes.find((n) => n.id === w.fromNode)!.kind];
              const port     = fromSpec.outputs.find((p) => p.id === w.fromPort);
              const clr      = port ? PORT_CLR[port.kind] : "#a8a8a8";
              const d        = bezier(fp.x, fp.y, tp.x, tp.y);
              return (
                <g key={w.id}>
                  {/* Wide invisible stroke for easy clicking */}
                  <path d={d} fill="none" stroke="transparent" strokeWidth={16}
                    style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    onClick={() => deleteWire(w.id)}
                  />
                  <path d={d} fill="none" stroke={clr} strokeWidth={2.5} opacity={0.88} strokeLinecap="round" />
                  {/* Animated flow dot */}
                  <circle r="3" fill={clr} opacity="0.7">
                    <animateMotion dur="1.8s" repeatCount="indefinite" path={d} />
                  </circle>
                </g>
              );
            })}

            {/* In-progress wire */}
            {conn && (
              <g>
                <path
                  d={bezier(conn.fx, conn.fy, conn.mx, conn.my)}
                  fill="none" stroke={PORT_CLR[conn.fromKind]}
                  strokeWidth={2} strokeDasharray="8 5" opacity={0.75} strokeLinecap="round"
                />
                <circle cx={conn.mx} cy={conn.my} r={PORT_RADIUS} fill="none"
                  stroke={PORT_CLR[conn.fromKind]} strokeWidth={2} opacity={0.6} />
              </g>
            )}
          </svg>

          {/* ── Nodes ──────────────────────────────────────────────────── */}
          {nodes.map((node) => {
            const spec     = NODE_SPECS[node.kind];
            const h        = nodeHeight(node.kind);
            const portRows = Math.max(spec.inputs.length, spec.outputs.length, 1);
            const isSel    = sel === node.id;

            return (
              <div
                key={node.id}
                style={{
                  position: "absolute", left: node.pos.x, top: node.pos.y,
                  width: NODE_W, height: h,
                  borderRadius: 6,
                  background: "#1e1e1e",
                  border: `1px solid ${isSel ? spec.accent : "#383838"}`,
                  boxShadow: isSel
                    ? `0 0 0 2px ${spec.accent}66, 0 8px 32px rgba(0,0,0,0.6)`
                    : "0 4px 20px rgba(0,0,0,0.5)",
                  overflow: "visible",
                }}
                onMouseDown={(e) => { e.stopPropagation(); setSel(node.id); }}
              >
                {/* Header */}
                <div
                  onMouseDown={(e) => onHeaderDown(e, node.id)}
                  style={{
                    height: HEADER_H, background: spec.color,
                    borderRadius: "5px 5px 0 0",
                    display: "flex", alignItems: "center",
                    padding: "0 10px", cursor: "grab", gap: 6,
                    borderBottom: "1px solid rgba(0,0,0,0.25)",
                  }}
                >
                  <span style={{
                    flex: 1, fontSize: 11, fontWeight: 700, color: "#fff",
                    letterSpacing: 0.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {node.label}
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {node.kind.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Body: port rows */}
                {Array.from({ length: portRows }).map((_, ri) => {
                  const inP  = spec.inputs[ri];
                  const outP = spec.outputs[ri];
                  const rowTop = HEADER_H + ri * PORT_ROW_H;
                  return (
                    <div key={ri} style={{
                      position: "absolute", top: rowTop, left: 0, right: 0, height: PORT_ROW_H,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0 14px",
                      borderBottom: ri < portRows - 1 ? "1px solid #2a2a2a" : undefined,
                    }}>
                      {inP
                        ? <span style={{ fontSize: 10, color: "#6f6f6f", fontWeight: 500 }}>{inP.label}</span>
                        : <span />}
                      {outP
                        ? <span style={{ fontSize: 10, color: "#c6c6c6", fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                            {node.outputs[outP.id] != null
                              ? `${fmt(node.outputs[outP.id])} ${UNIT_TAG[outP.kind]}`
                              : "—"}
                          </span>
                        : <span />}
                    </div>
                  );
                })}

                {/* Param rows */}
                {spec.params.map((param, pi) => {
                  const rowTop = HEADER_H + portRows * PORT_ROW_H + pi * PARAM_ROW_H;
                  const val    = node.params[param.id] ?? param.defaultValue;
                  return (
                    <div key={param.id} style={{
                      position: "absolute", top: rowTop, left: 0, right: 0, height: PARAM_ROW_H,
                      display: "flex", alignItems: "center", padding: "0 10px",
                      borderTop: "1px solid #2a2a2a", gap: 6,
                    }}>
                      <span style={{ flex: 1, fontSize: 10, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {param.label}
                      </span>
                      <input
                        type="number"
                        value={val}
                        min={param.min}
                        max={param.max}
                        step={param.step ?? 0.01}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateParam(node.id, param.id, parseFloat(e.target.value) || 0)}
                        style={{
                          width: 68, background: "#161616", border: "1px solid #3d3d3d",
                          color: "#f4f4f4", borderRadius: 3, padding: "2px 5px",
                          fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                          outline: "none", flexShrink: 0,
                        }}
                      />
                      {param.unit && (
                        <span style={{ fontSize: 9, color: "#3d3d3d", minWidth: 22, textAlign: "right" }}>{param.unit}</span>
                      )}
                    </div>
                  );
                })}

                {/* ── Input port dots (left edge) — highlight when connecting */}
                {spec.inputs.map((port, pi) => {
                  const isCompatible = conn && (conn.fromKind === port.kind || conn.fromKind === "number" || port.kind === "number");
                  return (
                    <div
                      key={port.id}
                      data-port-in="1"
                      title={`${port.label} (${UNIT_TAG[port.kind]})`}
                      onMouseUp={(e) => onInPortUp(e, node.id, port.id)}
                      style={{
                        position: "absolute",
                        left: -PORT_RADIUS,
                        top: inputPortY(node.kind, pi) - PORT_RADIUS,
                        width: PORT_RADIUS * 2, height: PORT_RADIUS * 2,
                        borderRadius: "50%",
                        background: PORT_CLR[port.kind],
                        border: isCompatible ? `2px solid #fff` : `2px solid #141414`,
                        cursor: conn ? "crosshair" : "default",
                        zIndex: 10,
                        boxShadow: isCompatible ? `0 0 10px ${PORT_CLR[port.kind]}` : "none",
                        transition: "box-shadow 0.1s, border-color 0.1s",
                        pointerEvents: "all",
                      }}
                    />
                  );
                })}

                {/* ── Output port dots (right edge) */}
                {spec.outputs.map((port, pi) => (
                  <div
                    key={port.id}
                    data-port-out="1"
                    title={`${port.label} (${UNIT_TAG[port.kind]})`}
                    onMouseDown={(e) => onOutPortDown(e, node.id, port.id, port.kind)}
                    style={{
                      position: "absolute",
                      left: NODE_W - PORT_RADIUS,
                      top: outputPortY(node.kind, pi) - PORT_RADIUS,
                      width: PORT_RADIUS * 2, height: PORT_RADIUS * 2,
                      borderRadius: "50%",
                      background: PORT_CLR[port.kind],
                      border: "2px solid #141414",
                      cursor: "crosshair",
                      zIndex: 10,
                      pointerEvents: "all",
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", pointerEvents: "none", gap: 8,
          }}>
            <p style={{ color: "#3d3d3d", fontSize: 14 }}>Canvas is empty — add a node from the toolbar</p>
          </div>
        )}

        {/* Legend */}
        <div style={{
          position: "absolute", bottom: 12, right: 12,
          background: "rgba(20,20,20,0.93)", border: "1px solid #2a2a2a",
          borderRadius: 6, padding: "10px 14px", backdropFilter: "blur(4px)",
          pointerEvents: "none",
        }}>
          <p style={{ fontSize: 9, color: "#444", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 5 }}>Wire types</p>
          {(Object.entries(PORT_CLR) as [PortKind, string][]).map(([k, c]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <div style={{ width: 18, height: 2, background: c, borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: "#555" }}>{UNIT_TAG[k]}</span>
            </div>
          ))}
          <div style={{ marginTop: 7, borderTop: "1px solid #242424", paddingTop: 6, fontSize: 9, color: "#383838", lineHeight: 1.8 }}>
            Drag header to move<br />
            Scroll to zoom · Alt+drag to pan<br />
            Drag <span style={{ color: "#555" }}>○ out</span> → <span style={{ color: "#555" }}>● in</span> to wire<br />
            Click wire to delete · Esc cancel
          </div>
        </div>
      </div>
    </div>
  );
}
