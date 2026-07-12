import type { ReactNode } from "react";
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
export declare function DataState({ loading, isEmpty, empty, columnCount, skeleton, children, }: {
    loading: boolean;
    isEmpty: boolean;
    /** Empty-state copy + optional action (one sentence + one action — Miller). */
    empty: {
        title: string;
        description?: string;
        action?: ReactNode;
    };
    /** Skeleton column count (match the real table). */
    columnCount?: number;
    /** Custom loading skeleton for non-table screens (e.g. a tile grid). */
    skeleton?: ReactNode;
    children: ReactNode;
}): import("react").JSX.Element;
export default DataState;
