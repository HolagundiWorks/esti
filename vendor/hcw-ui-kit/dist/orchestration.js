import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AI / mission orchestration primitives — domain-agnostic anatomy for mission-first
 * surfaces (Framework principle 6). No product/domain nouns in the public API.
 *
 * Compose with AwarenessStrip · StatusDot · HealthGlassOrb · ActionDock.
 * Template: T10 (docs/hcw-kit/05-TEMPLATES.md).
 */
import { Box, Stack, Typography } from "@mui/material";
import { enforceCapacity } from "./capacity.js";
import { logUxEvent } from "./uxEvents.js";
import { Surface } from "./Surface.js";
import { TRUST, TYPE_SCALE, colors, hexToRgba } from "./tokens.js";
/* ─── Mission ─────────────────────────────────────────────────────────── */
export function MissionHeader({ title, status, }) {
    return (_jsxs(Box, { component: "header", "aria-label": "Mission", sx: {
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 2,
            py: 1,
            borderBottom: `1px solid ${colors.borderSubtle}`,
        }, children: [_jsx(Typography, { component: "h2", sx: {
                    m: 0,
                    fontSize: TYPE_SCALE.subtitle,
                    fontWeight: 600,
                    color: colors.ink,
                    textTransform: "none",
                    letterSpacing: 0,
                }, children: title }), status ? (_jsx(Box, { sx: { flex: "0 0 auto", fontSize: TYPE_SCALE.caption, color: colors.textSecondary }, children: status })) : null] }));
}
export function ObjectiveList({ items, "aria-label": ariaLabel = "Objectives", }) {
    const visible = enforceCapacity("objectives", items);
    if (visible.length === 0)
        return null;
    return (_jsx(Stack, { component: "ol", spacing: 0.5, "aria-label": ariaLabel, sx: { m: 0, pl: 2.5, py: 0.5 }, children: visible.map((item) => (_jsx(Box, { component: "li", sx: {
                fontSize: TYPE_SCALE.body2,
                color: item.done ? colors.textSecondary : colors.ink,
                textDecoration: item.done ? "line-through" : "none",
            }, children: item.label }, item.id))) }));
}
/* ─── Phase ───────────────────────────────────────────────────────────── */
export function PhaseStrip({ phase, progress, eta, }) {
    const frac = typeof progress === "number" ? Math.max(0, Math.min(1, progress)) : null;
    return (_jsxs(Box, { component: "section", "aria-label": "Current phase", sx: {
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
            py: 1,
        }, children: [_jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", gap: 2, alignItems: "baseline" }, children: [_jsx(Typography, { sx: { fontSize: TYPE_SCALE.label, fontWeight: 700, color: colors.ink }, children: phase }), eta ? (_jsx(Typography, { sx: { fontSize: TYPE_SCALE.caption, color: colors.textSecondary }, children: eta })) : null] }), frac != null ? (_jsx(Box, { role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(frac * 100), sx: {
                    height: 4,
                    borderRadius: 0,
                    backgroundColor: colors.borderSubtle,
                    overflow: "hidden",
                }, children: _jsx(Box, { sx: {
                        width: `${frac * 100}%`,
                        height: "100%",
                        backgroundColor: colors.accent,
                    } }) })) : progress != null && typeof progress !== "number" ? (progress) : null] }));
}
const BAND_LABEL = {
    low: "Low confidence",
    medium: "Medium confidence",
    high: "High confidence",
};
const BAND_COLOR = {
    low: colors.supportWarning,
    medium: colors.supportInfo,
    high: colors.supportSuccess,
};
export function ConfidenceBand({ band, label, }) {
    if (!TRUST.preferConfidenceBand && label == null) {
        /* still render band words — preferConfidenceBand is the grammar contract */
    }
    return (_jsxs(Box, { component: "span", role: "status", "aria-label": typeof label === "string" ? label : BAND_LABEL[band], sx: {
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            fontSize: TYPE_SCALE.caption,
            fontWeight: 600,
            color: colors.ink,
        }, children: [_jsx(Box, { "aria-hidden": true, sx: {
                    width: 8,
                    height: 8,
                    borderRadius: 0,
                    backgroundColor: BAND_COLOR[band],
                } }), label ?? BAND_LABEL[band]] }));
}
export function DecisionCard({ id, question, recommendation, alternatives = [], impact, timeToDecide, recommended = true, onOpen, }) {
    const alts = enforceCapacity("alternatives", alternatives);
    return (_jsxs(Surface, { layer: recommended ? "glass" : "soft", role: "article", "aria-label": "Pending decision", "data-decision-id": id, onFocus: onOpen, tabIndex: 0, sx: { p: 1.5, display: "flex", flexDirection: "column", gap: 1 }, children: [_jsx(Typography, { sx: { fontSize: TYPE_SCALE.body2, fontWeight: 700, color: colors.ink }, children: question }), _jsxs(Box, { sx: {
                    fontSize: TYPE_SCALE.body2,
                    color: colors.ink,
                    borderInlineStart: `3px solid ${colors.accent}`,
                    pl: 1.25,
                    backgroundColor: hexToRgba(colors.accent, 0.06),
                    py: 0.75,
                }, children: [_jsx(Typography, { component: "span", sx: {
                            display: "block",
                            fontSize: TYPE_SCALE.micro,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: colors.textSecondary,
                            mb: 0.25,
                        }, children: "Recommendation" }), recommendation] }), alts.length > 0 ? (_jsx(Stack, { component: "ul", spacing: 0.25, sx: { m: 0, pl: 2 }, children: alts.map((alt, i) => (_jsx(Box, { component: "li", sx: { fontSize: TYPE_SCALE.caption, color: colors.textSecondary }, children: alt }, i))) })) : null, (impact || timeToDecide) && (_jsxs(Box, { sx: {
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1.5,
                    fontSize: TYPE_SCALE.caption,
                    color: colors.textSecondary,
                }, children: [impact ? _jsxs("span", { children: ["Impact: ", impact] }) : null, timeToDecide ? _jsxs("span", { children: ["Decide by: ", timeToDecide] }) : null] }))] }));
}
export function DecisionQueue({ items, empty, }) {
    if (items.length === 0) {
        return empty ? (_jsx(Box, { role: "status", sx: { fontSize: TYPE_SCALE.body2, color: colors.textSecondary, py: 1 }, children: empty })) : null;
    }
    return (_jsx(Stack, { component: "section", "aria-label": "Pending decisions", spacing: 1.5, sx: { py: 0.5 }, children: items.map((item) => (_jsx(DecisionCard, { ...item, onOpen: () => {
                logUxEvent("ux.decision", { id: item.id, state: "pending" });
                item.onOpen?.();
            } }, item.id))) }));
}
export function FrozenDecisionRow({ label, value }) {
    return (_jsxs(Box, { component: "tr", sx: {
            "& td": {
                py: 0.75,
                px: 1,
                borderBottom: `1px solid ${colors.borderSubtle}`,
                fontSize: TYPE_SCALE.body2,
                color: colors.ink,
                verticalAlign: "top",
            },
        }, children: [_jsx(Box, { component: "td", sx: { fontWeight: 600, width: "40%", color: colors.textSecondary }, children: label }), _jsx(Box, { component: "td", children: _jsxs(Box, { sx: { display: "inline-flex", alignItems: "center", gap: 0.75 }, children: [_jsx(Box, { "aria-hidden": true, sx: {
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                backgroundColor: colors.supportSuccess,
                            } }), value, _jsx(Typography, { component: "span", sx: {
                                fontSize: TYPE_SCALE.micro,
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: colors.textSecondary,
                            }, children: "Frozen" })] }) })] }));
}
export function FreezeTable({ items, caption = "Frozen decisions", }) {
    if (items.length === 0)
        return null;
    return (_jsxs(Box, { component: "table", "aria-label": caption, sx: { width: "100%", borderCollapse: "collapse", my: 0.5 }, children: [_jsx(Box, { component: "caption", sx: { textAlign: "left", fontSize: TYPE_SCALE.label, fontWeight: 700, pb: 0.5, color: colors.ink }, children: caption }), _jsx(Box, { component: "tbody", children: items.map((row) => (_jsx(FrozenDecisionRow, { label: row.label, value: row.value }, row.id))) })] }));
}
//# sourceMappingURL=orchestration.js.map