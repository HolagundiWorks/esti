import type { ZoneState } from "../dashboard/zoneState.js";

/**
 * Office-health indicator — shape ONLY (square / circle / triangle), per the
 * shell brief. Shape encodes severity so it reads without relying on colour:
 *   circle   = healthy      (stable / inactive)
 *   triangle = caution      (watch / friction)
 *   square   = critical     (critical)
 * Colour is a secondary cue from Carbon support tokens (never hard-coded hex).
 */
const GLYPH: Record<ZoneState, { shape: "circle" | "triangle" | "square"; token: string }> = {
  stable:   { shape: "circle",   token: "var(--cds-support-success)" },
  watch:    { shape: "triangle", token: "var(--cds-support-warning)" },
  friction: { shape: "triangle", token: "var(--cds-support-warning-minor, var(--cds-support-warning))" },
  critical: { shape: "square",   token: "var(--cds-support-error)" },
  inactive: { shape: "circle",   token: "var(--cds-text-disabled)" },
};


function FlatShape({
  shape,
  size,
  fill,
}: {
  shape: "circle" | "triangle" | "square";
  size: number;
  fill: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      {shape === "circle" && <circle cx="8" cy="8" r="6" fill={fill} />}
      {shape === "square" && <rect x="2" y="2" width="12" height="12" fill={fill} />}
      {shape === "triangle" && <polygon points="8,2 14,14 2,14" fill={fill} />}
    </svg>
  );
}

export function OfficeHealthGlyph({
  state,
  size = 14,
  title,
  variant = "flat",
}: {
  state: ZoneState;
  size?: number;
  title?: string;
  /** `glass` — glowing liquid-glass orb (canonical zone/office health indicator). */
  variant?: "flat" | "glass";
}) {
  const g = GLYPH[state];

  if (variant !== "glass") {
    return (
      <span role="img" aria-label={title ?? `Office health: ${state}`} title={title}>
        <FlatShape shape={g.shape} size={size} fill={g.token} />
      </span>
    );
  }

  return (
    <span
      className={`esti-zone-glass-orb esti-zone-glass-orb--${state}`}
      role="img"
      aria-label={title ?? `Office health: ${state}`}
      title={title}
    />
  );
}
