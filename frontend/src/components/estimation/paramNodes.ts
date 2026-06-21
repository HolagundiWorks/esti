// ── Parametric estimation node type definitions ───────────────────────────────

export type Unit = "CUM" | "SQM" | "RM" | "KG" | "NOS" | "BAG" | "₹";
export type PortKind = "number" | "area" | "volume" | "length" | "weight" | "money";

export const PORT_KIND_UNIT: Record<PortKind, Unit> = {
  number: "NOS",
  area: "SQM",
  volume: "CUM",
  length: "RM",
  weight: "KG",
  money: "₹",
};

export type NodeKind =
  | "number"       // manual value input (battery)
  | "dimension"    // L × W × H → area, volume
  | "brick_wall"   // CUM brickwork with deductions
  | "concrete"     // CUM concrete with deductions
  | "plaster"      // SQM plastering with deductions + wastage
  | "paint"        // SQM × coats
  | "waterproof"   // SQM waterproofing
  | "deduction"    // opening (door/window) → area + volume deduction
  | "converter"    // multiply by factor (e.g., SQM→CUM for screed thickness)
  | "steel"        // reinforcement: CUM concrete → KG steel
  | "boq_line";    // quantity × rate → amount

export interface PortSpec {
  id: string;
  label: string;
  kind: PortKind;
}

export interface ParamSpec {
  id: string;
  label: string;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: Unit;
}

export interface NodeSpec {
  kind: NodeKind;
  label: string;
  color: string;       // header background
  accent: string;      // port dot / wire color
  inputs: PortSpec[];
  outputs: PortSpec[];
  params: ParamSpec[]; // editable number fields inside the node
  compute: (
    inputs: Record<string, number | null>,
    params: Record<string, number>,
  ) => Record<string, number | null>;
}

// ── Colour palette (Carbon + custom) ─────────────────────────────────────────
const C = {
  purple:   "#6929c4",
  red:      "#da1e28",
  orange:   "#b45309",
  blue:     "#0f62fe",
  cyan:     "#1192e8",
  teal:     "#005d5d",
  green:    "#198038",
  gray:     "#393939",
  indigo:   "#4f46e5",
};

// ── NODE DEFINITIONS ─────────────────────────────────────────────────────────

export const NODE_SPECS: Record<NodeKind, NodeSpec> = {

  // ── Battery: single number value
  number: {
    kind: "number",
    label: "Number",
    color: C.gray,
    accent: "#a8a8a8",
    inputs: [],
    outputs: [
      { id: "value", label: "Value", kind: "number" },
    ],
    params: [
      { id: "value", label: "Value", defaultValue: 1 },
    ],
    compute: (_inp, p) => ({ value: p.value ?? 0 }),
  },

  // ── Dimension: L × W × H → area (L×H face), volume (L×W×H)
  dimension: {
    kind: "dimension",
    label: "Dimension",
    color: C.purple,
    accent: "#be95ff",
    inputs: [],
    outputs: [
      { id: "length",  label: "L (RM)",    kind: "length" },
      { id: "width",   label: "W (RM)",    kind: "length" },
      { id: "height",  label: "H (RM)",    kind: "length" },
      { id: "area",    label: "Area (SQM)", kind: "area"  },
      { id: "volume",  label: "Vol (CUM)", kind: "volume" },
    ],
    params: [
      { id: "length", label: "Length (m)", defaultValue: 5,    min: 0, step: 0.01, unit: "RM" },
      { id: "width",  label: "Width  (m)", defaultValue: 0.23, min: 0, step: 0.01, unit: "RM" },
      { id: "height", label: "Height (m)", defaultValue: 3,    min: 0, step: 0.01, unit: "RM" },
    ],
    compute: (_inp, p) => {
      const l = p.length ?? 0;
      const w = p.width  ?? 0;
      const h = p.height ?? 0;
      return {
        length: l,
        width:  w,
        height: h,
        area:   parseFloat((l * h).toFixed(3)),
        volume: parseFloat((l * w * h).toFixed(3)),
      };
    },
  },

  // ── Brick wall: gross volume − deductions → net CUM
  brick_wall: {
    kind: "brick_wall",
    label: "Brick Wall",
    color: C.red,
    accent: "#ffb3b8",
    inputs: [
      { id: "volume",    label: "Volume (CUM)",     kind: "volume" },
      { id: "deduction", label: "Deductions (CUM)", kind: "volume" },
    ],
    outputs: [
      { id: "net_volume", label: "Net Vol (CUM)", kind: "volume" },
      { id: "face_area",  label: "Face Area (SQM)", kind: "area"  },
    ],
    params: [
      { id: "thickness", label: "Wall thick (m)", defaultValue: 0.23, min: 0.05, step: 0.01, unit: "RM" },
    ],
    compute: (inp, p) => {
      const gross = inp.volume    ?? 0;
      const ded   = inp.deduction ?? 0;
      const net   = Math.max(0, gross - ded);
      const thick = p.thickness ?? 0.23;
      return {
        net_volume: parseFloat(net.toFixed(3)),
        face_area:  thick > 0 ? parseFloat((net / thick).toFixed(3)) : null,
      };
    },
  },

  // ── Concrete: gross volume − deductions → net CUM
  concrete: {
    kind: "concrete",
    label: "Concrete",
    color: C.teal,
    accent: "#9ef0f0",
    inputs: [
      { id: "volume",    label: "Volume (CUM)",     kind: "volume" },
      { id: "deduction", label: "Deductions (CUM)", kind: "volume" },
    ],
    outputs: [
      { id: "net_volume", label: "Net Vol (CUM)", kind: "volume" },
    ],
    params: [
      { id: "wastage", label: "Wastage %", defaultValue: 5, min: 0, max: 30, step: 0.5, unit: "NOS" },
    ],
    compute: (inp, p) => {
      const gross   = inp.volume    ?? 0;
      const ded     = inp.deduction ?? 0;
      const net     = Math.max(0, gross - ded);
      const wastage = 1 + (p.wastage ?? 5) / 100;
      return { net_volume: parseFloat((net * wastage).toFixed(3)) };
    },
  },

  // ── Plastering: area − deductions + wastage → net SQM
  plaster: {
    kind: "plaster",
    label: "Plastering",
    color: C.orange,
    accent: "#ffd580",
    inputs: [
      { id: "area",      label: "Area (SQM)",      kind: "area" },
      { id: "deduction", label: "Deductions (SQM)", kind: "area" },
    ],
    outputs: [
      { id: "net_area", label: "Net Area (SQM)", kind: "area" },
    ],
    params: [
      { id: "sides",   label: "Sides (1=one, 2=both)", defaultValue: 1, min: 1, max: 2, step: 1, unit: "NOS" },
      { id: "wastage", label: "Wastage %", defaultValue: 5, min: 0, max: 30, step: 0.5, unit: "NOS" },
    ],
    compute: (inp, p) => {
      const area    = inp.area      ?? 0;
      const ded     = inp.deduction ?? 0;
      const sides   = p.sides   ?? 1;
      const wastage = 1 + (p.wastage ?? 5) / 100;
      return { net_area: parseFloat((Math.max(0, area - ded) * sides * wastage).toFixed(3)) };
    },
  },

  // ── Paint: area × coats → SQM
  paint: {
    kind: "paint",
    label: "Paint",
    color: C.cyan,
    accent: "#82cfff",
    inputs: [
      { id: "area", label: "Area (SQM)", kind: "area" },
    ],
    outputs: [
      { id: "net_area", label: "Painted Area (SQM)", kind: "area" },
    ],
    params: [
      { id: "coats",   label: "No. of coats", defaultValue: 2, min: 1, max: 5, step: 1, unit: "NOS" },
      { id: "wastage", label: "Wastage %", defaultValue: 3, min: 0, max: 20, step: 0.5, unit: "NOS" },
    ],
    compute: (inp, p) => {
      const area    = inp.area ?? 0;
      const coats   = p.coats   ?? 2;
      const wastage = 1 + (p.wastage ?? 3) / 100;
      return { net_area: parseFloat((area * coats * wastage).toFixed(3)) };
    },
  },

  // ── Waterproofing: area → SQM (with up-turns)
  waterproof: {
    kind: "waterproof",
    label: "Waterproofing",
    color: C.blue,
    accent: "#78a9ff",
    inputs: [
      { id: "area", label: "Floor Area (SQM)", kind: "area" },
    ],
    outputs: [
      { id: "net_area", label: "WP Area (SQM)", kind: "area" },
    ],
    params: [
      { id: "upturn_h",  label: "Up-turn H (m)", defaultValue: 0.3, min: 0, step: 0.05, unit: "RM" },
      { id: "perimeter", label: "Perimeter (m)", defaultValue: 10,  min: 0, step: 0.1,  unit: "RM" },
    ],
    compute: (inp, p) => {
      const floor    = inp.area ?? 0;
      const upturn   = (p.upturn_h ?? 0.3) * (p.perimeter ?? 10);
      return { net_area: parseFloat((floor + upturn).toFixed(3)) };
    },
  },

  // ── Deduction: opening (door / window) → area SQM + volume CUM
  deduction: {
    kind: "deduction",
    label: "Opening",
    color: C.gray,
    accent: "#c6c6c6",
    inputs: [],
    outputs: [
      { id: "area",   label: "Area (SQM)",  kind: "area"   },
      { id: "volume", label: "Vol  (CUM)",  kind: "volume" },
    ],
    params: [
      { id: "width",     label: "Width (m)",  defaultValue: 1.2,  min: 0.1, step: 0.05, unit: "RM" },
      { id: "height",    label: "Height (m)", defaultValue: 2.1,  min: 0.1, step: 0.05, unit: "RM" },
      { id: "thickness", label: "Thick (m)",  defaultValue: 0.23, min: 0.1, step: 0.01, unit: "RM" },
      { id: "count",     label: "Count",      defaultValue: 1,    min: 1,   step: 1,    unit: "NOS" },
    ],
    compute: (_inp, p) => {
      const w = p.width     ?? 1.2;
      const h = p.height    ?? 2.1;
      const t = p.thickness ?? 0.23;
      const n = p.count     ?? 1;
      return {
        area:   parseFloat((w * h * n).toFixed(3)),
        volume: parseFloat((w * h * t * n).toFixed(3)),
      };
    },
  },

  // ── Converter: multiply area by thickness to get volume (e.g. floor screed)
  converter: {
    kind: "converter",
    label: "Unit Converter",
    color: C.indigo,
    accent: "#a5b4fc",
    inputs: [
      { id: "area",   label: "Area (SQM)",    kind: "area"   },
      { id: "volume", label: "Volume (CUM)",  kind: "volume" },
    ],
    outputs: [
      { id: "area",   label: "Area (SQM)",   kind: "area"   },
      { id: "volume", label: "Volume (CUM)", kind: "volume" },
    ],
    params: [
      { id: "thickness", label: "Thickness (m)", defaultValue: 0.012, min: 0, step: 0.001, unit: "RM" },
      { id: "factor",    label: "Multiply factor", defaultValue: 1, min: 0.001, step: 0.01, unit: "NOS" },
    ],
    compute: (inp, p) => {
      const area   = inp.area   ?? 0;
      const vol    = inp.volume ?? 0;
      const thick  = p.thickness ?? 0.012;
      const factor = p.factor ?? 1;
      return {
        area:   parseFloat((area   * factor).toFixed(3)),
        volume: parseFloat((vol > 0 ? vol * factor : area * thick).toFixed(3)),
      };
    },
  },

  // ── Steel reinforcement: CUM concrete → KG steel
  steel: {
    kind: "steel",
    label: "Reinforcement",
    color: C.green,
    accent: "#6fdc8c",
    inputs: [
      { id: "volume", label: "Concrete (CUM)", kind: "volume" },
    ],
    outputs: [
      { id: "weight", label: "Steel (KG)", kind: "weight" },
    ],
    params: [
      { id: "ratio", label: "Ratio (kg/m³)", defaultValue: 100, min: 20, max: 350, step: 5, unit: "KG" },
    ],
    compute: (inp, p) => {
      const vol   = inp.volume ?? 0;
      const ratio = p.ratio ?? 100;
      return { weight: parseFloat((vol * ratio).toFixed(2)) };
    },
  },

  // ── BOQ line: quantity × rate → amount
  boq_line: {
    kind: "boq_line",
    label: "BOQ Line",
    color: C.green,
    accent: "#a7f3d0",
    inputs: [
      { id: "quantity", label: "Quantity", kind: "number" },
    ],
    outputs: [
      { id: "qty_echo", label: "Qty (echo)", kind: "number" },
      { id: "amount",   label: "Amount (₹)", kind: "money"  },
    ],
    params: [
      { id: "rate", label: "Rate (₹/unit)", defaultValue: 1000, min: 0, step: 1, unit: "₹" },
    ],
    compute: (inp, p) => {
      const qty  = inp.quantity ?? 0;
      const rate = p.rate ?? 1000;
      return {
        qty_echo: parseFloat(qty.toFixed(3)),
        amount:   parseFloat((qty * rate).toFixed(2)),
      };
    },
  },
};

// ── Layout constants ──────────────────────────────────────────────────────────
export const NODE_W        = 230;
export const HEADER_H      = 34;
export const PORT_ROW_H    = 26;
export const PARAM_ROW_H   = 30;
export const PORT_RADIUS   = 6;
export const CORNER_R      = 8;

export function nodeBodyHeight(kind: NodeKind): number {
  const s = NODE_SPECS[kind];
  const portRows  = Math.max(s.inputs.length, s.outputs.length, 1);
  const paramRows = s.params.length;
  return portRows * PORT_ROW_H + paramRows * PARAM_ROW_H + 16;
}

export function nodeHeight(kind: NodeKind): number {
  return HEADER_H + nodeBodyHeight(kind);
}

// Port Y position relative to top of node
export function inputPortY(kind: NodeKind, idx: number): number {
  return HEADER_H + idx * PORT_ROW_H + PORT_ROW_H / 2;
}
export function outputPortY(kind: NodeKind, idx: number): number {
  return HEADER_H + idx * PORT_ROW_H + PORT_ROW_H / 2;
}

// ── Unit → port kind mapping (for estimate item auto-connect) ────────────────
export const UNIT_TO_PORT_KIND: Record<string, PortKind> = {
  CUM: "volume",
  M3:  "volume",
  SQM: "area",
  M2:  "area",
  RM:  "length",
  RMT: "length",
  M:   "length",
  KG:  "weight",
  MT:  "weight",
  NOS: "number",
  NO:  "number",
  BAG: "number",
  LOT: "number",
  SET: "number",
  LS:  "number",
};

// ── Runtime node state ───────────────────────────────────────────────────────
export interface NodeMeta {
  unit?: string;           // e.g. "CUM", "SQM", "RM"
  description?: string;    // full description from estimate item
  estimateItemId?: string;
  estimateId?: string;
  projectId?: string;
  ratePaise?: number;      // original rate in paise for reference
}

export interface NodeState {
  id: string;
  kind: NodeKind;
  label: string;          // user-editable title
  pos: { x: number; y: number };
  params: Record<string, number>;
  outputs: Record<string, number | null>; // computed
  meta?: NodeMeta;
}

export interface WireState {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
}

// Topological sort + reactive computation
export function computeAll(
  nodes: NodeState[],
  wires: WireState[],
): NodeState[] {
  // Kahn's algorithm: process nodes in dependency order
  const deps = new Map<string, Set<string>>();
  for (const n of nodes) deps.set(n.id, new Set());
  for (const w of wires) deps.get(w.toNode)?.add(w.fromNode);

  const remaining = new Map(Array.from(deps).map(([id, d]) => [id, new Set(d)]));
  const sorted: string[] = [];
  const ready = nodes.filter((n) => remaining.get(n.id)!.size === 0).map((n) => n.id);

  while (ready.length > 0) {
    const id = ready.shift()!;
    sorted.push(id);
    for (const [nid, d] of remaining) {
      if (d.delete(id) && d.size === 0) ready.push(nid);
    }
  }
  // Append any cycle survivors (shouldn't occur in normal use)
  for (const n of nodes) if (!sorted.includes(n.id)) sorted.push(n.id);

  // Compute in topological order
  const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]));
  for (const id of sorted) {
    const node   = nodeMap.get(id)!;
    const spec   = NODE_SPECS[node.kind];
    const wireIn = wires.filter((w) => w.toNode === id);
    const inputs: Record<string, number | null> = {};
    for (const port of spec.inputs) {
      const wire = wireIn.find((w) => w.toPort === port.id);
      inputs[port.id] = wire ? (nodeMap.get(wire.fromNode)?.outputs[wire.fromPort] ?? null) : null;
    }
    nodeMap.set(id, { ...node, outputs: spec.compute(inputs, node.params) });
  }
  return sorted.map((id) => nodeMap.get(id)!);
}

// ── Starter kit templates ─────────────────────────────────────────────────────
export function makeStarterKit(): { nodes: NodeState[]; wires: WireState[] } {
  const dim1: NodeState = {
    id: "dim1", kind: "dimension", label: "Wall A",
    pos: { x: 60, y: 80 },
    params: { length: 6, width: 0.23, height: 3 },
    outputs: {},
  };
  const deduct1: NodeState = {
    id: "ded1", kind: "deduction", label: "Window",
    pos: { x: 60, y: 340 },
    params: { width: 1.2, height: 1.5, thickness: 0.23, count: 2 },
    outputs: {},
  };
  const brick1: NodeState = {
    id: "brk1", kind: "brick_wall", label: "Brick Work",
    pos: { x: 380, y: 80 },
    params: { thickness: 0.23 },
    outputs: {},
  };
  const plOutside: NodeState = {
    id: "plo1", kind: "plaster", label: "Outside Plaster",
    pos: { x: 700, y: 80 },
    params: { sides: 1, wastage: 5 },
    outputs: {},
  };
  const plInside: NodeState = {
    id: "pli1", kind: "plaster", label: "Inside Plaster",
    pos: { x: 700, y: 260 },
    params: { sides: 1, wastage: 5 },
    outputs: {},
  };
  const paintOut: NodeState = {
    id: "pto1", kind: "paint", label: "Outside Paint",
    pos: { x: 1020, y: 80 },
    params: { coats: 2, wastage: 3 },
    outputs: {},
  };
  const paintIn: NodeState = {
    id: "pti1", kind: "paint", label: "Inside Paint",
    pos: { x: 1020, y: 260 },
    params: { coats: 2, wastage: 3 },
    outputs: {},
  };

  const nodes = [dim1, deduct1, brick1, plOutside, plInside, paintOut, paintIn];

  const wires: WireState[] = [
    { id: "w1", fromNode: "dim1", fromPort: "volume",    toNode: "brk1", toPort: "volume"    },
    { id: "w2", fromNode: "ded1", fromPort: "volume",    toNode: "brk1", toPort: "deduction" },
    { id: "w3", fromNode: "brk1", fromPort: "face_area", toNode: "plo1", toPort: "area"      },
    { id: "w4", fromNode: "brk1", fromPort: "face_area", toNode: "pli1", toPort: "area"      },
    { id: "w5", fromNode: "ded1", fromPort: "area",      toNode: "plo1", toPort: "deduction" },
    { id: "w6", fromNode: "ded1", fromPort: "area",      toNode: "pli1", toPort: "deduction" },
    { id: "w7", fromNode: "plo1", fromPort: "net_area",  toNode: "pto1", toPort: "area"      },
    { id: "w8", fromNode: "pli1", fromPort: "net_area",  toNode: "pti1", toPort: "area"      },
  ];

  return { nodes: computeAll(nodes, wires), wires };
}
