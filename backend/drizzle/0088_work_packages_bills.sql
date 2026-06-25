-- Estimation OS Phase 4 — work packages + running-bill estimation links.
-- Groups frozen BOQ items into contractor packages; running bills then measure
-- against package items with double-billing prevention (previous / cumulative /
-- balance qty). All statements are additive + idempotent (safe to re-run on
-- boot): existing flat free-text bills, the contractor portal, and the PMC read
-- models keep working unchanged. Money is integer paise.

CREATE TABLE IF NOT EXISTS "esti_work_package" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ref" text NOT NULL UNIQUE,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "estimate_id" uuid NOT NULL REFERENCES "esti_estimate"("id") ON DELETE CASCADE,
  "estimate_version_id" uuid REFERENCES "esti_estimate_version"("id"),
  "contractor_id" uuid REFERENCES "esti_contractor"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "package_type" text NOT NULL DEFAULT 'CIVIL',
  "status" text NOT NULL DEFAULT 'DRAFT',
  "contract_value_paise" bigint NOT NULL DEFAULT 0,
  "notes" text,
  "created_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_work_package_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "work_package_id" uuid NOT NULL REFERENCES "esti_work_package"("id") ON DELETE CASCADE,
  "boq_item_id" uuid REFERENCES "esti_estimate_item"("id") ON DELETE SET NULL,
  "component_id" uuid REFERENCES "esti_component"("id") ON DELETE SET NULL,
  "description" text NOT NULL,
  "unit" text NOT NULL,
  "approved_qty" double precision NOT NULL DEFAULT 0,
  "variation_qty" double precision NOT NULL DEFAULT 0,
  "rate_paise" bigint NOT NULL DEFAULT 0,
  "amount_paise" bigint NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "esti_running_bill" ADD COLUMN IF NOT EXISTS "work_package_id" uuid REFERENCES "esti_work_package"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "esti_running_bill_item" ADD COLUMN IF NOT EXISTS "work_package_item_id" uuid REFERENCES "esti_work_package_item"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "esti_running_bill_item" ADD COLUMN IF NOT EXISTS "boq_item_id" uuid;
--> statement-breakpoint
ALTER TABLE "esti_running_bill_item" ADD COLUMN IF NOT EXISTS "component_id" uuid;
--> statement-breakpoint
ALTER TABLE "esti_running_bill_item" ADD COLUMN IF NOT EXISTS "previous_billed_qty" double precision NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "esti_running_bill_item" ADD COLUMN IF NOT EXISTS "cumulative_billed_qty" double precision NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "esti_running_bill_item" ADD COLUMN IF NOT EXISTS "balance_qty" double precision NOT NULL DEFAULT 0;
--> statement-breakpoint
-- Soft FKs for the measurement-record estimate links (mirrors the schema's plain
-- uuid columns; added here to keep referential integrity without an import cycle).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_running_bill_item_boq_item_id_fk') THEN
    ALTER TABLE "esti_running_bill_item" ADD CONSTRAINT "esti_running_bill_item_boq_item_id_fk"
      FOREIGN KEY ("boq_item_id") REFERENCES "esti_estimate_item"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_running_bill_item_component_id_fk') THEN
    ALTER TABLE "esti_running_bill_item" ADD CONSTRAINT "esti_running_bill_item_component_id_fk"
      FOREIGN KEY ("component_id") REFERENCES "esti_component"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_work_package_project_idx" ON "esti_work_package" ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_work_package_item_package_idx" ON "esti_work_package_item" ("work_package_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_running_bill_item_boq_item_idx" ON "esti_running_bill_item" ("boq_item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_running_bill_work_package_idx" ON "esti_running_bill" ("work_package_id");
