import { useDroppable } from "@dnd-kit/core";
import { forwardRef } from "react";

interface RebarDisplay {
  diaMm: number;
  barType: string;
  quantity: number;
  posX?: number | null;
  posY?: number | null;
}

interface StirrupDisplay {
  diaMm: number;
}

interface CanvasProps {
  widthMm: number;
  depthMm: number;
  lengthMm: number;
  coverMm: number;
  rebars: RebarDisplay[];
  stirrups: StirrupDisplay[];
  elementType: string;
}

// ─── Beam / Column cross-section ─────────────────────────────────────────────

const BeamColumnSection = forwardRef<SVGSVGElement, Omit<CanvasProps, "elementType" | "lengthMm">>(
  function BeamColumnSection({ widthMm, depthMm, coverMm, rebars, stirrups }, ref) {
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
        aria-label="Beam/column cross-section"
      >
        <rect x={0} y={0} width={vw} height={vh}
          fill="var(--cds-layer-01)" stroke="var(--cds-border-strong-01)" strokeWidth={1.5} />
        <rect
          x={coverMm * scale} y={coverMm * scale}
          width={(widthMm - 2 * coverMm) * scale} height={(depthMm - 2 * coverMm) * scale}
          fill="none" stroke="var(--cds-border-subtle-01)" strokeWidth={0.5} strokeDasharray="4 3"
        />
        {stirrups.map((s, i) => (
          <rect key={i}
            x={coverMm * scale} y={coverMm * scale}
            width={(widthMm - 2 * coverMm) * scale} height={(depthMm - 2 * coverMm) * scale}
            fill="none" stroke="var(--cds-support-warning)"
            strokeWidth={Math.max(s.diaMm * scale, 1.5)} opacity={0.7}
          />
        ))}
        {rebars.flatMap((r, i) => {
          const count = r.quantity;
          const dia = r.diaMm * scale;
          const topBars = ["TOP_MAIN", "EXTRA_TOP"].includes(r.barType);
          const botBars = ["BOTTOM_MAIN", "EXTRA_BOTTOM"].includes(r.barType);
          const xs = Array.from({ length: count }, (_, k) =>
            count === 1 ? vw / 2
              : coverMm * scale + (k * (widthMm - 2 * coverMm) * scale) / (count - 1),
          );
          const y = topBars
            ? coverMm * scale + dia / 2
            : botBars
              ? vh - coverMm * scale - dia / 2
              : vh / 2;
          return xs.map((x, k) => (
            <circle key={`${i}-${k}`}
              cx={r.posX != null ? r.posX * scale : x}
              cy={r.posY != null ? r.posY * scale : y}
              r={Math.max(dia / 2, 3)}
              fill="var(--cds-support-info)" stroke="var(--cds-background)" strokeWidth={0.8}
            />
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

function SlabSection({ widthMm, depthMm, coverMm, rebars, stirrups }: Omit<CanvasProps, "elementType" | "lengthMm">) {
  // Show a cross-section strip; force a minimum viewable depth
  const CANVAS_W = 440;
  const MIN_H = 90;
  const scaleX = CANVAS_W / widthMm;
  const rawScaleY = MIN_H / depthMm;
  const scaleY = Math.max(rawScaleY, scaleX);
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
        return xs.map((x, k) => (
          <circle key={`${i}-${k}`} cx={x} cy={y} r={rScaled}
            fill="var(--cds-support-info)" stroke="var(--cds-background)" strokeWidth={0.8} />
        ));
      })}
      {/* Distribution bars indicator */}
      <text x={4} y={vh - 4} fill="var(--cds-text-secondary)" fontSize={9}>
        Slab strip (1m): w={widthMm} mm · d={depthMm} mm · cover={coverMm} mm
      </text>
    </svg>
  );
}

// ─── Footing plan view (bird's eye) ──────────────────────────────────────────

function FootingSection({ widthMm, depthMm, lengthMm, coverMm, rebars }: Omit<CanvasProps, "elementType" | "stirrups">) {
  const MAX = 340;
  const scale = Math.min(MAX / widthMm, (MAX * 0.7) / lengthMm);
  const vw = widthMm * scale;
  const vl = lengthMm * scale;

  const mainBars = rebars.filter((r) => r.barType === "BOTTOM_MAIN");
  const distBars = rebars.filter((r) => r.barType === "SIDE_FACE" || r.barType === "TOP_MAIN");

  return (
    <svg viewBox={`0 0 ${vw} ${vl}`} width={vw} height={vl}
      style={{ display: "block", maxWidth: "100%" }} aria-label="Footing plan view">
      {/* Footing base */}
      <rect x={0} y={0} width={vw} height={vl}
        fill="var(--cds-layer-01)" stroke="var(--cds-border-strong-01)" strokeWidth={1.5} />
      <rect
        x={coverMm * scale} y={coverMm * scale}
        width={(widthMm - 2 * coverMm) * scale} height={(lengthMm - 2 * coverMm) * scale}
        fill="none" stroke="var(--cds-border-subtle-01)" strokeWidth={0.5} strokeDasharray="4 3"
      />
      {/* Main bars — run across width (horizontal lines in plan) */}
      {mainBars.flatMap((r, i) => {
        const n = r.quantity;
        const usable = (lengthMm - 2 * coverMm) * scale;
        return Array.from({ length: n }, (_, k) => {
          const y = coverMm * scale + (k + 1) * (usable / (n + 1));
          return (
            <line key={`mx${i}-${k}`}
              x1={coverMm * scale} y1={y}
              x2={(widthMm - coverMm) * scale} y2={y}
              stroke="var(--cds-support-info)"
              strokeWidth={Math.max(r.diaMm * scale * 0.35, 1.2)} opacity={0.85}
            />
          );
        });
      })}
      {/* Distribution bars — run across length (vertical lines in plan) */}
      {distBars.flatMap((r, i) => {
        const n = r.quantity;
        const usable = (widthMm - 2 * coverMm) * scale;
        return Array.from({ length: n }, (_, k) => {
          const x = coverMm * scale + (k + 1) * (usable / (n + 1));
          return (
            <line key={`dy${i}-${k}`}
              x1={x} y1={coverMm * scale}
              x2={x} y2={(lengthMm - coverMm) * scale}
              stroke="var(--cds-support-warning)"
              strokeWidth={Math.max(r.diaMm * scale * 0.35, 1.2)} opacity={0.85}
            />
          );
        });
      })}
      {/* Labels */}
      <text x={4} y={vl - 12} fill="var(--cds-text-secondary)" fontSize={9}>
        Plan: {widthMm}×{lengthMm} mm · d={depthMm} mm
      </text>
      <text x={4} y={vl - 3} fill="var(--cds-text-secondary)" fontSize={8}>
        ── Bottom main (BOTTOM_MAIN)   ─ ─ Distribution (SIDE_FACE)
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
