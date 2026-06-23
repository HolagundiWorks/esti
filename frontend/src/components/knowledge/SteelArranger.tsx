/**
 * SteelFlow — member flow + reinforcement/BBS generator.
 * Structural calculations remain deterministic; this UI maps members, bars,
 * links, and BBS rows in one parametric-style workspace.
 */
import {
  Button,
  Column,
  Grid,
  InlineLoading,
  InlineNotification,
  Modal,
  NumberInput,
  Select,
  SelectItem,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TextInput,
  Tile,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { Add, ChartCustom, Document, Idea, TrashCan } from "@carbon/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  SF_BAR_DIAS,
  SF_ELEMENT_TYPES,
  SF_SHAPE_CODE_LABEL,
  SF_STIRRUP_LABEL,
  SF_STIRRUP_TYPES,
  sfDevelopmentLength,
  sfShapeCuttingLength,
  type SfBbsRow,
} from "@esti/contracts";
import { trpc } from "../../lib/trpc.js";
import { computeBbsRows, totalSteelKg } from "../../engine/bbsEngine.js";
import { SteelFlowCatalogManager } from "./SteelFlowCatalogManager.js";

type ElType = "BEAM" | "COLUMN" | "SLAB" | "FOOTING";
type NodePos = { x: number; y: number };

type ElementRow = {
  id: string;
  elementType: string;
  elementCode: string;
  lengthMm: number;
  widthMm: number;
  depthMm: number;
  coverMm: number;
  fck: number;
  fy: number;
};

type RebarRow = {
  id: string;
  barMark: string;
  diaMm: number;
  barType: string;
  quantity: number;
  cuttingLengthMm: number | null;
  shapeCode: string;
  posX: number | null;
  posY: number | null;
};

type StirrupRow = {
  id: string;
  diaMm: number;
  stirrupType: string;
  spacingMm: number;
  hookAngle: number;
  zone: string;
};

const TMT_GRADES = [
  { label: "Fe415", value: 415, ductility: "standard" },
  { label: "Fe415D", value: 415, ductility: "high ductility" },
  { label: "Fe415S", value: 415, ductility: "seismic ductility" },
  { label: "Fe500", value: 500, ductility: "standard" },
  { label: "Fe500D", value: 500, ductility: "high ductility" },
  { label: "Fe500S", value: 500, ductility: "seismic ductility" },
  { label: "Fe550", value: 550, ductility: "standard" },
  { label: "Fe550D", value: 550, ductility: "high ductility" },
  { label: "Fe600", value: 600, ductility: "high strength" },
] as const;

const DIM_LABELS: Record<ElType, { l: string; w: string; d: string; view: string }> = {
  BEAM: { l: "Span", w: "Width b", d: "Depth D", view: "Section + span" },
  COLUMN: { l: "Height H", w: "Width b", d: "Depth D", view: "Column cage" },
  SLAB: { l: "Span", w: "Strip width", d: "Thickness t", view: "Slab strip" },
  FOOTING: { l: "Length L", w: "Width B", d: "Depth D", view: "Footing mesh" },
};

const DEFAULTS: Record<ElType, { l: number; w: number; d: number; cover: number }> = {
  BEAM: { l: 5000, w: 230, d: 450, cover: 25 },
  COLUMN: { l: 3200, w: 300, d: 450, cover: 40 },
  SLAB: { l: 4000, w: 1000, d: 150, cover: 20 },
  FOOTING: { l: 1800, w: 1800, d: 450, cover: 50 },
};

const BAR_TYPES_FOR: Record<ElType, string[]> = {
  BEAM: ["BOTTOM_MAIN", "TOP_MAIN", "EXTRA_BOTTOM", "EXTRA_TOP", "SIDE_FACE"],
  COLUMN: ["TOP_MAIN", "BOTTOM_MAIN", "SIDE_FACE"],
  SLAB: ["BOTTOM_MAIN", "TOP_MAIN", "SIDE_FACE"],
  FOOTING: ["BOTTOM_MAIN", "SIDE_FACE", "TOP_MAIN"],
};

const BAR_LABEL_FOR: Record<ElType, Record<string, string>> = {
  BEAM: {
    BOTTOM_MAIN: "Bottom main tension",
    TOP_MAIN: "Top main / support",
    EXTRA_BOTTOM: "Extra bottom",
    EXTRA_TOP: "Extra top at support",
    SIDE_FACE: "Side-face bars",
  },
  COLUMN: {
    TOP_MAIN: "Longitudinal main",
    BOTTOM_MAIN: "Corner bars",
    SIDE_FACE: "Intermediate face bars",
  },
  SLAB: {
    BOTTOM_MAIN: "Main bottom mesh",
    TOP_MAIN: "Top negative mesh",
    SIDE_FACE: "Distribution bars",
  },
  FOOTING: {
    BOTTOM_MAIN: "Bottom X bars",
    SIDE_FACE: "Bottom Y bars",
    TOP_MAIN: "Top mesh",
  },
};

const SHAPES_FOR: Record<ElType, string[]> = {
  BEAM: ["A", "B", "C", "D", "E"],
  COLUMN: ["A", "B"],
  SLAB: ["A", "B", "E"],
  FOOTING: ["A", "B"],
};

const HAS_LINKS: Record<ElType, boolean> = {
  BEAM: true,
  COLUMN: true,
  SLAB: false,
  FOOTING: false,
};

const NODE_W = 250;
const NODE_H = 124;
const NODE_GAP_X = 92;
const NODE_GAP_Y = 28;
const PORT_Y = 62;

function elType(row?: ElementRow): ElType {
  return (row?.elementType ?? "BEAM") as ElType;
}

function nodePath(from: NodePos, to: NodePos) {
  const fx = from.x + NODE_W;
  const fy = from.y + PORT_Y;
  const tx = to.x;
  const ty = to.y + PORT_Y;
  const cp = Math.max(70, Math.abs(tx - fx) * 0.5);
  return `M ${fx} ${fy} C ${fx + cp} ${fy}, ${tx - cp} ${ty}, ${tx} ${ty}`;
}

function buildNodeLayout(elements: ElementRow[], overrides: Record<string, NodePos>) {
  const order: ElType[] = ["FOOTING", "COLUMN", "BEAM", "SLAB"];
  const rows = [...elements].sort((a, b) => {
    const typeSort = order.indexOf(elType(a)) - order.indexOf(elType(b));
    if (typeSort !== 0) return typeSort;
    return a.elementCode.localeCompare(b.elementCode, undefined, { numeric: true });
  });
  const counts = new Map<ElType, number>();
  return rows.map((element) => {
    const type = elType(element);
    const depth = order.indexOf(type);
    const row = counts.get(type) ?? 0;
    counts.set(type, row + 1);
    const base = {
      x: 36 + depth * (NODE_W + NODE_GAP_X),
      y: 34 + row * (NODE_H + NODE_GAP_Y),
    };
    return { ...element, ...(overrides[element.id] ?? base) };
  });
}

function memberWarnings(element: ElementRow, rebars: RebarRow[], stirrups: StirrupRow[]) {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const type = elType(element);
  const main = rebars.filter((r) => ["BOTTOM_MAIN", "TOP_MAIN"].includes(r.barType));
  const largestDia = rebars.length ? Math.max(...rebars.map((r) => r.diaMm)) : 0;

  if (main.length === 0) warnings.push("Add main reinforcement before issuing BBS.");
  if (element.coverMm < DEFAULTS[type].cover) {
    warnings.push(`Cover ${element.coverMm} mm is below the usual ${DEFAULTS[type].cover} mm reference for ${type.toLowerCase()}.`);
  }
  if ((type === "BEAM" || type === "COLUMN") && stirrups.length === 0) {
    warnings.push(type === "COLUMN" ? "Add column links/ties." : "Add beam stirrups.");
  }
  if (largestDia > 0) {
    suggestions.push(`Ld reference for T${largestDia}: ${sfDevelopmentLength(largestDia, element.fy, element.fck)} mm.`);
  }
  if (type === "SLAB") suggestions.push("Use bottom mesh for sagging zones and top mesh over supports/cantilevers.");
  if (type === "FOOTING") suggestions.push("Check X/Y mesh continuity and footing edge cover against structural drawings.");
  suggestions.push("Final bar size, spacing, anchorage, lap, and curtailment must be verified by the structural engineer.");
  return { warnings, suggestions };
}

function BbsTable({ rows }: { rows: SfBbsRow[] }) {
  if (rows.length === 0) return <p>No bars or links defined yet.</p>;
  const total = totalSteelKg(rows);
  return (
    <div className="esti-steel-table-scroll">
      <Table size="sm">
        <TableHead>
          <TableRow>
            <TableHeader>Element</TableHeader>
            <TableHeader>Mark</TableHeader>
            <TableHeader>Dia</TableHeader>
            <TableHeader>Shape</TableHeader>
            <TableHeader>Qty</TableHeader>
            <TableHeader>Cut. L</TableHeader>
            <TableHeader>Total L</TableHeader>
            <TableHeader>Wt/m</TableHeader>
            <TableHeader>Total kg</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={`${r.elementCode}-${r.barMark}-${i}`}>
              <TableCell>{r.elementCode}</TableCell>
              <TableCell>{r.barMark}</TableCell>
              <TableCell>T{r.diaMm}</TableCell>
              <TableCell>{r.shapeCode}</TableCell>
              <TableCell>{r.quantity}</TableCell>
              <TableCell>{r.cuttingLengthMm.toLocaleString()} mm</TableCell>
              <TableCell>{r.totalLengthMm.toLocaleString()} mm</TableCell>
              <TableCell>{r.unitWeightKgPerM}</TableCell>
              <TableCell>{r.totalWeightKg}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={8}>
              <strong>Total steel</strong>
            </TableCell>
            <TableCell>
              <strong>{total} kg</strong>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function MemberFlowCanvas({
  elements,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
}: {
  elements: ElementRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const [overrides, setOverrides] = useState<Record<string, NodePos>>({});
  const dragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const nodes = useMemo(() => buildNodeLayout(elements, overrides), [elements, overrides]);
  const nodeByType = useMemo(() => new Map(nodes.map((n) => [n.elementType, n])), [nodes]);
  const canvasWidth = Math.max(960, Math.max(...nodes.map((n) => n.x + NODE_W + 90), 960));
  const canvasHeight = Math.max(390, Math.max(...nodes.map((n) => n.y + NODE_H + 70), 390));

  useEffect(() => {
    function move(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      setOverrides((prev) => ({
        ...prev,
        [drag.id]: {
          x: Math.max(12, drag.ox + e.clientX - drag.sx),
          y: Math.max(12, drag.oy + e.clientY - drag.sy),
        },
      }));
    }
    function up() {
      dragRef.current = null;
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  const flowEdges = [
    ["FOOTING", "COLUMN"],
    ["COLUMN", "BEAM"],
    ["BEAM", "SLAB"],
  ] as const;

  return (
    <div className="esti-steel-flow">
      <div className="esti-steel-flow__toolbar">
        <div>
          <h4>Steel member flow</h4>
          <p className="esti-label esti-label--helper">
            Map footing, column, beam, and slab members, then extract BBS from the selected node.
          </p>
        </div>
        <Stack orientation="horizontal" gap={3}>
          <Button size="sm" kind="secondary" renderIcon={Add} onClick={onAdd}>
            Add member
          </Button>
          <Button size="sm" kind="ghost" onClick={() => setOverrides({})}>
            Reset layout
          </Button>
        </Stack>
      </div>
      <div className="esti-steel-flow__viewport">
        <div className="esti-steel-flow__canvas" style={{ width: canvasWidth, height: canvasHeight }}>
          <svg className="esti-steel-flow__edges" width={canvasWidth} height={canvasHeight}>
            <defs>
              <marker id="steel-flow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                <path d="M 0 0 L 8 3 L 0 6 z" className="esti-steel-flow__arrow" />
              </marker>
            </defs>
            {flowEdges.map(([fromType, toType]) => {
              const from = nodeByType.get(fromType);
              const to = nodeByType.get(toType);
              if (!from || !to) return null;
              return (
                <path
                  key={`${fromType}-${toType}`}
                  d={nodePath(from, to)}
                  markerEnd="url(#steel-flow-arrow)"
                  className="esti-steel-flow__edge"
                />
              );
            })}
          </svg>
          {nodes.map((node) => {
            const type = elType(node);
            const selected = selectedId === node.id;
            return (
              <div
                key={node.id}
                className={selected ? "esti-steel-node esti-steel-node--selected" : "esti-steel-node"}
                style={{ left: node.x, top: node.y }}
                onClick={() => onSelect(node.id)}
                onMouseDown={(e) => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  dragRef.current = { id: node.id, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y };
                }}
              >
                <span className="esti-steel-node__port esti-steel-node__port--in" />
                <span className="esti-steel-node__port esti-steel-node__port--out" />
                <div className="esti-steel-node__hdr">
                  <Tag type={type === "FOOTING" ? "purple" : type === "COLUMN" ? "blue" : type === "BEAM" ? "teal" : "green"} size="sm">
                    {type}
                  </Tag>
                  <span>{node.elementCode}</span>
                </div>
                <div className="esti-steel-node__title">{DIM_LABELS[type].view}</div>
                <div className="esti-steel-node__meta">
                  <span>{node.lengthMm.toLocaleString()} mm</span>
                  <span>{node.widthMm} x {node.depthMm}</span>
                </div>
                <div className="esti-steel-node__meta">
                  <span>M{node.fck} / Fe{node.fy}</span>
                  <span>cover {node.coverMm}</span>
                </div>
                <Button
                  kind="ghost"
                  size="sm"
                  hasIconOnly
                  renderIcon={TrashCan}
                  iconDescription="Delete member"
                  className="esti-steel-node__delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(node.id);
                  }}
                />
              </div>
            );
          })}
          {nodes.length === 0 && (
            <div className="esti-steel-flow__empty">
              <ChartCustom size={32} />
              <h3>No members in this session</h3>
              <p>Add a footing, column, beam, or slab node to start the reinforcement flow.</p>
              <Button kind="primary" size="sm" renderIcon={Add} onClick={onAdd}>
                Add member
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddMemberForm({ sessionId, onCreated }: { sessionId: string; onCreated: (id: string) => void }) {
  const catalogQ = trpc.knowledgeBank.listPublishedSteelFlowCatalog.useQuery();
  const [mode, setMode] = useState<"catalog" | "manual">("manual");
  const [templateId, setTemplateId] = useState("");
  const [type, setType] = useState<ElType>("BEAM");
  const [code, setCode] = useState("");
  const [length, setLength] = useState(DEFAULTS.BEAM.l);
  const [width, setWidth] = useState(DEFAULTS.BEAM.w);
  const [depth, setDepth] = useState(DEFAULTS.BEAM.d);
  const [cover, setCover] = useState(DEFAULTS.BEAM.cover);
  const [fck, setFck] = useState(25);
  const [fy, setFy] = useState(500);
  const utils = trpc.useUtils();
  const catalog = catalogQ.data ?? [];

  function applyType(next: ElType) {
    const d = DEFAULTS[next];
    setType(next);
    setLength(d.l);
    setWidth(d.w);
    setDepth(d.d);
    setCover(d.cover);
  }

  const create = trpc.steelflow.createElement.useMutation({
    onSuccess: (row) => {
      void utils.steelflow.listElements.invalidate({ sessionId });
      onCreated(row.id);
    },
  });
  const applyCatalog = trpc.steelflow.applyCatalog.useMutation({
    onSuccess: (row) => {
      void utils.steelflow.listElements.invalidate({ sessionId });
      onCreated(row.id);
    },
  });

  const dims = DIM_LABELS[type];
  return (
    <Stack gap={4}>
      <Select id="sf-member-mode" labelText="Add method" size="sm" value={mode} onChange={(e) => setMode(e.target.value as "catalog" | "manual")}>
        <SelectItem value="manual" text="Manual member" />
        <SelectItem value="catalog" text="Published catalogue template" />
      </Select>

      {mode === "catalog" ? (
        <Stack gap={3}>
          <Select id="sf-template" labelText="Catalogue template" size="sm" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <SelectItem value="" text="Select…" />
            {catalog.map((c) => (
              <SelectItem key={c.id} value={c.id} text={`${c.code} — ${c.name}`} />
            ))}
          </Select>
          <Stack orientation="horizontal" gap={3}>
            <TextInput id="sf-cat-code" labelText="Member code" size="sm" value={code} placeholder="B1" onChange={(e) => setCode(e.target.value)} />
            <NumberInput id="sf-cat-span" label="Span / length (mm)" size="sm" min={300} max={30000} step={100} value={length} onChange={(_, { value }) => setLength(Number(value))} />
          </Stack>
          <Button
            size="sm"
            kind="primary"
            renderIcon={Add}
            disabled={!templateId || applyCatalog.isPending}
            onClick={() => applyCatalog.mutate({ sessionId, templateId, elementCode: code || "B1", spanMm: length })}
          >
            Add template member
          </Button>
        </Stack>
      ) : (
        <Stack gap={3}>
          <Stack orientation="horizontal" gap={3}>
            <Select id="sf-member-type" labelText="Member type" size="sm" value={type} onChange={(e) => applyType(e.target.value as ElType)}>
              {SF_ELEMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t} text={t} />
              ))}
            </Select>
            <TextInput id="sf-member-code" labelText="Member code" size="sm" value={code} placeholder="B1 / C1 / S1 / F1" onChange={(e) => setCode(e.target.value)} />
          </Stack>
          <Stack orientation="horizontal" gap={3}>
            <NumberInput id="sf-member-l" label={`${dims.l} (mm)`} size="sm" min={300} max={30000} step={100} value={length} onChange={(_, { value }) => setLength(Number(value))} />
            <NumberInput id="sf-member-w" label={`${dims.w} (mm)`} size="sm" min={100} max={3000} step={25} value={width} onChange={(_, { value }) => setWidth(Number(value))} />
            <NumberInput id="sf-member-d" label={`${dims.d} (mm)`} size="sm" min={50} max={3000} step={25} value={depth} onChange={(_, { value }) => setDepth(Number(value))} />
          </Stack>
          <Stack orientation="horizontal" gap={3}>
            <NumberInput id="sf-member-cover" label="Cover (mm)" size="sm" min={15} max={75} step={5} value={cover} onChange={(_, { value }) => setCover(Number(value))} />
            <Select id="sf-member-fck" labelText="Concrete" size="sm" value={fck} onChange={(e) => setFck(Number(e.target.value))}>
              {[20, 25, 30, 35, 40].map((v) => (
                <SelectItem key={v} value={v} text={`M${v}`} />
              ))}
            </Select>
            <Select id="sf-member-fy" labelText="TMT grade" size="sm" value={fy} onChange={(e) => setFy(Number(e.target.value))}>
              {TMT_GRADES.map((g) => (
                <SelectItem key={g.label} value={g.value} text={`${g.label} — ${g.ductility}`} />
              ))}
            </Select>
          </Stack>
          <Button
            size="sm"
            kind="primary"
            renderIcon={Add}
            disabled={create.isPending}
            onClick={() =>
              create.mutate({
                sessionId,
                elementType: type,
                elementCode: code || `${type[0]}1`,
                lengthMm: length,
                widthMm: width,
                depthMm: depth,
                coverMm: cover,
                fck,
                fy,
              })
            }
          >
            Add member
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

function AddRebarForm({ element }: { element: ElementRow }) {
  const type = elType(element);
  const [dia, setDia] = useState<number>(type === "SLAB" ? 10 : 16);
  const [barType, setBarType] = useState(BAR_TYPES_FOR[type][0] ?? "BOTTOM_MAIN");
  const [qty, setQty] = useState(type === "SLAB" || type === "FOOTING" ? 8 : 2);
  const [shapeCode, setShapeCode] = useState("A");
  const [mark, setMark] = useState("");
  const [leg2, setLeg2] = useState(300);
  const [hairpinH, setHairpinH] = useState(300);
  const [hairpinW, setHairpinW] = useState(150);
  const [crankH, setCrankH] = useState(Math.max(50, Math.round(element.depthMm / 3)));
  const utils = trpc.useUtils();
  const create = trpc.steelflow.createRebar.useMutation({
    onSuccess: () => {
      void utils.steelflow.listRebars.invalidate({ elementId: element.id });
      setMark("");
    },
  });
  const cuttingLength = sfShapeCuttingLength(shapeCode, element.lengthMm, dia, {
    leg2,
    hairpinH,
    hairpinW,
    crankH,
  });

  return (
    <Stack gap={3}>
      <Stack orientation="horizontal" gap={3}>
        <TextInput id="sf-bar-mark" labelText="Mark" size="sm" value={mark} placeholder={`${element.elementCode}-${barType[0]}${dia}`} onChange={(e) => setMark(e.target.value)} />
        <Select id="sf-bar-dia" labelText="Diameter" size="sm" value={dia} onChange={(e) => setDia(Number(e.target.value))}>
          {SF_BAR_DIAS.map((d) => (
            <SelectItem key={d} value={d} text={`T${d}`} />
          ))}
        </Select>
        <NumberInput id="sf-bar-qty" label="Qty" size="sm" min={1} max={200} value={qty} onChange={(_, { value }) => setQty(Number(value))} />
      </Stack>
      <Stack orientation="horizontal" gap={3}>
        <Select id="sf-bar-type" labelText="Arrangement" size="sm" value={barType} onChange={(e) => setBarType(e.target.value)}>
          {BAR_TYPES_FOR[type].map((t) => (
            <SelectItem key={t} value={t} text={BAR_LABEL_FOR[type][t] ?? t} />
          ))}
        </Select>
        <Select id="sf-bar-shape" labelText="Shape" size="sm" value={shapeCode} onChange={(e) => setShapeCode(e.target.value)}>
          {SHAPES_FOR[type].map((shape) => (
            <SelectItem key={shape} value={shape} text={`${shape} — ${SF_SHAPE_CODE_LABEL[shape] ?? shape}`} />
          ))}
        </Select>
      </Stack>
      {shapeCode === "B" && (
        <NumberInput id="sf-bar-leg2" label="Bent leg (mm)" size="sm" min={50} max={3000} step={25} value={leg2} onChange={(_, { value }) => setLeg2(Number(value))} />
      )}
      {shapeCode === "D" && (
        <Stack orientation="horizontal" gap={3}>
          <NumberInput id="sf-bar-hp-h" label="Hairpin height (mm)" size="sm" min={50} max={3000} step={25} value={hairpinH} onChange={(_, { value }) => setHairpinH(Number(value))} />
          <NumberInput id="sf-bar-hp-w" label="Hairpin width (mm)" size="sm" min={50} max={3000} step={25} value={hairpinW} onChange={(_, { value }) => setHairpinW(Number(value))} />
        </Stack>
      )}
      {shapeCode === "E" && (
        <NumberInput id="sf-bar-crank" label="Crank height (mm)" size="sm" min={10} max={500} step={5} value={crankH} onChange={(_, { value }) => setCrankH(Number(value))} />
      )}
      <Stack orientation="horizontal" gap={3} style={{ alignItems: "center" }}>
        <Tag type="blue" size="sm">Cutting length {cuttingLength.toLocaleString()} mm</Tag>
        <Button
          kind="primary"
          size="sm"
          renderIcon={Add}
          disabled={create.isPending}
          onClick={() =>
            create.mutate({
              elementId: element.id,
              barMark: mark || `${element.elementCode}-${barType.slice(0, 1)}${dia}`,
              diaMm: dia as (typeof SF_BAR_DIAS)[number],
              barType: barType as Parameters<typeof create.mutate>[0]["barType"],
              quantity: qty,
              cuttingLengthMm: cuttingLength,
              shapeCode,
            })
          }
        >
          Add bar group
        </Button>
      </Stack>
    </Stack>
  );
}

function AddLinkForm({ element }: { element: ElementRow }) {
  const [dia, setDia] = useState(8);
  const [spacing, setSpacing] = useState(elType(element) === "COLUMN" ? 150 : 125);
  const [stirrupType, setStirrupType] = useState("CLOSED");
  const utils = trpc.useUtils();
  const create = trpc.steelflow.createStirrup.useMutation({
    onSuccess: () => void utils.steelflow.listStirrups.invalidate({ elementId: element.id }),
  });
  return (
    <Stack gap={3}>
      <Stack orientation="horizontal" gap={3}>
        <Select id="sf-link-dia" labelText="Link dia" size="sm" value={dia} onChange={(e) => setDia(Number(e.target.value))}>
          {[6, 8, 10, 12].map((d) => (
            <SelectItem key={d} value={d} text={`T${d}`} />
          ))}
        </Select>
        <Select id="sf-link-type" labelText={elType(element) === "COLUMN" ? "Tie type" : "Stirrup type"} size="sm" value={stirrupType} onChange={(e) => setStirrupType(e.target.value)}>
          {SF_STIRRUP_TYPES.map((t) => (
            <SelectItem key={t} value={t} text={SF_STIRRUP_LABEL[t]} />
          ))}
        </Select>
        <NumberInput id="sf-link-spacing" label="Spacing (mm)" size="sm" min={50} max={500} step={25} value={spacing} onChange={(_, { value }) => setSpacing(Number(value))} />
      </Stack>
      <Button
        kind="primary"
        size="sm"
        renderIcon={Add}
        disabled={create.isPending}
        onClick={() =>
          create.mutate({
            elementId: element.id,
            diaMm: dia as (typeof SF_BAR_DIAS)[number],
            stirrupType: stirrupType as (typeof SF_STIRRUP_TYPES)[number],
            spacingMm: spacing,
            hookAngle: 135,
          })
        }
      >
        Add {elType(element) === "COLUMN" ? "tie" : "stirrup"}
      </Button>
    </Stack>
  );
}

function MemberEditor({ element }: { element: ElementRow }) {
  const type = elType(element);
  const utils = trpc.useUtils();
  const rebarsQ = trpc.steelflow.listRebars.useQuery({ elementId: element.id });
  const stirrupsQ = trpc.steelflow.listStirrups.useQuery({ elementId: element.id });
  const deleteRebar = trpc.steelflow.deleteRebar.useMutation({
    onSuccess: () => void utils.steelflow.listRebars.invalidate({ elementId: element.id }),
  });
  const deleteStirrup = trpc.steelflow.deleteStirrup.useMutation({
    onSuccess: () => void utils.steelflow.listStirrups.invalidate({ elementId: element.id }),
  });
  const rebars = rebarsQ.data ?? [];
  const stirrups = stirrupsQ.data ?? [];
  const bbsRows = computeBbsRows(
    element,
    rebars.map((r) => ({
      ...r,
      cuttingLengthMm: r.cuttingLengthMm ?? undefined,
      posX: r.posX ?? undefined,
      posY: r.posY ?? undefined,
    })),
    stirrups,
  );
  const review = memberWarnings(element, rebars, stirrups);

  function exportXlsx() {
    const ws = XLSX.utils.json_to_sheet(
      bbsRows.map((r) => ({
        Element: r.elementCode,
        "Bar Mark": r.barMark,
        "Dia (mm)": `T${r.diaMm}`,
        Shape: r.shapeCode,
        Qty: r.quantity,
        "Cutting Length (mm)": r.cuttingLengthMm,
        "Total Length (mm)": r.totalLengthMm,
        "Unit Wt (kg/m)": r.unitWeightKgPerM,
        "Total Wt (kg)": r.totalWeightKg,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BBS");
    XLSX.writeFile(wb, `BBS_${element.elementCode}.xlsx`);
  }

  return (
    <Stack gap={5}>
      <Tile className="esti-steel-member-summary">
        <Stack gap={3}>
          <Stack orientation="horizontal" gap={2} style={{ flexWrap: "wrap" }}>
            <Tag type="cool-gray" size="sm">{type}</Tag>
            <strong>{element.elementCode}</strong>
            <Tag type="blue" size="sm">{DIM_LABELS[type].l}: {element.lengthMm.toLocaleString()} mm</Tag>
            <Tag type="teal" size="sm">{element.widthMm} x {element.depthMm} mm</Tag>
            <Tag type="gray" size="sm">M{element.fck} / Fe{element.fy}</Tag>
            <Tag type="gray" size="sm">Cover {element.coverMm} mm</Tag>
          </Stack>
          <p className="esti-label esti-label--helper">
            Rule assist references IS 456 detailing, IS 2502 bending/BBS conventions, and IS 1786 TMT grade families. It does not replace structural design approval.
          </p>
        </Stack>
      </Tile>

      <Tabs>
        <TabList aria-label="Steel member editor">
          <Tab>Bars</Tab>
          {HAS_LINKS[type] && <Tab>{type === "COLUMN" ? "Ties" : "Stirrups"}</Tab>}
          <Tab>BBS</Tab>
          <Tab>Review</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Stack gap={4}>
              <AddRebarForm element={element} />
              <Stack gap={2}>
                {rebars.map((r) => (
                  <div key={r.id} className="esti-steel-row">
                    <Tag type="blue" size="sm">T{r.diaMm}</Tag>
                    <Tag type="gray" size="sm">{BAR_LABEL_FOR[type][r.barType] ?? r.barType}</Tag>
                    <span>{r.barMark} · {r.quantity} nos · {(r.cuttingLengthMm ?? element.lengthMm).toLocaleString()} mm · shape {r.shapeCode}</span>
                    <Button kind="ghost" size="sm" hasIconOnly renderIcon={TrashCan} iconDescription="Remove" onClick={() => deleteRebar.mutate({ id: r.id })} />
                  </div>
                ))}
                {rebars.length === 0 && <p>No bar groups added.</p>}
              </Stack>
            </Stack>
          </TabPanel>
          {HAS_LINKS[type] && (
            <TabPanel>
              <Stack gap={4}>
                <AddLinkForm element={element} />
                <Stack gap={2}>
                  {stirrups.map((s) => (
                    <div key={s.id} className="esti-steel-row">
                      <Tag type="teal" size="sm">T{s.diaMm}</Tag>
                      <Tag type="gray" size="sm">{SF_STIRRUP_LABEL[s.stirrupType as (typeof SF_STIRRUP_TYPES)[number]] ?? s.stirrupType}</Tag>
                      <span>@ {s.spacingMm} mm c/c · {s.zone} · {s.hookAngle}deg hooks</span>
                      <Button kind="ghost" size="sm" hasIconOnly renderIcon={TrashCan} iconDescription="Remove" onClick={() => deleteStirrup.mutate({ id: s.id })} />
                    </div>
                  ))}
                  {stirrups.length === 0 && <p>No links/stirrups added.</p>}
                </Stack>
              </Stack>
            </TabPanel>
          )}
          <TabPanel>
            <Stack gap={4}>
              <BbsTable rows={bbsRows} />
              {bbsRows.length > 0 && (
                <Button kind="ghost" size="sm" renderIcon={Document} onClick={exportXlsx}>
                  Export BBS Excel
                </Button>
              )}
            </Stack>
          </TabPanel>
          <TabPanel>
            <Stack gap={4}>
              {review.warnings.length === 0 ? (
                <InlineNotification kind="success" lowContrast hideCloseButton title="No rule-assist warnings detected." />
              ) : (
                review.warnings.map((warning) => (
                  <InlineNotification key={warning} kind="warning" lowContrast hideCloseButton title={warning} />
                ))
              )}
              <Stack gap={2}>
                <Tag type="blue" size="sm">Suggestions</Tag>
                {review.suggestions.map((suggestion) => (
                  <p key={suggestion}>{suggestion}</p>
                ))}
              </Stack>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Dia</TableHeader>
                    <TableHeader>Development length</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {SF_BAR_DIAS.map((d) => (
                    <TableRow key={d}>
                      <TableCell>T{d}</TableCell>
                      <TableCell>{sfDevelopmentLength(d, element.fy, element.fck)} mm</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}

function SteelArrangerWorkshop({ embedded = false }: { embedded?: boolean }) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [newSessionName, setNewSessionName] = useState("");
  const [showNewSession, setShowNewSession] = useState(false);
  const [showNewElement, setShowNewElement] = useState(false);
  const utils = trpc.useUtils();
  const sessionsQ = trpc.steelflow.listSessions.useQuery();
  const elementsQ = trpc.steelflow.listElements.useQuery(
    { sessionId: activeSessionId ?? "" },
    { enabled: !!activeSessionId },
  );
  const sessions = sessionsQ.data ?? [];
  const elements = elementsQ.data ?? [];
  const activeElement = elements.find((e) => e.id === activeElementId) ?? null;

  useEffect(() => {
    if (!activeSessionId && sessions[0]) setActiveSessionId(sessions[0].id);
  }, [activeSessionId, sessions]);

  useEffect(() => {
    if (!activeElementId && elements[0]) setActiveElementId(elements[0].id);
    if (activeElementId && elements.length > 0 && !elements.some((e) => e.id === activeElementId)) {
      setActiveElementId(elements[0]?.id ?? null);
    }
  }, [activeElementId, elements]);

  const createSession = trpc.steelflow.createSession.useMutation({
    onSuccess: (row) => {
      void utils.steelflow.listSessions.invalidate();
      setActiveSessionId(row.id);
      setNewSessionName("");
      setShowNewSession(false);
    },
  });
  const deleteSession = trpc.steelflow.deleteSession.useMutation({
    onSuccess: () => {
      void utils.steelflow.listSessions.invalidate();
      setActiveSessionId(null);
      setActiveElementId(null);
    },
  });
  const deleteElement = trpc.steelflow.deleteElement.useMutation({
    onSuccess: () => {
      if (activeSessionId) void utils.steelflow.listElements.invalidate({ sessionId: activeSessionId });
      setActiveElementId(null);
    },
  });

  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <Stack orientation="horizontal" gap={3} style={{ alignItems: "center" }}>
          <Tag type="gray" size="sm">SteelFlow</Tag>
          {embedded ? <h2>Reinforcement Flow + BBS</h2> : <h1>Reinforcement Flow + BBS</h1>}
        </Stack>
        <p>
          Build a structural member map, assign TMT bars and links, then extract an auditable bar bending schedule.
        </p>
      </Stack>

      <Grid narrow>
        <Column lg={4} md={3} sm={4}>
          <Tile>
            <Stack gap={4}>
              <Stack orientation="horizontal" gap={2}>
                <Tag type="gray" size="sm">Sessions</Tag>
                <div className="esti-grow" />
                <Button kind="ghost" size="sm" hasIconOnly renderIcon={Add} iconDescription="New session" onClick={() => setShowNewSession(true)} />
              </Stack>
              {sessionsQ.isLoading ? (
                <InlineLoading description="Loading…" />
              ) : sessions.length === 0 ? (
                <p>No sessions. Create one to start.</p>
              ) : (
                <Stack gap={2}>
                  {sessions.map((session) => (
                    <Stack key={session.id} orientation="horizontal" gap={2}>
                      <Button
                        kind={activeSessionId === session.id ? "primary" : "ghost"}
                        size="sm"
                        className="esti-grow"
                        onClick={() => {
                          setActiveSessionId(session.id);
                          setActiveElementId(null);
                        }}
                      >
                        {session.name}
                      </Button>
                      <Button kind="ghost" size="sm" hasIconOnly renderIcon={TrashCan} iconDescription="Delete session" onClick={() => deleteSession.mutate({ id: session.id })} />
                    </Stack>
                  ))}
                </Stack>
              )}
            </Stack>
          </Tile>
        </Column>
        <Column lg={12} md={5} sm={4}>
          {!activeSessionId ? (
            <Tile>
              <Stack gap={3}>
                <ChartCustom size={32} />
                <h3>Create a BBS session</h3>
                <p>A session can contain slab, beam, column, and footing members for one structural package.</p>
                <Button kind="primary" size="sm" renderIcon={Add} onClick={() => setShowNewSession(true)}>
                  New session
                </Button>
              </Stack>
            </Tile>
          ) : (
            <Stack gap={5}>
              <MemberFlowCanvas
                elements={elements}
                selectedId={activeElementId}
                onSelect={setActiveElementId}
                onAdd={() => setShowNewElement(true)}
                onDelete={(id) => deleteElement.mutate({ id })}
              />
              {elementsQ.isLoading ? (
                <InlineLoading description="Loading members…" />
              ) : activeElement ? (
                <MemberEditor element={activeElement} />
              ) : (
                <Tile>
                  <Stack gap={3}>
                    <Idea size={28} />
                    <h3>Select a member node</h3>
                    <p>Add or select a member to define reinforcement and generate BBS rows.</p>
                  </Stack>
                </Tile>
              )}
            </Stack>
          )}
        </Column>
      </Grid>

      <Modal
        open={showNewSession}
        modalHeading="New BBS session"
        primaryButtonText="Create"
        secondaryButtonText="Cancel"
        onRequestClose={() => setShowNewSession(false)}
        onRequestSubmit={() => {
          if (newSessionName.trim()) createSession.mutate({ name: newSessionName.trim() });
        }}
      >
        <TextInput id="sf-session-name" labelText="Session name" placeholder="Ground floor reinforcement — Block A" value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)} />
      </Modal>

      {activeSessionId && (
        <Modal open={showNewElement} modalHeading="Add structural member" passiveModal onRequestClose={() => setShowNewElement(false)}>
          <AddMemberForm
            sessionId={activeSessionId}
            onCreated={(id) => {
              setActiveElementId(id);
              setShowNewElement(false);
            }}
          />
        </Modal>
      )}
    </Stack>
  );
}

export function SteelArranger({ embedded = false }: { embedded?: boolean }) {
  const meQ = trpc.auth.me.useQuery();
  const canManage = !!meQ.data && !["VIEWER", "CLIENT"].includes(meQ.data.role);
  const [panelIndex, setPanelIndex] = useState(embedded ? 1 : 0);

  return (
    <Stack gap={5}>
      <Tabs selectedIndex={panelIndex} onChange={({ selectedIndex }) => setPanelIndex(selectedIndex)}>
        <TabList aria-label="SteelFlow sections">
          <Tab>Catalogue</Tab>
          <Tab>Member flow</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <SteelFlowCatalogManager canManage={canManage} />
          </TabPanel>
          <TabPanel>
            <SteelArrangerWorkshop embedded={embedded} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
