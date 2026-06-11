import { DataTableSkeleton, Stack, Tile } from "@carbon/react";
import type { ReactNode } from "react";

/**
 * Uniform loading / empty handling for list screens. While `loading`, shows a
 * Carbon table skeleton; when the data set is empty, shows a centred empty
 * state with an optional call to action; otherwise renders `children`.
 */
export function DataState({
  loading,
  isEmpty,
  empty,
  columnCount = 4,
  children,
}: {
  loading: boolean;
  isEmpty: boolean;
  /** Empty-state copy + optional action. */
  empty: { title: string; description?: string; action?: ReactNode };
  /** Skeleton column count (match the real table). */
  columnCount?: number;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <DataTableSkeleton
        columnCount={columnCount}
        rowCount={5}
        showHeader={false}
        showToolbar={false}
      />
    );
  }
  if (isEmpty) {
    return (
      <Tile>
        <Stack gap={5}>
          <h3>{empty.title}</h3>
          {empty.description && <p>{empty.description}</p>}
          {empty.action}
        </Stack>
      </Tile>
    );
  }
  return <>{children}</>;
}
