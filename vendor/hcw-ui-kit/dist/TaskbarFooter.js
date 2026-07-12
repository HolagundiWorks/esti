import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TaskbarFooter — full-width bottom bar (HCW spatial model).
 * Parity with workspace `AppFooterBar` launcher layout:
 *
 *   LEFT   — utilities (calculator, health, …)
 *   CENTER — primary launchers (home, search, Ask ESTI, …)
 *   RIGHT  — tray (clock, alerts, identity, sign-out)
 *
 * Default surface is flat white; pass `sx` / glass tokens for frosted chrome.
 * Workspace keeps `AppFooterBar` as the product composition; this is the kit shell.
 *
 *   <TaskbarFooter left={…} center={…} right={…} />
 */
import { Box, IconButton, Tooltip } from "@mui/material";
import { useEffect, useState } from "react";
import { colors, NEU_RAISED, REDUCE_MOTION, FOCUS_RING } from "./tokens.js";
export const TASKBAR_HEIGHT = 56;
function Clock() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const date = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    return (_jsxs(Box, { sx: { textAlign: "right", lineHeight: 1.15, fontVariantNumeric: "tabular-nums", pr: 0.5 }, children: [_jsx(Box, { sx: { fontWeight: 700, fontSize: "0.82rem", color: "text.primary" }, children: time }), _jsx(Box, { sx: { fontSize: "0.66rem", color: colors.textSecondary }, children: date })] }));
}
/** A neumorphic launcher chip for the footer's left cluster. */
export function TaskbarButton({ icon, label, onClick, active = false, }) {
    return (_jsx(Tooltip, { title: label, children: _jsx(IconButton, { onClick: onClick, "aria-label": label, size: "small", sx: {
                ...NEU_RAISED,
                color: active ? colors.accent : colors.ink,
                width: 38,
                height: 38,
                transition: "transform 120ms ease, color 120ms ease",
                "&:hover": { transform: "translateY(-2px)", color: colors.accent },
                // Keyboard parity: focus tints to the accent and shows the focus ring.
                "&:focus-visible": { ...FOCUS_RING, color: colors.accent },
                [REDUCE_MOTION]: { transition: "none", "&:hover": { transform: "none" } },
            }, children: icon }) }));
}
export function TaskbarFooter({ left, center, right, showClock = true, sx, ...rest }) {
    return (_jsxs(Box, { component: "footer", role: "contentinfo", sx: {
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1100,
            height: TASKBAR_HEIGHT,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 1.5,
            backgroundColor: "#ffffff",
            borderTop: `1px solid ${colors.borderSubtle}`,
            ...sx,
        }, ...rest, children: [_jsx(Box, { sx: { display: "flex", alignItems: "center", gap: 1, minWidth: 0 }, children: left }), _jsx(Box, { sx: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 0.5 }, children: center }), _jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, minWidth: 0, justifyContent: "flex-end" }, children: [showClock && _jsx(Clock, {}), right] })] }));
}
export default TaskbarFooter;
//# sourceMappingURL=TaskbarFooter.js.map