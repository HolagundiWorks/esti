import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ActionDock — the single, global, context-aware action bar. Every screen's CTAs
 * live here, not inline. A screen publishes its actions with `useScreenActions`;
 * the dock renders them in three fixed zones for muscle memory:
 *
 *   LEFT   = exit / destroy   (Delete · Discard · Cancel)      — red tone
 *   CENTER = generate         (Add · Create · New)             — orange (primary)
 *   RIGHT  = commit           (Save · Edit · Save changes)     — orange (primary)
 *
 * Buttons are flat pill at rest and lift to liquid-glass capsule on hover (Layer 3) — only
 * text-entry wells use neumorphic inset depth. The dock tray itself is ACTION_DOCK_TRAY
 * (NEU_RAISED capsule, Layer 2).
 * The dock floats bottom-centre, above the taskbar footer, and hides when no screen
 * has published actions.
 *
 * Capacity: visible actions capped at {@link CAPACITY.dockVisibleActions} (trim + warn).
 * Telemetry: optional `track` / `outcome` on {@link DockAction} (see KPI instrument).
 * Zones are **semantic roles** (destroy · create · commit), not physical sides — not remapped under RTL.
 *
 * **Modal exception:** while a create/edit `Dialog` is open, publish `[]` so the
 * dock does not compete with `DialogActions` (commit stays in the dialog). Re-publish
 * screen actions when the dialog closes.
 *
 * **Marketing exception:** public `MarketingShell` mounts its own `ActionDockProvider`.
 * Create-account / Sign-in live **only** in the dock — never duplicate them in the
 * marketing rail (Hick / Fitts / single CTA locus).
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, } from "react";
import { Box, Button, Tooltip } from "@mui/material";
import { actionDockButtonSx } from "./chrome-sx.js";
import { enforceCapacity } from "./capacity.js";
import { publishOutcome } from "./ActionOutcome.js";
import { logUxEvent } from "./uxEvents.js";
import { ACTION_DOCK_TRAY, NEU_GROOVE_VERTICAL, colors } from "./tokens.js";
const DockContext = createContext(null);
/** Prefer primary/danger, then zone order left→center→right, then original order. */
export function prioritizeDockActions(actions) {
    const zoneRank = { left: 0, center: 1, right: 2 };
    const toneRank = (t) => (t === "danger" || t === "primary" ? 0 : 1);
    return [...actions].sort((a, b) => {
        const tr = toneRank(a.tone) - toneRank(b.tone);
        if (tr !== 0)
            return tr;
        return zoneRank[a.zone] - zoneRank[b.zone];
    });
}
/** Cap + warn; keeps highest-priority actions when over {@link CAPACITY.dockVisibleActions}. */
export function trimDockActions(actions) {
    if (actions.length === 0)
        return [];
    const ranked = prioritizeDockActions(actions);
    const kept = enforceCapacity("dock", ranked);
    // Restore visual zone order for rendering.
    const zoneRank = { left: 0, center: 1, right: 2 };
    return [...kept].sort((a, b) => zoneRank[a.zone] - zoneRank[b.zone]);
}
function instrumentAction(action) {
    const shouldTrack = action.track ?? Boolean(action.outcome);
    if (!shouldTrack && !action.outcome)
        return action;
    return {
        ...action,
        onClick: () => {
            if (shouldTrack) {
                logUxEvent("ux.dock", { zone: action.zone, actionId: action.id });
            }
            action.onClick();
            if (action.outcome) {
                publishOutcome(action.outcome);
                const status = action.outcome.status === "error"
                    ? "failure"
                    : action.outcome.status === "success"
                        ? "success"
                        : "blocked";
                logUxEvent("ux.outcome", { status, source: action.id });
            }
        },
    };
}
export function ActionDockProvider({ children }) {
    const [actions, setActions] = useState([]);
    const value = useMemo(() => ({ actions, publish: setActions, clear: () => setActions([]) }), [actions]);
    return _jsx(DockContext.Provider, { value: value, children: children });
}
/**
 * Publish the current screen's actions to the global dock. Pass a `deps` array
 * (like useEffect) so the dock re-syncs when the actions' handlers/state change.
 * Actions clear automatically when the screen unmounts.
 */
export function useScreenActions(actions, deps = []) {
    const ctx = useContext(DockContext);
    useEffect(() => {
        if (!ctx)
            return;
        ctx.publish(actions.map(instrumentAction));
        return () => ctx.clear();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
export function useDockActions() {
    return useContext(DockContext)?.actions ?? [];
}
function toneColor(tone = "default") {
    if (tone === "danger")
        return colors.supportError;
    if (tone === "primary")
        return colors.accent;
    return colors.ink;
}
function DockButton({ action, tabIndex, innerRef, }) {
    const ink = toneColor(action.tone);
    const btn = (_jsx(Button, { className: "hcw-action-dock-btn", ref: innerRef, tabIndex: tabIndex, onClick: action.onClick, disabled: action.disabled, startIcon: action.iconOnly ? undefined : action.icon, "aria-label": action.label, sx: actionDockButtonSx(ink, {
            iconOnly: action.iconOnly,
            fontWeight: action.tone === "primary" ? 700 : 600,
        }), children: action.iconOnly ? action.icon : action.label }));
    return action.iconOnly ? (_jsx(Tooltip, { title: action.label, children: _jsx("span", { children: btn }) })) : (btn);
}
function Divider() {
    return _jsx(Box, { "aria-hidden": true, className: "hcw-action-dock-divider", sx: NEU_GROOVE_VERTICAL });
}
export function ActionDock() {
    const raw = useDockActions();
    const actions = useMemo(() => trimDockActions(raw), [raw]);
    const btnRefs = useRef(new Map());
    const [rovingId, setRovingId] = useState(null);
    const left = actions.filter((a) => a.zone === "left");
    const center = actions.filter((a) => a.zone === "center");
    const right = actions.filter((a) => a.zone === "right");
    // Visual reading order = keyboard order: left → center → right.
    const ordered = [...left, ...center, ...right];
    const enabled = ordered.filter((a) => !a.disabled);
    // Reserve scroll space under content — same 16px gutter as shell sides.
    useEffect(() => {
        const shell = document.querySelector(".esti-app-shell2");
        if (!shell)
            return;
        shell.classList.toggle("esti-app-shell2--dock-visible", actions.length > 0);
        return () => shell.classList.remove("esti-app-shell2--dock-visible");
    }, [actions.length]);
    // The roving target stays valid as screens republish: keep the tracked id while
    // it's still an enabled action, else fall back to the first enabled one.
    const activeId = rovingId && enabled.some((a) => a.id === rovingId) ? rovingId : (enabled[0]?.id ?? null);
    if (actions.length === 0)
        return null;
    const focusId = (id) => {
        if (!id)
            return;
        setRovingId(id);
        btnRefs.current.get(id)?.focus();
    };
    // WAI-ARIA toolbar keyboard model: one Tab stop, then arrows/Home/End move
    // focus between the (enabled) action buttons, wrapping at the ends.
    const onKeyDown = (e) => {
        if (enabled.length === 0)
            return;
        const idx = enabled.findIndex((a) => a.id === activeId);
        if (idx < 0)
            return;
        let next = idx;
        switch (e.key) {
            case "ArrowRight":
            case "ArrowDown":
                next = (idx + 1) % enabled.length;
                break;
            case "ArrowLeft":
            case "ArrowUp":
                next = (idx - 1 + enabled.length) % enabled.length;
                break;
            case "Home":
                next = 0;
                break;
            case "End":
                next = enabled.length - 1;
                break;
            default:
                return;
        }
        e.preventDefault();
        focusId(enabled[next]?.id);
    };
    const dockProps = (a) => ({
        tabIndex: a.disabled ? -1 : a.id === activeId ? 0 : -1,
        innerRef: (el) => {
            if (el)
                btnRefs.current.set(a.id, el);
            else
                btnRefs.current.delete(a.id);
        },
    });
    const zones = [left, center, right].filter((z) => z.length > 0);
    return (_jsx(Box, { className: "hcw-action-dock", role: "toolbar", "aria-label": "Screen actions", "aria-orientation": "horizontal", onKeyDown: onKeyDown, sx: {
            position: "fixed",
            left: "50%",
            // App shell: 72px clears the taskbar. Marketing (no footer) sets
            // --esti-dock-bottom on .lp2-shell (see landing.scss).
            bottom: "var(--esti-dock-bottom, 72px)",
            transform: "translateX(-50%)",
            zIndex: 1250,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 1.5,
            py: 1,
            ...ACTION_DOCK_TRAY,
        }, children: zones.map((z, i) => (_jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1.5 }, children: [i > 0 && _jsx(Divider, {}), _jsx(Box, { sx: { display: "flex", gap: 1 }, children: z.map((a) => (_jsx(DockButton, { action: a, ...dockProps(a) }, a.id))) })] }, i))) }));
}
export default ActionDock;
//# sourceMappingURL=ActionDock.js.map