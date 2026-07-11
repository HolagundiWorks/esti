/**
 * BrandMark — AORMS wordmark with the isolated typography **a** beside the label.
 * The accent uses `/aorms-mark.png` (CSS mask + Radiant Orange fill) — same asset as
 * favicons and collapsed rail marks. HCW / custom labels can keep a flat square accent.
 *
 *   <BrandMark />                      → a AORMS
 *   <BrandMark label="AORMS Estimate" size="lg" />
 *   <BrandMark accent={false} />       → wordmark only
 */
import { Box, type SxProps, type Theme } from "@mui/material";
import { colors, FONT_FAMILY } from "./tokens.js";

const SIZES = {
  sm: { font: "0.9rem", mark: 14, square: 8, gap: 0.75 },
  md: { font: "1.15rem", mark: 18, square: 10, gap: 1 },
  lg: { font: "1.6rem", mark: 24, square: 14, gap: 1.25 },
} as const;

const AORMS_MARK_MASK = 'url("/aorms-mark.png")';

function AormsAccentMark({ size }: { size: keyof typeof SIZES }) {
  const px = SIZES[size].mark;
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
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
      }}
    />
  );
}

export function BrandMark({
  label = "AORMS",
  size = "md",
  accent = true,
  accentShape = "auto",
  sx,
}: {
  label?: string;
  size?: keyof typeof SIZES;
  accent?: boolean;
  /** `auto` → typography **a** for AORMS labels, orange square otherwise */
  accentShape?: "auto" | "a" | "square";
  sx?: SxProps<Theme>;
}) {
  const s = SIZES[size];
  const useAMark =
    accentShape === "a" ||
    (accentShape === "auto" && (label === "AORMS" || label.startsWith("AORMS ")));

  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", gap: s.gap, lineHeight: 1, ...sx }}
    >
      {accent ? (
        useAMark ? (
          <AormsAccentMark size={size} />
        ) : (
          <Box
            component="span"
            aria-hidden
            sx={{ width: s.square, height: s.square, backgroundColor: colors.accent, flex: "0 0 auto" }}
          />
        )
      ) : null}
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
