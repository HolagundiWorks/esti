/**
 * Pictograms & icons — HCW-owned glyph grammar.
 *
 * The kit does **not** ship an icon font. Consumers inject glyphs into named
 * slots. Pictograms (brand, health, status, chart markers) are kit-owned shapes
 * that encode meaning without colour alone.
 */
import { CHART_MARKERS } from "./charts.js";
import { colors } from "./tokens.js";
/** Injected icon slots — where consumer glyphs may appear. */
export const ICON_SLOTS = ["dock", "taskbar", "chrome", "inline", "breadcrumb"];
/** Glyph size ladder (px) for injected icons. */
export const ICON_SIZE = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
};
/**
 * Icon contract — attributes every injected glyph must satisfy.
 *
 * | Attribute   | Values / rule                                      |
 * | ----------- | -------------------------------------------------- |
 * | `slot`      | dock · taskbar · chrome · inline · breadcrumb      |
 * | `size`      | sm 16 · md 20 · lg 24 · xl 32                      |
 * | `label`     | required accessible name when icon-only            |
 * | `tone`      | default · accent · danger (ink follows tone)       |
 * | chrome hit  | persistent chrome ≥ {@link ICON.chromeHit} (44px)  |
 */
export const ICON = {
    slots: ICON_SLOTS,
    size: ICON_SIZE,
    tones: ["default", "accent", "danger"],
    chromeHit: 44,
};
/** Brand accent pictogram shapes (BrandMark). */
export const BRAND_ACCENT_SHAPES = ["auto", "a", "square"];
/** Health / zone severity pictogram — shape is primary, colour secondary. */
export const HEALTH_PICTOGRAM = {
    stable: { shape: "circle", fillRole: "supportSuccess" },
    watch: { shape: "triangle", fillRole: "supportWarning" },
    friction: { shape: "triangle", fillRole: "supportWarning" },
    critical: { shape: "square", fillRole: "supportError" },
    inactive: { shape: "circle", fillRole: "textHelper" },
};
/** Status indicator pictogram — always a circle beside ink label. */
export const STATUS_PICTOGRAM = {
    shape: "circle",
    sizes: { sm: 8, md: 10 },
};
/**
 * Kit pictogram registry — catalog § Pictograms.
 * Chart markers re-export the ordered series ladder.
 */
export const PICTOGRAM = {
    brandAccent: {
        shapes: BRAND_ACCENT_SHAPES,
        sizes: ["sm", "md", "lg"],
    },
    health: HEALTH_PICTOGRAM,
    status: STATUS_PICTOGRAM,
    chartMarkers: CHART_MARKERS,
    avatar: {
        sizes: ["xs", "sm", "md", "lg", "xl"],
        modes: ["photo", "initials"],
    },
};
//# sourceMappingURL=pictograms.js.map