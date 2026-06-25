-- Construction Cost OS Phase C — Site Measurement Book + bill types/deductions.
-- A site measurement (location/floor/zone + photo evidence + measured-by/checked-
-- by) is recorded against a work-package BOQ line, approved, then billed; the
-- double-billing guard now runs at approval time on approved measurement records.
-- Running bills gain a bill type + a deduction block (retention / advance / tax-
-- TDS / other → net payable) + a PDF. All statements are additive + idempotent
-- (safe to re-run on boot): existing bills, items, and the Phase-4 work-package /
-- running-bill spine keep working unchanged. Money is integer paise.

CREATE TABLE IF NOT EXISTS "esti_measurement_record" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ref" text NOT NULL UNIQUE,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "work_package_id" uuid NOT NULL REFERENCES "esti_work_package"("id") ON DELETE CASCADE,
  "work_package_item_id" uuid REFERENCES "esti_work_package_item"("id") ON DELETE SET NULL,
  "boq_item_id" uuid,
  "component_id" uuid,
  "description" text NOT NULL,
  "unit" text NOT NULL,
  "qty" double precision NOT NULL DEFAULT 0,
  "location" text,
  "floor" text,
  "zone" text,
  "photo_key" text,
  "measured_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "measured_by_name" text,
  "checked_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "checked_by_name" text,
  "status" text NOT NULL DEFAULT 'MEASURED',
  "approved_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "approved_at" timestamptz,
  "rejection_reason" text,
  "running_bill_id" uuid,
  "notes" text,
  "created_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_measurement_record_project_idx" ON "esti_measurement_record" ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_measurement_record_wp_idx" ON "esti_measurement_record" ("work_package_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_measurement_record_boq_idx" ON "esti_measurement_record" ("boq_item_id");
--> statement-breakpoint
-- Bill type + deduction block + net payable + PDF (Phase C). total_paise stays
-- the gross (Σ qty×rate) — net_payable_paise is backfilled to gross for existing
-- rows below so historical bills read as "no deductions".
ALTER TABLE "esti_running_bill" ADD COLUMN IF NOT EXISTS "bill_type" text NOT NULL DEFAULT 'RA';
--> statement-breakpoint
ALTER TABLE "esti_running_bill" ADD COLUMN IF NOT EXISTS "retention_paise" bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "esti_running_bill" ADD COLUMN IF NOT EXISTS "advance_recovery_paise" bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "esti_running_bill" ADD COLUMN IF NOT EXISTS "tax_tds_paise" bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "esti_running_bill" ADD COLUMN IF NOT EXISTS "other_recovery_paise" bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "esti_running_bill" ADD COLUMN IF NOT EXISTS "net_payable_paise" bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "esti_running_bill" ADD COLUMN IF NOT EXISTS "pdf_key" text;
--> statement-breakpoint
ALTER TABLE "esti_running_bill" ADD COLUMN IF NOT EXISTS "pdf_status" text NOT NULL DEFAULT 'NONE';
--> statement-breakpoint
UPDATE "esti_running_bill" SET "net_payable_paise" = "total_paise" WHERE "net_payable_paise" = 0 AND "total_paise" <> 0;
--> statement-breakpoint
ALTER TABLE "esti_running_bill_item" ADD COLUMN IF NOT EXISTS "measurement_record_id" uuid;
--> statement-breakpoint
-- Soft FK for the measurement-record link (mirrors the schema's plain uuid).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_running_bill_item_measurement_record_id_fk') THEN
    ALTER TABLE "esti_running_bill_item" ADD CONSTRAINT "esti_running_bill_item_measurement_record_id_fk"
      FOREIGN KEY ("measurement_record_id") REFERENCES "esti_measurement_record"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_measurement_record_running_bill_id_fk') THEN
    ALTER TABLE "esti_measurement_record" ADD CONSTRAINT "esti_measurement_record_running_bill_id_fk"
      FOREIGN KEY ("running_bill_id") REFERENCES "esti_running_bill"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_running_bill_item_measurement_idx" ON "esti_running_bill_item" ("measurement_record_id");
