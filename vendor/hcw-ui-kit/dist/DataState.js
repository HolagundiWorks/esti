import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Paper, Skeleton, Stack } from "@mui/material";
/**
 * DataState — uniform loading / empty handling for list screens (the HCW
 * "never a blank stage" rule). While `loading`, shows a table-shaped skeleton;
 * when the data set is empty, shows a one-sentence empty state with an optional
 * single action; otherwise renders `children`.
 *
 * Promoted from the app (2026-07) so every portal shares one loading/empty grammar.
 *
 *   <DataState loading={q.isLoading} isEmpty={rows.length === 0}
 *              empty={{ title: "No invoices yet", action: <Button…/> }}>
 *     <DataGrid … />
 *   </DataState>
 */
export function DataState({ loading, isEmpty, empty, columnCount = 4, skeleton, children, }) {
    if (loading) {
        return (_jsx(_Fragment, { children: skeleton ?? (_jsx(Stack, { spacing: 0.5, children: Array.from({ length: 5 }).map((_, row) => (_jsx(Stack, { direction: "row", spacing: 1, children: Array.from({ length: columnCount }).map((__, col) => (_jsx(Skeleton, { variant: "rectangular", height: row === 0 ? 40 : 32, sx: { flex: 1 } }, col))) }, row))) })) }));
    }
    if (isEmpty) {
        return (_jsx(Paper, { sx: { p: 3 }, children: _jsxs(Stack, { spacing: 2, children: [_jsx("h3", { children: empty.title }), empty.description && _jsx("p", { children: empty.description }), empty.action] }) }));
    }
    return _jsx(_Fragment, { children: children });
}
export default DataState;
