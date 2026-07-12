/**
 * BrandMark — AORMS wordmark with the isolated typography **a** beside the label.
 * The accent uses `/aorms-mark.png` (CSS mask + Radiant Orange fill) — same asset as
 * favicons and collapsed rail marks. HCW / custom labels can keep a flat square accent.
 *
 *   <BrandMark />                      → a AORMS
 *   <BrandMark label="AORMS Estimate" size="lg" />
 *   <BrandMark accent={false} />       → wordmark only
 */
import { type SxProps, type Theme } from "@mui/material";
declare const SIZES: {
    readonly sm: {
        readonly font: "0.9rem";
        readonly mark: 14;
        readonly square: 8;
        readonly gap: 0.75;
    };
    readonly md: {
        readonly font: "1.15rem";
        readonly mark: 18;
        readonly square: 10;
        readonly gap: 1;
    };
    readonly lg: {
        readonly font: "1.6rem";
        readonly mark: 24;
        readonly square: 14;
        readonly gap: 1.25;
    };
};
export declare function BrandMark({ label, size, accent, accentShape, sx, }: {
    label?: string;
    size?: keyof typeof SIZES;
    accent?: boolean;
    /** `auto` → typography **a** for AORMS labels, orange square otherwise */
    accentShape?: "auto" | "a" | "square";
    sx?: SxProps<Theme>;
}): import("react").JSX.Element;
export default BrandMark;
