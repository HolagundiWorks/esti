/**
 * SteelFlow AI — Interactive Steel Arranger + Automated BBS Generator.
 * Route: /steel-arranger
 *
 * Phase 2E complete features:
 *   - dnd-kit drag-and-drop bar placement from palette onto SVG canvas
 *   - Shape codes B/D/E: L-bend, Hairpin, Cranked bar with computed cutting lengths
 *   - BEAM/COLUMN cross-section, SLAB strip view, FOOTING plan view
 *   - Excel BBS export (SheetJS)
 *   - IS:456 rule-based AI review
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
import { useRef, useState } from "react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import * as XLSX from "xlsx";
import {
  SF_BAR_DIAS,
  SF_BAR_TYPES,
  SF_BAR_TYPE_LABEL,
  SF_ELEMENT_TYPES,
  SF_STIRRUP_TYPES,
  SF_STIRRUP_LABEL,
  SF_SHAPE_CODE_LABEL,
  sfDevelopmentLength,
  sfShapeCuttingLength,
} from "@esti/contracts";
import { trpc } from "../lib/trpc.js";
import { useSteelStore } from "../store/useSteelStore.js";
import { computeBbsRows, totalSteelKg } from "../engine/bbsEngine.js";
import { BarPalette } from "../components/steelflow/BarPalette.js";
import { CrossSectionDropZone } from "../components/steelflow/CrossSectionCanvas.js";

// ─── BBS Table ─────────────────────────────────────────────────────────────────

function BbsTable({ rows }: { rows: ReturnType<typeof computeBbsRows> }) {
  if (rows.length === 0) return <p>No bars or stirrups defined yet.</p>;
  const total = totalSteelKg(rows);
  return (
    <div style={{ overflowX: "auto" }}>
      <Table size="sm">
        <TableHead>
          <TableRow>
            <TableHeader>Element</TableHeader>
            <TableHeader>Mark</TableHeader>
            <TableHeader>Dia</TableHeader>
            <TableHeader>Shape</TableHeader>
            <TableHeader>Qty</TableHeader>
            <TableHeader>Cut. L (mm)</TableHeader>
            <TableHeader>Total L (mm)</TableHeader>
            <TableHeader>Wt/m (kg)</TableHeader>
            <TableHeader>Total Wt (kg)</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{r.elementCode}</TableCell>
              <TableCell>{r.barMark}</TableCell>
              <TableCell>T{r.diaMm}</TableCell>
              <TableCell>{r.shapeCode}</TableCell>
              <TableCell>{r.quantity}</TableCell>
              <TableCell>{r.cuttingLengthMm.toLocaleString()}</TableCell>
              <TableCell>{r.totalLengthMm.toLocaleString()}</TableCell>
              <TableCell>{r.unitWeightKgPerM}</TableCell>
              <TableCell>{r.totalWeightKg}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={8}><strong>Total Steel Weight</strong></TableCell>
            <TableCell><strong>{total} kg</strong></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

// ─── AI Review panel ──────────────────────────────────────────────────────────

function AiReviewPanel({ elementId }: { elementId: string }) {
  const reviewQ = trpc.steelflow.aiReview.useQuery({ elementId });
  if (reviewQ.isLoading) return <InlineLoading description="Running IS:456 review…" />;
  if (reviewQ.error)
    return <InlineNotification kind="error" lowContrast hideCloseButton title="Review failed" />;
  const r = reviewQ.data!;
  return (
    <Stack gap={4}>
      <Stack gap={2}>
        <Tag type="gray" size="sm">Summary</Tag>
        <p>Total steel: <strong>{r.summary.totalSteelKg} kg</strong></p>
        <p>Steel ratio: <strong>{r.summary.steelPercentage}%</strong></p>
      </Stack>
      {r.warnings.length > 0 && (
        <Stack gap={2}>
          <Tag type="red" size="sm">IS:456 Warnings</Tag>
          {r.warnings.map((w, i) => (
            <InlineNotification key={i} kind="warning" lowContrast hideCloseButton title={w} />
          ))}
        </Stack>
      )}
      {r.suggestions.length > 0 && (
        <Stack gap={2}>
          <Tag type="blue" size="sm">Suggestions</Tag>
          {r.suggestions.map((s, i) => <p key={i}>{s}</p>)}
        </Stack>
      )}
      {r.warnings.length === 0 && (
        <InlineNotification kind="success" lowContrast hideCloseButton title="No IS:456 violations detected." />
      )}
    </Stack>
  );
}

// ─── Add rebar form (with shape code + bent-bar dimensions) ───────────────────

function AddRebarForm({
  elementId,
  elementLengthMm,
  elementCoverMm,
  elementWidthMm,
  elementDepthMm,
  initialDia,
  initialPosX,
  initialPosY,
  onDone,
}: {
  elementId: string;
  elementLengthMm: number;
  elementCoverMm: number;
  elementWidthMm: number;
  elementDepthMm: number;
  initialDia?: number;
  initialPosX?: number;
  initialPosY?: number;
  onDone?: () => void;
}) {
  const [dia, setDia] = useState<number>(initialDia ?? 12);
  const [barType, setBarType] = useState<string>(
    initialPosY != null && initialPosY < elementDepthMm * 0.4
      ? "BOTTOM_MAIN"
      : initialPosY != null && initialPosY > elementDepthMm * 0.6
        ? "TOP_MAIN"
        : "BOTTOM_MAIN",
  );
  const [qty, setQty] = useState(1);
  const [shapeCode, setShapeCode] = useState("A");
  const [mark, setMark] = useState("");
  // Bent bar dimension inputs
  const [leg2, setLeg2] = useState(300);
  const [hairpinH, setHairpinH] = useState(300);
  const [hairpinW, setHairpinW] = useState(150);
  const [crankH, setCrankH] = useState(50);
  const utils = trpc.useUtils();

  const computedCutLen =
    shapeCode === "A"
      ? elementLengthMm
      : sfShapeCuttingLength(shapeCode, elementLengthMm, dia, {
          leg2,
          hairpinH,
          hairpinW,
          crankH,
        });

  const createMut = trpc.steelflow.createRebar.useMutation({
    onSuccess: () => {
      utils.steelflow.listRebars.invalidate({ elementId });
      setMark("");
      onDone?.();
    },
  });

  function handleAdd() {
    createMut.mutate({
      elementId,
      barMark: mark || `${shapeCode}${dia}`,
      diaMm: dia as (typeof SF_BAR_DIAS)[number],
      barType: barType as (typeof SF_BAR_TYPES)[number],
      quantity: qty,
      cuttingLengthMm: computedCutLen,
      shapeCode,
      posX: initialPosX,
      posY: initialPosY,
    });
  }

  return (
    <Stack gap={3}>
      <Stack orientation="horizontal" gap={3}>
        <TextInput
          id="rebar-mark"
          labelText="Mark"
          size="sm"
          placeholder={`${shapeCode}${dia}`}
          value={mark}
          onChange={(e) => setMark(e.target.value)}
        />
        <Select id="rebar-dia" labelText="Dia (mm)" size="sm" value={dia}
          onChange={(e) => setDia(Number(e.target.value))}>
          {SF_BAR_DIAS.map((d) => <SelectItem key={d} value={d} text={`T${d}`} />)}
        </Select>
        <Select id="rebar-type" labelText="Bar type" size="sm" value={barType}
          onChange={(e) => setBarType(e.target.value)}>
          {SF_BAR_TYPES.map((t) => <SelectItem key={t} value={t} text={SF_BAR_TYPE_LABEL[t]} />)}
        </Select>
      </Stack>
      <Stack orientation="horizontal" gap={3}>
        <NumberInput id="rebar-qty" label="Qty" size="sm" min={1} max={50} value={qty}
          onChange={(_e, { value }) => setQty(Number(value))} />
        <Select id="rebar-shape" labelText="Shape code" size="sm" value={shapeCode}
          onChange={(e) => setShapeCode(e.target.value)}>
          {Object.entries(SF_SHAPE_CODE_LABEL)
            .filter(([k]) => k !== "F") // stirrups only
            .map(([k, v]) => <SelectItem key={k} value={k} text={`${k} — ${v}`} />)}
        </Select>
      </Stack>

      {/* Shape-specific extra dimension inputs */}
      {shapeCode === "B" && (
        <Stack gap={2}>
          <Tag type="gray" size="sm">L-bend dimensions</Tag>
          <NumberInput id="leg2" label="Side leg (mm)" size="sm" min={50} max={3000} step={50}
            value={leg2} onChange={(_e, { value }) => setLeg2(Number(value))} />
        </Stack>
      )}
      {shapeCode === "D" && (
        <Stack gap={2}>
          <Tag type="gray" size="sm">Hairpin dimensions</Tag>
          <Stack orientation="horizontal" gap={3}>
            <NumberInput id="hp-h" label="Height (mm)" size="sm" min={50} max={3000} step={25}
              value={hairpinH} onChange={(_e, { value }) => setHairpinH(Number(value))} />
            <NumberInput id="hp-w" label="Width (mm)" size="sm" min={50} max={3000} step={25}
              value={hairpinW} onChange={(_e, { value }) => setHairpinW(Number(value))} />
          </Stack>
        </Stack>
      )}
      {shapeCode === "E" && (
        <Stack gap={2}>
          <Tag type="gray" size="sm">Cranked bar dimensions</Tag>
          <NumberInput id="crank-h" label="Crank height (mm)" size="sm" min={10} max={500} step={5}
            value={crankH} onChange={(_e, { value }) => setCrankH(Number(value))} />
        </Stack>
      )}

      <Stack orientation="horizontal" gap={3}>
        <Tag type={shapeCode === "A" ? "gray" : "blue"} size="sm">
          Cut. L = {computedCutLen.toLocaleString()} mm
        </Tag>
        {initialPosX != null && (
          <Tag type="teal" size="sm">
            pos ({Math.round(initialPosX)}, {Math.round(initialPosY ?? 0)}) mm
          </Tag>
        )}
      </Stack>

      <Button kind="primary" size="sm" renderIcon={Add} onClick={handleAdd}
        disabled={createMut.isPending}>
        Add rebar
      </Button>
    </Stack>
  );
}

// ─── Add stirrup form ─────────────────────────────────────────────────────────

function AddStirrupForm({ elementId }: { elementId: string }) {
  const [dia, setDia] = useState(8);
  const [spacing, setSpacing] = useState(150);
  const [stirrupType, setStirrupType] = useState("CLOSED");
  const utils = trpc.useUtils();
  const createMut = trpc.steelflow.createStirrup.useMutation({
    onSuccess: () => utils.steelflow.listStirrups.invalidate({ elementId }),
  });
  return (
    <Stack gap={3}>
      <Stack orientation="horizontal" gap={3}>
        <Select id="stir-dia" labelText="Dia (mm)" size="sm" value={dia}
          onChange={(e) => setDia(Number(e.target.value))}>
          {[6, 8, 10, 12].map((d) => <SelectItem key={d} value={d} text={`T${d}`} />)}
        </Select>
        <Select id="stir-type" labelText="Type" size="sm" value={stirrupType}
          onChange={(e) => setStirrupType(e.target.value)}>
          {SF_STIRRUP_TYPES.map((t) => <SelectItem key={t} value={t} text={SF_STIRRUP_LABEL[t]} />)}
        </Select>
        <NumberInput id="stir-spacing" label="Spacing (mm)" size="sm" min={50} max={500} step={25}
          value={spacing} onChange={(_e, { value }) => setSpacing(Number(value))} />
      </Stack>
      <Button kind="primary" size="sm" renderIcon={Add}
        onClick={() => createMut.mutate({
          elementId,
          diaMm: dia as (typeof SF_BAR_DIAS)[number],
          stirrupType: stirrupType as (typeof SF_STIRRUP_TYPES)[number],
          spacingMm: spacing,
          hookAngle: 135,
        })}
        disabled={createMut.isPending}>
        Add stirrup
      </Button>
    </Stack>
  );
}

// ─── Element editor ───────────────────────────────────────────────────────────

function ElementEditor({ elementId }: { elementId: string }) {
  const [showAi, setShowAi] = useState(false);
  // Pending drop state — when a bar is dropped from palette, we show the form
  const [pendingDrop, setPendingDrop] = useState<{
    dia: number; posX: number; posY: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
  );

  const rebarsQ = trpc.steelflow.listRebars.useQuery({ elementId });
  const stirrupsQ = trpc.steelflow.listStirrups.useQuery({ elementId });
  const utils = trpc.useUtils();

  const deleteRebarMut = trpc.steelflow.deleteRebar.useMutation({
    onSuccess: () => utils.steelflow.listRebars.invalidate({ elementId }),
  });
  const deleteStirrupMut = trpc.steelflow.deleteStirrup.useMutation({
    onSuccess: () => utils.steelflow.listStirrups.invalidate({ elementId }),
  });

  const rebars = rebarsQ.data ?? [];
  const stirrups = stirrupsQ.data ?? [];

  const sessId = useSteelStore((s) => s.activeSessionId) ?? "";
  const allElemsQ = trpc.steelflow.listElements.useQuery(
    { sessionId: sessId },
    { enabled: !!sessId },
  );
  const el = (allElemsQ.data ?? []).find((e) => e.id === elementId);

  const bbsRows = el
    ? computeBbsRows(
        el,
        rebars.map((r) => ({
          ...r,
          cuttingLengthMm: r.cuttingLengthMm ?? undefined,
          posX: r.posX ?? undefined,
          posY: r.posY ?? undefined,
        })),
        stirrups,
      )
    : [];

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.over.id !== "sf-canvas" || !el) return;
    const dia = event.active.data.current?.dia as number;
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    // Compute final client position from activator + delta
    const ae = event.activatorEvent as MouseEvent | TouchEvent;
    const startX = "clientX" in ae ? ae.clientX : ae.touches[0]?.clientX ?? 0;
    const startY = "clientX" in ae ? ae.clientY : ae.touches[0]?.clientY ?? 0;
    const finalX = startX + event.delta.x;
    const finalY = startY + event.delta.y;
    // Convert to SVG mm coordinates
    const scale = Math.min(320 / el.widthMm, 320 / el.depthMm);
    const posX = Math.max(0, Math.min(el.widthMm, (finalX - svgRect.left) / scale));
    const posY = Math.max(0, Math.min(el.depthMm, (finalY - svgRect.top) / scale));
    setPendingDrop({ dia, posX, posY });
  }

  function exportXlsx() {
    const ws = XLSX.utils.json_to_sheet(
      bbsRows.map((r) => ({
        "Element": r.elementCode,
        "Bar Mark": r.barMark,
        "Dia (mm)": `T${r.diaMm}`,
        "Shape": r.shapeCode,
        "Qty": r.quantity,
        "Cutting Length (mm)": r.cuttingLengthMm,
        "Total Length (mm)": r.totalLengthMm,
        "Unit Wt (kg/m)": r.unitWeightKgPerM,
        "Total Wt (kg)": r.totalWeightKg,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BBS");
    XLSX.writeFile(wb, `BBS_${el?.elementCode ?? "element"}.xlsx`);
  }

  if (!el) return <InlineLoading description="Loading element…" />;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <Stack gap={5}>
        {/* Element info bar */}
        <Stack orientation="horizontal" gap={3} style={{ flexWrap: "wrap" }}>
          <Tag type="gray" size="sm">{el.elementType}</Tag>
          <strong>{el.elementCode}</strong>
          <Tag type="blue" size="sm">{el.widthMm} × {el.depthMm} mm</Tag>
          <Tag type="teal" size="sm">L = {el.lengthMm.toLocaleString()} mm</Tag>
          <Tag type="gray" size="sm">M{el.fck} / Fe{el.fy}</Tag>
          <Tag type="gray" size="sm">Cover {el.coverMm} mm</Tag>
        </Stack>

        <Grid narrow>
          {/* Canvas column */}
          <Column lg={7} md={4} sm={4}>
            <Tile>
              <Stack gap={3}>
                <Stack orientation="horizontal" gap={3}>
                  <Tag type="gray" size="sm">
                    {el.elementType === "SLAB"
                      ? "Cross-section strip"
                      : el.elementType === "FOOTING"
                        ? "Plan view"
                        : "Cross-section"}
                  </Tag>
                  {(el.elementType === "BEAM" || el.elementType === "COLUMN") && (
                    <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
                      Drop a bar from the palette onto the section
                    </p>
                  )}
                </Stack>
                {(el.elementType === "BEAM" || el.elementType === "COLUMN") && (
                  <BarPalette />
                )}
                <CrossSectionDropZone
                  ref={svgRef}
                  elementType={el.elementType}
                  widthMm={el.widthMm}
                  depthMm={el.depthMm}
                  lengthMm={el.lengthMm}
                  coverMm={el.coverMm}
                  rebars={rebars}
                  stirrups={stirrups}
                />
                {el.elementType === "SLAB" && (
                  <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
                    BOTTOM_MAIN = bottom layer · TOP_MAIN = top layer · SIDE_FACE = distribution bars
                  </p>
                )}
                {el.elementType === "FOOTING" && (
                  <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
                    BOTTOM_MAIN = bars in X-direction · SIDE_FACE / TOP_MAIN = bars in Y-direction
                  </p>
                )}
              </Stack>
            </Tile>
          </Column>

          {/* Tabs column */}
          <Column lg={9} md={4} sm={4}>
            <Tabs>
              <TabList aria-label="Reinforcement tabs">
                <Tab>Rebars ({rebars.length})</Tab>
                <Tab>Stirrups ({stirrups.length})</Tab>
                <Tab>BBS</Tab>
                <Tab>Dev. Length</Tab>
              </TabList>
              <TabPanels>
                {/* Rebars */}
                <TabPanel>
                  <Stack gap={4}>
                    <AddRebarForm
                      elementId={elementId}
                      elementLengthMm={el.lengthMm}
                      elementCoverMm={el.coverMm}
                      elementWidthMm={el.widthMm}
                      elementDepthMm={el.depthMm}
                    />
                    {rebars.length > 0 && (
                      <Stack gap={2}>
                        {rebars.map((r) => (
                          <Stack key={r.id} orientation="horizontal" gap={2} style={{ flexWrap: "wrap" }}>
                            <Tag type="blue" size="sm">T{r.diaMm}</Tag>
                            <Tag type="gray" size="sm">
                              {SF_BAR_TYPE_LABEL[r.barType as (typeof SF_BAR_TYPES)[number]] ?? r.barType}
                            </Tag>
                            <Tag type={r.shapeCode !== "A" ? "purple" : "cool-gray"} size="sm">
                              {r.shapeCode} — {SF_SHAPE_CODE_LABEL[r.shapeCode] ?? r.shapeCode}
                            </Tag>
                            <p>{r.barMark} · {r.quantity} nos · {(r.cuttingLengthMm ?? el.lengthMm).toLocaleString()} mm</p>
                            <Button kind="danger--ghost" size="sm" hasIconOnly
                              renderIcon={TrashCan} iconDescription="Remove"
                              onClick={() => deleteRebarMut.mutate({ id: r.id })} />
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </TabPanel>

                {/* Stirrups */}
                <TabPanel>
                  <Stack gap={4}>
                    <AddStirrupForm elementId={elementId} />
                    {stirrups.length > 0 && (
                      <Stack gap={2}>
                        {stirrups.map((s) => (
                          <Stack key={s.id} orientation="horizontal" gap={2}>
                            <Tag type="teal" size="sm">T{s.diaMm}</Tag>
                            <Tag type="gray" size="sm">
                              {SF_STIRRUP_LABEL[s.stirrupType as (typeof SF_STIRRUP_TYPES)[number]] ?? s.stirrupType}
                            </Tag>
                            <p>@ {s.spacingMm} mm c/c · {s.zone}</p>
                            <Button kind="danger--ghost" size="sm" hasIconOnly
                              renderIcon={TrashCan} iconDescription="Remove"
                              onClick={() => deleteStirrupMut.mutate({ id: s.id })} />
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </TabPanel>

                {/* BBS */}
                <TabPanel>
                  <Stack gap={4}>
                    <BbsTable rows={bbsRows} />
                    {bbsRows.length > 0 && (
                      <Button kind="ghost" size="sm" renderIcon={Document} onClick={exportXlsx}>
                        Export BBS (Excel)
                      </Button>
                    )}
                  </Stack>
                </TabPanel>

                {/* Development length */}
                <TabPanel>
                  <Stack gap={3}>
                    <p>IS:456 cl.26.2 — Development length for M{el.fck} / Fe{el.fy}:</p>
                    <div style={{ overflowX: "auto" }}>
                      <Table size="sm">
                        <TableHead>
                          <TableRow>
                            <TableHeader>Bar dia</TableHeader>
                            <TableHeader>Ld (mm)</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {SF_BAR_DIAS.map((d) => (
                            <TableRow key={d}>
                              <TableCell>T{d}</TableCell>
                              <TableCell>{sfDevelopmentLength(d, el.fy, el.fck)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Stack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Column>
        </Grid>

        {/* AI review */}
        <Stack orientation="horizontal" gap={3}>
          <Button kind={showAi ? "secondary" : "ghost"} size="sm" renderIcon={Idea}
            onClick={() => setShowAi((v) => !v)}>
            {showAi ? "Hide AI Review" : "IS:456 AI Review"}
          </Button>
        </Stack>
        {showAi && <AiReviewPanel elementId={elementId} />}
      </Stack>

      {/* Drop-to-add modal — shows rebar form pre-filled with drop position */}
      {pendingDrop && el && (
        <Modal
          open
          modalHeading={`Add T${pendingDrop.dia} bar at (${Math.round(pendingDrop.posX)}, ${Math.round(pendingDrop.posY)}) mm`}
          passiveModal
          onRequestClose={() => setPendingDrop(null)}
        >
          <AddRebarForm
            elementId={elementId}
            elementLengthMm={el.lengthMm}
            elementCoverMm={el.coverMm}
            elementWidthMm={el.widthMm}
            elementDepthMm={el.depthMm}
            initialDia={pendingDrop.dia}
            initialPosX={pendingDrop.posX}
            initialPosY={pendingDrop.posY}
            onDone={() => setPendingDrop(null)}
          />
        </Modal>
      )}
    </DndContext>
  );
}

// ─── New element form ─────────────────────────────────────────────────────────

function NewElementForm({
  sessionId,
  onCreated,
}: {
  sessionId: string;
  onCreated: (id: string) => void;
}) {
  const [type, setType] = useState("BEAM");
  const [code, setCode] = useState("");
  const [length, setLength] = useState(5000);
  const [width, setWidth] = useState(230);
  const [depth, setDepth] = useState(450);
  const [cover, setCover] = useState(25);
  const [fck, setFck] = useState(25);
  const [fy, setFy] = useState(500);
  const utils = trpc.useUtils();

  const createMut = trpc.steelflow.createElement.useMutation({
    onSuccess: (row) => {
      utils.steelflow.listElements.invalidate({ sessionId });
      onCreated(row.id);
      setCode("");
    },
  });

  // Default dimensions per type
  function applyDefaults(t: string) {
    if (t === "COLUMN") { setWidth(230); setDepth(450); setCover(40); }
    else if (t === "SLAB") { setWidth(1000); setDepth(150); setCover(20); }
    else if (t === "FOOTING") { setWidth(1500); setDepth(400); setCover(50); }
    else { setWidth(230); setDepth(450); setCover(25); }
    setType(t);
  }

  return (
    <Stack gap={3}>
      <Stack orientation="horizontal" gap={3}>
        <Select id="el-type" labelText="Type" size="sm" value={type}
          onChange={(e) => applyDefaults(e.target.value)}>
          {SF_ELEMENT_TYPES.map((t) => <SelectItem key={t} value={t} text={t} />)}
        </Select>
        <TextInput id="el-code" labelText="Code" size="sm" placeholder="B1"
          value={code} onChange={(e) => setCode(e.target.value)} />
      </Stack>
      <Stack orientation="horizontal" gap={3}>
        <NumberInput id="el-len" label="Length (mm)" size="sm" min={300} max={30000} step={100}
          value={length} onChange={(_e, { value }) => setLength(Number(value))} />
        <NumberInput id="el-width" label="Width (mm)" size="sm" min={100} max={3000} step={25}
          value={width} onChange={(_e, { value }) => setWidth(Number(value))} />
        <NumberInput id="el-depth" label="Depth (mm)" size="sm" min={100} max={3000} step={25}
          value={depth} onChange={(_e, { value }) => setDepth(Number(value))} />
      </Stack>
      <Stack orientation="horizontal" gap={3}>
        <NumberInput id="el-cover" label="Cover (mm)" size="sm" min={15} max={75} step={5}
          value={cover} onChange={(_e, { value }) => setCover(Number(value))} />
        <Select id="el-fck" labelText="fck (MPa)" size="sm" value={fck}
          onChange={(e) => setFck(Number(e.target.value))}>
          {[20, 25, 30, 35, 40].map((v) => <SelectItem key={v} value={v} text={`M${v}`} />)}
        </Select>
        <Select id="el-fy" labelText="fy (MPa)" size="sm" value={fy}
          onChange={(e) => setFy(Number(e.target.value))}>
          {[250, 415, 500, 550].map((v) => <SelectItem key={v} value={v} text={`Fe${v}`} />)}
        </Select>
      </Stack>
      <Button kind="primary" size="sm" renderIcon={Add}
        onClick={() => createMut.mutate({
          sessionId,
          elementType: type as (typeof SF_ELEMENT_TYPES)[number],
          elementCode: code || `${type[0]}1`,
          lengthMm: length,
          widthMm: width,
          depthMm: depth,
          coverMm: cover,
          fck,
          fy,
        })}
        disabled={createMut.isPending}>
        Add element
      </Button>
    </Stack>
  );
}

// ─── Main route ───────────────────────────────────────────────────────────────

export function SteelArranger() {
  const { activeSessionId, activeElementId, setActiveSession, setActiveElement } =
    useSteelStore();

  const [newSessionName, setNewSessionName] = useState("");
  const [showNewSession, setShowNewSession] = useState(false);
  const [showNewElement, setShowNewElement] = useState(false);

  const utils = trpc.useUtils();
  const sessionsQ = trpc.steelflow.listSessions.useQuery();
  const elementsQ = trpc.steelflow.listElements.useQuery(
    { sessionId: activeSessionId! },
    { enabled: !!activeSessionId },
  );

  const createSessionMut = trpc.steelflow.createSession.useMutation({
    onSuccess: (row) => {
      utils.steelflow.listSessions.invalidate();
      setActiveSession(row.id);
      setNewSessionName("");
      setShowNewSession(false);
    },
  });
  const deleteSessionMut = trpc.steelflow.deleteSession.useMutation({
    onSuccess: () => {
      utils.steelflow.listSessions.invalidate();
      setActiveSession(null);
    },
  });
  const deleteElementMut = trpc.steelflow.deleteElement.useMutation({
    onSuccess: () => {
      utils.steelflow.listElements.invalidate({ sessionId: activeSessionId! });
      setActiveElement(null);
    },
  });

  const sessions = sessionsQ.data ?? [];
  const elements = elementsQ.data ?? [];

  return (
    <Stack gap={5}>
      <Stack orientation="horizontal" gap={3}>
        <Tag type="gray" size="sm">SteelFlow AI</Tag>
        <h1>Steel Arranger + BBS Generator</h1>
      </Stack>
      <p>Interactive reinforcement arrangement with automated Bar Bending Schedule per IS:456 / IS:2502.</p>

      <Grid narrow>
        {/* Sidebar */}
        <Column lg={4} md={3} sm={4}>
          <Tile>
            <Stack gap={4}>
              <Stack orientation="horizontal" gap={2}>
                <Tag type="gray" size="sm">Sessions</Tag>
                <div className="esti-grow" />
                <Button kind="ghost" size="sm" hasIconOnly renderIcon={Add}
                  iconDescription="New session" onClick={() => setShowNewSession(true)} />
              </Stack>
              {sessionsQ.isLoading ? (
                <InlineLoading description="Loading…" />
              ) : sessions.length === 0 ? (
                <p>No sessions. Create one to start.</p>
              ) : (
                <Stack gap={2}>
                  {sessions.map((s) => (
                    <Stack key={s.id} orientation="horizontal" gap={2}>
                      <Button
                        kind={activeSessionId === s.id ? "primary" : "ghost"}
                        size="sm" className="esti-grow"
                        onClick={() => setActiveSession(s.id)}>
                        {s.name}
                      </Button>
                      <Button kind="danger--ghost" size="sm" hasIconOnly renderIcon={TrashCan}
                        iconDescription="Delete" onClick={() => deleteSessionMut.mutate({ id: s.id })} />
                    </Stack>
                  ))}
                </Stack>
              )}
            </Stack>
          </Tile>

          {activeSessionId && (
            <Tile style={{ marginBlockStart: "1rem" }}>
              <Stack gap={4}>
                <Stack orientation="horizontal" gap={2}>
                  <Tag type="blue" size="sm">Elements</Tag>
                  <div className="esti-grow" />
                  <Button kind="ghost" size="sm" hasIconOnly renderIcon={Add}
                    iconDescription="New element" onClick={() => setShowNewElement(true)} />
                </Stack>
                {elementsQ.isLoading ? (
                  <InlineLoading description="Loading…" />
                ) : elements.length === 0 ? (
                  <p>No elements. Add a beam, column, slab, or footing.</p>
                ) : (
                  <Stack gap={2}>
                    {elements.map((e) => (
                      <Stack key={e.id} orientation="horizontal" gap={2}>
                        <Button
                          kind={activeElementId === e.id ? "secondary" : "ghost"}
                          size="sm" className="esti-grow"
                          onClick={() => setActiveElement(e.id)}>
                          {e.elementCode} — {e.elementType}
                        </Button>
                        <Button kind="danger--ghost" size="sm" hasIconOnly renderIcon={TrashCan}
                          iconDescription="Delete" onClick={() => deleteElementMut.mutate({ id: e.id })} />
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Tile>
          )}
        </Column>

        {/* Main editor */}
        <Column lg={12} md={5} sm={4}>
          {!activeSessionId ? (
            <Tile>
              <Stack gap={3}>
                <ChartCustom size={32} />
                <h3>Select or create a session to start</h3>
                <p>A session represents one structural design — e.g. "Ground Floor Beams". Each session can contain beams, columns, slabs, and footings.</p>
                <Button kind="primary" size="sm" renderIcon={Add} onClick={() => setShowNewSession(true)}>
                  New session
                </Button>
              </Stack>
            </Tile>
          ) : !activeElementId ? (
            <Tile>
              <Stack gap={3}>
                <h3>Select an element to edit reinforcement</h3>
                <p>Choose an element from the sidebar, or add a new one.</p>
              </Stack>
            </Tile>
          ) : (
            <ElementEditor elementId={activeElementId} />
          )}
        </Column>
      </Grid>

      {/* New session modal */}
      <Modal open={showNewSession} modalHeading="New BBS session"
        primaryButtonText="Create" secondaryButtonText="Cancel"
        onRequestClose={() => setShowNewSession(false)}
        onRequestSubmit={() => {
          if (newSessionName.trim()) createSessionMut.mutate({ name: newSessionName.trim() });
        }}>
        <TextInput id="new-session-name" labelText="Session name"
          placeholder="Ground floor beams — Block A"
          value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)} />
      </Modal>

      {/* New element modal */}
      {activeSessionId && (
        <Modal open={showNewElement} modalHeading="Add structural element"
          passiveModal onRequestClose={() => setShowNewElement(false)}>
          <NewElementForm
            sessionId={activeSessionId}
            onCreated={(id) => { setActiveElement(id); setShowNewElement(false); }}
          />
        </Modal>
      )}
    </Stack>
  );
}
