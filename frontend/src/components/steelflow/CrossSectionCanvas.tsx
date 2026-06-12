import { useDroppable } from "@dnd-kit/core";
import { forwardRef, useState } from "react";

export interface RebarDisplay {
  id: string;
  barMark: string;
  diaMm: number;
  barType: string;
  quantity: number;
  posX?: number | null;
  posY?: number | null;
}

export interface StirrupDisplay {
  diaMm: number;
}

export interface CanvasProps {
  widthMm: number;
  depthMm: number;
  lengthMm: number;
  coverMm: number;
  rebars: RebarDisplay[];
  stirrups: StirrupDisplay[];
  elementType: string;
  onBarClick?: (id: string) => void;
}

// ─── Beam / Column cross-section ─────────────────────────────────────────────

const BeamColumnSection = forwardRef<SVGSVGElement, Omit<CanvasProps, "elementType" | "lengthMm">>(
  function BeamColumnSection({ widthMm, depthMm, coverMm, rebars, stirrups, onBarClick }, ref) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const MAX = 320;
    const scale = Math.min(MAX / widthMm, MAX / depthMm);
    const vw = widthMm * scale;
    const vh = depthMm * scale;

    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${vw} ${vh}`}
        width={vw}
        height={vh}
        style={{ display: "block", maxWidth: "100%" }}
        aria-label="Cross-section"
      >
        {/* Concrete outline */}
        <rect x={0} y={0} width={vw} height={vh}
          fill="var(--cds-layer-01)" stroke="var(--cds-border-strong-01)" strokeWidth={1.5} />
        {/* Cover line */}
        <rect
          x={coverMm * scale} y={coverMm * scale}
          width={(widthMm - 2 * coverMm) * scale} height={(depthMm - 2 * coverMm) * scale}
          fill="none" stroke="var(--cds-border-subtle-01)" strokeWidth={0.5} strokeDasharray="4 3"
        />
        {/* Stirrups */}
        {stirrups.map((s, i) => (
          <rect key={i}
            x={coverMm * scale} y={coverMm * scale}
            width={(widthMm - 2 * coverMm) * scale} height={(depthMm - 2 * coverMm) * scale}
            fill="none" stroke="var(--cds-support-warning)"
            strokeWidth={Math.max(s.diaMm * scale, 1.5)} opacity={0.7}
          />
        ))}
        {/* Rebars — each group is a clickable element */}
        {rebars.flatMap((r, i) => {
          const count = r.quantity;
          const dia = r.diaMm * scale;
          const radius = Math.max(dia / 2, 3);
          const topBars = ["TOP_MAIN", "EXTRA_TOP"].includes(r.barType);
          const botBars = ["BOTTOM_MAIN", "EXTRA_BOTTOM"].includes(r.barType);
          const xs = Array.from({ length: count }, (_, k) =>
            count === 1
              ? vw / 2
              : coverMm * scale + (k * (widthMm - 2 * coverMm) * scale) / (count - 1),
          );
          const y = topBars
            ? coverMm * scale + radius
            : botBars
              ? vh - coverMm * scale - radius
              : vh / 2;
          const isHovered = hoveredId === r.id;
          return xs.map((x, k) => (
            <g
              key={`${i}-${k}`}
              onClick={() => onBarClick?.(r.id)}
              onMouseEnter={() => onBarClick && setHoveredId(r.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: onBarClick ? "pointer" : "default" }}
            >
              <title>{r.barMark} T{r.diaMm} ×{r.quantity} — click to remove</title>
              <circle
                cx={r.posX != null ? r.posX * scale : x}
                cy={r.posY != null ? r.posY * scale : y}
                r={radius}
                fill={isHovered ? "var(--cds-support-error)" : "var(--cds-support-info)"}
                stroke={isHovered ? "var(--cds-support-error-inverse)" : "var(--cds-background)"}
                strokeWidth={isHovered ? 1.5 : 0.8}
              />
            </g>
          ));
        })}
        <text x={2} y={vh - 3} fill="var(--cds-text-secondary)" fontSize={9}>
          {widthMm}×{depthMm} mm
        </text>
      </svg>
    );
  },
);

// ─── Slab cross-section strip ─────────────────────────────────────────────────

function SlabSection({
  widthMm, depthMm, coverMm, rebars, onBarClick,
}: Omit<CanvasProps, "elementType" | "lengthMm" | "stirrups">) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const CANVAS_W = 440;
  const MIN_H = 90;
  const scaleX = CANVAS_W / widthMm;
  const scaleY = Math.max(MIN_H / depthMm, scaleX);
  const vw = CANVAS_W;
  const vh = Math.max(depthMm * scaleY, MIN_H);

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} width={vw} height={vh}
      style={{ display: "block", maxWidth: "100%" }} aria-label="Slab cross-section">
      <rect x={0} y={0} width={vw} height={vh}
        fill="var(--cds-layer-01)" stroke="var(--cds-border-strong-01)" strokeWidth={1.5} />
      <rect
        x={coverMm * scaleX} y={coverMm * scaleY}
        width={(widthMm - 2 * coverMm) * scaleX} height={(depthMm - 2 * coverMm) * scaleY}
        fill="none" stroke="var(--cds-border-subtle-01)" strokeWidth={0.5} strokeDasharray="4 3"
      />
      {rebars.flatMap((r, i) => {
        const count = r.quantity;
        const rScaled = Math.max((r.diaMm / 2) * scaleX, 3);
        const topBars = ["TOP_MAIN", "EXTRA_TOP"].includes(r.barType);
        const botBars = ["BOTTOM_MAIN", "EXTRA_BOTTOM"].includes(r.barType);
        const xs = Array.from({ length: count }, (_, k) =>
          count === 1 ? vw / 2
            : coverMm * scaleX + (k * (widthMm - 2 * coverMm) * scaleX) / (count - 1),
        );
        const y = topBars
          ? coverMm * scaleY + rScaled
          : botBars
            ? vh - coverMm * scaleY - rScaled
            : vh / 2;
        const isHovered = hoveredId === r.id;
        return xs.map((x, k) => (
          <g
            key={`${i}-${k}`}
            onClick={() => onBarClick?.(r.id)}
            onMouseEnter={() => onBarClick && setHoveredId(r.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{ cursor: onBarClick ? "pointer" : "default" }}
          >
            <title>{r.barMark} T{r.diaMm} ×{r.quantity} — click to remove</title>
            <circle cx={x} cy={y} r={rScaled}
              fill={isHovered ? "var(--cds-support-error)" : "var(--cds-support-info)"}
              stroke={isHovered ? "var(--cds-support-error-inverse)" : "var(--cds-background)"}
              strokeWidth={isHovered ? 1.5 : 0.8}
            />
          </g>
        ));
      })}
      <text x={4} y={vh - 4} fill="var(--cds-text-secondary)" fontSize={9}>
        Slab strip: span={widthMm} mm · t={depthMm} mm · cover={coverMm} mm
      </text>
    </svg>
  );
}

// ─── Footing plan view (bird's eye) ──────────────────────────────────────────

function FootingSection({
  widthMm, depthMm, lengthMm, coverMm, rebars, onBarClick,
}: Omit<CanvasProps, "elementType" | "stirrups">) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const MAX = 340;
  const scale = Math.min(MAX / widthMm, (MAX * 0.7) / lengthMm);
  const vw = widthMm * scale;
  const vl = lengthMm * scale;

  const mainBars = rebars.filter((r) => r.barType === "BOTTOM_MAIN");
  const distBars = rebars.filter((r) => r.barType === "SIDE_FACE" || r.barType === "TOP_MAIN");

  function barLine(
    r: RebarDisplay,
    x1: number, y1: number, x2: number, y2: number,
    strokeColor: string,
  ) {
    const isHovered = hoveredId === r.id;
    const sw = Math.max(r.diaMm * scale * 0.35, 1.2);
    return (
      <g
        key={`${r.id}-${x1}-${y1}`}
        onClick={() => onBarClick?.(r.id)}
        onMouseEnter={() => onBarClick && setHoveredId(r.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ cursor: onBarClick ? "pointer" : "default" }}
      >
        <title>{r.barMark} T{r.diaMm} ×{r.quantity} — click to remove</title>
        {/* Transparent wider hit area */}
        <line x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="transparent" strokeWidth={Math.max(sw * 3, 6)} />
        <line x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={isHovered ? "var(--cds-support-error)" : strokeColor}
          strokeWidth={sw} opacity={isHovered ? 1 : 0.85}
        />
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${vw} ${vl}`} width={vw} height={vl}
      style={{ display: "block", maxWidth: "100%" }} aria-label="Footing plan view">
      <rect x={0} y={0} width={vw} height={vl}
        fill="var(--cds-layer-01)" stroke="var(--cds-border-strong-01)" strokeWidth={1.5} />
      <rect
        x={coverMm * scale} y={coverMm * scale}
        width={(widthMm - 2 * coverMm) * scale} height={(lengthMm - 2 * coverMm) * scale}
        fill="none" stroke="var(--cds-border-subtle-01)" strokeWidth={0.5} strokeDasharray="4 3"
      />
      {mainBars.flatMap((r) => {
        const n = r.quantity;
        const usable = (lengthMm - 2 * coverMm) * scale;
        return Array.from({ length: n }, (_, k) => {
          const y = coverMm * scale + (k + 1) * (usable / (n + 1));
          return barLine(r,
            coverMm * scale, y,
            (widthMm - coverMm) * scale, y,
            "var(--cds-support-info)",
          );
        });
      })}
      {distBars.flatMap((r) => {
        const n = r.quantity;
        const usable = (widthMm - 2 * coverMm) * scale;
        return Array.from({ length: n }, (_, k) => {
          const x = coverMm * scale + (k + 1) * (usable / (n + 1));
          return barLine(r,
            x, coverMm * scale,
            x, (lengthMm - coverMm) * scale,
            "var(--cds-support-warning)",
          );
        });
      })}
      <text x={4} y={vl - 12} fill="var(--cds-text-secondary)" fontSize={9}>
        Plan: {widthMm}×{lengthMm} mm · D={depthMm} mm
      </text>
      <text x={4} y={vl - 3} fill="var(--cds-text-secondary)" fontSize={8}>
        ── Main (X)   ─ ─ Distribution (Y)
      </text>
    </svg>
  );
}

// ─── Drop-zone wrapper ────────────────────────────────────────────────────────

export const CrossSectionDropZone = forwardRef<SVGSVGElement, CanvasProps>(
  function CrossSectionDropZone(props, ref) {
    const { setNodeRef, isOver } = useDroppable({ id: "sf-canvas" });

    return (
      <div
        ref={setNodeRef}
        style={{
          display: "inline-block",
          outline: isOver ? "2px solid var(--cds-focus)" : "2px solid transparent",
          borderRadius: "2px",
          transition: "outline 0.1s",
        }}
      >
        {props.elementType === "SLAB" ? (
          <SlabSection {...props} />
        ) : props.elementType === "FOOTING" ? (
          <FootingSection {...props} />
        ) : (
          <BeamColumnSection ref={ref} {...props} />
        )}
      </div>
    );
  },
);
