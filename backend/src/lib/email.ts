import { type SQL, sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

/** Canonical email form for login lookup and new user rows. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Case-insensitive equality against a normalized email — the canonical way to
 * look up or de-duplicate a login by address. Compares on `lower(column)` so it
 * matches regardless of the stored casing (incl. legacy rows saved before emails
 * were normalized on write), and unlike `ilike` it does **not** treat `_`/`%` in
 * the address as LIKE wildcards.
 */
export function emailMatches(column: AnyColumn, email: string): SQL {
  return sql`lower(${column}) = ${normalizeEmail(email)}`;
}
