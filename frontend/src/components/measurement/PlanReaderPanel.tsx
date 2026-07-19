import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PlanMarkerKind,
  areaPointsToMm2,
  formatDimensionMm,
  geometryAreaPoints,
  type PlanMarkupGeometry,
} from "@esti/contracts";
import { DATA_VIZ, colors, useScreenActions } from "@hcw/ui-kit";
import { trpc } from "../../lib/trpc.js";
import { sanitizeSvgMarkup } from "../../lib/sanitize-svg.js";
import { PlanPdfCanvas } from "./PlanPdfCanvas.js";

type Tool =
  | "SELECT"
  | "PAN"
  | "CALIBRATE"
  | "MEASURE"
  | "WALL"
  | "COLUMN"
  | "DOOR"
  | "WINDOW"
  | "HEIGHT"
  | "RECT"
  | "AREA";

// Domain mapping stays app-side; VALUES come from kit tokens (Token Governance §7).
const MARKER_COLOR: Record<string, string> = {
  WALL: colors.accent,
  DOOR: DATA_VIZ.blue,
  WINDOW: DATA_VIZ.green,
  COLUMN: DATA_VIZ.purple,
  HEIGHT: DATA_VIZ.violet,
  SECTION: DATA_VIZ.cyan,
  POLYLINE: colors.accent,
  COUNT: DATA_VIZ.gray,
  RECT: DATA_VIZ.orange,
  // Palette has 7 tokens for 9 marker kinds, so AREA shares cyan with SECTION —
  // they are rarely marked up on the same sheet.
  AREA: DATA_VIZ.cyan,
  MEASURE: colors.ink,
};

type Pt = { x: number; y: number };

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

function dist(a: Pt, b: Pt) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function svgPointFromEvent(svg: SVGSVGElement, clientX: number, clientY: number): Pt {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const local = pt.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

function clampZoom(z: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

export function PlanReaderPanel({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const drawingsQ = trpc.drawings.listByProject.useQuery({ projectId });
  const catalogQ = trpc.itemLibrary.activeCatalog.useQuery();
  const levelsQ = trpc.measurement.listLevels.useQuery({ projectId });
  const [drawingId, setDrawingId] = useState("");
  const [tool, setTool] = useState<Tool>("SELECT");
  const [libraryItemId, setLibraryItemId] = useState("");
  const [deriveLevelId, setDeriveLevelId] = useState("");
  const [draftPts, setDraftPts] = useState<Pt[]>([]);
  const [calibRealMm, setCalibRealMm] = useState("1000");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pdfPageSize, setPdfPageSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [measureHint, setMeasureHint] = useState<string | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const svgHostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panDragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  useEffect(() => {
    if (!drawingId && drawingsQ.data && drawingsQ.data.length > 0) {
      const ready = drawingsQ.data.find((d) => d.status === "READY");
      setDrawingId(ready?.id ?? drawingsQ.data[0]!.id);
    }
  }, [drawingsQ.data, drawingId]);

  // Space = temporary pan (common CAD habit).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const selectedDrawing = useMemo(
    () => (drawingsQ.data ?? []).find((d) => d.id === drawingId) ?? null,
    [drawingsQ.data, drawingId],
  );
  const isPdf = selectedDrawing?.sourceKind === "PDF";

  const svgQ = trpc.drawings.svg.useQuery(
    { id: drawingId },
    { enabled: !!drawingId && !isPdf },
  );
  const pdfQ = trpc.drawings.pdf.useQuery(
    { id: drawingId },
    { enabled: !!drawingId && isPdf },
  );
  const markupQ = trpc.planMarkup.getForDrawing.useQuery(
    { projectId, drawingId },
    { enabled: !!drawingId },
  );

  const upsertCalib = trpc.planMarkup.upsertCalibration.useMutation({
    meta: { errorTitle: "Couldn't save the calibration" },
    onSuccess: () => utils.planMarkup.getForDrawing.invalidate({ projectId, drawingId }),
  });
  const upsertItem = trpc.planMarkup.upsertItem.useMutation({
    meta: { errorTitle: "Couldn't save the markup item" },
    onSuccess: () => {
      utils.planMarkup.getForDrawing.invalidate({ projectId, drawingId });
      setDraftPts([]);
    },
  });
  const removeItem = trpc.planMarkup.removeItem.useMutation({
    meta: { errorTitle: "Couldn't delete the markup item" },
    onSuccess: () => utils.planMarkup.getForDrawing.invalidate({ projectId, drawingId }),
  });
  const derive = trpc.measurement.deriveFromMarkup.useMutation({
    meta: { errorTitle: "Couldn't derive the measurements" },
    onSuccess: () => {
      utils.measurement.getBook.invalidate({ projectId });
      utils.planMarkup.getForDrawing.invalidate({ projectId, drawingId });
      setSelectedIds([]);
    },
  });

  const calibration = markupQ.data?.calibration ?? null;
  const items = markupQ.data?.items ?? [];
  const setId = markupQ.data?.set?.id;
  const panActive = tool === "PAN" || spaceHeld;

  const viewBox = useMemo(() => {
    if (isPdf && pdfPageSize) {
      return `0 0 ${pdfPageSize.width} ${pdfPageSize.height}`;
    }
    if (!svgQ.data?.svg) return "0 0 1000 1000";
    const m = svgQ.data.svg.match(/viewBox=["']([^"']+)["']/i);
    return m?.[1] ?? "0 0 1000 1000";
  }, [isPdf, pdfPageSize, svgQ.data?.svg]);

  const planReady = isPdf ? !!pdfQ.data?.base64 && !!pdfPageSize : !!svgQ.data?.svg;

  const libraryForTool = useMemo(() => {
    const kind: PlanMarkerKind | null =
      tool === "WALL" || tool === "RECT"
        ? "WALL"
        : tool === "DOOR"
          ? "DOOR"
          : tool === "WINDOW"
            ? "WINDOW"
            : tool === "COLUMN"
              ? "COLUMN"
              : tool === "HEIGHT"
                ? "HEIGHT"
                : null;
    if (!kind) return catalogQ.data?.items ?? [];
    return (catalogQ.data?.items ?? []).filter((i) => {
      const markers = Array.isArray(i.markerKinds) ? i.markerKinds : [];
      return markers.length === 0 || markers.includes(kind);
    });
  }, [catalogQ.data?.items, tool]);

  useScreenActions(
    [
      {
        id: "plan-derive",
        zone: "right",
        tone: "primary",
        label: selectedIds.length ? `To sheet (${selectedIds.length})` : "To sheet",
        disabled: selectedIds.length === 0 || derive.isPending,
        onClick: () =>
          derive.mutate({
            projectId,
            markupItemIds: selectedIds,
            levelId: deriveLevelId || null,
          }),
      },
      {
        id: "plan-clear-draft",
        zone: "left",
        label: "Clear draft",
        disabled: draftPts.length === 0 && !measureHint,
        onClick: () => {
          setDraftPts([]);
          setMeasureHint(null);
        },
      },
      {
        id: "plan-reset-view",
        zone: "left",
        label: "Reset view",
        disabled: zoom === 1 && pan.x === 0 && pan.y === 0,
        onClick: () => {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        },
      },
    ],
    [selectedIds, draftPts.length, derive.isPending, deriveLevelId, measureHint, zoom, pan.x, pan.y],
  );

  // Inject SVG into host once loaded (DXF path only).
  useEffect(() => {
    const host = svgHostRef.current;
    if (!host) return;
    host.innerHTML = "";
    if (isPdf || !svgQ.data?.svg) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = sanitizeSvgMarkup(svgQ.data.svg);
    const svg = wrap.querySelector("svg");
    if (!svg) return;
    svg.setAttribute("width", "100%");
    svg.removeAttribute("height");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.display = "block";
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.maxHeight = "none";
    host.appendChild(svg);
  }, [isPdf, svgQ.data?.svg]);

  // Reset view when switching drawings.
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setDraftPts([]);
    setMeasureHint(null);
    setSelectedIds([]);
    setPdfPageSize(null);
  }, [drawingId]);

  const sheetLengthMm = (ptsDist: number) => {
    if (!calibration || ptsDist <= 0) return null;
    return ptsDist * calibration.unitsPerPoint;
  };

  const finishMarkup = (geometry: PlanMarkupGeometry, markerKind: PlanMarkerKind) => {
    if (!setId) return;
    const label =
      (catalogQ.data?.items.find((i) => i.id === libraryItemId)?.code ?? markerKind) +
      ` @ ${new Date().toLocaleTimeString()}`;
    upsertItem.mutate({
      setId,
      markerKind,
      libraryItemId: libraryItemId || null,
      label,
      geometry,
      count:
        markerKind === "DOOR" ||
        markerKind === "WINDOW" ||
        markerKind === "COUNT" ||
        markerKind === "COLUMN"
          ? 1
          : 1,
    });
  };

  // Non-passive wheel so we can prevent page scroll while zooming the plan.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const prev = zoomRef.current;
      const next = clampZoom(prev * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
      const ratio = next / prev;
      const p = panRef.current;
      setZoom(next);
      setPan({
        x: mx - (mx - p.x) * ratio,
        y: my - (my - p.y) * ratio,
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const beginPan = (clientX: number, clientY: number) => {
    panDragRef.current = {
      startX: clientX,
      startY: clientY,
      originX: panRef.current.x,
      originY: panRef.current.y,
    };
    setIsPanning(true);
  };

  const onViewportPointerDown = (e: React.PointerEvent) => {
    const middle = e.button === 1;
    if (middle || panActive) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      beginPan(e.clientX, e.clientY);
    }
  };

  const onViewportPointerMove = (e: React.PointerEvent) => {
    const drag = panDragRef.current;
    if (!drag) return;
    setPan({
      x: drag.originX + (e.clientX - drag.startX),
      y: drag.originY + (e.clientY - drag.startY),
    });
  };

  const onViewportPointerUp = (e: React.PointerEvent) => {
    if (panDragRef.current) {
      panDragRef.current = null;
      setIsPanning(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    }
  };

  const onOverlayPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (panActive || e.button === 1) return;
    if (tool === "SELECT") return;
    const svg = overlayRef.current;
    if (!svg) return;
    const p = svgPointFromEvent(svg, e.clientX, e.clientY);

    if (tool === "CALIBRATE") {
      if (draftPts.length === 0) {
        setDraftPts([p]);
        setMeasureHint("Click the other end of the known dimension");
      } else if (draftPts.length === 1) {
        const a = draftPts[0]!;
        const ptsDist = dist(a, p);
        const realMm = Number.parseFloat(calibRealMm);
        if (ptsDist > 0 && Number.isFinite(realMm) && realMm > 0) {
          upsertCalib.mutate({
            drawingId,
            pageNo: 0,
            unitsPerPoint: realMm / ptsDist,
            unitLabel: "mm",
          });
          setMeasureHint(`Calibrated: ${realMm} mm over ${ptsDist.toFixed(1)} sheet units`);
        }
        setDraftPts([]);
        setTool("MEASURE");
      }
      return;
    }

    if (tool === "MEASURE") {
      if (draftPts.length === 0) {
        setDraftPts([p]);
        setMeasureHint("Click the second point");
      } else if (draftPts.length === 1) {
        const a = draftPts[0]!;
        const ptsDist = dist(a, p);
        const mm = sheetLengthMm(ptsDist);
        setMeasureHint(
          mm != null
            ? `Length: ${formatDimensionMm(mm)} m (${Math.round(mm)} mm)`
            : `Length: ${ptsDist.toFixed(1)} sheet units — calibrate for mm`,
        );
        setDraftPts([a, p]);
      } else {
        setDraftPts([p]);
        setMeasureHint("Click the second point");
      }
      return;
    }

    if (tool === "HEIGHT") {
      if (draftPts.length === 0) {
        setDraftPts([p]);
        setMeasureHint("Click the other end of the height mark");
      } else {
        const a = draftPts[0]!;
        finishMarkup({ kind: "POLYLINE", points: [a, p] }, "HEIGHT");
        setMeasureHint(null);
      }
      return;
    }

    if (tool === "DOOR" || tool === "WINDOW" || tool === "COLUMN") {
      finishMarkup(
        { kind: "POINT", points: [p] },
        tool === "DOOR" ? "DOOR" : tool === "WINDOW" ? "WINDOW" : "COLUMN",
      );
      return;
    }

    if (tool === "WALL" || tool === "AREA") {
      setDraftPts((prev) => [...prev, p]);
      return;
    }

    if (tool === "RECT") {
      if (draftPts.length === 0) {
        setDraftPts([p]);
      } else {
        const a = draftPts[0]!;
        finishMarkup(
          {
            kind: "RECT",
            points: [
              { x: a.x, y: a.y },
              { x: p.x, y: a.y },
              { x: p.x, y: p.y },
              { x: a.x, y: p.y },
            ],
            closed: true,
          },
          "WALL",
        );
      }
    }
  };

  const commitWall = () => {
    if (draftPts.length < 2) return;
    finishMarkup({ kind: "POLYLINE", points: draftPts }, "WALL");
  };

  /**
   * Plan area — the polygon is closed on commit so the server can shoelace it.
   * Needs 3+ points: two points enclose nothing and would silently measure 0.
   */
  const commitArea = () => {
    if (draftPts.length < 3) return;
    finishMarkup({ kind: "POLYLINE", points: draftPts, closed: true }, "AREA");
  };

  /** Live area readout for the in-progress polygon, in m². */
  const draftAreaSqm = useMemo(() => {
    if (tool !== "AREA" || draftPts.length < 3 || !calibration) return null;
    const mm2 = areaPointsToMm2(
      geometryAreaPoints({ kind: "POLYLINE", points: draftPts, closed: true }),
      calibration.unitsPerPoint,
    );
    return mm2 / 1_000_000;
  }, [tool, draftPts, calibration]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const readyDrawings = drawingsQ.data ?? [];
  const draftMm =
    draftPts.length === 2 && tool === "MEASURE"
      ? sheetLengthMm(dist(draftPts[0]!, draftPts[1]!))
      : draftPts.length === 1 && tool === "CALIBRATE"
        ? null
        : null;

  const cursor = panActive || isPanning
    ? isPanning
      ? "grabbing"
      : "grab"
    : tool === "SELECT"
      ? "default"
      : "crosshair";

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "flex-start" }}>
        <TextField
          select
          label="Drawing"
          value={drawingId}
          onChange={(e) => setDrawingId(e.target.value)}
          sx={{ minWidth: 280 }}
        >
          <MenuItem value="">Select drawing…</MenuItem>
          {readyDrawings.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {`${d.ref} — ${d.title}${d.sourceKind === "PDF" ? " · PDF" : ""}${d.status !== "READY" ? ` (${d.status})` : ""}`}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Library item"
          value={libraryItemId}
          onChange={(e) => setLibraryItemId(e.target.value)}
          sx={{ minWidth: 280 }}
          helperText="Optional — links markup to a standard item"
        >
          <MenuItem value="">— none —</MenuItem>
          {libraryForTool.map((i) => (
            <MenuItem key={i.id} value={i.id}>
              {`${i.code} — ${i.particulars.slice(0, 48)}`}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Sheet level"
          value={deriveLevelId}
          onChange={(e) => setDeriveLevelId(e.target.value)}
          sx={{ minWidth: 200 }}
          helperText="Links To sheet heights to this level"
        >
          <MenuItem value="">— not linked —</MenuItem>
          {(levelsQ.data ?? []).map((l) => (
            <MenuItem key={l.id} value={l.id}>
              {l.code} — {l.name}
            </MenuItem>
          ))}
        </TextField>

        {tool === "CALIBRATE" && (
          <TextField
            label="Real length (mm)"
            value={calibRealMm}
            onChange={(e) => setCalibRealMm(e.target.value)}
            sx={{ width: 160 }}
            helperText="Click two points on a known dimension"
          />
        )}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={tool}
          onChange={(_e, v) => {
            if (v) {
              setTool(v);
              setDraftPts([]);
              setMeasureHint(null);
            }
          }}
        >
          <ToggleButton value="SELECT">Select</ToggleButton>
          <ToggleButton value="PAN">Pan</ToggleButton>
          <ToggleButton value="CALIBRATE">Calibrate</ToggleButton>
          <ToggleButton value="MEASURE">Measure</ToggleButton>
          <ToggleButton value="WALL">Wall</ToggleButton>
          <ToggleButton value="COLUMN">Column</ToggleButton>
          <ToggleButton value="DOOR">Door</ToggleButton>
          <ToggleButton value="WINDOW">Window</ToggleButton>
          <ToggleButton value="HEIGHT">Height</ToggleButton>
          <ToggleButton value="RECT">Rect</ToggleButton>
          <ToggleButton value="AREA">Area</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" className="esti-label--secondary">
          Zoom {(zoom * 100).toFixed(0)}% · wheel zoom · Space/middle-drag pan
        </Typography>
      </Stack>

      {!calibration && drawingId && (
        <Alert severity="info">
          Calibrate first — enter a known length in mm, choose Calibrate, then click both ends of
          that dimension on the plan. Then use Measure to pick other lengths.
        </Alert>
      )}
      {calibration && (
        <Typography variant="body2" className="esti-label--secondary">
          Scale: {calibration.unitsPerPoint.toFixed(4)} mm / sheet unit
          {calibration.unitLabel ? ` (${calibration.unitLabel})` : ""}
          {measureHint ? ` · ${measureHint}` : ""}
          {draftMm != null ? ` · draft ${formatDimensionMm(draftMm)} m` : ""}
        </Typography>
      )}
      {!calibration && measureHint && (
        <Typography variant="body2" className="esti-label--secondary">
          {measureHint}
        </Typography>
      )}

      {!drawingId && (
        <Alert severity="warning">
          Upload a DXF or PDF under Drawings &amp; approvals. DXF needs processing (READY); PDF is
          ready immediately — then open it here.
        </Alert>
      )}

      {drawingId && !isPdf && svgQ.isLoading && (
        <Typography variant="body2">Loading plan SVG…</Typography>
      )}
      {drawingId && isPdf && pdfQ.isLoading && (
        <Typography variant="body2">Loading plan PDF…</Typography>
      )}
      {drawingId && !isPdf && svgQ.data === null && !svgQ.isLoading && (
        <Alert severity="warning">
          No rendered SVG for this drawing yet. Wait for processing, or re-upload the DXF.
        </Alert>
      )}
      {drawingId && isPdf && pdfQ.data === null && !pdfQ.isLoading && (
        <Alert severity="warning">Could not load this PDF plan. Re-upload under Drawings.</Alert>
      )}

      <Box
        ref={viewportRef}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerCancel={onViewportPointerUp}
        sx={{
          position: "relative",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: colors.layer01,
          height: "70vh",
          overflow: "hidden",
          cursor,
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            willChange: "transform",
          }}
        >
          <Box sx={{ position: "relative", width: "100%" }}>
            {isPdf && pdfQ.data?.base64 ? (
              <PlanPdfCanvas base64={pdfQ.data.base64} pageNo={0} onPageSize={setPdfPageSize} />
            ) : (
              <Box
                ref={svgHostRef}
                sx={{
                  width: "100%",
                  lineHeight: 0,
                  "& svg": { width: "100%", height: "auto", display: "block" },
                }}
              />
            )}
            {planReady && (
              <Box
                component="svg"
                ref={overlayRef}
                viewBox={viewBox}
                onPointerDown={onOverlayPointer}
                sx={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  cursor,
                  touchAction: "none",
                }}
              >
                {items.map((item) => {
                  const geo = item.geometry as PlanMarkupGeometry;
                  const color = MARKER_COLOR[item.markerKind] ?? colors.accent;
                  const selected = selectedIds.includes(item.id);
                  const stroke = selected ? colors.ink : color;
                  const strokeW = selected ? 3 : 2;
                  if (geo.kind === "POINT" && geo.points[0]) {
                    const pt = geo.points[0];
                    return (
                      <g
                        key={item.id}
                        onClick={() => tool === "SELECT" && toggleSelect(item.id)}
                        style={{ cursor: tool === "SELECT" ? "pointer" : "inherit" }}
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={8}
                          fill={color}
                          stroke={stroke}
                          strokeWidth={strokeW}
                        />
                        <title>{item.label}</title>
                      </g>
                    );
                  }
                  const pts = geo.points.map((pt) => `${pt.x},${pt.y}`).join(" ");
                  return (
                    <g
                      key={item.id}
                      onClick={() => tool === "SELECT" && toggleSelect(item.id)}
                      style={{ cursor: tool === "SELECT" ? "pointer" : "inherit" }}
                    >
                      <polyline
                        points={pts}
                        fill={geo.closed || geo.kind === "RECT" ? `${color}33` : "none"}
                        stroke={stroke}
                        strokeWidth={strokeW}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      <title>
                        {item.label}
                        {item.lengthMm != null ? ` — ${formatDimensionMm(item.lengthMm)} m` : ""}
                      </title>
                    </g>
                  );
                })}
                {draftPts.length > 0 && (
                  <polyline
                    points={draftPts.map((pt) => `${pt.x},${pt.y}`).join(" ")}
                    fill="none"
                    stroke={colors.ink}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                )}
                {draftPts.map((pt, i) => (
                  <circle key={i} cx={pt.x} cy={pt.y} r={4} fill={colors.ink} />
                ))}
                {draftPts.length === 2 && (tool === "MEASURE" || tool === "CALIBRATE") && (
                  <text
                    x={(draftPts[0]!.x + draftPts[1]!.x) / 2}
                    y={(draftPts[0]!.y + draftPts[1]!.y) / 2 - 8}
                    fill={colors.ink}
                    fontSize={Math.max(12, 14 / zoom)}
                    textAnchor="middle"
                  >
                    {draftMm != null
                      ? `${formatDimensionMm(draftMm)} m`
                      : `${dist(draftPts[0]!, draftPts[1]!).toFixed(1)} u`}
                  </text>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {tool === "WALL" && draftPts.length >= 2 && (
        <Button variant="contained" size="small" onClick={commitWall} disabled={upsertItem.isPending}>
          Commit wall ({draftPts.length} pts)
        </Button>
      )}

      {tool === "AREA" && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            variant="contained"
            size="small"
            onClick={commitArea}
            disabled={draftPts.length < 3 || upsertItem.isPending}
          >
            Commit area ({draftPts.length} pts)
          </Button>
          <Typography variant="body2" className="esti-label--secondary">
            {draftPts.length < 3
              ? "Click at least 3 points to enclose an area — it closes automatically."
              : draftAreaSqm != null
                ? `Enclosed: ${draftAreaSqm.toFixed(3)} m²`
                : "Calibrate the sheet to see the area in m²."}
          </Typography>
        </Stack>
      )}

      {items.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Markup ({items.length})</Typography>
          {items.map((item) => (
            <Stack
              key={item.id}
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                py: 0.5,
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: selectedIds.includes(item.id) ? "action.selected" : undefined,
              }}
            >
              <Button size="small" variant="text" onClick={() => toggleSelect(item.id)}>
                {selectedIds.includes(item.id) ? "✓" : "○"}
              </Button>
              <Typography variant="body2" sx={{ flex: 1 }}>
                <strong>{item.markerKind}</strong> {item.label}
                {item.lengthMm != null ? ` · L ${formatDimensionMm(item.lengthMm)} m` : ""}
                {item.measurementRowId ? " · on sheet" : ""}
              </Typography>
              <Button
                size="small"
                color="error"
                variant="text"
                onClick={() => removeItem.mutate({ id: item.id })}
              >
                Remove
              </Button>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
