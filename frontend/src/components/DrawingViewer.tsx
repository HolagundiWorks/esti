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
import { useMemo, useRef, useState } from "react";
import { trpc } from "../lib/trpc.js";

type Pt = { x: number; y: number };

function dist(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
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

  const overlayRef = useRef<SVGSVGElement | null>(null);
  const [mode, setMode] = useState<"measure" | "calibrate">("measure");
  const [pts, setPts] = useState<Pt[]>([]);
  const [calibLen, setCalibLen] = useState("");
  const [calibUnit, setCalibUnit] = useState("mm");
  const [label, setLabel] = useState("");

  const viewBox = useMemo(() => {
    const m = svgQ.data?.svg.match(/viewBox="([^"]+)"/);
    return m?.[1] ?? "0 0 100 100";
  }, [svgQ.data]);

  const scale = metaQ.data?.scaleUnitsPerVb ?? null;
  const scaleUnit = metaQ.data?.scaleUnit ?? null;
  const vbLen = pts.length === 2 ? dist(pts[0]!, pts[1]!) : 0;

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

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = overlayRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const u = p.matrixTransform(ctm.inverse());
    setPts((prev) => (prev.length >= 2 ? [{ x: u.x, y: u.y }] : [...prev, { x: u.x, y: u.y }]));
  }

  // Stroke width relative to the viewBox so it stays visible at any model scale.
  const vbW = Number(viewBox.split(/\s+/)[2]) || 1000;
  const sw = vbW / 300;

  return (
    <Modal
      open={open}
      modalHeading="Drawing viewer & measurement"
      passiveModal
      size="lg"
      onRequestClose={onClose}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <Button
          size="sm"
          kind={mode === "measure" ? "primary" : "tertiary"}
          onClick={() => {
            setMode("measure");
            setPts([]);
          }}
        >
          Measure
        </Button>
        <Button
          size="sm"
          kind={mode === "calibrate" ? "primary" : "tertiary"}
          onClick={() => {
            setMode("calibrate");
            setPts([]);
          }}
        >
          Calibrate scale
        </Button>
        {scale ? (
          <Tag type="green">Calibrated: 1 unit ≈ {scale.toFixed(4)} {scaleUnit}</Tag>
        ) : (
          <Tag type="red">Not calibrated</Tag>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#6f6f6f" }}>
          Click two points to draw a line.
        </span>
      </div>

      {svgQ.isLoading && <p>Loading drawing…</p>}
      {svgQ.data === null && <p>No rendered SVG for this drawing.</p>}
      {svgQ.data?.svg && (
        <div
          style={{
            position: "relative",
            width: "100%",
            border: "1px solid #e0e0e0",
            background: "#fff",
            maxHeight: "55vh",
            overflow: "auto",
          }}
        >
          <div className="dwg-base" dangerouslySetInnerHTML={{ __html: svgQ.data.svg }} />
          <svg
            ref={overlayRef}
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            onClick={handleClick}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "crosshair" }}
          >
            {pts.length === 2 && (
              <line
                x1={pts[0]!.x}
                y1={pts[0]!.y}
                x2={pts[1]!.x}
                y2={pts[1]!.y}
                stroke="#da1e28"
                strokeWidth={sw}
              />
            )}
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={sw * 1.5} fill="#0f62fe" />
            ))}
          </svg>
        </div>
      )}

      {/* Action panel for a completed 2-point line */}
      {pts.length === 2 && mode === "calibrate" && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 12 }}>
          <TextInput
            id="calib-len"
            labelText={`Real length of this line (vb ${vbLen.toFixed(1)})`}
            type="number"
            value={calibLen}
            onChange={(e) => setCalibLen(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          <Select id="calib-unit" labelText="Unit" value={calibUnit} onChange={(e) => setCalibUnit(e.target.value)}>
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
      {pts.length === 2 && mode === "measure" && (
        <div style={{ marginTop: 12 }}>
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

      <TableContainer title="Measurements (takeoff)" style={{ marginTop: 20 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Label</TableHeader>
              <TableHeader>Length</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(measQ.data ?? []).map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.label}</TableCell>
                <TableCell>
                  {m.realLength.toFixed(1)} {m.unit}
                </TableCell>
                <TableCell>
                  <Button kind="ghost" size="sm" onClick={() => removeMeas.mutate({ id: m.id })}>
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Modal>
  );
}
