/**
 * BrandMark — the AORMS wordmark as an asset-free, on-brand primitive: a flat
 * Radiant-Orange square (the accent) beside the uppercase wordmark in the brand
 * font. Portable to any portal (no image files), square and flat by construction.
 *
 *   <BrandMark />                      → ◼ AORMS
 *   <BrandMark label="AORMS Estimate" size="lg" />
 *   <BrandMark accent={false} />       → wordmark only
 */
import { Box, type SxProps, type Theme } from "@mui/material";
import { colors, FONT_FAMILY } from "./tokens.js";

const SIZES = {
  sm: { font: "0.9rem", dot: 8, gap: 0.75 },
  md: { font: "1.15rem", dot: 10, gap: 1 },
  lg: { font: "1.6rem", dot: 14, gap: 1.25 },
} as const;

export function BrandMark({
  label = "AORMS",
  size = "md",
  accent = true,
  sx,
}: {
  label?: string;
  size?: keyof typeof SIZES;
  accent?: boolean;
  sx?: SxProps<Theme>;
}) {
  const s = SIZES[size];
  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", gap: s.gap, lineHeight: 1, ...sx }}
    >
      {accent && (
        <Box
          component="span"
          aria-hidden
          sx={{ width: s.dot, height: s.dot, backgroundColor: colors.accent, flex: "0 0 auto" }}
        />
      )}
      <Box
        component="span"
        sx={{
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: s.font,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "text.primary",
        }}
      >
        {label}
      </Box>
    </Box>
  );
}

export default BrandMark;
