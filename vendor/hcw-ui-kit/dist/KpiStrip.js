import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * KpiStrip — flat KPI row for stage/rail heads. Hard-capped at
 * {@link CAPACITY.kpiStrip} (Cowan). Prefer StatusDot for health, not colour chips.
 *
 *   <KpiStrip items={[
 *     { id: "open", label: "Open", value: "12" },
 *     { id: "due", label: "Due", value: "3" },
 *   ]} />
 */
import { Box, Typography } from "@mui/material";
import { enforceCapacity } from "./capacity.js";
import { colors } from "./tokens.js";
import { typeScaleSx } from "./chrome-sx.js";
export function KpiStrip({ items, "aria-label": ariaLabel = "Key measures", }) {
    const visible = enforceCapacity("kpi", items);
    if (visible.length === 0)
        return null;
    return (_jsx(Box, { component: "ul", "aria-label": ariaLabel, sx: {
            listStyle: "none",
            m: 0,
            p: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
        }, children: visible.map((item) => {
            const inner = (_jsxs(_Fragment, { children: [_jsx(Typography, { component: "span", sx: {
                            display: "block",
                            ...typeScaleSx("caption"),
                            color: colors.textSecondary,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            fontWeight: 600,
                        }, children: item.label }), _jsx(Typography, { component: "span", sx: {
                            display: "block",
                            ...typeScaleSx("kpi"),
                            fontWeight: 600,
                            color: colors.ink,
                            lineHeight: 1.2,
                        }, children: item.value })] }));
            return (_jsx(Box, { component: "li", sx: { minWidth: 72 }, children: item.onClick ? (_jsx(Box, { component: "button", type: "button", onClick: item.onClick, sx: {
                        all: "unset",
                        cursor: "pointer",
                        display: "block",
                        "&:focus-visible": {
                            outline: `2px solid ${colors.accent}`,
                            outlineOffset: 2,
                        },
                    }, children: inner })) : (inner) }, item.id));
        }) }));
}
export default KpiStrip;
//# sourceMappingURL=KpiStrip.js.map