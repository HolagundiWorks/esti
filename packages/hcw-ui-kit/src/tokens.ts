/**
 * AORMS design tokens — the SINGLE source of truth for colour, shape, surface and
 * type across every portal (workspace app, client & consultant portals, licensing
 * console, ESE, the Estimate app, and any future deployable). The MUI theme
 * (`theme.ts`) is built entirely from these, and portals may import the raw tokens
 * for the rare edge case the theme doesn't cover.
 *
 * Design language: HYPER-MINIMALIST LIGHT with a RADIANT ORANGE accent —
 * Fog-Gray canvas, Pure-White cards, Coal-Black ink, square surfaces (0 radius),
 * flat borderless panels (definition from spacing + hairlines, not boxes).
 * **Rounded corners:** buttons `BUTTON_RADIUS` (4px), ActionDock `DOCK_PILL_RADIUS`
 * (capsule tray + dock buttons), dialogs `DIALOG_RADIUS` (8px).
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
  textHelper: "#667085", // slate helper — ≥4.5:1 on Fog Gray / white (WCAG AA)
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

// ── Colour schemes (semantic tier — designtokens.org global→semantic layering) ──
/** A scheme carries every semantic colour role. `colors` above IS the light scheme
 *  (kept as the default export shape for full backward compatibility). */
export type ColorScheme = Record<keyof typeof colors, string>;
export type SchemeName = "light" | "dark" | "highContrast";

/** Dark scheme — brand-consistent inversion (Coal canvas, lifted accent for AA on
 *  dark). **Scaffold status:** palette-complete; the neumorphic/glass RECIPES below
 *  remain light-tuned, so dark is preview-grade until recipes gain dark variants. */
export const DARK_SCHEME: ColorScheme = {
  background: "#101215",
  layer01: "#191C21",
  layer02: "#232830",
  borderSubtle: "rgba(255, 255, 255, 0.10)",
  borderStrong: "rgba(255, 255, 255, 0.20)",
  textPrimary: "#EDEFF3",
  textSecondary: "#9AA2AE",
  textHelper: "#98A1AD",
  textOnColor: "#FFFFFF",
  ink: "#EDEFF3",
  onAccent: "#FFFFFF",
  accent: "#FF5C28",
  accentSoft: "rgba(255, 92, 40, 0.20)",
  accentDark: "#FF7A4D", // hover lifts LIGHTER on dark canvases
  hoverSoft: "rgba(255, 255, 255, 0.06)",
  supportSuccess: "#4CC29A",
  supportWarning: "#FFB25C",
  supportError: "#F07862",
  supportInfo: "#8FB4CE",
} as const;

/** High-contrast scheme (light HC) — pure grounds, full-strength borders, darkened
 *  accent so white-on-accent text holds ≥4.5:1. Scaffold status as above. */
export const HIGH_CONTRAST_SCHEME: ColorScheme = {
  background: "#FFFFFF",
  layer01: "#FFFFFF",
  layer02: "#E5E5E5",
  borderSubtle: "#141517",
  borderStrong: "#000000",
  textPrimary: "#000000",
  textSecondary: "#141517",
  textHelper: "#333A44",
  textOnColor: "#FFFFFF",
  ink: "#000000",
  onAccent: "#FFFFFF",
  accent: "#C93A00",
  accentSoft: "rgba(201, 58, 0, 0.18)",
  accentDark: "#A32F00",
  hoverSoft: "rgba(0, 0, 0, 0.08)",
  supportSuccess: "#0E5A3C",
  supportWarning: "#8A4B00",
  supportError: "#A31226",
  supportInfo: "#1F4258",
} as const;

/** All schemes by name — the theme factory resolves from here. */
export const SCHEMES: Record<SchemeName, ColorScheme> = {
  light: colors,
  dark: DARK_SCHEME,
  highContrast: HIGH_CONTRAST_SCHEME,
};

/** Status hues for StatusDot/StatusTag — canonical kit-owned values (supersede the
 *  frozen `--cds-tag-*` compat layer for new code). */
export const STATUS_COLORS: Record<string, string> = {
  red: "#a2191f",
  magenta: "#9f1853",
  purple: "#6929c4",
  blue: "#0043ce",
  cyan: "#00539a",
  teal: "#005d5d",
  green: "#0e6027",
  gray: "#161616",
  "cool-gray": "#121619",
  "warm-gray": "#171414",
};

/** Surface / panel / input corner radius — square everywhere (0). */
export const RADIUS = 0;
/** Buttons (MuiButton) — rounded workspace controls. */
export const BUTTON_RADIUS = 4;
/** ActionDock tray + dock buttons — full capsule pill (not square NEU_RAISED). */
export const DOCK_PILL_RADIUS = 9999;
/** Dialogs (MuiDialog paper) — the only rounded surface panel in the workspace. */
export const DIALOG_RADIUS = 8;
/** Marketing section carousel — rounded glass tray + chips (public landing only). */
export const MARKETING_DOCK_RADIUS = 12;
/** Selected tab accent — inset top rule (alert line), not a background fill. */
export const TAB_ALERT_WIDTH = 3;

// ── Scale tokens (the numeric ladders the theme + components build on) ─────────

/** Spacing base — 8px, matching MUI's default grid so existing layouts are
 *  unaffected. `theme.spacing(1)` = 8px. Use `SPACING.*` instead of magic px. */
export const SPACING_UNIT = 8;
export const SPACING = {
  none: 0, xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64,
} as const;

/** Responsive breakpoints (px). Mirror MUI defaults; `md: 900` is the rail
 *  stack/unstack line used across the workspace + marketing shells. */
export const BREAKPOINTS = { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } as const;

/** Z-index ladder — one stack order for every floating surface, mirroring MUI's
 *  ladder so themed MUI overlays and HCW chrome (rail · dock · footer) never fight. */
export const Z_INDEX = {
  base: 0, rail: 5, stickyHeader: 10, fab: 1050, appBar: 1100, drawer: 1200,
  actionDock: 1250, dialog: 1300, toast: 1400, tooltip: 1500,
} as const;

/** Opacity scale — the only sanctioned alpha steps for UI state. */
export const OPACITY = {
  disabled: 0.45, muted: 0.6, hoverWash: 0.04, selectedWash: 0.14,
} as const;

/** Type scale — the sanctioned font sizes BELOW/BESIDE the MUI variants, for the
 *  dense-telemetry cases (rail micro-labels, KPI values) that variants don't cover.
 *  Icon sizing via `fontSize` on icon components is geometry, not typography — it
 *  is exempt from this scale (see HCW-KIT-AI-KNOWLEDGE-BASE.md R1). */
export const TYPE_SCALE = {
  micro: "0.65rem", // rail telemetry micro-labels (below caption)
  caption: "0.75rem", // = MUI caption; here for completeness of the ladder
  body2: "0.875rem",
  body: "1rem",
  kpi: "1.1rem", // stage-head / rail KPI values (light weight)
} as const;

/** Motion tokens — durations (ms) + easings. `fast`/`base` match the 130–200ms
 *  used across the theme. Always gate transforms behind {@link REDUCE_MOTION}. */
export const MOTION = {
  duration: { instant: 80, fast: 130, base: 200, slow: 320 },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    emphasized: "cubic-bezier(0.3, 0, 0, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
  },
} as const;

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
  borderRadius: DIALOG_RADIUS,
  boxShadow: "9px 9px 22px rgba(20, 21, 23, 0.18), -9px -9px 22px rgba(255, 255, 255, 0.92)",
} as const;

/** MENUS / popovers / autocomplete — flat white with a soft ambient shadow. */
export const FLAT_POP = {
  backgroundColor: "#ffffff",
  backgroundImage: "none",
  border: "none",
  borderRadius: 0,
  boxShadow: "0 8px 24px rgba(20, 21, 23, 0.14)",
} as const;

// ── Flat text buttons ─────────────────────────────────────────────────────────
export const BTN_LIFT = "translateY(-2px)"; // hover float
export const UNDERLINE_ORANGE = "inset 0 -2px 0 0 #ff4f18"; // hover bottom line
export const UNDERLINE_RED = "inset 0 -2px 0 0 #c8442e";
export const GLASS_ORANGE_30 = "rgba(255, 79, 24, 0.30)"; // selected toggle wash

// ── Motion & focus (accessibility) ─────────────────────────────────────────────
/** Media-query key that matches when the OS "reduce motion" preference is on.
 *  Gate every transform/lift behind it so users who ask for calm keep the colour +
 *  shadow cues but lose the movement (WCAG 2.3.3). Usable as an sx / styleOverride
 *  object key: `{ [REDUCE_MOTION]: { transition: "none" } }`. */
export const REDUCE_MOTION = "@media (prefers-reduced-motion: reduce)";
/** Keyboard focus ring — the Radiant-Orange accent, offset off the control. Applied
 *  on `:focus-visible` so keyboard users get the same "this is actionable" signal a
 *  mouse user gets on hover, without showing a ring on plain mouse clicks. */
export const FOCUS_RING = {
  outline: `2px solid ${colors.accent}`,
  outlineOffset: "2px",
} as const;

// ── Neumorphic recessed inputs (text-entry wells) ──────────────────────────────
export const NEU_FILL = "#eceef2";
export const NEU_INSET =
  "inset 2px 2px 4.5px rgba(20, 21, 23, 0.16), inset -2px -2px 4.5px rgba(255, 255, 255, 0.92)";
export const NEU_INSET_FOCUS =
  "inset 2.5px 2.5px 5.5px rgba(20, 21, 23, 0.20), inset -2.5px -2.5px 5.5px rgba(255, 255, 255, 0.95), inset 0 0 0 1.5px rgba(255, 79, 24, 0.45)";
export const NEU_INSET_ERROR =
  "inset 2px 2px 4.5px rgba(20, 21, 23, 0.16), inset -2px -2px 4.5px rgba(255, 255, 255, 0.92), inset 0 0 0 1.5px rgba(200, 68, 46, 0.55)";
export const NEU_INPUT_RADIUS = 0;

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
  borderRadius: 0,
  boxShadow: "6px 6px 14px rgba(20, 21, 23, 0.16), -6px -6px 14px rgba(255, 255, 255, 0.92)",
} as const;

/** ActionDock floating tray — neumorphic raised capsule (Layer 2 shell for dock buttons). */
export const ACTION_DOCK_TRAY = {
  ...NEU_RAISED,
  borderRadius: DOCK_PILL_RADIUS,
} as const;

/** Recessed groove — vertical zone separator inside NEU_RAISED / ActionDock tray. */
export const NEU_GROOVE_VERTICAL = {
  width: "2px",
  alignSelf: "stretch",
  my: 0.5,
  flexShrink: 0,
  borderRadius: "1px",
  background: "transparent",
  boxShadow:
    "inset 1px 0 rgba(20, 21, 23, 0.15), inset -1px 0 rgba(255, 255, 255, 0.82)",
} as const;

/** Recessed groove — horizontal separator on soft / clear-glass surfaces. */
export const NEU_GROOVE_HORIZONTAL = {
  height: "2px",
  width: "100%",
  flexShrink: 0,
  borderRadius: "1px",
  background: "transparent",
  boxShadow:
    "inset 0 1px 0 rgba(20, 21, 23, 0.12), inset 0 -1px 0 rgba(255, 255, 255, 0.72)",
} as const;
// Layer 3 GLASS (glassmorphism) — the live, floating layer: hover, CTAs, the
// action dock, priority alerts, active widgets. Translucent frosted glass that
// visibly lifts above everything and pulls the eye. Reserved for what's actionable.
export const GLASS_SURFACE = {
  background: "rgba(255, 255, 255, 0.36)",
  backdropFilter: "blur(28px) saturate(1.85)",
  WebkitBackdropFilter: "blur(28px) saturate(1.85)",
  border: "1px solid rgba(255, 255, 255, 0.48)",
  borderRadius: 0,
  boxShadow:
    "0 14px 42px rgba(20, 21, 23, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.62), inset 0 -1px 0 rgba(255, 255, 255, 0.18)",
} as const;

/**
 * Layer 3 variant — **liquid glass** for ActionDock buttons on hover/focus.
 * Crystal-clear frosted pill: gradient wash, high saturate blur, specular inset edges.
 * Flat pill at rest; liquid-glass capsule on hover/focus (`DOCK_PILL_RADIUS`).
 */
export const LIQUID_GLASS_BUTTON = {
  background:
    "linear-gradient(165deg, rgba(255, 255, 255, 0.58) 0%, rgba(255, 255, 255, 0.18) 45%, rgba(255, 255, 255, 0.42) 100%)",
  backdropFilter: "blur(36px) saturate(2.25) brightness(1.14)",
  WebkitBackdropFilter: "blur(36px) saturate(2.25) brightness(1.14)",
  border: "1px solid rgba(255, 255, 255, 0.72)",
  borderRadius: DOCK_PILL_RADIUS,
  boxShadow:
    "0 12px 36px rgba(20, 21, 23, 0.11), 0 2px 10px rgba(255, 79, 24, 0.07), inset 0 1.5px 0 rgba(255, 255, 255, 0.92), inset 0 -1px 0 rgba(255, 255, 255, 0.28)",
} as const;

/** ActionDock button hover/focus lift. */
export const DOCK_BUTTON_LIFT = "translateY(-3px)";

/**
 * Layer 3 variant — **clear glass** (marketing rail / section heading bands).
 * More translucent than `GLASS_SURFACE` so atmosphere (contours) stays readable.
 * Do **not** use on dense sub-cards — flat/transparent + hairlines instead.
 */
export const CLEAR_GLASS_SURFACE = {
  background:
    "linear-gradient(175deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 48%, rgba(255, 255, 255, 0.09) 100%)",
  backdropFilter: "blur(26px) saturate(1.7) brightness(1.08)",
  WebkitBackdropFilter: "blur(26px) saturate(1.7) brightness(1.08)",
  border: "1px solid rgba(255, 255, 255, 0.38)",
  borderRadius: 0,
  boxShadow:
    "6px 0 32px rgba(20, 21, 23, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.55), inset 1px 0 0 rgba(255, 255, 255, 0.28)",
} as const;

/**
 * SectionDock chips — clear liquid glass pills (marketing section carousel).
 * Translucent gradient + specular inset edges; pair with `MARKETING_DOCK_RADIUS`.
 */
export const SECTION_DOCK_CHIP_GLASS = {
  background:
    "linear-gradient(175deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.07) 48%, rgba(255, 255, 255, 0.18) 100%)",
  backdropFilter: "blur(28px) saturate(1.85) brightness(1.1)",
  WebkitBackdropFilter: "blur(28px) saturate(1.85) brightness(1.1)",
  border: "1px solid rgba(255, 255, 255, 0.58)",
  boxShadow:
    "inset 0 1px 0 rgba(255, 255, 255, 0.72), inset 0 -1px 0 rgba(255, 255, 255, 0.24), 0 4px 14px rgba(20, 21, 23, 0.06)",
} as const;

/**
 * Layer 3 variant — **heading glass** (full-width section openers on marketing).
 * Same clear recipe, stronger top edge; pairs with accent left rule in CSS.
 */
export const HEADING_GLASS_SURFACE = {
  background:
    "linear-gradient(155deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.06) 55%, rgba(255, 255, 255, 0.10) 100%)",
  backdropFilter: "blur(22px) saturate(1.55) brightness(1.06)",
  WebkitBackdropFilter: "blur(22px) saturate(1.55) brightness(1.06)",
  borderTop: "1px solid rgba(255, 255, 255, 0.55)",
  borderRight: "1px solid rgba(20, 21, 23, 0.06)",
  borderBottom: "1px solid rgba(20, 21, 23, 0.08)",
  borderLeft: `4px solid ${colors.accent}`,
  borderRadius: 0,
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 8px 24px rgba(20, 21, 23, 0.04)",
} as const;

// ── Scheme-aware surface recipes ────────────────────────────────────────────────
// The neu/glass material language per colour scheme. LIGHT is the shipped brand
// (the standalone constants above); DARK/HIGH-CONTRAST are preview-grade derivations
// pending visual sign-off. Dark neumorphism: near-black shadow pairs + faint white
// highlights on a lifted fill. High contrast: no soft shadows or frosts at all —
// solid fills + full-strength borders (reduced-transparency friendly).

export type SurfaceRecipes = {
  POP_FILL: string;
  GLASS_BORDER: string;
  NEU_FILL: string;
  NEU_POP: Record<string, unknown>;
  FLAT_POP: Record<string, unknown>;
  NEU_RAISED: Record<string, unknown>;
  NEU_INSET: string;
  NEU_INSET_FOCUS: string;
  NEU_INSET_ERROR: string;
  GLASS_SURFACE: {
    background: string;
    backdropFilter: string;
    WebkitBackdropFilter: string;
    border: string;
    borderRadius: number;
    boxShadow: string;
  };
};

const LIGHT_RECIPES: SurfaceRecipes = {
  POP_FILL,
  GLASS_BORDER,
  NEU_FILL,
  NEU_POP,
  FLAT_POP,
  NEU_RAISED,
  NEU_INSET,
  NEU_INSET_FOCUS,
  NEU_INSET_ERROR,
  GLASS_SURFACE,
};

export const DARK_RECIPES: SurfaceRecipes = {
  POP_FILL: "#191C21",
  GLASS_BORDER: "1px solid rgba(255, 255, 255, 0.08)",
  NEU_FILL: "#1e222a",
  NEU_POP: {
    backgroundColor: "#20242c",
    backgroundImage: "none",
    border: "none",
    borderRadius: DIALOG_RADIUS,
    boxShadow: "9px 9px 22px rgba(0, 0, 0, 0.60), -9px -9px 22px rgba(255, 255, 255, 0.05)",
  },
  FLAT_POP: {
    backgroundColor: "#191C21",
    backgroundImage: "none",
    border: "none",
    borderRadius: 0,
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.55)",
  },
  NEU_RAISED: {
    backgroundColor: "#1e222a",
    backgroundImage: "none",
    border: "none",
    borderRadius: 0,
    boxShadow: "6px 6px 14px rgba(0, 0, 0, 0.55), -6px -6px 14px rgba(255, 255, 255, 0.045)",
  },
  NEU_INSET:
    "inset 2px 2px 4.5px rgba(0, 0, 0, 0.55), inset -2px -2px 4.5px rgba(255, 255, 255, 0.05)",
  NEU_INSET_FOCUS:
    "inset 2.5px 2.5px 5.5px rgba(0, 0, 0, 0.62), inset -2.5px -2.5px 5.5px rgba(255, 255, 255, 0.06), inset 0 0 0 1.5px rgba(255, 92, 40, 0.5)",
  NEU_INSET_ERROR:
    "inset 2px 2px 4.5px rgba(0, 0, 0, 0.55), inset -2px -2px 4.5px rgba(255, 255, 255, 0.05), inset 0 0 0 1.5px rgba(240, 120, 98, 0.55)",
  GLASS_SURFACE: {
    background: "rgba(25, 28, 33, 0.5)",
    backdropFilter: "blur(28px) saturate(1.6)",
    WebkitBackdropFilter: "blur(28px) saturate(1.6)",
    border: "1px solid rgba(255, 255, 255, 0.14)",
    borderRadius: 0,
    boxShadow:
      "0 14px 42px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.10), inset 0 -1px 0 rgba(255, 255, 255, 0.04)",
  },
};

export const HIGH_CONTRAST_RECIPES: SurfaceRecipes = {
  POP_FILL: "#FFFFFF",
  GLASS_BORDER: "1px solid #000000",
  NEU_FILL: "#FFFFFF",
  NEU_POP: {
    backgroundColor: "#FFFFFF",
    backgroundImage: "none",
    border: "2px solid #000000",
    borderRadius: DIALOG_RADIUS,
    boxShadow: "none",
  },
  FLAT_POP: {
    backgroundColor: "#FFFFFF",
    backgroundImage: "none",
    border: "2px solid #000000",
    borderRadius: 0,
    boxShadow: "none",
  },
  NEU_RAISED: {
    backgroundColor: "#FFFFFF",
    backgroundImage: "none",
    border: "2px solid #000000",
    borderRadius: 0,
    boxShadow: "none",
  },
  NEU_INSET: "inset 0 0 0 2px #000000",
  NEU_INSET_FOCUS: "inset 0 0 0 3px #C93A00",
  NEU_INSET_ERROR: "inset 0 0 0 3px #A31226",
  GLASS_SURFACE: {
    background: "#FFFFFF",
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
    border: "2px solid #000000",
    borderRadius: 0,
    boxShadow: "none",
  },
};

/** Surface recipes for a scheme — the theme factory resolves through this. */
export function recipesFor(scheme: SchemeName): SurfaceRecipes {
  if (scheme === "dark") return DARK_RECIPES;
  if (scheme === "highContrast") return HIGH_CONTRAST_RECIPES;
  return LIGHT_RECIPES;
}

/** The three layers, by name. `flat` is intentionally minimal (square canvas). */
export type SurfaceLayer = "flat" | "soft" | "glass" | "clearGlass" | "headingGlass";
export const LAYERS: Record<SurfaceLayer, Record<string, unknown>> = {
  flat: { borderRadius: 0 },
  soft: NEU_RAISED,
  glass: GLASS_SURFACE,
  clearGlass: CLEAR_GLASS_SURFACE,
  headingGlass: HEADING_GLASS_SURFACE,
};

/** Elevation ladder — depth-encodes-importance as numeric levels: 0 = flat
 *  (Layer 1) · 1–2 = neumorphic (Layer 2) · 3 = glass (Layer 3). Values are the
 *  box-shadow strings the recipes already use, exposed as one ordered scale. */
export const ELEVATION = {
  0: "none",
  1: NEU_RAISED.boxShadow,
  2: NEU_POP.boxShadow,
  3: GLASS_SURFACE.boxShadow,
} as const;

/** The token bundle, handy for a one-shot import. */
export const tokens = {
  colors,
  RADIUS,
  BUTTON_RADIUS,
  DOCK_PILL_RADIUS,
  DIALOG_RADIUS,
  FONT_FAMILY,
  SPACING,
  SPACING_UNIT,
  BREAKPOINTS,
  Z_INDEX,
  OPACITY,
  MOTION,
  ELEVATION,
} as const;
