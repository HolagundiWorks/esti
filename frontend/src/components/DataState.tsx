import { Paper, Skeleton, Stack } from "@mui/material";
import type { ReactNode } from "react";

/**
 * Uniform loading / empty handling for list screens. While `loading`, shows a
 * table-shaped skeleton; when the data set is empty, shows a centred empty state
 * with an optional call to action; otherwise renders `children`.
 *
 * Migrated to Material UI (Paper + Skeleton). API unchanged.
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
  /** Empty-state copy + optional action. */
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
