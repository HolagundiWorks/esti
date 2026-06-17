import {
  Button,
  ButtonSet,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
  Toggle,
} from "@carbon/react";
import { FitToScreen, Maximize, Minimize, Move, Ruler, ZoomIn, ZoomOut } from "@carbon/icons-react";
import {
  DEFAULT_SNAP_GRID_MM,
  takeoffElement,
  type TakeoffCategory,
  type TakeoffElementSpec,
} from "@esti/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clientToSvgPoint,
  fitViewBoxToBounds,
  parseSvgMarkup,
  panViewBox,
  viewBoxString,
  zoomViewBox,
  type ViewBox,
} from "../lib/drawingViewport.js";
import { applySnap, extractSvgEndpoints, type Pt } from "../lib/takeoffSnap.js";
import { trpc } from "../lib/trpc.js";
import { TakeoffComponentPicker } from "./TakeoffComponentPicker.js";

type Tool = "pan" | "measure" | "area" | "count" | "calibrate";

function toolForElement(el: TakeoffElementSpec): Tool {
  if (el.measureKind === "AREA") return "area";
  if (el.measureKind === "COUNT") return "count";
  return "measure";
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function polygonArea(pts: Pt[]): number {
  if (pts.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

function initialViewBox(
  svg: string | undefined,
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null | undefined,
): ViewBox {
  if (bounds && bounds.maxX > bounds.minX && bounds.maxY > bounds.minY) {
    return fitViewBoxToBounds(bounds);
  }
  const parsed = svg ? parseSvgMarkup(svg) : null;
  return parsed?.viewBox ?? { x: 0, y: 0, w: 1000, h: 1000 };
}

export function DrawingViewer({
  drawingId,
  projectId,
  open,
  onClose,
}: {
  drawingId: string;
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const svgQ = trpc.drawings.svg.useQuery({ id: drawingId }, { enabled: open });
  const metaQ = trpc.drawings.byId.useQuery({ id: drawingId }, { enabled: open });
  const measQ = trpc.measurements.listByDrawing.useQuery({ drawingId }, { enabled: open });

  const svgRootRef = useRef<SVGSVGElement | null>(null);
  const panRef = useRef<{ x: number; y: number; vb: ViewBox } | null>(null);

  const [tool, setTool] = useState<Tool>("pan");
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, w: 1000, h: 1000 });
  const [pts, setPts] = useState<Pt[]>([]);
  const [calibLen, setCalibLen] = useState("");
  const [calibUnit, setCalibUnit] = useState("mm");
  const [label, setLabel] = useState("");
  const [fullscreen, setFullscreen] = useState(true);
  const [snapOrtho, setSnapOrtho] = useState(true);
  const [snapGrid, setSnapGrid] = useState(true);
  const [snapEndpoints, setSnapEndpoints] = useState(true);
  const [gridMm, setGridMm] = useState(DEFAULT_SNAP_GRID_MM);
  const [endpoints, setEndpoints] = useState<Pt[]>([]);

  const [category, setCategory] = useState<TakeoffCategory>("WALL");
  const [element, setElement] = useState<TakeoffElementSpec>(() => takeoffElement("WALL_230")!);
  const [heightMm, setHeightMm] = useState("3000");
  const [itemCount, setItemCount] = useState("1");

  const parsedSvg = useMemo(
    () => (svgQ.data?.svg ? parseSvgMarkup(svgQ.data.svg) : null),
    [svgQ.data?.svg],
  );

  const bounds = metaQ.data?.bounds as
    | { minX: number; minY: number; maxX: number; maxY: number }
    | null
    | undefined;

  useEffect(() => {
    if (!open || !svgQ.data?.svg) return;
    const b = metaQ.data?.bounds as
      | { minX: number; minY: number; maxX: number; maxY: number }
      | null
      | undefined;
    setViewBox(initialViewBox(svgQ.data.svg, b));
    setPts([]);
    setTool("pan");
  }, [open, drawingId, svgQ.data?.svg]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const svg = svgRootRef.current;
      if (svg) setEndpoints(extractSvgEndpoints(svg));
    }, 100);
    return () => window.clearTimeout(t);
  }, [open, parsedSvg?.inner, viewBox]);

  const handleElementChange = useCallback((el: TakeoffElementSpec) => {
    setElement(el);
    if (el.defaultHeightMm) setHeightMm(String(el.defaultHeightMm));
    setTool((t) => (t === "calibrate" ? t : toolForElement(el)));
    setPts([]);
  }, []);

  const scale = metaQ.data?.scaleUnitsPerVb ?? null;
  const scaleUnit = metaQ.data?.scaleUnit ?? null;

  const snapSettings = useMemo(
    () => ({
      ortho: snapOrtho,
      grid: snapGrid,
      gridMm,
      endpoints: snapEndpoints,
      scaleUnitsPerVb: scale,
      scaleUnit,
    }),
    [snapOrtho, snapGrid, gridMm, snapEndpoints, scale, scaleUnit],
  );
  const vbLen = pts.length === 2 ? dist(pts[0]!, pts[1]!) : 0;
  const vbArea = tool === "area" ? polygonArea(pts) : 0;
  const realArea = scale ? vbArea * scale * scale : 0;
  const areaUnit = scaleUnit ? `${scaleUnit}²` : "";

  const setScale = trpc.drawings.setScale.useMutation({
    onSuccess: () => {
      utils.drawings.byId.invalidate({ id: drawingId });
      setPts([]);
      setCalibLen("");
      setTool("measure");
    },
  });
  const createMeas = trpc.measurements.create.useMutation({
    onSuccess: () => {
      utils.measurements.listByDrawing.invalidate({ drawingId });
      utils.measurements.listByProject.invalidate({ projectId });
      setPts([]);
      setLabel("");
      setItemCount("1");
    },
  });
  const removeMeas = trpc.measurements.remove.useMutation({
    onSuccess: () => {
      utils.measurements.listByDrawing.invalidate({ drawingId });
      utils.measurements.listByProject.invalidate({ projectId });
    },
  });

  const fitToDrawing = useCallback(() => {
    setViewBox(initialViewBox(svgQ.data?.svg, bounds));
  }, [svgQ.data?.svg, bounds]);

  const zoomBy = useCallback(
    (factor: number) => {
      const svg = svgRootRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const cx = viewBox.x + viewBox.w / 2;
      const cy = viewBox.y + viewBox.h / 2;
      const focus = clientToSvgPoint(svg, rect.left + rect.width / 2, rect.top + rect.height / 2);
      setViewBox((vb) => zoomViewBox(vb, factor, focus.x || cx, focus.y || cy));
    },
    [viewBox.x, viewBox.y, viewBox.w, viewBox.h],
  );

  useEffect(() => {
    const svg = svgRootRef.current;
    if (!svg || !open) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.12 : 0.88;
      const focus = clientToSvgPoint(svg, e.clientX, e.clientY);
      setViewBox((vb) => zoomViewBox(vb, factor, focus.x, focus.y));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [open, parsedSvg?.inner]);

  function switchTool(next: Tool) {
    setTool(next);
    setPts([]);
  }

  function snapPoint(origin: Pt | null, next: Pt): Pt {
    return applySnap(next, origin, snapSettings, endpoints);
  }

  function addPoint(raw: Pt) {
    const origin = pts.length ? pts[pts.length - 1]! : null;
    const next = snapPoint(origin, raw);
    if (tool === "area") {
      setPts((prev) => [...prev, next]);
      return;
    }
    if (tool === "count") {
      setPts([next]);
      return;
    }
    setPts((prev) => (prev.length >= 2 ? [next] : [...prev, next]));
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRootRef.current;
    if (!svg) return;
    if (tool === "pan" || e.button === 1) {
      svg.setPointerCapture(e.pointerId);
      panRef.current = { x: e.clientX, y: e.clientY, vb: viewBox };
      return;
    }
    if (tool !== "pan" && e.button === 0) {
      const p = clientToSvgPoint(svg, e.clientX, e.clientY);
      addPoint(p);
    }
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const pan = panRef.current;
    if (!pan) return;
    const svg = svgRootRef.current;
    if (!svg) return;
    const dxPx = e.clientX - pan.x;
    const dyPx = e.clientY - pan.y;
    const rect = svg.getBoundingClientRect();
    const dx = (-dxPx / rect.width) * pan.vb.w;
    const dy = (-dyPx / rect.height) * pan.vb.h;
    setViewBox(panViewBox(pan.vb, dx, dy));
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (panRef.current) {
      panRef.current = null;
      svgRootRef.current?.releasePointerCapture(e.pointerId);
    }
  }

  const sw = viewBox.w / 400;
  const cursor =
    tool === "pan" || panRef.current ? "grab" : "crosshair";

  const toolHint: Record<Tool, string> = {
    pan: "Drag to pan · scroll wheel to zoom · Fit resets the view",
    measure: "Enter element name · pick type above · click two points · save length",
    area: "Enter element name · pick type above · click vertices · save area",
    count: "Enter element name · pick type above · click location · save count",
    calibrate: "Click a known dimension (two points) · enter real length below",
  };

  const elementName = label.trim();
  const canSave = elementName.length > 0;

  const toolbar = (
    <Stack gap={4} style={{ marginBottom: 12, padding: fullscreen ? "12px 12px 0" : 0 }}>
      <Stack orientation="horizontal" gap={4} style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <TakeoffComponentPicker
          category={category}
          elementTypeId={element.id}
          onCategoryChange={(c) => setCategory(c)}
          onElementChange={handleElementChange}
        />
        <TextInput
          id="element-name"
          labelText="Element name"
          placeholder="e.g. Grid A1"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          size="sm"
          style={{ minWidth: 200, maxWidth: 280 }}
        />
        <Tag type="blue" size="md">
          Type: {element.label}
        </Tag>
      </Stack>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <ButtonSet>
          <Button
            size="sm"
            kind={tool === "pan" ? "primary" : "tertiary"}
            renderIcon={Move}
            onClick={() => switchTool("pan")}
          >
            Pan
          </Button>
          <Button
            size="sm"
            kind={tool === "measure" ? "primary" : "tertiary"}
            renderIcon={Ruler}
            onClick={() => switchTool("measure")}
          >
            Length
          </Button>
          <Button
            size="sm"
            kind={tool === "area" ? "primary" : "tertiary"}
            onClick={() => switchTool("area")}
          >
            Area
          </Button>
          <Button
            size="sm"
            kind={tool === "count" ? "primary" : "tertiary"}
            onClick={() => switchTool("count")}
          >
            Count
          </Button>
          <Button
            size="sm"
            kind={tool === "calibrate" ? "primary" : "tertiary"}
            onClick={() => switchTool("calibrate")}
          >
            Scale
          </Button>
        </ButtonSet>

        <ButtonSet>
          <Button
            size="sm"
            kind="ghost"
            hasIconOnly
            iconDescription="Zoom in"
            renderIcon={ZoomIn}
            onClick={() => zoomBy(0.75)}
          />
          <Button
            size="sm"
            kind="ghost"
            hasIconOnly
            iconDescription="Zoom out"
            renderIcon={ZoomOut}
            onClick={() => zoomBy(1.33)}
          />
          <Button
            size="sm"
            kind="ghost"
            hasIconOnly
            iconDescription="Fit to drawing"
            renderIcon={FitToScreen}
            onClick={fitToDrawing}
          />
        </ButtonSet>

        {scale ? (
          <Tag type="green">
            1 vb unit ≈ {scale.toFixed(4)} {scaleUnit}
          </Tag>
        ) : (
          <Tag type="red">Scale not set — use Scale tool first</Tag>
        )}

        <Toggle
          id="snap-ortho"
          size="sm"
          labelText="Ortho"
          toggled={snapOrtho}
          onToggle={(v) => setSnapOrtho(v)}
        />
        <Toggle
          id="snap-grid"
          size="sm"
          labelText="Grid"
          toggled={snapGrid}
          onToggle={(v) => setSnapGrid(v)}
        />
        <Toggle
          id="snap-end"
          size="sm"
          labelText="Endpoints"
          toggled={snapEndpoints}
          onToggle={(v) => setSnapEndpoints(v)}
        />
        {snapGrid && (
          <TextInput
            id="snap-grid-mm"
            labelText="Grid mm"
            size="sm"
            type="number"
            value={String(gridMm)}
            onChange={(e) => setGridMm(Number(e.target.value) || DEFAULT_SNAP_GRID_MM)}
            style={{ maxWidth: 100 }}
          />
        )}

        {pts.length > 0 && (
          <Button size="sm" kind="ghost" onClick={() => setPts([])}>
            Clear points
          </Button>
        )}

        <Button
          size="sm"
          kind="ghost"
          hasIconOnly
          iconDescription={fullscreen ? "Exit full screen" : "Full screen"}
          renderIcon={fullscreen ? Minimize : Maximize}
          onClick={() => setFullscreen((v) => !v)}
          style={{ marginLeft: "auto" }}
        />
      </div>
      {!canSave && tool !== "pan" && tool !== "calibrate" && (
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--cds-support-warning)" }}>
          Enter an element name before saving (e.g. Grid A1).
        </p>
      )}
      <p style={{ margin: 0, opacity: 0.85, fontSize: "0.875rem" }}>{toolHint[tool]}</p>
    </Stack>
  );

  const canvas = (
    <>
      {svgQ.isLoading && <p>Loading drawing…</p>}
      {svgQ.data === null && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="No preview"
          subtitle="Takeoff counts are available but this DXF did not render to SVG. Re-upload or simplify the file."
        />
      )}
      {parsedSvg && (
        <div
          className="dwg-viewport"
          style={{
            flex: fullscreen ? 1 : undefined,
            minHeight: fullscreen ? 0 : "60vh",
            height: fullscreen ? "100%" : "60vh",
          }}
        >
          <svg
            ref={svgRootRef}
            viewBox={viewBoxString(viewBox)}
            preserveAspectRatio="xMidYMid meet"
            className="dwg-viewport__svg"
            style={{ cursor, touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <g className="dwg-viewport__content" dangerouslySetInnerHTML={{ __html: parsedSvg.inner }} />
            <g className="dwg-viewport__overlay">
              {tool === "count" && pts.length === 1 && (
                <rect
                  x={pts[0]!.x - sw * 3}
                  y={pts[0]!.y - sw * 3}
                  width={sw * 6}
                  height={sw * 6}
                  fill="var(--cds-support-warning)"
                  fillOpacity={0.5}
                  stroke="var(--cds-support-warning)"
                  strokeWidth={sw}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {tool !== "area" && tool !== "count" && pts.length === 2 && (
                <line
                  x1={pts[0]!.x}
                  y1={pts[0]!.y}
                  x2={pts[1]!.x}
                  y2={pts[1]!.y}
                  stroke="var(--cds-support-error)"
                  strokeWidth={sw}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {tool === "area" && pts.length >= 2 && (
                <polygon
                  points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="var(--cds-highlight)"
                  fillOpacity={0.35}
                  stroke="var(--cds-link-primary)"
                  strokeWidth={sw}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={sw * 2}
                  fill="var(--cds-link-primary)"
                  stroke="var(--cds-background)"
                  strokeWidth={sw * 0.4}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          </svg>
        </div>
      )}
    </>
  );

  const actions = (
    <>
      {tool === "calibrate" && pts.length === 2 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            flexWrap: "wrap",
            marginTop: 12,
            padding: fullscreen ? 12 : 0,
          }}
        >
          <TextInput
            id="calib-len"
            labelText={`Real length of line (${vbLen.toFixed(2)} drawing units)`}
            type="number"
            value={calibLen}
            onChange={(e) => setCalibLen(e.target.value)}
            style={{ maxWidth: 240 }}
          />
          <Select
            id="calib-unit"
            labelText="Unit"
            value={calibUnit}
            onChange={(e) => setCalibUnit(e.target.value)}
          >
            {["mm", "cm", "m", "ft", "in"].map((u) => (
              <SelectItem key={u} value={u} text={u} />
            ))}
          </Select>
          <Button
            size="md"
            disabled={!calibLen || vbLen === 0 || setScale.isPending}
            onClick={() =>
              setScale.mutate({
                id: drawingId,
                scaleUnitsPerVb: Number(calibLen) / vbLen,
                scaleUnit: calibUnit,
              })
            }
          >
            Save scale
          </Button>
        </div>
      )}

      {tool === "measure" && pts.length === 2 && (
        <div style={{ marginTop: 12, padding: fullscreen ? 12 : 0 }}>
          {scale ? (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <Tag type="gray" size="md">
                {(vbLen * scale).toFixed(2)} {scaleUnit}
              </Tag>
              {element.category === "WALL" && (
                <TextInput
                  id="wall-height"
                  labelText="Wall height (mm)"
                  type="number"
                  value={heightMm}
                  onChange={(e) => setHeightMm(e.target.value)}
                  style={{ maxWidth: 160 }}
                />
              )}
              <Button
                size="md"
                disabled={!canSave || createMeas.isPending}
                onClick={() =>
                  createMeas.mutate({
                    drawingId,
                    projectId,
                    kind: "LINEAR",
                    label: elementName,
                    vbLength: vbLen,
                    realLength: vbLen * scale,
                    unit: scaleUnit!,
                    elementTypeId: element.id,
                    heightMm: element.category === "WALL" ? Number(heightMm) || undefined : undefined,
                    itemCount: 1,
                  })
                }
              >
                Save length
              </Button>
            </div>
          ) : (
            <InlineNotification
              kind="warning"
              lowContrast
              hideCloseButton
              title="Set scale first"
              subtitle="Switch to the Scale tool, click a known dimension, and enter its real length."
            />
          )}
        </div>
      )}

      {tool === "area" && pts.length >= 3 && (
        <div style={{ marginTop: 12, padding: fullscreen ? 12 : 0 }}>
          {scale ? (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <Tag type="gray" size="md">
                {realArea.toFixed(2)} {areaUnit} · {pts.length} pts
              </Tag>
              <Button
                size="md"
                disabled={!canSave || createMeas.isPending}
                onClick={() =>
                  createMeas.mutate({
                    drawingId,
                    projectId,
                    kind: "AREA",
                    label: elementName,
                    vbLength: vbArea,
                    realLength: realArea,
                    unit: areaUnit.slice(0, 8),
                    elementTypeId: element.id,
                    itemCount: 1,
                  })
                }
              >
                Save area
              </Button>
            </div>
          ) : (
            <InlineNotification
              kind="warning"
              lowContrast
              hideCloseButton
              title="Set scale first"
              subtitle="Calibrate with the Scale tool before saving areas."
            />
          )}
        </div>
      )}

      {tool === "count" && pts.length === 1 && (
        <div style={{ marginTop: 12, padding: fullscreen ? 12 : 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <TextInput
              id="count-qty"
              labelText="Quantity (nos)"
              type="number"
              value={itemCount}
              onChange={(e) => setItemCount(e.target.value)}
              style={{ maxWidth: 140 }}
            />
            <Button
              size="md"
              disabled={!canSave || createMeas.isPending}
              onClick={() =>
                createMeas.mutate({
                  drawingId,
                  projectId,
                  kind: "COUNT",
                  label: elementName,
                  vbLength: 0,
                  realLength: 0,
                  unit: "nos",
                  elementTypeId: element.id,
                  itemCount: Number(itemCount) || 1,
                })
              }
            >
              Save count
            </Button>
          </div>
        </div>
      )}
    </>
  );

  const measurementsTable = (
    <TableContainer title="Saved takeoff" style={{ marginTop: 16 }}>
      <Table size="sm">
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Measured</TableHeader>
            <TableHeader>BOQ</TableHeader>
            <TableHeader />
          </TableRow>
        </TableHead>
        <TableBody>
          {(measQ.data ?? []).map((m) => {
            const el = m.elementTypeId ? takeoffElement(m.elementTypeId) : undefined;
            return (
              <TableRow key={m.id}>
                <TableCell>{m.label}</TableCell>
                <TableCell>{el?.label ?? m.elementTypeId ?? "—"}</TableCell>
                <TableCell>
                  {m.kind === "COUNT"
                    ? `${m.itemCount ?? 1} nos`
                    : `${m.realLength.toFixed(2)} ${m.unit}`}
                </TableCell>
                <TableCell>
                  {m.boqQty != null ? `${Number(m.boqQty).toFixed(3)} ${m.boqUnit ?? ""}` : "—"}
                </TableCell>
                <TableCell>
                  <Button kind="ghost" size="sm" onClick={() => removeMeas.mutate({ id: m.id })}>
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const body = (
    <>
      {toolbar}
      {canvas}
      {actions}
      {!fullscreen && measurementsTable}
    </>
  );

  if (fullscreen && open) {
    return (
      <div className="dwg-viewport-fs">
        <div className="dwg-viewport-fs__bar">
          <strong>{metaQ.data?.title ?? "Drawing takeoff"}</strong>
          <Button size="sm" kind="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="dwg-viewport-fs__main">{body}</div>
        <div className="dwg-viewport-fs__side">{measurementsTable}</div>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      modalHeading={metaQ.data?.title ?? "Drawing takeoff"}
      passiveModal
      size="lg"
      onRequestClose={onClose}
    >
      {body}
    </Modal>
  );
}
