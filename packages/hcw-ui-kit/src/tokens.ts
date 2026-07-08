/**
 * AORMS design tokens — the SINGLE source of truth for colour, shape, surface and
 * type across every portal (workspace app, client & consultant portals, licensing
 * console, ESE, the Estimate app, and any future deployable). The MUI theme
 * (`theme.ts`) is built entirely from these, and portals may import the raw tokens
 * for the rare edge case the theme doesn't cover.
 *
 * Design language: HYPER-MINIMALIST LIGHT with a RADIANT ORANGE accent —
 * Fog-Gray canvas, Pure-White cards, Coal-Black ink, one soft-square radius,
 * flat borderless surfaces (definition from spacing + hairlines, not boxes).
 * Full spec: docs/esti/AORMS-BRANDING-KIT.md.
 */

/** Brand palette. Orange is a FILL/active accent only (carries white text); links
 *  use slate, never the accent. */
export const colors = {
  background: "#F2F4F7", // Fog Gray — clean cool canvas
  layer01: "#FFFFFF", // Pure White — card surface
  layer02: "#E7EAF0", // quiet fog — secondary/selected surface
  borderSubtle: "rgba(20, 21, 23, 0.10)", // hairline separator (Coal Black @ 10%)
  borderStrong: "rgba(20, 21, 23, 0.20)",
  textPrimary: "#141517", // Coal Black — ink
  textSecondary: "#5b616b", // muted slate-grey
  textHelper: "#8a9099", // quiet label grey
  textOnColor: "#FFFFFF",
  ink: "#141517", // Coal Black — primary text/ink
  onAccent: "#FFFFFF", // text on the orange accent
  accent: "#FF4F18", // Radiant Orange — THE accent (fills, active states)
  accentSoft: "rgba(255, 79, 24, 0.14)", // orange wash (selected rows)
  accentDark: "#DB3E0F", // deeper orange — accent hover
  hoverSoft: "rgba(20, 21, 23, 0.04)", // neutral row/hover wash
  supportSuccess: "#1B7F5A", // deep teal-green
  supportWarning: "#FF9932", // saffron — distinct from the orange accent
  supportError: "#C8442E", // burnt red
  supportInfo: "#3B5568", // slate — links + info
} as const;

/** The one "soft-square" corner radius used EVERYWHERE (popups, panels, buttons,
 *  inputs) so the whole product reads as a single system. */
export const RADIUS = 8;
/** Buttons use a slightly tighter radius (they are pure text, so this is subtle). */
export const BUTTON_RADIUS = 4;

/** Brand font — Urbanist (OFL, self-hosted via @fontsource; works offline).
 *  Consumers import the weights they need (see README) and this stack is applied
 *  by the theme + as the `--esti-font-sans` custom property. */
export const FONT_FAMILY =
  "'Urbanist', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// ── Surface recipes (shared by the theme; exported for bespoke surfaces) ───────

/** Hairline edge for the few surfaces that keep an edge (drawer, app bar). */
export const GLASS_BORDER = "1px solid rgba(20, 21, 23, 0.08)";
export const GLASS_BLUR = "none"; // flat content — no backdrop blur
export const GLASS_SHADOW = "none"; // flat content — no elevation
export const POP_FILL = "#FFFFFF"; // edge-docked surfaces sit over content — solid white

/** DIALOGS — the one pop-over with the neumorphic extruded card. */
export const NEU_POP = {
  backgroundColor: "#eceef2",
  backgroundImage: "none",
  border: "none",
  borderRadius: RADIUS,
  boxShadow: "9px 9px 22px rgba(20, 21, 23, 0.18), -9px -9px 22px rgba(255, 255, 255, 0.92)",
} as const;

/** MENUS / popovers / autocomplete — flat white with a soft ambient shadow. */
export const FLAT_POP = {
  backgroundColor: "#ffffff",
  backgroundImage: "none",
  border: "none",
  borderRadius: RADIUS,
  boxShadow: "0 8px 24px rgba(20, 21, 23, 0.14)",
} as const;

// ── Flat text buttons ─────────────────────────────────────────────────────────
export const BTN_LIFT = "translateY(-2px)"; // hover float
export const UNDERLINE_ORANGE = "inset 0 -2px 0 0 #ff4f18"; // hover bottom line
export const UNDERLINE_RED = "inset 0 -2px 0 0 #c8442e";
export const GLASS_ORANGE_30 = "rgba(255, 79, 24, 0.30)"; // selected toggle wash

// ── Neumorphic recessed inputs (text-entry wells) ──────────────────────────────
export const NEU_FILL = "#eceef2";
export const NEU_INSET =
  "inset 2px 2px 4.5px rgba(20, 21, 23, 0.16), inset -2px -2px 4.5px rgba(255, 255, 255, 0.92)";
export const NEU_INSET_FOCUS =
  "inset 2.5px 2.5px 5.5px rgba(20, 21, 23, 0.20), inset -2.5px -2.5px 5.5px rgba(255, 255, 255, 0.95), inset 0 0 0 1.5px rgba(255, 79, 24, 0.45)";
export const NEU_INSET_ERROR =
  "inset 2px 2px 4.5px rgba(20, 21, 23, 0.16), inset -2px -2px 4.5px rgba(255, 255, 255, 0.92), inset 0 0 0 1.5px rgba(200, 68, 46, 0.55)";
export const NEU_INPUT_RADIUS = RADIUS;

/** Dropdowns (Select) — FLAT at rest, button-like on hover (white box + orange line). */
export const DD_FLAT = {
  backgroundColor: "transparent",
  boxShadow: "none",
  border: "1px solid transparent",
  transition: "background 130ms ease, box-shadow 130ms ease, border-color 130ms ease",
  "&:hover": {
    backgroundColor: "#ffffff",
    borderColor: colors.borderSubtle,
    boxShadow: UNDERLINE_ORANGE,
  },
  "&.Mui-focused": {
    backgroundColor: "#ffffff",
    border: `1px solid ${colors.accent}`,
    boxShadow: "none",
  },
  "&.Mui-error": { borderColor: "rgba(200, 68, 46, 0.7)" },
  "&.Mui-disabled": { boxShadow: "none", opacity: 0.6 },
} as const;

// ── The three depth layers (HCW-UI-Kit thesis: depth encodes importance) ───────
// Layer 1 FLAT (hyperminimalist) — the resting plane: tables, text, inputs at
// rest. No recipe: it IS the canvas + hairlines (see the theme's Paper/DataGrid).
// Layer 2 SOFT (neumorphic) — contained objects you work within: widgets,
// highlight cards, panels, dialogs. A same-material block extruded off the canvas.
export const NEU_RAISED = {
  backgroundColor: NEU_FILL,
  backgroundImage: "none",
  border: "none",
  borderRadius: RADIUS,
  boxShadow: "6px 6px 14px rgba(20, 21, 23, 0.16), -6px -6px 14px rgba(255, 255, 255, 0.92)",
} as const;
// Layer 3 GLASS (glassmorphism) — the live, floating layer: hover, CTAs, the
// action dock, priority alerts, active widgets. Translucent frosted glass that
// visibly lifts above everything and pulls the eye. Reserved for what's actionable.
export const GLASS_SURFACE = {
  background: "rgba(255, 255, 255, 0.62)",
  backdropFilter: "blur(20px) saturate(1.6)",
  WebkitBackdropFilter: "blur(20px) saturate(1.6)",
  border: "1px solid rgba(255, 255, 255, 0.55)",
  borderRadius: RADIUS,
  boxShadow: "0 10px 34px rgba(20, 21, 23, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
} as const;

/** The three layers, by name. `flat` is intentionally empty (it IS the canvas). */
export type SurfaceLayer = "flat" | "soft" | "glass";
export const LAYERS: Record<SurfaceLayer, Record<string, unknown>> = {
  flat: {},
  soft: NEU_RAISED,
  glass: GLASS_SURFACE,
};

/** The token bundle, handy for a one-shot import. */
export const tokens = { colors, RADIUS, BUTTON_RADIUS, FONT_FAMILY } as const;
