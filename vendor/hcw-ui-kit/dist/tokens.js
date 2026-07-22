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
/** Brand palette. Radiant Orange is the single accent: **fills** (CTAs, chips,
 *  brand marks — with `onAccent` ink) and **active/hover tints** on chrome glyphs
 *  (taskbar, docks, tab rules). Body copy and links use slate (`supportInfo`),
 *  never the accent. */
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
};
/** Dark scheme — brand-consistent inversion (Coal canvas, lifted accent for AA on
 *  dark). **Scaffold status:** palette-complete; the neumorphic/glass RECIPES below
 *  remain light-tuned, so dark is preview-grade until recipes gain dark variants. */
export const DARK_SCHEME = {
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
};
/** High-contrast scheme (light HC) — pure grounds, full-strength borders, darkened
 *  accent so white-on-accent text holds ≥4.5:1. Scaffold status as above. */
export const HIGH_CONTRAST_SCHEME = {
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
};
/** All schemes by name — the theme factory resolves from here. */
export const SCHEMES = {
    light: colors,
    dark: DARK_SCHEME,
    highContrast: HIGH_CONTRAST_SCHEME,
};
/** Categorical data-viz hues — canvas/SVG marker + series colours (CAD takeoff
 *  markers, chart series). Kit-owned so diagram palettes stop hardcoding hex
 *  (Token Governance §7). Values match the shipped marker palette.
 *  `orange` here is a **series** hue (`#FF832B`), not the brand accent
 *  (`colors.accent` / Radiant Orange `#FF4F18`). Never use `DATA_VIZ` for CTAs. */
export const DATA_VIZ = {
    blue: "#0F62FE",
    cyan: "#1192E8",
    green: "#24A148",
    purple: "#8A3FFC",
    violet: "#A56EFF",
    orange: "#FF832B",
    gray: "#525252",
};
/**
 * Ordered categorical series for charts. Prefer this over
 * `Object.values(DATA_VIZ)` so series order stays stable across builds.
 * Viz hues are never CTAs — brand accent stays Radiant Orange.
 */
export const DATA_VIZ_CATEGORICAL = [
    DATA_VIZ.blue,
    DATA_VIZ.cyan,
    DATA_VIZ.green,
    DATA_VIZ.orange,
    DATA_VIZ.purple,
    DATA_VIZ.violet,
    DATA_VIZ.gray,
];
/**
 * Sequential intensity ramp (single-hue) — heatmaps, choropleths, continuous
 * magnitudes. Low → high. Never use brand accent as the ramp.
 */
export const DATA_VIZ_SEQUENTIAL = [
    "#D0E2FF",
    "#A6C8FF",
    "#78A9FF",
    "#4589FF",
    DATA_VIZ.blue,
    "#0043CE",
    "#002D9C",
];
/**
 * Diverging ramp — polarity / delta charts (negative ← neutral → positive).
 * Ends align with support error/success; mid is categorical gray. Not CTAs.
 */
export const DATA_VIZ_DIVERGING = [
    "#A2191F",
    "#FA4D56",
    "#FFB3B8",
    DATA_VIZ.gray,
    "#A7F0BA",
    DATA_VIZ.green,
    "#0E6027",
];
/**
 * Semantic roles for KPI deltas, sparkline polarity, and alert series — map
 * meaning first, then colour (pair with {@link CHART_MARKERS} for WCAG 1.4.1).
 */
export const DATA_VIZ_SEMANTIC = {
    positive: colors.supportSuccess,
    negative: colors.supportError,
    caution: colors.supportWarning,
    neutral: DATA_VIZ.gray,
    info: colors.supportInfo,
};
/** Evenly sample a closed ramp into `n` colours (n=1 → mid step). */
export function sampleColorRamp(ramp, n) {
    if (n <= 0)
        return [];
    if (n === 1)
        return [ramp[Math.floor(ramp.length / 2)]];
    if (n >= ramp.length) {
        const out = [];
        for (let i = 0; i < n; i++)
            out.push(ramp[i % ramp.length]);
        return out;
    }
    const out = [];
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        out.push(ramp[Math.round(t * (ramp.length - 1))]);
    }
    return out;
}
/** First `n` chart series colours, cycling the categorical ladder. */
export function chartSeriesColors(n) {
    if (n <= 0)
        return [];
    const out = [];
    for (let i = 0; i < n; i++) {
        out.push(DATA_VIZ_CATEGORICAL[i % DATA_VIZ_CATEGORICAL.length]);
    }
    return out;
}
/** Categorical colour at index (stable, wraps). */
export function chartColorAt(index) {
    const i = ((index % DATA_VIZ_CATEGORICAL.length) + DATA_VIZ_CATEGORICAL.length) % DATA_VIZ_CATEGORICAL.length;
    return DATA_VIZ_CATEGORICAL[i];
}
/** Sequential intensity colours for `n` bins. */
export function sequentialColors(n) {
    return sampleColorRamp(DATA_VIZ_SEQUENTIAL, n);
}
/** Diverging polarity colours for `n` bins (odd n keeps a true mid). */
export function divergingColors(n) {
    return sampleColorRamp(DATA_VIZ_DIVERGING, n);
}
/** Palette picker — categorical cycles; sequential/diverging sample their ramps. */
export function chartPalette(kind, n) {
    if (kind === "categorical")
        return chartSeriesColors(n);
    if (kind === "sequential")
        return sequentialColors(n);
    return divergingColors(n);
}
/** Area / band fill from a series stroke — translucent, scheme-safe via hex. */
export function chartAreaFill(stroke, alpha = 0.16) {
    return hexToRgba(stroke, alpha);
}
/**
 * Enterprise density targets — WCAG touch targets and compact chrome heights.
 *
 * Prefer {@link densityFor} when wiring theme/control heights; use
 * {@link chromeIconSx} for persistent-chrome icons (44 default; 48 under
 * `[data-hcw-coga="calm"]`).
 */
export const DENSITY = {
    /** Minimum interactive target (WCAG 2.5.5 / persistent chrome). */
    touchTarget: 44,
    /** Compact control (taskbar chips, dense toolbars, `density="compact"`). */
    controlCompact: 38,
    /** Default / comfortable control · tab row height. */
    control: 40,
};
/**
 * Resolved control metrics for a density mode. `createAormsTheme({ density })`
 * and list/table chrome consume these — do not invent px heights at call sites.
 * Pass `coga: "calm"` to raise interactive floors to {@link COGA.calmTargetMinPx}.
 */
export function densityFor(mode = "comfortable", coga = "default") {
    const compact = mode === "compact";
    const floor = coga === "calm" ? COGA.calmTargetMinPx : 0;
    const lift = (n) => Math.max(n, floor);
    return {
        mode,
        /** Generic control / tab height. */
        control: lift(compact ? 32 : DENSITY.control),
        /** Contained/text button min-height. */
        button: lift(compact ? 32 : 36),
        /** Text field / outlined input min-height. */
        input: lift(compact ? 32 : DENSITY.control),
        /** List item / menu item min-height. */
        listItem: lift(compact ? 32 : DENSITY.control),
        tab: lift(compact ? 32 : DENSITY.control),
        menuItem: lift(compact ? 32 : DENSITY.control),
        /** Table cell vertical padding (`theme.spacing` units). */
        tableCellPy: compact ? 0.5 : 1,
        chip: compact && coga !== "calm" ? 22 : coga === "calm" ? 32 : 28,
        dataGridRow: lift(compact ? 36 : 48),
        /**
         * In-content IconButton size. Persistent chrome (taskbar/ribbon) uses
         * {@link chromeIconSx} — 44 by default, 48 under COGA calm via
         * `[data-hcw-coga="calm"]`.
         */
        iconButton: lift(compact ? 32 : DENSITY.controlCompact),
    };
}
/** Status hues for StatusDot/StatusTag — canonical kit-owned values (supersede the
 *  frozen `--cds-tag-*` compat layer for new code). */
export const STATUS_COLORS = {
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
 *  unaffected. `theme.spacing(1)` = 8px. Use `SPACING.*` instead of magic px.
 *  Ladder aligns with productive enterprise density steps
 *  (2/4/8/12/16/24/32/40/48/64) while keeping HCW names. */
export const SPACING_UNIT = 8;
export const SPACING = {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    /** Dense stack / chip gap — Carbon `$spacing-04`. */
    compact: 12,
    md: 16,
    lg: 24,
    xl: 32,
    /** Section separation — Carbon `$spacing-08`. */
    section: 40,
    xxl: 48,
    xxxl: 64,
};
/** Responsive breakpoints (px). Mirror MUI defaults; `md: 900` is the rail
 *  stack/unstack line used across the workspace + marketing shells. */
export const BREAKPOINTS = { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 };
/**
 * Layout / grid organisation — shell gutters, margins, and proportions as HCW
 * tokens. **Grid is 12-column.** Fluid workspace rails may use `railFraction`;
 * kit `GlassRail` uses fixed `railWidth` for portal/auth shells.
 */
export const LAYOUT = {
    columns: 12,
    gutter: SPACING.md,
    margin: SPACING.md,
    railWidth: 240,
    railWidthCollapsed: 56,
    railFraction: 0.2,
    stageFraction: 0.8,
    /** theme.spacing multipliers for GlassRail / stage padding. */
    railPadding: 2,
    stagePaddingXs: 2,
    stagePaddingMd: 3,
    stagePaddingBottomXs: 4,
    stagePaddingBottomMd: 6,
    contentMaxWidth: 1280,
    taskbarHeight: 56,
    dockClearance: SPACING.md,
};
/**
 * Working-memory capacity caps (Cowan ~4±1 chunks — tighter than Miller 7±2).
 * UI surfaces must not exceed these without progressive disclosure. Audits and
 * primitives (`ToastHost`, `AwarenessStrip`, dock, `KpiStrip`, DecisionCard) enforce
 * where possible.
 */
export const CAPACITY = {
    workingMemoryChunks: 4,
    railObjectives: 5,
    dockVisibleActions: 5,
    kpiStrip: 4,
    trustChips: 4,
    openLoops: 3,
    toastStack: 2,
    /** Endsley SA lines: state · meaning · next. */
    awarenessLines: 3,
    /** DecisionCard alternatives (Hick) — progressive disclosure beyond this. */
    decisionAlternatives: 3,
};
/**
 * Interruption budget (Bailey / Iqbal notification-cost research).
 * Glass/alerts are scarce; toasts never flood. Error toasts may assert; ambient
 * motion is capped at one “needs you” signal.
 */
export const INTERRUPTION = {
    maxConcurrentToasts: CAPACITY.toastStack,
    dedupeMs: 4000,
    defaultTtlMs: 6000,
    errorTtlMs: 8000,
    maxAmbientMotion: 1,
};
/**
 * Cognitive accessibility extras (W3C COGA) beyond WCAG 2.2 AA.
 * `calm` mode: larger targets, one type step up, reduced secondary chrome.
 * Wire via `KitRoot({ coga: "calm" })` / `createHcwTheme({ coga: "calm" })`.
 */
export const COGA = {
    targetMinPx: 44,
    calmTargetMinPx: 48,
    /** Bump dense type one step when calm mode is on (caption→label, etc.). */
    calmTypeStep: 1,
};
/**
 * AI trust calibration (Lee & See) — ESTI / orchestration copy grammar.
 * Overconfident success theatre is banned; judgment is the only interrupt cue.
 */
export const TRUST = {
    assumptionChipLabel: "Assumption",
    judgmentNeedsLabel: "Needs your judgment",
    /** Confidence is shown as a band/word, never a false-precision percent alone. */
    preferConfidenceBand: true,
};
/**
 * Preattentive status shapes (Treisman / Ware) — colour alone is never enough
 * for urgency (WCAG 1.4.1). Pair with {@link StatusDot} `shape` or HealthGlassOrb.
 */
export const STATUS_SHAPE = {
    ok: "circle",
    watch: "triangle",
    critical: "square",
    inactive: "circle",
};
/** Z-index ladder — one stack order for every floating surface, mirroring MUI's
 *  ladder so themed MUI overlays and HCW chrome (rail · dock · footer) never fight. */
export const Z_INDEX = {
    base: 0, rail: 5, stickyHeader: 10, fab: 1050, appBar: 1100, drawer: 1200,
    actionDock: 1250, dialog: 1300, toast: 1400, tooltip: 1500,
};
/** Opacity scale — the only sanctioned alpha steps for UI state. */
export const OPACITY = {
    disabled: 0.45, muted: 0.6, hoverWash: 0.04, selectedWash: 0.14,
};
/**
 * Type scale — productive hierarchy (Carbon density inspiration) in HCW names.
 * Dense telemetry (`micro`/`caption`/`label`) sits beside body; `kpi`/`subtitle`/
 * `heading`/`display` cover stage readouts and page titles. Theme typography
 * sizes are wired from this ladder — do not invent rem sizes at call sites.
 * Icon `fontSize` on icon components is geometry, not typography (KB R1).
 */
export const TYPE_SCALE = {
    micro: "0.65rem",
    caption: "0.75rem",
    /** Compact UI label (taskbar, dense controls) — ~13px. */
    label: "0.8125rem",
    body2: "0.875rem",
    body: "1rem",
    kpi: "1.1rem",
    subtitle: "1.25rem",
    heading: "1.75rem",
    display: "2.625rem",
};
const TYPE_LADDER = [
    "micro",
    "caption",
    "label",
    "body2",
    "body",
    "kpi",
    "subtitle",
    "heading",
    "display",
];
/**
 * Resolved COGA metrics. Calm raises interactive floors and bumps type one step
 * on the {@link TYPE_SCALE} ladder.
 */
export function cogaFor(mode = "default") {
    const calm = mode === "calm";
    const bump = (key) => {
        if (!calm)
            return TYPE_SCALE[key];
        const i = TYPE_LADDER.indexOf(key);
        const nextIdx = Math.min(i + COGA.calmTypeStep, TYPE_LADDER.length - 1);
        const next = TYPE_LADDER[nextIdx] ?? key;
        return TYPE_SCALE[next];
    };
    return {
        mode,
        targetMinPx: calm ? COGA.calmTargetMinPx : COGA.targetMinPx,
        type: {
            micro: bump("micro"),
            caption: bump("caption"),
            label: bump("label"),
            body2: bump("body2"),
            body: bump("body"),
            kpi: bump("kpi"),
            subtitle: bump("subtitle"),
            heading: bump("heading"),
            display: bump("display"),
        },
    };
}
/** Motion tokens — durations (ms) + easings. `fast`/`base` match the 130–200ms
 *  used across the theme. Always gate transforms behind {@link REDUCE_MOTION}. */
export const MOTION = {
    duration: { instant: 80, fast: 130, base: 200, slow: 320 },
    easing: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        emphasized: "cubic-bezier(0.3, 0, 0, 1)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
    },
};
/** Brand font — Urbanist (OFL, self-hosted via @fontsource; works offline).
 *  Consumers import the weights they need (see README) and this stack is applied
 *  by the theme + as the `--esti-font-sans` custom property. */
export const FONT_FAMILY = "'Urbanist', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
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
};
/** MENUS / popovers / autocomplete — flat white with a soft ambient shadow. */
export const FLAT_POP = {
    backgroundColor: "#ffffff",
    backgroundImage: "none",
    border: "none",
    borderRadius: 0,
    boxShadow: "0 8px 24px rgba(20, 21, 23, 0.14)",
};
// ── Flat text buttons ─────────────────────────────────────────────────────────
export const BTN_LIFT = "translateY(-2px)"; // hover float
/** Parse `#RGB` / `#RRGGBB` into `rgba(r,g,b,alpha)`. Used so accent washes follow
 *  the active scheme instead of baking light-scheme hex into recipes. */
export function hexToRgba(hex, alpha) {
    const raw = hex.replace("#", "").trim();
    const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
    const n = Number.parseInt(full, 16);
    if (!Number.isFinite(n) || full.length !== 6) {
        throw new Error(`hexToRgba: expected #RRGGBB, got ${hex}`);
    }
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
/** Hover bottom underline in the given accent (scheme-aware). */
export function underlineAccent(accent = colors.accent) {
    return `inset 0 -2px 0 0 ${accent}`;
}
/** Translucent accent wash (selected toggles, etc.) — scheme-aware. */
export function glassAccentWash(accent = colors.accent, alpha = 0.3) {
    return hexToRgba(accent, alpha);
}
/** Light-scheme defaults — prefer `underlineAccent(scheme.accent)` when scheme-aware. */
export const UNDERLINE_ORANGE = underlineAccent(colors.accent);
export const UNDERLINE_RED = underlineAccent(colors.supportError);
export const GLASS_ORANGE_30 = glassAccentWash(colors.accent, 0.3);
// ── Motion & focus (accessibility) ─────────────────────────────────────────────
/** Media-query key that matches when the OS "reduce motion" preference is on.
 *  Gate every transform/lift behind it so users who ask for calm keep the colour +
 *  shadow cues but lose the movement (WCAG 2.3.3). Usable as an sx / styleOverride
 *  object key: `{ [REDUCE_MOTION]: { transition: "none" } }`. */
export const REDUCE_MOTION = "@media (prefers-reduced-motion: reduce)";
/** Keyboard focus ring — scheme-aware. Applied on `:focus-visible` so keyboard
 *  users get the same "this is actionable" signal a mouse user gets on hover,
 *  without showing a ring on plain mouse clicks. */
export function focusRingFor(accent = colors.accent) {
    return {
        outline: `2px solid ${accent}`,
        outlineOffset: "2px",
    };
}
/** Light-scheme default — prefer `focusRingFor(scheme.accent)` when scheme-aware. */
export const FOCUS_RING = focusRingFor(colors.accent);
// ── Neumorphic recessed inputs (text-entry wells) ──────────────────────────────
export const NEU_FILL = "#eceef2";
export const NEU_INSET = "inset 2px 2px 4.5px rgba(20, 21, 23, 0.16), inset -2px -2px 4.5px rgba(255, 255, 255, 0.92)";
export const NEU_INSET_FOCUS = `inset 2.5px 2.5px 5.5px rgba(20, 21, 23, 0.20), inset -2.5px -2.5px 5.5px rgba(255, 255, 255, 0.95), inset 0 0 0 1.5px ${hexToRgba(colors.accent, 0.45)}`;
export const NEU_INSET_ERROR = `inset 2px 2px 4.5px rgba(20, 21, 23, 0.16), inset -2px -2px 4.5px rgba(255, 255, 255, 0.92), inset 0 0 0 1.5px ${hexToRgba(colors.supportError, 0.55)}`;
export const NEU_INPUT_RADIUS = 0;
/** Dropdowns (Select) — FLAT at rest, button-like on hover (white box + accent line). */
export function ddFlatFor(scheme = colors) {
    return {
        backgroundColor: "transparent",
        boxShadow: "none",
        border: "1px solid transparent",
        transition: "background 130ms ease, box-shadow 130ms ease, border-color 130ms ease",
        "&:hover": {
            backgroundColor: scheme.layer01,
            borderColor: scheme.borderSubtle,
            boxShadow: underlineAccent(scheme.accent),
        },
        "&.Mui-focused": {
            backgroundColor: scheme.layer01,
            border: `1px solid ${scheme.accent}`,
            boxShadow: "none",
        },
        "&.Mui-error": { borderColor: hexToRgba(scheme.supportError, 0.7) },
        "&.Mui-disabled": { boxShadow: "none", opacity: 0.6 },
    };
}
/** Light-scheme default — prefer `ddFlatFor(scheme)` when scheme-aware. */
export const DD_FLAT = ddFlatFor(colors);
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
};
/** ActionDock floating tray — neumorphic raised capsule (Layer 2 shell for dock buttons). */
export const ACTION_DOCK_TRAY = {
    ...NEU_RAISED,
    borderRadius: DOCK_PILL_RADIUS,
};
/** Recessed groove — vertical zone separator inside NEU_RAISED / ActionDock tray. */
export const NEU_GROOVE_VERTICAL = {
    width: "2px",
    alignSelf: "stretch",
    my: 0.5,
    flexShrink: 0,
    borderRadius: "1px",
    background: "transparent",
    boxShadow: "inset 1px 0 rgba(20, 21, 23, 0.15), inset -1px 0 rgba(255, 255, 255, 0.82)",
};
/** Recessed groove — horizontal separator on soft / clear-glass surfaces. */
export const NEU_GROOVE_HORIZONTAL = {
    height: "2px",
    width: "100%",
    flexShrink: 0,
    borderRadius: "1px",
    background: "transparent",
    boxShadow: "inset 0 1px 0 rgba(20, 21, 23, 0.12), inset 0 -1px 0 rgba(255, 255, 255, 0.72)",
};
// Layer 3 GLASS (glassmorphism) — the live, floating layer: hover, CTAs, the
// action dock, priority alerts, active widgets. Translucent frosted glass that
// visibly lifts above everything and pulls the eye. Reserved for what's actionable.
export const GLASS_SURFACE = {
    background: "rgba(255, 255, 255, 0.36)",
    backdropFilter: "blur(28px) saturate(1.85)",
    WebkitBackdropFilter: "blur(28px) saturate(1.85)",
    border: "1px solid rgba(255, 255, 255, 0.48)",
    borderRadius: 0,
    boxShadow: "0 14px 42px rgba(20, 21, 23, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.62), inset 0 -1px 0 rgba(255, 255, 255, 0.18)",
};
/**
 * Layer 3 variant — **liquid glass** for ActionDock buttons on hover/focus.
 * Crystal-clear frosted pill: gradient wash, high saturate blur, specular inset edges.
 * Flat pill at rest; liquid-glass capsule on hover/focus (`DOCK_PILL_RADIUS`).
 * Accent glow tracks the scheme accent (not a baked light-scheme hex).
 */
export function liquidGlassButtonFor(accent = colors.accent) {
    return {
        background: "linear-gradient(165deg, rgba(255, 255, 255, 0.58) 0%, rgba(255, 255, 255, 0.18) 45%, rgba(255, 255, 255, 0.42) 100%)",
        backdropFilter: "blur(36px) saturate(2.25) brightness(1.14)",
        WebkitBackdropFilter: "blur(36px) saturate(2.25) brightness(1.14)",
        border: "1px solid rgba(255, 255, 255, 0.72)",
        borderRadius: DOCK_PILL_RADIUS,
        boxShadow: `0 12px 36px rgba(20, 21, 23, 0.11), 0 2px 10px ${hexToRgba(accent, 0.07)}, inset 0 1.5px 0 rgba(255, 255, 255, 0.92), inset 0 -1px 0 rgba(255, 255, 255, 0.28)`,
    };
}
/** Light-scheme default — prefer `liquidGlassButtonFor(scheme.accent)` when scheme-aware. */
export const LIQUID_GLASS_BUTTON = liquidGlassButtonFor(colors.accent);
/** ActionDock button hover/focus lift. */
export const DOCK_BUTTON_LIFT = "translateY(-3px)";
/**
 * Layer 3 variant — **clear glass** (marketing rail / section heading bands).
 * More translucent than `GLASS_SURFACE` so atmosphere (contours) stays readable.
 * Do **not** use on dense sub-cards — flat/transparent + hairlines instead.
 */
export const CLEAR_GLASS_SURFACE = {
    background: "linear-gradient(175deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 48%, rgba(255, 255, 255, 0.09) 100%)",
    backdropFilter: "blur(26px) saturate(1.7) brightness(1.08)",
    WebkitBackdropFilter: "blur(26px) saturate(1.7) brightness(1.08)",
    border: "1px solid rgba(255, 255, 255, 0.38)",
    borderRadius: 0,
    boxShadow: "6px 0 32px rgba(20, 21, 23, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.55), inset 1px 0 0 rgba(255, 255, 255, 0.28)",
};
/**
 * SectionDock chips — clear liquid glass pills (marketing section carousel).
 * Translucent gradient + specular inset edges; pair with `MARKETING_DOCK_RADIUS`.
 */
export const SECTION_DOCK_CHIP_GLASS = {
    background: "linear-gradient(175deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.07) 48%, rgba(255, 255, 255, 0.18) 100%)",
    backdropFilter: "blur(28px) saturate(1.85) brightness(1.1)",
    WebkitBackdropFilter: "blur(28px) saturate(1.85) brightness(1.1)",
    border: "1px solid rgba(255, 255, 255, 0.58)",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.72), inset 0 -1px 0 rgba(255, 255, 255, 0.24), 0 4px 14px rgba(20, 21, 23, 0.06)",
};
/**
 * Layer 3 variant — **heading glass** (full-width section openers on marketing).
 * Same clear recipe, stronger top edge; pairs with accent left rule in CSS.
 */
export const HEADING_GLASS_SURFACE = {
    background: "linear-gradient(155deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.06) 55%, rgba(255, 255, 255, 0.10) 100%)",
    backdropFilter: "blur(22px) saturate(1.55) brightness(1.06)",
    WebkitBackdropFilter: "blur(22px) saturate(1.55) brightness(1.06)",
    borderTop: "1px solid rgba(255, 255, 255, 0.55)",
    borderRight: "1px solid rgba(20, 21, 23, 0.06)",
    borderBottom: "1px solid rgba(20, 21, 23, 0.08)",
    borderLeft: `4px solid ${colors.accent}`,
    borderRadius: 0,
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 8px 24px rgba(20, 21, 23, 0.04)",
};
const LIGHT_RECIPES = {
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
export const DARK_RECIPES = {
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
    NEU_INSET: "inset 2px 2px 4.5px rgba(0, 0, 0, 0.55), inset -2px -2px 4.5px rgba(255, 255, 255, 0.05)",
    NEU_INSET_FOCUS: `inset 2.5px 2.5px 5.5px rgba(0, 0, 0, 0.62), inset -2.5px -2.5px 5.5px rgba(255, 255, 255, 0.06), inset 0 0 0 1.5px ${hexToRgba(DARK_SCHEME.accent, 0.5)}`,
    NEU_INSET_ERROR: `inset 2px 2px 4.5px rgba(0, 0, 0, 0.55), inset -2px -2px 4.5px rgba(255, 255, 255, 0.05), inset 0 0 0 1.5px ${hexToRgba(DARK_SCHEME.supportError, 0.55)}`,
    GLASS_SURFACE: {
        background: "rgba(25, 28, 33, 0.5)",
        backdropFilter: "blur(28px) saturate(1.6)",
        WebkitBackdropFilter: "blur(28px) saturate(1.6)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        borderRadius: 0,
        boxShadow: "0 14px 42px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.10), inset 0 -1px 0 rgba(255, 255, 255, 0.04)",
    },
};
export const HIGH_CONTRAST_RECIPES = {
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
    NEU_INSET_FOCUS: `inset 0 0 0 3px ${HIGH_CONTRAST_SCHEME.accent}`,
    NEU_INSET_ERROR: `inset 0 0 0 3px ${HIGH_CONTRAST_SCHEME.supportError}`,
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
export function recipesFor(scheme) {
    if (scheme === "dark")
        return DARK_RECIPES;
    if (scheme === "highContrast")
        return HIGH_CONTRAST_RECIPES;
    return LIGHT_RECIPES;
}
export const LAYERS = {
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
};
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
    LAYOUT,
    DENSITY,
    DATA_VIZ,
    DATA_VIZ_CATEGORICAL,
    DATA_VIZ_SEQUENTIAL,
    DATA_VIZ_DIVERGING,
    DATA_VIZ_SEMANTIC,
    CAPACITY,
    INTERRUPTION,
    COGA,
    TRUST,
    STATUS_SHAPE,
    BREAKPOINTS,
    Z_INDEX,
    OPACITY,
    TYPE_SCALE,
    MOTION,
    ELEVATION,
};
//# sourceMappingURL=tokens.js.map