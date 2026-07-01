/**
 * Studio Intelligence — zone-state vocabulary (spec §5/§6).
 *
 * Constants + types live here, apart from the React components in
 * `abstractShell.tsx`, so that file exports only components and React Fast
 * Refresh can hot-update it (mixing component + constant exports disables HMR).
 */

export type ZoneState = "stable" | "watch" | "friction" | "critical" | "inactive";

// Palette (spec §6) — Carbon tokens only; applied inline from these maps.
export const ZONE_COLOR: Record<ZoneState, string> = {
  stable: "var(--cds-support-success)",
  watch: "var(--cds-support-info)",
  friction: "var(--cds-support-warning)",
  critical: "var(--cds-support-error)",
  inactive: "var(--cds-text-secondary)",
};

export const STATE_WORD: Record<ZoneState, string> = {
  stable: "Stable",
  watch: "Watch",
  friction: "Friction",
  critical: "Critical",
  inactive: "Inactive",
};

// Alert geometry: ● circle = handled/stable · ▲ triangle = watch/monitoring ·
// ■ square = critical. Each is rendered in its alert colour (ZONE_COLOR) by
// StatusSymbol — shape and colour together carry the severity.
export type Glyph = "●" | "▲" | "■";

export function glyphFor(state: ZoneState): Glyph {
  if (state === "critical") return "■";
  if (state === "watch" || state === "friction") return "▲";
  return "●";
}

// Per-shape optical-size class (the font draws each glyph at a different height).
export const GLYPH_CLASS: Record<Glyph, string> = {
  "●": "esti-geo--circle",
  "▲": "esti-geo--triangle",
  "■": "esti-geo--square",
};
