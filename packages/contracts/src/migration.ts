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
