-- Construction Cost OS Phase D — Controls (quantity + rate deviations, variation
-- orders / "additions", extra items, two-step approval). A deviation makes
-- scope/rate drift against the contract visible and governed; a variation order
-- is the ONLY thing that mutates the billable ledger (work_package_item.
-- variation_qty), and only after a recorded internal + client sign-off. A RATE
-- deviation is document-and-approve only — it never overwrites the contract rate
-- (Rule 5). All statements are additive + idempotent (safe to re-run on boot):
-- the Phase A–C spine (estimate → work package → measurement → running bill)
-- keeps working unchanged. Money is integer paise; signed where noted.

CREATE TABLE IF NOT EXISTS "esti_deviation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ref" text NOT NULL UNIQUE,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "work_package_id" uuid NOT NULL REFERENCES "esti_work_package"("id") ON DELETE CASCADE,
  "work_package_item_id" uuid REFERENCES "esti_work_package_item"("id") ON DELETE SET NULL,
  "boq_item_id" uuid,
  "deviation_type" text NOT NULL,
  "description" text NOT NULL,
  "unit" text NOT NULL,
  "boq_qty" double precision NOT NULL DEFAULT 0,
  "executed_qty" double precision NOT NULL DEFAULT 0,
  "deviation_qty" double precision NOT NULL DEFAULT 0,
  "deviation_pct" double precision NOT NULL DEFAULT 0,
  "estimated_rate_paise" bigint NOT NULL DEFAULT 0,
  "tendered_rate_paise" bigint NOT NULL DEFAULT 0,
  "awarded_rate_paise" bigint NOT NULL DEFAULT 0,
  "revised_rate_paise" bigint NOT NULL DEFAULT 0,
  "cost_impact_paise" bigint NOT NULL DEFAULT 0,
  "reason" text,
  "reason_source" text NOT NULL DEFAULT 'OTHER',
  "status" text NOT NULL DEFAULT 'OPEN',
  "variation_id" uuid,
  "approved_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "approved_at" timestamptz,
  "rejection_reason" text,
  "created_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_deviation_project_idx" ON "esti_deviation" ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_deviation_wp_idx" ON "esti_deviation" ("work_package_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_deviation_boq_idx" ON "esti_deviation" ("boq_item_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_variation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ref" text NOT NULL UNIQUE,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "work_package_id" uuid REFERENCES "esti_work_package"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "reason" text,
  "originator" text NOT NULL DEFAULT 'CLIENT',
  "linked_drawing_id" uuid,
  "linked_drawing_revision_id" uuid,
  "cost_impact_paise" bigint NOT NULL DEFAULT 0,
  "time_impact_days" integer NOT NULL DEFAULT 0,
  "billable" boolean NOT NULL DEFAULT true,
  "status" text NOT NULL DEFAULT 'DRAFT',
  "internal_approved_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "internal_approved_at" timestamptz,
  "client_approved_by_name" text,
  "client_approved_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "client_approved_at" timestamptz,
  "applied_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "applied_at" timestamptz,
  "rejection_reason" text,
  "created_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_variation_project_idx" ON "esti_variation" ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_variation_wp_idx" ON "esti_variation" ("work_package_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_variation_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "variation_id" uuid NOT NULL REFERENCES "esti_variation"("id") ON DELETE CASCADE,
  "work_package_item_id" uuid REFERENCES "esti_work_package_item"("id") ON DELETE SET NULL,
  "boq_item_id" uuid,
  "is_extra_item" boolean NOT NULL DEFAULT false,
  "description" text NOT NULL,
  "unit" text NOT NULL,
  "qty" double precision NOT NULL DEFAULT 0,
  "rate_paise" bigint NOT NULL DEFAULT 0,
  "amount_paise" bigint NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_variation_item_variation_idx" ON "esti_variation_item" ("variation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_variation_item_boq_idx" ON "esti_variation_item" ("boq_item_id");
--> statement-breakpoint
-- Soft FK for the deviation→variation roll-up link (mirrors the schema's plain uuid).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_deviation_variation_id_fk') THEN
    ALTER TABLE "esti_deviation" ADD CONSTRAINT "esti_deviation_variation_id_fk"
      FOREIGN KEY ("variation_id") REFERENCES "esti_variation"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
-- Rule 9 ledger key fix. `boq_item_id` is a project-wide ledger key, not strictly
-- an estimate-item id: a variation's EXTRA item self-keys boq_item_id =
-- variation_item.id so its billable balance is tracked like any other line. 0088
-- gave work_package_item / running_bill_item a stale FK to esti_estimate_item
-- (esti_measurement_record — the same ledger key — never had one, and the schema
-- modules declare all three as plain uuids). That FK rejects the self-key and
-- breaks applyVariation / billing for extra items, so drop it to match the
-- schema. Idempotent; ON DELETE SET NULL means no data is touched.
ALTER TABLE "esti_work_package_item" DROP CONSTRAINT IF EXISTS "esti_work_package_item_boq_item_id_fkey";
--> statement-breakpoint
ALTER TABLE "esti_running_bill_item" DROP CONSTRAINT IF EXISTS "esti_running_bill_item_boq_item_id_fk";
