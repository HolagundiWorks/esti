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

  // 0176_drawing_review — drawing QC / peer-review checkpoint (SOP-07/08).
  await db.execute(sql`
    ALTER TABLE esti_drawing
      ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'PENDING_REVIEW',
      ADD COLUMN IF NOT EXISTS reviewed_by_id uuid REFERENCES esti_user(id),
      ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
      ADD COLUMN IF NOT EXISTS review_note text
  `);

  // 0177_lead_conflict_check — COA Regulations 1989 check on lead conversion (SOP-26).
  await db.execute(sql`
    ALTER TABLE esti_lead
      ADD COLUMN IF NOT EXISTS conflict_check_done boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS conflict_check_notes text
  `);

  // 0178_academy_sop_progress — LXOS Academy theory/practical tracking.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS esti_sop_progress (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES esti_user(id) ON DELETE CASCADE,
      sop_code text NOT NULL,
      theory_read_at timestamptz,
      practical_source text,
      practical_at timestamptz,
      practical_note text,
      completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS esti_sop_progress_user_sop_idx
      ON esti_sop_progress (user_id, sop_code)
  `);
}
