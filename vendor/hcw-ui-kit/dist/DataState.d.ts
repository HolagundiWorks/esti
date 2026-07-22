import type { ReactNode } from "react";
/**
 * DataState — uniform loading / empty handling (HCW "never a blank stage").
 * Empty state keeps title · description · action in one contiguous cluster
 * (Mayer spatial contiguity) — the action sits with the void, not only in the dock.
 */
export declare function DataState({ loading, isEmpty, empty, columnCount, skeleton, children, }: {
    loading: boolean;
    isEmpty: boolean;
    /** Empty-state copy + optional action (one sentence + one action — Cowan/Miller). */
    empty: {
        title: string;
        description?: string;
        action?: ReactNode;
    };
    columnCount?: number;
    skeleton?: ReactNode;
    children: ReactNode;
}): import("react").JSX.Element;
export default DataState;
//# sourceMappingURL=DataState.d.ts.map