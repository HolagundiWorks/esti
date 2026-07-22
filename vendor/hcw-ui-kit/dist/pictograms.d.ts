/**
 * Pictograms & icons — HCW-owned glyph grammar.
 *
 * The kit does **not** ship an icon font. Consumers inject glyphs into named
 * slots. Pictograms (brand, health, status, chart markers) are kit-owned shapes
 * that encode meaning without colour alone.
 */
import { type ChartMarker } from "./charts.js";
import type { HealthZoneState } from "./HealthGlassOrb.js";
import { colors } from "./tokens.js";
/** Injected icon slots — where consumer glyphs may appear. */
export declare const ICON_SLOTS: readonly ["dock", "taskbar", "chrome", "inline", "breadcrumb"];
export type IconSlot = (typeof ICON_SLOTS)[number];
/** Glyph size ladder (px) for injected icons. */
export declare const ICON_SIZE: {
    readonly sm: 16;
    readonly md: 20;
    readonly lg: 24;
    readonly xl: 32;
};
export type IconSizeName = keyof typeof ICON_SIZE;
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
export declare const ICON: {
    readonly slots: readonly ["dock", "taskbar", "chrome", "inline", "breadcrumb"];
    readonly size: {
        readonly sm: 16;
        readonly md: 20;
        readonly lg: 24;
        readonly xl: 32;
    };
    readonly tones: readonly ["default", "accent", "danger"];
    readonly chromeHit: 44;
};
export type IconTone = (typeof ICON.tones)[number];
/** Brand accent pictogram shapes (BrandMark). */
export declare const BRAND_ACCENT_SHAPES: readonly ["auto", "a", "square"];
export type BrandAccentShape = (typeof BRAND_ACCENT_SHAPES)[number];
/** Health / zone severity pictogram — shape is primary, colour secondary. */
export declare const HEALTH_PICTOGRAM: Record<HealthZoneState, {
    shape: "circle" | "triangle" | "square";
    fillRole: keyof typeof colors;
}>;
/** Status indicator pictogram — always a circle beside ink label. */
export declare const STATUS_PICTOGRAM: {
    shape: "circle";
    sizes: {
        readonly sm: 8;
        readonly md: 10;
    };
};
/**
 * Kit pictogram registry — catalog § Pictograms.
 * Chart markers re-export the ordered series ladder.
 */
export declare const PICTOGRAM: {
    readonly brandAccent: {
        readonly shapes: readonly ["auto", "a", "square"];
        readonly sizes: readonly ["sm", "md", "lg"];
    };
    readonly health: Record<HealthZoneState, {
        shape: "circle" | "triangle" | "square";
        fillRole: keyof typeof colors;
    }>;
    readonly status: {
        shape: "circle";
        sizes: {
            readonly sm: 8;
            readonly md: 10;
        };
    };
    readonly chartMarkers: readonly ["circle", "square", "triangle", "diamond", "cross", "star"];
    readonly avatar: {
        readonly sizes: readonly ["xs", "sm", "md", "lg", "xl"];
        readonly modes: readonly ["photo", "initials"];
    };
};
export type { ChartMarker };
//# sourceMappingURL=pictograms.d.ts.map