import { DataTableSkeleton } from "@carbon/react";
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
    return <DataTableSkeleton columnCount={columnCount} rowCount={5} showHeader={false} showToolbar={false} />;
  }
  if (isEmpty) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem 1rem",
          border: "1px dashed var(--cds-border-subtle)",
          borderRadius: 4,
          color: "var(--cds-text-secondary)",
        }}
      >
        <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>{empty.title}</p>
        {empty.description && <p style={{ marginTop: 4 }}>{empty.description}</p>}
        {empty.action && <div style={{ marginTop: 16 }}>{empty.action}</div>}
      </div>
    );
  }
  return <>{children}</>;
}
