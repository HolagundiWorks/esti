/**
 * HealthGlassOrb — zone / office-health indicator (glass variant).
 * Shape encodes severity without relying on colour alone:
 *   circle   = healthy / inactive
 *   triangle = caution (watch / friction)
 *   square   = critical
 *
 * Glass styling uses CSS class `hcw-health-glass-orb` (+ state modifier).
 * Host apps may map these to existing `.esti-zone-glass-orb*` rules until
 * glass.scss is fully shrunk (see HCW-UI-KIT.md).
 */
import type { CSSProperties } from "react";

export type HealthZoneState = "stable" | "watch" | "friction" | "critical" | "inactive";

const GLYPH: Record<
  HealthZoneState,
  { shape: "circle" | "triangle" | "square"; fill: string }
> = {
  stable: { shape: "circle", fill: "var(--cds-support-success, #198038)" },
  watch: { shape: "triangle", fill: "var(--cds-support-warning, #f1c21b)" },
  friction: {
    shape: "triangle",
    fill: "var(--cds-support-warning-minor, var(--cds-support-warning, #f1c21b))",
  },
  critical: { shape: "square", fill: "var(--cds-support-error, #da1e28)" },
  inactive: { shape: "circle", fill: "var(--cds-text-disabled, #a8a8a8)" },
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

export function HealthGlassOrb({
  state,
  size = 14,
  title,
  variant = "glass",
  className,
  style,
}: {
  state: HealthZoneState;
  size?: number;
  title?: string;
  variant?: "flat" | "glass";
  className?: string;
  style?: CSSProperties;
}) {
  const g = GLYPH[state];
  const label = title ?? `Health: ${state}`;

  if (variant !== "glass") {
    return (
      <span role="img" aria-label={label} title={title} className={className} style={style}>
        <FlatShape shape={g.shape} size={size} fill={g.fill} />
      </span>
    );
  }

  return (
    <span
      className={[
        "hcw-health-glass-orb",
        `hcw-health-glass-orb--${state}`,
        // App alias until glass.scss migrates class names
        "esti-zone-glass-orb",
        `esti-zone-glass-orb--${state}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="img"
      aria-label={label}
      title={title}
      style={{ width: size, height: size, ...style }}
    />
  );
}
