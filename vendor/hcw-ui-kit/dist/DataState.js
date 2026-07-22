import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Paper, Skeleton, Stack } from "@mui/material";
import { TYPE_SCALE, colors } from "./tokens.js";
/**
 * DataState — uniform loading / empty handling (HCW "never a blank stage").
 * Empty state keeps title · description · action in one contiguous cluster
 * (Mayer spatial contiguity) — the action sits with the void, not only in the dock.
 */
export function DataState({ loading, isEmpty, empty, columnCount = 4, skeleton, children, }) {
    if (loading) {
        return (_jsx(_Fragment, { children: skeleton ?? (_jsx(Stack, { spacing: 0.5, children: Array.from({ length: 5 }).map((_, row) => (_jsx(Stack, { direction: "row", spacing: 1, children: Array.from({ length: columnCount }).map((__, col) => (_jsx(Skeleton, { variant: "rectangular", height: row === 0 ? 40 : 32, sx: { flex: 1 } }, col))) }, row))) })) }));
    }
    if (isEmpty) {
        return (_jsx(Paper, { sx: {
                p: 3,
                maxWidth: 480,
            }, role: "status", children: _jsxs(Stack, { spacing: 1.5, sx: { alignItems: "flex-start" }, children: [_jsx("h3", { style: { margin: 0, fontSize: TYPE_SCALE.subtitle, fontWeight: 600, color: colors.ink }, children: empty.title }), empty.description ? (_jsx("p", { style: { margin: 0, fontSize: TYPE_SCALE.body2, color: colors.textSecondary }, children: empty.description })) : null, empty.action] }) }));
    }
    return _jsx(_Fragment, { children: children });
}
export default DataState;
//# sourceMappingURL=DataState.js.map