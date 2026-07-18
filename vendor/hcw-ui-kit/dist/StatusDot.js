import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * StatusDot — the ONE status-indicator primitive: a coloured dot + label in normal
 * ink, never a colour-filled chip (HCW flat-layer thesis; colour is secondary to
 * text). Promoted from the app so every portal inherits the same status grammar.
 *
 *   <StatusDot color="green" label="Active" />
 *   <StatusDot color="red" label="Revoked" size="md" />
 *
 * `color` accepts a named status hue from `STATUS_COLORS` (green, red, teal, blue,
 * purple, gray, cool-gray, …) or any CSS colour; unknown names fall back to ink.
 */
import { Box } from "@mui/material";
import { colors, STATUS_COLORS } from "./tokens.js";
export function StatusDot({ color = "gray", label, size = "sm", }) {
    const dot = STATUS_COLORS[color] ?? color ?? colors.textPrimary;
    const px = size === "md" ? 10 : 8;
    return (_jsxs(Box, { component: "span", sx: { display: "inline-flex", alignItems: "center", gap: 0.75, whiteSpace: "nowrap", lineHeight: 1.2 }, children: [_jsx(Box, { component: "span", "aria-hidden": true, sx: { width: px, height: px, borderRadius: "50%", flex: "0 0 auto", backgroundColor: dot } }), _jsx(Box, { component: "span", sx: { fontSize: size === "md" ? "0.875rem" : "0.75rem", color: "text.primary" }, children: label })] }));
}
export default StatusDot;
