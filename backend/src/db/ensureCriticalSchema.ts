import { sql } from "drizzle-orm";
import type { DB } from "./index.js";

/**
 * Belt-and-suspenders column/table guards for migrations that were historically
 * committed as SQL without a journal entry (see PRODUCTION-OPS.md). Idempotent —
 * safe on every boot after `runMigrations()`.
 */
export async function ensureCriticalSchema(db: DB): Promise<void> {
  await db.execute(sql`
    ALTER TABLE esti_user
      ADD COLUMN IF NOT EXISTS must_complete_workspace_profile boolean NOT NULL DEFAULT false
  `);

  await db.execute(sql`
    ALTER TABLE esti_orgsettings
      ADD COLUMN IF NOT EXISTS licence_status text NOT NULL DEFAULT 'ACTIVE'
  `);

  await db.execute(sql`
    ALTER TABLE esti_orgsettings
      ADD COLUMN IF NOT EXISTS ai_tokens_this_month integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ai_tokens_month_start timestamptz
  `);

  await db.execute(sql`
    ALTER TABLE hlp_account
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS profile jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz
  `);
}
