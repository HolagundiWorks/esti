import { z } from "zod";
import { Plan } from "./plans.js";

/**
 * Local → cloud migration (Phase 2). A local-first Lite/Pro install packages its
 * WHOLE instance (all `esti_*` rows + object-store bytes) into a versioned
 * bundle and ships it to a fresh, empty cloud tenant. The firm boundary is the
 * database boundary (no `firm_id` on domain tables), so a whole-instance
 * transfer is clean — provided the target is empty (no id-remap needed).
 *
 * This module defines only the SHARED, read-only contract: the bundle version,
 * the preflight readiness report, and the pure blocker logic. The destructive
 * import/cutover lives server-side and is gated behind an empty-target check.
 */

/** Bump when the migration bundle SHAPE changes (not on every schema migration). */
export const MIGRATION_BUNDLE_VERSION = 1;

/** Read-only readiness report: what would move, and whether the move can start. */
export const MigrationPreflight = z.object({
  bundleVersion: z.number().int(),
  /** Applied-migration count on the source — the schema-version handshake. */
  schemaHead: z.number().int(),
  plan: Plan,
  firmName: z.string(),
  counts: z.object({
    users: z.number().int().nonnegative(),
    projects: z.number().int().nonnegative(),
    clients: z.number().int().nonnegative(),
    invoices: z.number().int().nonnegative(),
    drawings: z.number().int().nonnegative(),
  }),
  /** Total object-store bytes that would be re-uploaded to the cloud bucket. */
  fileBytes: z.number().int().nonnegative(),
  ready: z.boolean(),
  blockers: z.array(z.string()),
});
export type MigrationPreflight = z.infer<typeof MigrationPreflight>;

/**
 * Pure readiness check — the reasons a local→cloud migration cannot start yet.
 * Empty array ⇒ ready. Kept pure so it is unit-testable and shared by the SPA.
 */
export function migrationBlockers(input: { plan: Plan }): string[] {
  const blockers: string[] = [];
  if (input.plan !== "PRO") {
    blockers.push("Upgrade to Pro before moving your studio to the cloud.");
  }
  return blockers;
}

/**
 * The complete bundle table-of-contents: every `esti_*` table's exact row count,
 * the schema head, and total object-store bytes. The export stamps it into the
 * bundle; after restore the cloud recomputes its own and `diffManifest` proves
 * the transfer was faithful (nothing dropped, no schema skew).
 */
export const MigrationManifest = z.object({
  bundleVersion: z.number().int(),
  schemaHead: z.number().int(),
  plan: Plan,
  firmName: z.string(),
  tables: z.array(z.object({ table: z.string(), rows: z.number().int().nonnegative() })),
  fileBytes: z.number().int().nonnegative(),
});
export type MigrationManifest = z.infer<typeof MigrationManifest>;

/**
 * A whole-instance bundle: the manifest plus every `esti_*` table's rows as JSON.
 * v1 carries DB rows only (object-store bytes move separately); the manifest's
 * fileBytes is informational and is neutralised in the import's DB-only verify.
 */
export const MigrationBundle = z.object({
  manifest: MigrationManifest,
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});
export type MigrationBundle = z.infer<typeof MigrationBundle>;

export interface ManifestDiff {
  ok: boolean;
  bundleVersionMismatch: boolean;
  schemaHeadMismatch: boolean;
  fileBytesMismatch: boolean;
  tableMismatches: { table: string; expected: number; actual: number }[];
}

/**
 * Compare the bundle's manifest (`expected`) against the restored target's
 * (`actual`). `ok` ⇒ a faithful, complete transfer. Pure: this is the import's
 * verification gate — do not cut over unless it returns ok.
 */
export function diffManifest(expected: MigrationManifest, actual: MigrationManifest): ManifestDiff {
  const actualByTable = new Map(actual.tables.map((t) => [t.table, t.rows]));
  const expectedTables = new Set(expected.tables.map((t) => t.table));
  const tableMismatches: { table: string; expected: number; actual: number }[] = [];

  for (const t of expected.tables) {
    const a = actualByTable.get(t.table) ?? 0;
    if (a !== t.rows) tableMismatches.push({ table: t.table, expected: t.rows, actual: a });
  }
  // Rows that appeared in the target but were not in the bundle (non-empty target).
  for (const t of actual.tables) {
    if (!expectedTables.has(t.table) && t.rows !== 0) {
      tableMismatches.push({ table: t.table, expected: 0, actual: t.rows });
    }
  }

  const bundleVersionMismatch = expected.bundleVersion !== actual.bundleVersion;
  const schemaHeadMismatch = expected.schemaHead !== actual.schemaHead;
  const fileBytesMismatch = expected.fileBytes !== actual.fileBytes;
  return {
    ok: !bundleVersionMismatch && !schemaHeadMismatch && !fileBytesMismatch && tableMismatches.length === 0,
    bundleVersionMismatch,
    schemaHeadMismatch,
    fileBytesMismatch,
    tableMismatches,
  };
}
