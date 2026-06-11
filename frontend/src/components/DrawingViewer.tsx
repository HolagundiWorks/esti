import {
  Button,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from "@carbon/react";
import { Maximize, Minimize } from "@carbon/icons-react";
import { useMemo, useRef, useState } from "react";
import { trpc } from "../lib/trpc.js";

type Pt = { x: number; y: number };
type Mode = "measure" | "area" | "calibrate";

function dist(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Shoelace polygon area (absolute) in viewBox units². */
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
  const metaQ = trpc.drawings.byId.useQuery(
    { id: drawingId },
    { enabled: open },
  );
  const measQ = trpc.measurements.listByDrawing.useQuery(
    { drawingId },
    { enabled: open },
  );

  const overlayRef = useRef<SVGSVGElement | null>(null);
  const [mode, setMode] = useState<Mode>("measure");
  const [pts, setPts] = useState<Pt[]>([]);
  const [calibLen, setCalibLen] = useState("");
  const [calibUnit, setCalibUnit] = useState("mm");
  const [label, setLabel] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  const viewBox = useMemo(() => {
    const m = svgQ.data?.svg.match(/viewBox="([^"]+)"/);
    return m?.[1] ?? "0 0 100 100";
  }, [svgQ.data]);

  const scale = metaQ.data?.scaleUnitsPerVb ?? null;
  const scaleUnit = metaQ.data?.scaleUnit ?? null;
  const vbLen = pts.length === 2 ? dist(pts[0]!, pts[1]!) : 0;
  const vbArea = mode === "area" ? polygonArea(pts) : 0;
  // Linear scale calibrates length; area scales by the square of that factor.
  const realArea = scale ? vbArea * scale * scale : 0;
  const areaUnit = scaleUnit ? `${scaleUnit}²` : "";

  const setScale = trpc.drawings.setScale.useMutation({
    onSuccess: () => {
      utils.drawings.byId.invalidate({ id: drawingId });
      setPts([]);
      setCalibLen("");
    },
  });
  const createMeas = trpc.measurements.create.useMutation({
    onSuccess: () => {
      utils.measurements.listByDrawing.invalidate({ drawingId });
      utils.measurements.listByProject.invalidate({ projectId });
      setPts([]);
      setLabel("");
    },
  });
  const removeMeas = trpc.measurements.remove.useMutation({
    onSuccess: () => {
      utils.measurements.listByDrawing.invalidate({ drawingId });
      utils.measurements.listByProject.invalidate({ projectId });
    },
  });

  function switchMode(m: Mode) {
    setMode(m);
    setPts([]);
  }

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = overlayRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const u = p.matrixTransform(ctm.inverse());
    const next = { x: u.x, y: u.y };
    setPts((prev) => {
      // Polygon: keep appending vertices. Line/calibrate: cap at two points.
      if (mode === "area") return [...prev, next];
      return prev.length >= 2 ? [next] : [...prev, next];
    });
  }

  // Stroke width relative to the viewBox so it stays visible at any model scale.
  const vbW = Number(viewBox.split(/\s+/)[2]) || 1000;
  const sw = vbW / 300;

  const canvasWrap: React.CSSProperties = fullscreen
    ? {
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
      }
    : {};

  const toolbar = (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        marginBottom: 12,
        flexWrap: "wrap",
        padding: fullscreen ? 12 : 0,
      }}
    >
      <Button
        size="sm"
        kind={mode === "measure" ? "primary" : "tertiary"}
        onClick={() => switchMode("measure")}
      >
        Measure
      </Button>
      <Button
        size="sm"
        kind={mode === "area" ? "primary" : "tertiary"}
        onClick={() => switchMode("area")}
      >
        Area
      </Button>
      <Button
        size="sm"
        kind={mode === "calibrate" ? "primary" : "tertiary"}
        onClick={() => switchMode("calibrate")}
      >
        Calibrate scale
      </Button>
      {scale ? (
        <Tag type="green">
          Calibrated: 1 unit ≈ {scale.toFixed(4)} {scaleUnit}
        </Tag>
      ) : (
        <Tag type="red">Not calibrated</Tag>
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
      <span>
        {mode === "area"
          ? "Click vertices to outline an area."
          : "Click two points to draw a line."}
      </span>
    </div>
  );

  const canvas = (
    <>
      {svgQ.isLoading && <p>Loading drawing…</p>}
      {svgQ.data === null && <p>No rendered SVG for this drawing.</p>}
      {svgQ.data?.svg && (
        <div
          style={{
            position: "relative",
            width: "100%",
            flex: fullscreen ? 1 : undefined,
            maxHeight: fullscreen ? "none" : "55vh",
            overflow: "auto",
          }}
        >
          <div
            className="dwg-base"
            dangerouslySetInnerHTML={{ __html: svgQ.data.svg }}
          />
          <svg
            ref={overlayRef}
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            onClick={handleClick}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              cursor: "crosshair",
            }}
          >
            {mode !== "area" && pts.length === 2 && (
              <line
                x1={pts[0]!.x}
                y1={pts[0]!.y}
                x2={pts[1]!.x}
                y2={pts[1]!.y}
                stroke="var(--cds-support-error)"
                strokeWidth={sw}
              />
            )}
            {mode === "area" && pts.length >= 2 && (
              <polygon
                points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="var(--cds-highlight)"
                stroke="var(--cds-link-primary)"
                strokeWidth={sw}
              />
            )}
            {pts.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={sw * 1.5}
                fill="var(--cds-link-primary)"
              />
            ))}
          </svg>
        </div>
      )}
    </>
  );

  // Action panel: calibration, linear measurement, or area measurement.
  const actions = (
    <>
      {mode === "calibrate" && pts.length === 2 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            marginTop: 12,
            padding: fullscreen ? 12 : 0,
          }}
        >
          <TextInput
            id="calib-len"
            labelText={`Real length of this line (vb ${vbLen.toFixed(1)})`}
            type="number"
            value={calibLen}
            onChange={(e) => setCalibLen(e.target.value)}
            style={{ maxWidth: 220 }}
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
            Save calibration
          </Button>
        </div>
      )}

      {mode === "measure" && pts.length === 2 && (
        <div style={{ marginTop: 12, padding: fullscreen ? 12 : 0 }}>
          {scale ? (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <TextInput
                id="meas-label"
                labelText={`Label (length ≈ ${(vbLen * scale).toFixed(1)} ${scaleUnit})`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                style={{ maxWidth: 280 }}
              />
              <Button
                size="md"
                disabled={!label || createMeas.isPending}
                onClick={() =>
                  createMeas.mutate({
                    drawingId,
                    projectId,
                    kind: "LINEAR",
                    label,
                    vbLength: vbLen,
                    realLength: vbLen * scale,
                    unit: scaleUnit!,
                  })
                }
              >
                Save measurement
              </Button>
            </div>
          ) : (
            <InlineNotification
              kind="warning"
              lowContrast
              hideCloseButton
              title="Calibrate first"
              subtitle="Set the scale before saving measurements."
            />
          )}
        </div>
      )}

      {mode === "area" && pts.length >= 3 && (
        <div style={{ marginTop: 12, padding: fullscreen ? 12 : 0 }}>
          {scale ? (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <TextInput
                id="area-label"
                labelText={`Label (area ≈ ${realArea.toFixed(2)} ${areaUnit}, ${pts.length} vertices)`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                style={{ maxWidth: 320 }}
              />
              <Button
                size="md"
                disabled={!label || createMeas.isPending}
                onClick={() =>
                  createMeas.mutate({
                    drawingId,
                    projectId,
                    kind: "AREA",
                    label,
                    vbLength: vbArea,
                    realLength: realArea,
                    unit: areaUnit.slice(0, 8),
                  })
                }
              >
                Save area
              </Button>
              <Button size="md" kind="ghost" onClick={() => setPts([])}>
                Clear
              </Button>
            </div>
          ) : (
            <InlineNotification
              kind="warning"
              lowContrast
              hideCloseButton
              title="Calibrate first"
              subtitle="Set the scale before saving an area."
            />
          )}
        </div>
      )}
    </>
  );

  const measurementsTable = (
    <TableContainer title="Measurements (takeoff)" style={{ marginTop: 20 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Label</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Quantity</TableHeader>
            <TableHeader></TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {(measQ.data ?? []).map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.label}</TableCell>
              <TableCell>{m.kind === "AREA" ? "Area" : "Length"}</TableCell>
              <TableCell>
                {m.realLength.toFixed(m.kind === "AREA" ? 2 : 1)} {m.unit}
              </TableCell>
              <TableCell>
                <Button
                  kind="ghost"
                  size="sm"
                  onClick={() => removeMeas.mutate({ id: m.id })}
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Full-screen mode escapes the Modal into a fixed overlay covering the viewport.
  if (fullscreen && open) {
    return (
      <div style={canvasWrap}>
        {toolbar}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "0 12px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {canvas}
        </div>
        {actions}
      </div>
    );
  }

  return (
    <Modal
      open={open}
      modalHeading="Drawing viewer & measurement"
      passiveModal
      size="lg"
      onRequestClose={onClose}
    >
      {toolbar}
      {canvas}
      {actions}
      {measurementsTable}
    </Modal>
  );
}
