import { Paper, Skeleton, Stack } from "@mui/material";
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
export function DataState({
  loading,
  isEmpty,
  empty,
  columnCount = 4,
  skeleton,
  children,
}: {
  loading: boolean;
  isEmpty: boolean;
  /** Empty-state copy + optional action (one sentence + one action — Miller). */
  empty: { title: string; description?: string; action?: ReactNode };
  /** Skeleton column count (match the real table). */
  columnCount?: number;
  /** Custom loading skeleton for non-table screens (e.g. a tile grid). */
  skeleton?: ReactNode;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <>
        {skeleton ?? (
          <Stack spacing={0.5}>
            {Array.from({ length: 5 }).map((_, row) => (
              <Stack key={row} direction="row" spacing={1}>
                {Array.from({ length: columnCount }).map((__, col) => (
                  <Skeleton
                    key={col}
                    variant="rectangular"
                    height={row === 0 ? 40 : 32}
                    sx={{ flex: 1 }}
                  />
                ))}
              </Stack>
            ))}
          </Stack>
        )}
      </>
    );
  }
  if (isEmpty) {
    return (
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <h3>{empty.title}</h3>
          {empty.description && <p>{empty.description}</p>}
          {empty.action}
        </Stack>
      </Paper>
    );
  }
  return <>{children}</>;
}

export default DataState;
