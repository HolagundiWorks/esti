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
import { useHcwLocale } from "./MuiRoot.js";
import { colors, NEU_RAISED, REDUCE_MOTION, FOCUS_RING, LAYOUT, TYPE_SCALE, DENSITY } from "./tokens.js";
export const TASKBAR_HEIGHT = LAYOUT.taskbarHeight;
function Clock({ locale }) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    const time = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    const date = now.toLocaleDateString(locale, { day: "2-digit", month: "short" });
    return (_jsxs(Box, { sx: {
            textAlign: "end",
            lineHeight: 1.15,
            fontVariantNumeric: "tabular-nums",
            paddingInlineEnd: 0.5,
        }, children: [_jsx(Box, { sx: { fontWeight: 700, fontSize: TYPE_SCALE.label, color: "text.primary" }, children: time }), _jsx(Box, { sx: { fontSize: TYPE_SCALE.micro, color: colors.textSecondary }, children: date })] }));
}
/** A neumorphic launcher chip for the footer's left cluster. */
export function TaskbarButton({ icon, label, onClick, active = false, }) {
    return (_jsx(Tooltip, { title: label, children: _jsx(IconButton, { onClick: onClick, "aria-label": label, size: "small", sx: {
                ...NEU_RAISED,
                color: active ? colors.accent : colors.ink,
                width: DENSITY.controlCompact,
                height: DENSITY.controlCompact,
                transition: "transform 120ms ease, color 120ms ease",
                "&:hover": { transform: "translateY(-2px)", color: colors.accent },
                // Keyboard parity: focus tints to the accent and shows the focus ring.
                "&:focus-visible": { ...FOCUS_RING, color: colors.accent },
                [REDUCE_MOTION]: { transition: "none", "&:hover": { transform: "none" } },
            }, children: icon }) }));
}
export function TaskbarFooter({ left, center, right, showClock = true, locale: localeProp, sx, ...rest }) {
    const ctxLocale = useHcwLocale();
    const locale = localeProp ?? ctxLocale;
    return (_jsxs(Box, { component: "footer", role: "contentinfo", sx: {
            position: "fixed",
            insetInline: 0,
            bottom: 0,
            zIndex: 1100,
            height: TASKBAR_HEIGHT,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 1.5,
            backgroundColor: colors.layer01,
            borderTop: `1px solid ${colors.borderSubtle}`,
            ...sx,
        }, ...rest, children: [_jsx(Box, { sx: { display: "flex", alignItems: "center", gap: 1, minWidth: 0 }, children: left }), _jsx(Box, { sx: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 0.5 }, children: center }), _jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, minWidth: 0, justifyContent: "flex-end" }, children: [showClock && _jsx(Clock, { locale: locale }), right] })] }));
}
export default TaskbarFooter;
//# sourceMappingURL=TaskbarFooter.js.map