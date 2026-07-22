/**
 * Shared MUI `sx` recipes — single source for chrome that must match across portals.
 * Redesign a look here (or in `tokens.ts`), then use the kit component or import
 * these helpers; do not duplicate rgba/blur recipes in `landing.scss` / `glass.scss`.
 */
import type { SxProps, Theme } from "@mui/material/styles";
import { REDUCE_MOTION, TYPE_SCALE, type CogaMode } from "./tokens.js";
/**
 * Persistent-chrome IconButton — taskbar, ribbon, rail utilities.
 * Default ≥44px (WCAG); under KitRoot `coga="calm"` expands to
 * {@link COGA.calmTargetMinPx} via `[data-hcw-coga="calm"]`.
 */
export declare function chromeIconSxFor(coga?: CogaMode): {
    width: number;
    height: number;
    borderRadius: number;
    color: string;
    "&:hover": {
        color: string;
        backgroundColor: string;
    };
    "&:focus-visible": Record<string, unknown>;
    [REDUCE_MOTION]: {
        transition: string;
    };
};
/**
 * Default chrome icon recipe with calm CSS override when inside
 * `KitRoot({ coga: "calm" })` (`data-hcw-coga="calm"`).
 */
export declare const chromeIconSx: {
    width: 44;
    height: 44;
    borderRadius: number;
    color: "#141517";
    "&:hover": {
        color: "#FF4F18";
        backgroundColor: "rgba(20, 21, 23, 0.04)";
    };
    "&:focus-visible": {
        color: "#FF4F18";
        outline: `2px solid ${string}`;
        outlineOffset: "2px";
    };
    "@media (prefers-reduced-motion: reduce)": {
        transition: "none";
    };
    '[data-hcw-coga="calm"] &': {
        width: 48;
        height: 48;
    };
};
/**
 * Type size that bumps one ladder step under COGA calm (via data attribute).
 * Prefer MUI Typography variants when the theme already carries calm metrics.
 */
export declare function typeScaleSx(key: keyof typeof TYPE_SCALE): {
    fontSize: string;
    '[data-hcw-coga="calm"] &'?: {
        fontSize: string;
    };
};
/** ActionDock button — flat pill at rest, liquid-glass capsule on hover/focus. */
export declare function actionDockButtonSx(ink: string, opts?: {
    iconOnly?: boolean;
    fontWeight?: number;
}): SxProps<Theme>;
/** SectionDock chip — clear liquid glass (marketing section carousel). */
export declare function sectionDockChipSx(active: boolean): SxProps<Theme>;
/** Static specimen / label chip — liquid glass at rest (e.g. design-system legend). */
export declare function liquidGlassSpecimenSx(ink?: "#FF4F18"): SxProps<Theme>;
/**
 * Layout `sx` recipes — Carbon-inspired organisation (shell · gutters · 12-col
 * content) without adopting Carbon Grid. Prefer these over magic padding/widths.
 */
export declare const layoutSx: {
    /** Stage content padding matching GlassRail. */
    readonly stage: {
        p: {
            xs: 2;
            md: 3;
        };
        pb: {
            xs: 4;
            md: 6;
        };
    };
    /** Fixed kit rail column (portals/auth). */
    readonly rail: {
        width: {
            xs: string;
            md: 240;
        };
        flex: {
            xs: string;
            md: string;
        };
        p: 2;
    };
    /** Optional reading-width constraint for stage interiors. */
    readonly content: {
        width: string;
        maxWidth: 1280;
        mx: string;
        px: {
            xs: 2;
            md: number;
        };
    };
    /**
     * 12-column CSS grid with the sanctioned gutter. Map children with
     * `gridColumn: span N` (N ≤ {@link LAYOUT.columns}).
     */
    readonly grid: {
        display: "grid";
        gridTemplateColumns: string;
        gap: string;
        width: string;
    };
    /** Outer shell margin (page edge). */
    readonly page: {
        px: string;
    };
    /**
     * List / register toolbar — search + filters row (T2 template). Pair with
     * {@link searchFieldSx} on the TextField.
     */
    readonly listToolbar: {
        display: "flex";
        flexWrap: "wrap";
        alignItems: "center";
        gap: number;
        mb: number;
        width: string;
    };
    /**
     * Form field cluster — Mayer spatial contiguity: label, control, and helper
     * share one column so related info is never scattered.
     */
    readonly formField: {
        display: "flex";
        flexDirection: "column";
        alignItems: "stretch";
        gap: number;
        width: string;
        maxWidth: number;
    };
};
/**
 * Search field recipe — neumorphic TextField with start adornment slot.
 * Usage: `<TextField placeholder="Search…" sx={searchFieldSx} slotProps={{ input: { startAdornment: … } }} />`
 */
export declare const searchFieldSx: {
    minWidth: {
        xs: string;
        sm: number;
    };
    maxWidth: number;
    flex: {
        xs: string;
        sm: string;
    };
};
//# sourceMappingURL=chrome-sx.d.ts.map