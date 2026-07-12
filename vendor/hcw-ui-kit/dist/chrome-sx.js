import { DOCK_PILL_RADIUS, colors, DOCK_BUTTON_LIFT, FOCUS_RING, LIQUID_GLASS_BUTTON, MARKETING_DOCK_RADIUS, REDUCE_MOTION, SECTION_DOCK_CHIP_GLASS, } from "./tokens.js";
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
            ? "inset 0 1px 0 rgba(255, 255, 255, 0.75), inset 0 -1px 0 rgba(255, 255, 255, 0.28), 0 4px 16px rgba(255, 79, 24, 0.14)"
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
        fontSize: "0.68rem",
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: "0.02em",
        transform: "translateY(-2px)",
        verticalAlign: "middle",
    };
}
