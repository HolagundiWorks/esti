import { clampListLimit, type CursorParams } from "@esti/contracts";
import { and, eq, lt, or, type SQL, type AnyColumn } from "drizzle-orm";

export function cursorWhere(
  cursor: CursorParams | null | undefined,
  createdAtCol: AnyColumn,
  idCol: AnyColumn,
): SQL | undefined {
  if (!cursor) return undefined;
  return or(
    lt(createdAtCol, new Date(cursor.createdAt)),
    and(eq(createdAtCol, new Date(cursor.createdAt)), lt(idCol, cursor.id)),
  );
}

export function buildCursorPage<T extends { createdAt: Date; id: string }>(
  rows: T[],
  requestedLimit?: number | null,
): { rows: T[]; nextCursor: CursorParams | null } {
  const limit = clampListLimit(requestedLimit);
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows.at(-1);
  return {
    rows: pageRows,
    nextCursor:
      hasMore && last ?
        { createdAt: last.createdAt.toISOString(), id: last.id }
      : null,
  };
}
