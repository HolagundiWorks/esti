-- Construction Cost OS Phase F — final account + closure.
-- A per-work-package closing statement: its financial position is rolled up from
-- the spine (WP items → original + variation value; the package's running bills →
-- gross billed, deduction block, net paid) and the office enters the closing
-- adjustments (final certified, retention released) + attests closure (no-claim
-- cert, client final approval). Two-state DRAFT → CLOSED; closing is gated by
-- cost:approve, sets the parent work package to CLOSED, and is refused while any
-- deviation/variation is still open (Rule 6). Additive + idempotent (safe to
-- re-run on boot) — the Phase A–E spine is untouched. Money is integer paise. A
-- summary statement, so there is no item table; line detail stays in the running
-- bills + work-package items. esti_work_package / esti_user / esti_projectoffice
-- all predate this migration, so the FKs are inlined.

CREATE TABLE IF NOT EXISTS "esti_final_account" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ref" text NOT NULL UNIQUE,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "work_package_id" uuid REFERENCES "esti_work_package"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "status" text NOT NULL DEFAULT 'DRAFT',
  "notes" text,
  "original_contract_paise" bigint NOT NULL DEFAULT 0,
  "variation_paise" bigint NOT NULL DEFAULT 0,
  "gross_billed_paise" bigint NOT NULL DEFAULT 0,
  "retention_held_paise" bigint NOT NULL DEFAULT 0,
  "retention_released_paise" bigint NOT NULL DEFAULT 0,
  "advance_recovered_paise" bigint NOT NULL DEFAULT 0,
  "tax_tds_paise" bigint NOT NULL DEFAULT 0,
  "other_recovery_paise" bigint NOT NULL DEFAULT 0,
  "net_paid_paise" bigint NOT NULL DEFAULT 0,
  "final_certified_paise" bigint NOT NULL DEFAULT 0,
  "balance_due_paise" bigint NOT NULL DEFAULT 0,
  "no_claim_received" boolean NOT NULL DEFAULT false,
  "client_final_approval" boolean NOT NULL DEFAULT false,
  "checklist" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "closed_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "closed_at" timestamptz,
  "pdf_key" text,
  "pdf_status" text NOT NULL DEFAULT 'NONE',
  "created_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_final_account_project_idx" ON "esti_final_account" ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_final_account_wp_idx" ON "esti_final_account" ("work_package_id");
