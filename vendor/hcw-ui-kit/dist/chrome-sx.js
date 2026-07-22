import { BUTTON_RADIUS, COGA, DOCK_PILL_RADIUS, colors, DOCK_BUTTON_LIFT, DENSITY, FOCUS_RING, LIQUID_GLASS_BUTTON, MARKETING_DOCK_RADIUS, REDUCE_MOTION, SECTION_DOCK_CHIP_GLASS, LAYOUT, TYPE_SCALE, hexToRgba, } from "./tokens.js";
/**
 * Persistent-chrome IconButton — taskbar, ribbon, rail utilities.
 * Default ≥44px (WCAG); under KitRoot `coga="calm"` expands to
 * {@link COGA.calmTargetMinPx} via `[data-hcw-coga="calm"]`.
 */
export function chromeIconSxFor(coga = "default") {
    const px = coga === "calm" ? COGA.calmTargetMinPx : DENSITY.touchTarget;
    return {
        width: px,
        height: px,
        borderRadius: BUTTON_RADIUS,
        color: colors.ink,
        "&:hover": { color: colors.accent, backgroundColor: colors.hoverSoft },
        "&:focus-visible": { ...FOCUS_RING, color: colors.accent },
        [REDUCE_MOTION]: { transition: "none" },
    };
}
/**
 * Default chrome icon recipe with calm CSS override when inside
 * `KitRoot({ coga: "calm" })` (`data-hcw-coga="calm"`).
 */
export const chromeIconSx = {
    width: DENSITY.touchTarget,
    height: DENSITY.touchTarget,
    borderRadius: BUTTON_RADIUS,
    color: colors.ink,
    "&:hover": { color: colors.accent, backgroundColor: colors.hoverSoft },
    "&:focus-visible": { ...FOCUS_RING, color: colors.accent },
    [REDUCE_MOTION]: { transition: "none" },
    '[data-hcw-coga="calm"] &': {
        width: COGA.calmTargetMinPx,
        height: COGA.calmTargetMinPx,
    },
};
/**
 * Type size that bumps one ladder step under COGA calm (via data attribute).
 * Prefer MUI Typography variants when the theme already carries calm metrics.
 */
export function typeScaleSx(key) {
    const ladder = [
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
    const i = ladder.indexOf(key);
    const calmKey = i >= 0 ? ladder[Math.min(i + COGA.calmTypeStep, ladder.length - 1)] : key;
    if (calmKey === key)
        return { fontSize: TYPE_SCALE[key] };
    return {
        fontSize: TYPE_SCALE[key],
        '[data-hcw-coga="calm"] &': { fontSize: TYPE_SCALE[calmKey] },
    };
}
/** ActionDock button — flat pill at rest, liquid-glass capsule on hover/focus. */
export function actionDockButtonSx(ink, opts) {
    const fw = opts?.fontWeight ?? 600;
    return {
        borderRadius: DOCK_PILL_RADIUS,
        color: ink,
        backgroundColor: "transparent",
        background: "transparent",
        border: "none",
        boxShadow: "none",
        minWidth: opts?.iconOnly ? 44 : 64,
        px: opts?.iconOnly ? 1.25 : 2,
        py: 1,
        fontWeight: fw,
        textTransform: "none",
        transition: "transform 130ms ease, box-shadow 130ms ease, background 130ms ease, border-color 130ms ease",
        "&:hover": {
            ...LIQUID_GLASS_BUTTON,
            color: ink,
            transform: DOCK_BUTTON_LIFT,
        },
        "&:focus-visible": {
            ...LIQUID_GLASS_BUTTON,
            ...FOCUS_RING,
            color: ink,
            transform: DOCK_BUTTON_LIFT,
        },
        "&.Mui-disabled": { opacity: 0.4 },
        [REDUCE_MOTION]: {
            transition: "none",
            "&:hover": { transform: "none" },
            "&:focus-visible": { transform: "none" },
        },
    };
}
/** SectionDock chip — clear liquid glass (marketing section carousel). */
export function sectionDockChipSx(active) {
    return {
        ...SECTION_DOCK_CHIP_GLASS,
        borderRadius: `${MARKETING_DOCK_RADIUS}px`,
        border: `1px solid ${active ? colors.accent : "rgba(255, 255, 255, 0.58)"}`,
        borderTopColor: active ? colors.accentDark : "rgba(255, 255, 255, 0.72)",
        color: active ? colors.accent : colors.ink,
        fontWeight: active ? 700 : 600,
        boxShadow: active
            ? `inset 0 1px 0 rgba(255, 255, 255, 0.75), inset 0 -1px 0 rgba(255, 255, 255, 0.28), 0 4px 16px ${hexToRgba(colors.accent, 0.14)}`
            : SECTION_DOCK_CHIP_GLASS.boxShadow,
        transition: "color 0.14s ease, background 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease",
        "&:hover": {
            ...SECTION_DOCK_CHIP_GLASS,
            borderRadius: `${MARKETING_DOCK_RADIUS}px`,
            border: `1px solid ${active ? colors.accent : "rgba(255, 255, 255, 0.72)"}`,
            color: active ? colors.accentDark : colors.accent,
            background: "linear-gradient(175deg, rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0.1) 48%, rgba(255, 255, 255, 0.24) 100%)",
        },
        "&:focus-visible": { ...FOCUS_RING },
    };
}
/** Static specimen / label chip — liquid glass at rest (e.g. design-system legend). */
export function liquidGlassSpecimenSx(ink = colors.accent) {
    return {
        ...LIQUID_GLASS_BUTTON,
        display: "inline-block",
        color: ink,
        px: 1,
        py: 0.5,
        fontSize: TYPE_SCALE.micro,
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: "0.02em",
        transform: "translateY(-2px)",
        verticalAlign: "middle",
    };
}
/**
 * Layout `sx` recipes — Carbon-inspired organisation (shell · gutters · 12-col
 * content) without adopting Carbon Grid. Prefer these over magic padding/widths.
 */
export const layoutSx = {
    /** Stage content padding matching GlassRail. */
    stage: {
        p: { xs: LAYOUT.stagePaddingXs, md: LAYOUT.stagePaddingMd },
        pb: { xs: LAYOUT.stagePaddingBottomXs, md: LAYOUT.stagePaddingBottomMd },
    },
    /** Fixed kit rail column (portals/auth). */
    rail: {
        width: { xs: "100%", md: LAYOUT.railWidth },
        flex: { xs: "none", md: `0 0 ${LAYOUT.railWidth}px` },
        p: LAYOUT.railPadding,
    },
    /** Optional reading-width constraint for stage interiors. */
    content: {
        width: "100%",
        maxWidth: LAYOUT.contentMaxWidth,
        mx: "auto",
        px: { xs: LAYOUT.stagePaddingXs, md: 0 },
    },
    /**
     * 12-column CSS grid with the sanctioned gutter. Map children with
     * `gridColumn: span N` (N ≤ {@link LAYOUT.columns}).
     */
    grid: {
        display: "grid",
        gridTemplateColumns: `repeat(${LAYOUT.columns}, minmax(0, 1fr))`,
        gap: `${LAYOUT.gutter}px`,
        width: "100%",
    },
    /** Outer shell margin (page edge). */
    page: {
        px: `${LAYOUT.margin}px`,
    },
    /**
     * List / register toolbar — search + filters row (T2 template). Pair with
     * {@link searchFieldSx} on the TextField.
     */
    listToolbar: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 1,
        mb: 1.5,
        width: "100%",
    },
    /**
     * Form field cluster — Mayer spatial contiguity: label, control, and helper
     * share one column so related info is never scattered.
     */
    formField: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 0.5,
        width: "100%",
        maxWidth: 480,
    },
};
/**
 * Search field recipe — neumorphic TextField with start adornment slot.
 * Usage: `<TextField placeholder="Search…" sx={searchFieldSx} slotProps={{ input: { startAdornment: … } }} />`
 */
export const searchFieldSx = {
    minWidth: { xs: "100%", sm: 220 },
    maxWidth: 360,
    flex: { xs: "1 1 100%", sm: "0 1 360px" },
};
//# sourceMappingURL=chrome-sx.js.map