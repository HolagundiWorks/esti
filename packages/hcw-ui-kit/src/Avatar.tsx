/**
 * Avatar — circular identity mark: photo when available, initials otherwise.
 * Presentational only: the CALLER supplies `color` (domain colour logic like
 * staff-level palettes stays app-side — same injection pattern as
 * PageBreadcrumb's linkComponent). Promoted from the app (2026-07).
 *
 *   <Avatar name="A. Rao" color={resolveColor(member)} size="md" />
 */
import { Box } from "@mui/material";
import { colors } from "./tokens.js";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
const SIZE_PX: Record<AvatarSize, number> = { xs: 20, sm: 28, md: 36, lg: 48, xl: 96 };
const FONT_PX: Record<AvatarSize, number> = { xs: 9, sm: 11, md: 13, lg: 16, xl: 32 };

/** Initials from a display name — first + last word, letters only. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => /^[A-Za-z]/.test(p));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]![0] ?? "?").toUpperCase();
  return ((parts[0]![0] ?? "") + (parts[parts.length - 1]![0] ?? "")).toUpperCase();
}

export function Avatar({
  name,
  photoUrl,
  color = colors.textSecondary,
  size = "md",
  className,
}: {
  name: string;
  photoUrl?: string | null;
  /** Background colour behind initials — injected by the caller. */
  color?: string;
  size?: AvatarSize;
  className?: string;
}) {
  const px = SIZE_PX[size];
  return (
    <Box
      component="span"
      className={className}
      title={name}
      aria-label={name}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: px,
        height: px,
        minWidth: px,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        backgroundColor: color,
        color: colors.textOnColor,
        fontWeight: 700,
        letterSpacing: "0.02em",
        lineHeight: 1,
        userSelect: "none",
        fontSize: FONT_PX[size],
        "& img": { width: "100%", height: "100%", objectFit: "cover" },
      }}
    >
      {photoUrl ? <img src={photoUrl} alt={name} /> : <span aria-hidden>{getInitials(name)}</span>}
    </Box>
  );
}

export default Avatar;
