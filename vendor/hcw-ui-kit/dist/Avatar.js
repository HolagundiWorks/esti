import { jsx as _jsx } from "react/jsx-runtime";
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
const SIZE_PX = { xs: 20, sm: 28, md: 36, lg: 48, xl: 96 };
const FONT_PX = { xs: 9, sm: 11, md: 13, lg: 16, xl: 32 };
/** Initials from a display name — first + last word, letters only. */
export function getInitials(name) {
    const parts = name.trim().split(/\s+/).filter((p) => /^[A-Za-z]/.test(p));
    if (parts.length === 0)
        return "?";
    if (parts.length === 1)
        return (parts[0][0] ?? "?").toUpperCase();
    return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}
export function Avatar({ name, photoUrl, color = colors.textSecondary, size = "md", className, }) {
    const px = SIZE_PX[size];
    return (_jsx(Box, { component: "span", className: className, title: name, "aria-label": name, sx: {
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
        }, children: photoUrl ? _jsx("img", { src: photoUrl, alt: name }) : _jsx("span", { "aria-hidden": true, children: getInitials(name) }) }));
}
export default Avatar;
