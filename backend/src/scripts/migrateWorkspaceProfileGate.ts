/**
 * One-time migration: flag existing staff users for workspace profile confirmation.
 * Applied automatically via drizzle 0172_workspace_profile_gate.sql on boot;
 * this script re-runs the UPDATE safely for manual ops.
 *
 *   pnpm --filter @esti/backend migrate:workspace-profile
 */
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";

async function main() {
  const result = await db.execute(sql`
    UPDATE esti_user
    SET must_complete_workspace_profile = true
    WHERE is_demo = false
      AND disabled = false
      AND role IN (
        'OWNER', 'PARTNER', 'ACCOUNTANT', 'HR_MANAGER',
        'SENIOR', 'ASSOCIATE', 'VIEWER', 'SITE_SUPERVISOR'
      )
      AND consultant_id IS NULL
      AND client_id IS NULL
      AND contractor_id IS NULL
      AND must_complete_workspace_profile = false
  `);
  console.log(`✓ workspace profile gate updated (${result.rowCount ?? "?"} rows)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
