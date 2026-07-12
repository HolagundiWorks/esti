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
export declare const colors: {
    readonly background: "#F2F4F7";
    readonly layer01: "#FFFFFF";
    readonly layer02: "#E7EAF0";
    readonly borderSubtle: "rgba(20, 21, 23, 0.10)";
    readonly borderStrong: "rgba(20, 21, 23, 0.20)";
    readonly textPrimary: "#141517";
    readonly textSecondary: "#5b616b";
    readonly textHelper: "#667085";
    readonly textOnColor: "#FFFFFF";
    readonly ink: "#141517";
    readonly onAccent: "#FFFFFF";
    readonly accent: "#FF4F18";
    readonly accentSoft: "rgba(255, 79, 24, 0.14)";
    readonly accentDark: "#DB3E0F";
    readonly hoverSoft: "rgba(20, 21, 23, 0.04)";
    readonly supportSuccess: "#1B7F5A";
    readonly supportWarning: "#FF9932";
    readonly supportError: "#C8442E";
    readonly supportInfo: "#3B5568";
};
/** A scheme carries every semantic colour role. `colors` above IS the light scheme
 *  (kept as the default export shape for full backward compatibility). */
export type ColorScheme = Record<keyof typeof colors, string>;
export type SchemeName = "light" | "dark" | "highContrast";
/** Dark scheme — brand-consistent inversion (Coal canvas, lifted accent for AA on
 *  dark). **Scaffold status:** palette-complete; the neumorphic/glass RECIPES below
 *  remain light-tuned, so dark is preview-grade until recipes gain dark variants. */
export declare const DARK_SCHEME: ColorScheme;
/** High-contrast scheme (light HC) — pure grounds, full-strength borders, darkened
 *  accent so white-on-accent text holds ≥4.5:1. Scaffold status as above. */
export declare const HIGH_CONTRAST_SCHEME: ColorScheme;
/** All schemes by name — the theme factory resolves from here. */
export declare const SCHEMES: Record<SchemeName, ColorScheme>;
/** Categorical data-viz hues — canvas/SVG marker + series colours (CAD takeoff
 *  markers, chart series). Kit-owned so diagram palettes stop hardcoding hex
 *  (Token Governance §7). Values match the shipped marker palette. */
export declare const DATA_VIZ: {
    readonly blue: "#0F62FE";
    readonly cyan: "#1192E8";
    readonly green: "#24A148";
    readonly purple: "#8A3FFC";
    readonly violet: "#A56EFF";
    readonly orange: "#FF832B";
    readonly gray: "#525252";
};
/** Status hues for StatusDot/StatusTag — canonical kit-owned values (supersede the
 *  frozen `--cds-tag-*` compat layer for new code). */
export declare const STATUS_COLORS: Record<string, string>;
/** Surface / panel / input corner radius — square everywhere (0). */
export declare const RADIUS = 0;
/** Buttons (MuiButton) — rounded workspace controls. */
export declare const BUTTON_RADIUS = 4;
/** ActionDock tray + dock buttons — full capsule pill (not square NEU_RAISED). */
export declare const DOCK_PILL_RADIUS = 9999;
/** Dialogs (MuiDialog paper) — the only rounded surface panel in the workspace. */
export declare const DIALOG_RADIUS = 8;
/** Marketing section carousel — rounded glass tray + chips (public landing only). */
export declare const MARKETING_DOCK_RADIUS = 12;
/** Selected tab accent — inset top rule (alert line), not a background fill. */
export declare const TAB_ALERT_WIDTH = 3;
/** Spacing base — 8px, matching MUI's default grid so existing layouts are
 *  unaffected. `theme.spacing(1)` = 8px. Use `SPACING.*` instead of magic px. */
export declare const SPACING_UNIT = 8;
export declare const SPACING: {
    readonly none: 0;
    readonly xxs: 2;
    readonly xs: 4;
    readonly sm: 8;
    readonly md: 16;
    readonly lg: 24;
    readonly xl: 32;
    readonly xxl: 48;
    readonly xxxl: 64;
};
/** Responsive breakpoints (px). Mirror MUI defaults; `md: 900` is the rail
 *  stack/unstack line used across the workspace + marketing shells. */
export declare const BREAKPOINTS: {
    readonly xs: 0;
    readonly sm: 600;
    readonly md: 900;
    readonly lg: 1200;
    readonly xl: 1536;
};
/** Z-index ladder — one stack order for every floating surface, mirroring MUI's
 *  ladder so themed MUI overlays and HCW chrome (rail · dock · footer) never fight. */
export declare const Z_INDEX: {
    readonly base: 0;
    readonly rail: 5;
    readonly stickyHeader: 10;
    readonly fab: 1050;
    readonly appBar: 1100;
    readonly drawer: 1200;
    readonly actionDock: 1250;
    readonly dialog: 1300;
    readonly toast: 1400;
    readonly tooltip: 1500;
};
/** Opacity scale — the only sanctioned alpha steps for UI state. */
export declare const OPACITY: {
    readonly disabled: 0.45;
    readonly muted: 0.6;
    readonly hoverWash: 0.04;
    readonly selectedWash: 0.14;
};
/** Type scale — the sanctioned font sizes BELOW/BESIDE the MUI variants, for the
 *  dense-telemetry cases (rail micro-labels, KPI values) that variants don't cover.
 *  Icon sizing via `fontSize` on icon components is geometry, not typography — it
 *  is exempt from this scale (see HCW-KIT-AI-KNOWLEDGE-BASE.md R1). */
export declare const TYPE_SCALE: {
    readonly micro: "0.65rem";
    readonly caption: "0.75rem";
    readonly body2: "0.875rem";
    readonly body: "1rem";
    readonly kpi: "1.1rem";
};
/** Motion tokens — durations (ms) + easings. `fast`/`base` match the 130–200ms
 *  used across the theme. Always gate transforms behind {@link REDUCE_MOTION}. */
export declare const MOTION: {
    readonly duration: {
        readonly instant: 80;
        readonly fast: 130;
        readonly base: 200;
        readonly slow: 320;
    };
    readonly easing: {
        readonly standard: "cubic-bezier(0.2, 0, 0, 1)";
        readonly emphasized: "cubic-bezier(0.3, 0, 0, 1)";
        readonly exit: "cubic-bezier(0.4, 0, 1, 1)";
    };
};
/** Brand font — Urbanist (OFL, self-hosted via @fontsource; works offline).
 *  Consumers import the weights they need (see README) and this stack is applied
 *  by the theme + as the `--esti-font-sans` custom property. */
export declare const FONT_FAMILY = "'Urbanist', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
/** Hairline edge for the few surfaces that keep an edge (drawer, app bar). */
export declare const GLASS_BORDER = "1px solid rgba(20, 21, 23, 0.08)";
export declare const GLASS_BLUR = "none";
export declare const GLASS_SHADOW = "none";
export declare const POP_FILL = "#FFFFFF";
/** DIALOGS — the one pop-over with the neumorphic extruded card. */
export declare const NEU_POP: {
    readonly backgroundColor: "#eceef2";
    readonly backgroundImage: "none";
    readonly border: "none";
    readonly borderRadius: 8;
    readonly boxShadow: "9px 9px 22px rgba(20, 21, 23, 0.18), -9px -9px 22px rgba(255, 255, 255, 0.92)";
};
/** MENUS / popovers / autocomplete — flat white with a soft ambient shadow. */
export declare const FLAT_POP: {
    readonly backgroundColor: "#ffffff";
    readonly backgroundImage: "none";
    readonly border: "none";
    readonly borderRadius: 0;
    readonly boxShadow: "0 8px 24px rgba(20, 21, 23, 0.14)";
};
export declare const BTN_LIFT = "translateY(-2px)";
export declare const UNDERLINE_ORANGE = "inset 0 -2px 0 0 #ff4f18";
export declare const UNDERLINE_RED = "inset 0 -2px 0 0 #c8442e";
export declare const GLASS_ORANGE_30 = "rgba(255, 79, 24, 0.30)";
/** Media-query key that matches when the OS "reduce motion" preference is on.
 *  Gate every transform/lift behind it so users who ask for calm keep the colour +
 *  shadow cues but lose the movement (WCAG 2.3.3). Usable as an sx / styleOverride
 *  object key: `{ [REDUCE_MOTION]: { transition: "none" } }`. */
export declare const REDUCE_MOTION = "@media (prefers-reduced-motion: reduce)";
/** Keyboard focus ring — the Radiant-Orange accent, offset off the control. Applied
 *  on `:focus-visible` so keyboard users get the same "this is actionable" signal a
 *  mouse user gets on hover, without showing a ring on plain mouse clicks. */
export declare const FOCUS_RING: {
    readonly outline: "2px solid #FF4F18";
    readonly outlineOffset: "2px";
};
export declare const NEU_FILL = "#eceef2";
export declare const NEU_INSET = "inset 2px 2px 4.5px rgba(20, 21, 23, 0.16), inset -2px -2px 4.5px rgba(255, 255, 255, 0.92)";
export declare const NEU_INSET_FOCUS = "inset 2.5px 2.5px 5.5px rgba(20, 21, 23, 0.20), inset -2.5px -2.5px 5.5px rgba(255, 255, 255, 0.95), inset 0 0 0 1.5px rgba(255, 79, 24, 0.45)";
export declare const NEU_INSET_ERROR = "inset 2px 2px 4.5px rgba(20, 21, 23, 0.16), inset -2px -2px 4.5px rgba(255, 255, 255, 0.92), inset 0 0 0 1.5px rgba(200, 68, 46, 0.55)";
export declare const NEU_INPUT_RADIUS = 0;
/** Dropdowns (Select) — FLAT at rest, button-like on hover (white box + orange line). */
export declare const DD_FLAT: {
    readonly backgroundColor: "transparent";
    readonly boxShadow: "none";
    readonly border: "1px solid transparent";
    readonly transition: "background 130ms ease, box-shadow 130ms ease, border-color 130ms ease";
    readonly "&:hover": {
        readonly backgroundColor: "#ffffff";
        readonly borderColor: "rgba(20, 21, 23, 0.10)";
        readonly boxShadow: "inset 0 -2px 0 0 #ff4f18";
    };
    readonly "&.Mui-focused": {
        readonly backgroundColor: "#ffffff";
        readonly border: "1px solid #FF4F18";
        readonly boxShadow: "none";
    };
    readonly "&.Mui-error": {
        readonly borderColor: "rgba(200, 68, 46, 0.7)";
    };
    readonly "&.Mui-disabled": {
        readonly boxShadow: "none";
        readonly opacity: 0.6;
    };
};
export declare const NEU_RAISED: {
    readonly backgroundColor: "#eceef2";
    readonly backgroundImage: "none";
    readonly border: "none";
    readonly borderRadius: 0;
    readonly boxShadow: "6px 6px 14px rgba(20, 21, 23, 0.16), -6px -6px 14px rgba(255, 255, 255, 0.92)";
};
/** ActionDock floating tray — neumorphic raised capsule (Layer 2 shell for dock buttons). */
export declare const ACTION_DOCK_TRAY: {
    readonly borderRadius: 9999;
    readonly backgroundColor: "#eceef2";
    readonly backgroundImage: "none";
    readonly border: "none";
    readonly boxShadow: "6px 6px 14px rgba(20, 21, 23, 0.16), -6px -6px 14px rgba(255, 255, 255, 0.92)";
};
/** Recessed groove — vertical zone separator inside NEU_RAISED / ActionDock tray. */
export declare const NEU_GROOVE_VERTICAL: {
    readonly width: "2px";
    readonly alignSelf: "stretch";
    readonly my: 0.5;
    readonly flexShrink: 0;
    readonly borderRadius: "1px";
    readonly background: "transparent";
    readonly boxShadow: "inset 1px 0 rgba(20, 21, 23, 0.15), inset -1px 0 rgba(255, 255, 255, 0.82)";
};
/** Recessed groove — horizontal separator on soft / clear-glass surfaces. */
export declare const NEU_GROOVE_HORIZONTAL: {
    readonly height: "2px";
    readonly width: "100%";
    readonly flexShrink: 0;
    readonly borderRadius: "1px";
    readonly background: "transparent";
    readonly boxShadow: "inset 0 1px 0 rgba(20, 21, 23, 0.12), inset 0 -1px 0 rgba(255, 255, 255, 0.72)";
};
export declare const GLASS_SURFACE: {
    readonly background: "rgba(255, 255, 255, 0.36)";
    readonly backdropFilter: "blur(28px) saturate(1.85)";
    readonly WebkitBackdropFilter: "blur(28px) saturate(1.85)";
    readonly border: "1px solid rgba(255, 255, 255, 0.48)";
    readonly borderRadius: 0;
    readonly boxShadow: "0 14px 42px rgba(20, 21, 23, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.62), inset 0 -1px 0 rgba(255, 255, 255, 0.18)";
};
/**
 * Layer 3 variant — **liquid glass** for ActionDock buttons on hover/focus.
 * Crystal-clear frosted pill: gradient wash, high saturate blur, specular inset edges.
 * Flat pill at rest; liquid-glass capsule on hover/focus (`DOCK_PILL_RADIUS`).
 */
export declare const LIQUID_GLASS_BUTTON: {
    readonly background: "linear-gradient(165deg, rgba(255, 255, 255, 0.58) 0%, rgba(255, 255, 255, 0.18) 45%, rgba(255, 255, 255, 0.42) 100%)";
    readonly backdropFilter: "blur(36px) saturate(2.25) brightness(1.14)";
    readonly WebkitBackdropFilter: "blur(36px) saturate(2.25) brightness(1.14)";
    readonly border: "1px solid rgba(255, 255, 255, 0.72)";
    readonly borderRadius: 9999;
    readonly boxShadow: "0 12px 36px rgba(20, 21, 23, 0.11), 0 2px 10px rgba(255, 79, 24, 0.07), inset 0 1.5px 0 rgba(255, 255, 255, 0.92), inset 0 -1px 0 rgba(255, 255, 255, 0.28)";
};
/** ActionDock button hover/focus lift. */
export declare const DOCK_BUTTON_LIFT = "translateY(-3px)";
/**
 * Layer 3 variant — **clear glass** (marketing rail / section heading bands).
 * More translucent than `GLASS_SURFACE` so atmosphere (contours) stays readable.
 * Do **not** use on dense sub-cards — flat/transparent + hairlines instead.
 */
export declare const CLEAR_GLASS_SURFACE: {
    readonly background: "linear-gradient(175deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 48%, rgba(255, 255, 255, 0.09) 100%)";
    readonly backdropFilter: "blur(26px) saturate(1.7) brightness(1.08)";
    readonly WebkitBackdropFilter: "blur(26px) saturate(1.7) brightness(1.08)";
    readonly border: "1px solid rgba(255, 255, 255, 0.38)";
    readonly borderRadius: 0;
    readonly boxShadow: "6px 0 32px rgba(20, 21, 23, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.55), inset 1px 0 0 rgba(255, 255, 255, 0.28)";
};
/**
 * SectionDock chips — clear liquid glass pills (marketing section carousel).
 * Translucent gradient + specular inset edges; pair with `MARKETING_DOCK_RADIUS`.
 */
export declare const SECTION_DOCK_CHIP_GLASS: {
    readonly background: "linear-gradient(175deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.07) 48%, rgba(255, 255, 255, 0.18) 100%)";
    readonly backdropFilter: "blur(28px) saturate(1.85) brightness(1.1)";
    readonly WebkitBackdropFilter: "blur(28px) saturate(1.85) brightness(1.1)";
    readonly border: "1px solid rgba(255, 255, 255, 0.58)";
    readonly boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.72), inset 0 -1px 0 rgba(255, 255, 255, 0.24), 0 4px 14px rgba(20, 21, 23, 0.06)";
};
/**
 * Layer 3 variant — **heading glass** (full-width section openers on marketing).
 * Same clear recipe, stronger top edge; pairs with accent left rule in CSS.
 */
export declare const HEADING_GLASS_SURFACE: {
    readonly background: "linear-gradient(155deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.06) 55%, rgba(255, 255, 255, 0.10) 100%)";
    readonly backdropFilter: "blur(22px) saturate(1.55) brightness(1.06)";
    readonly WebkitBackdropFilter: "blur(22px) saturate(1.55) brightness(1.06)";
    readonly borderTop: "1px solid rgba(255, 255, 255, 0.55)";
    readonly borderRight: "1px solid rgba(20, 21, 23, 0.06)";
    readonly borderBottom: "1px solid rgba(20, 21, 23, 0.08)";
    readonly borderLeft: "4px solid #FF4F18";
    readonly borderRadius: 0;
    readonly boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 8px 24px rgba(20, 21, 23, 0.04)";
};
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
export declare const DARK_RECIPES: SurfaceRecipes;
export declare const HIGH_CONTRAST_RECIPES: SurfaceRecipes;
/** Surface recipes for a scheme — the theme factory resolves through this. */
export declare function recipesFor(scheme: SchemeName): SurfaceRecipes;
/** The three layers, by name. `flat` is intentionally minimal (square canvas). */
export type SurfaceLayer = "flat" | "soft" | "glass" | "clearGlass" | "headingGlass";
export declare const LAYERS: Record<SurfaceLayer, Record<string, unknown>>;
/** Elevation ladder — depth-encodes-importance as numeric levels: 0 = flat
 *  (Layer 1) · 1–2 = neumorphic (Layer 2) · 3 = glass (Layer 3). Values are the
 *  box-shadow strings the recipes already use, exposed as one ordered scale. */
export declare const ELEVATION: {
    readonly 0: "none";
    readonly 1: "6px 6px 14px rgba(20, 21, 23, 0.16), -6px -6px 14px rgba(255, 255, 255, 0.92)";
    readonly 2: "9px 9px 22px rgba(20, 21, 23, 0.18), -9px -9px 22px rgba(255, 255, 255, 0.92)";
    readonly 3: "0 14px 42px rgba(20, 21, 23, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.62), inset 0 -1px 0 rgba(255, 255, 255, 0.18)";
};
/** The token bundle, handy for a one-shot import. */
export declare const tokens: {
    readonly colors: {
        readonly background: "#F2F4F7";
        readonly layer01: "#FFFFFF";
        readonly layer02: "#E7EAF0";
        readonly borderSubtle: "rgba(20, 21, 23, 0.10)";
        readonly borderStrong: "rgba(20, 21, 23, 0.20)";
        readonly textPrimary: "#141517";
        readonly textSecondary: "#5b616b";
        readonly textHelper: "#667085";
        readonly textOnColor: "#FFFFFF";
        readonly ink: "#141517";
        readonly onAccent: "#FFFFFF";
        readonly accent: "#FF4F18";
        readonly accentSoft: "rgba(255, 79, 24, 0.14)";
        readonly accentDark: "#DB3E0F";
        readonly hoverSoft: "rgba(20, 21, 23, 0.04)";
        readonly supportSuccess: "#1B7F5A";
        readonly supportWarning: "#FF9932";
        readonly supportError: "#C8442E";
        readonly supportInfo: "#3B5568";
    };
    readonly RADIUS: 0;
    readonly BUTTON_RADIUS: 4;
    readonly DOCK_PILL_RADIUS: 9999;
    readonly DIALOG_RADIUS: 8;
    readonly FONT_FAMILY: "'Urbanist', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
    readonly SPACING: {
        readonly none: 0;
        readonly xxs: 2;
        readonly xs: 4;
        readonly sm: 8;
        readonly md: 16;
        readonly lg: 24;
        readonly xl: 32;
        readonly xxl: 48;
        readonly xxxl: 64;
    };
    readonly SPACING_UNIT: 8;
    readonly BREAKPOINTS: {
        readonly xs: 0;
        readonly sm: 600;
        readonly md: 900;
        readonly lg: 1200;
        readonly xl: 1536;
    };
    readonly Z_INDEX: {
        readonly base: 0;
        readonly rail: 5;
        readonly stickyHeader: 10;
        readonly fab: 1050;
        readonly appBar: 1100;
        readonly drawer: 1200;
        readonly actionDock: 1250;
        readonly dialog: 1300;
        readonly toast: 1400;
        readonly tooltip: 1500;
    };
    readonly OPACITY: {
        readonly disabled: 0.45;
        readonly muted: 0.6;
        readonly hoverWash: 0.04;
        readonly selectedWash: 0.14;
    };
    readonly MOTION: {
        readonly duration: {
            readonly instant: 80;
            readonly fast: 130;
            readonly base: 200;
            readonly slow: 320;
        };
        readonly easing: {
            readonly standard: "cubic-bezier(0.2, 0, 0, 1)";
            readonly emphasized: "cubic-bezier(0.3, 0, 0, 1)";
            readonly exit: "cubic-bezier(0.4, 0, 1, 1)";
        };
    };
    readonly ELEVATION: {
        readonly 0: "none";
        readonly 1: "6px 6px 14px rgba(20, 21, 23, 0.16), -6px -6px 14px rgba(255, 255, 255, 0.92)";
        readonly 2: "9px 9px 22px rgba(20, 21, 23, 0.18), -9px -9px 22px rgba(255, 255, 255, 0.92)";
        readonly 3: "0 14px 42px rgba(20, 21, 23, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.62), inset 0 -1px 0 rgba(255, 255, 255, 0.18)";
    };
};
//# sourceMappingURL=tokens.d.ts.map