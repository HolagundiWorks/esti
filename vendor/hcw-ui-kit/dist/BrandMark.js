import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * BrandMark — AORMS wordmark with the isolated typography **a** beside the label.
 * The accent uses `/aorms-mark.png` (CSS mask + Radiant Orange fill) — same asset as
 * favicons and collapsed rail marks. HCW / custom labels can keep a flat square accent.
 *
 *   <BrandMark />                      → a AORMS
 *   <BrandMark label="AORMS Estimate" size="lg" />
 *   <BrandMark accent={false} />       → wordmark only
 */
import { Box } from "@mui/material";
import { colors, FONT_FAMILY } from "./tokens.js";
const SIZES = {
    sm: { font: "0.9rem", mark: 14, square: 8, gap: 0.75 },
    md: { font: "1.15rem", mark: 18, square: 10, gap: 1 },
    lg: { font: "1.6rem", mark: 24, square: 14, gap: 1.25 },
};
const AORMS_MARK_MASK = 'url("/aorms-mark.png")';
function AormsAccentMark({ size }) {
    const px = SIZES[size].mark;
    return (_jsx(Box, { component: "span", "aria-hidden": true, sx: {
            width: px,
            height: px,
            flex: "0 0 auto",
            bgcolor: colors.accent,
            WebkitMaskImage: AORMS_MARK_MASK,
            maskImage: AORMS_MARK_MASK,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
        } }));
}
export function BrandMark({ label = "AORMS", size = "md", accent = true, accentShape = "auto", sx, }) {
    const s = SIZES[size];
    const useAMark = accentShape === "a" ||
        (accentShape === "auto" && (label === "AORMS" || label.startsWith("AORMS ")));
    return (_jsxs(Box, { component: "span", sx: { display: "inline-flex", alignItems: "center", gap: s.gap, lineHeight: 1, ...sx }, children: [accent ? (useAMark ? (_jsx(AormsAccentMark, { size: size })) : (_jsx(Box, { component: "span", "aria-hidden": true, sx: { width: s.square, height: s.square, backgroundColor: colors.accent, flex: "0 0 auto" } }))) : null, _jsx(Box, { component: "span", sx: {
                    fontFamily: FONT_FAMILY,
                    fontWeight: 700,
                    fontSize: s.font,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "text.primary",
                }, children: label })] }));
}
export default BrandMark;
//# sourceMappingURL=BrandMark.js.map