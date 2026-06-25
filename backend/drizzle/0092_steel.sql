-- Construction Cost OS Phase E — BBS into the spine + steel reconciliation.
-- The Bar Bending Schedule gains spine links (work package / BOQ line / drawing
-- revision) and an optional floor on each line for floor-wise roll-ups. A new
-- steel reconciliation compares, per diameter, the steel scheduled (seeded from
-- the BBS) against issued (store → site) and consumed (measured / placed); the
-- gap is wastage. All statements are additive + idempotent (safe to re-run on
-- boot): the Phase A–D spine keeps working unchanged. `boq_item_id` on the BBS is
-- a Rule 9 ledger key and stays FK-free; the other links get soft FKs. Steel
-- quantities are kilograms.

ALTER TABLE "esti_bbs" ADD COLUMN IF NOT EXISTS "work_package_id" uuid;
--> statement-breakpoint
ALTER TABLE "esti_bbs" ADD COLUMN IF NOT EXISTS "boq_item_id" uuid;
--> statement-breakpoint
ALTER TABLE "esti_bbs" ADD COLUMN IF NOT EXISTS "drawing_id" uuid;
--> statement-breakpoint
ALTER TABLE "esti_bbs_item" ADD COLUMN IF NOT EXISTS "floor" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_steel_reconciliation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ref" text NOT NULL UNIQUE,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE CASCADE,
  "work_package_id" uuid,
  "bbs_id" uuid,
  "title" text NOT NULL,
  "status" text NOT NULL DEFAULT 'DRAFT',
  "notes" text,
  "scheduled_kg" double precision NOT NULL DEFAULT 0,
  "issued_kg" double precision NOT NULL DEFAULT 0,
  "consumed_kg" double precision NOT NULL DEFAULT 0,
  "wastage_kg" double precision NOT NULL DEFAULT 0,
  "finalized_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "finalized_at" timestamptz,
  "created_by_id" uuid REFERENCES "esti_user"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_steel_reconciliation_project_idx" ON "esti_steel_reconciliation" ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_steel_reconciliation_wp_idx" ON "esti_steel_reconciliation" ("work_package_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_steel_reconciliation_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reconciliation_id" uuid NOT NULL REFERENCES "esti_steel_reconciliation"("id") ON DELETE CASCADE,
  "dia_mm" integer NOT NULL,
  "scheduled_kg" double precision NOT NULL DEFAULT 0,
  "issued_kg" double precision NOT NULL DEFAULT 0,
  "consumed_kg" double precision NOT NULL DEFAULT 0,
  "wastage_kg" double precision NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_steel_reconciliation_item_recon_idx" ON "esti_steel_reconciliation_item" ("reconciliation_id");
--> statement-breakpoint
-- Soft FKs for the BBS spine links (plain uuids in the schema module). The BBS
-- boq_item_id stays FK-free — it is a Rule 9 project-wide ledger key.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_bbs_work_package_id_fk') THEN
    ALTER TABLE "esti_bbs" ADD CONSTRAINT "esti_bbs_work_package_id_fk"
      FOREIGN KEY ("work_package_id") REFERENCES "esti_work_package"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_bbs_drawing_id_fk') THEN
    ALTER TABLE "esti_bbs" ADD CONSTRAINT "esti_bbs_drawing_id_fk"
      FOREIGN KEY ("drawing_id") REFERENCES "esti_drawing"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_steel_reconciliation_work_package_id_fk') THEN
    ALTER TABLE "esti_steel_reconciliation" ADD CONSTRAINT "esti_steel_reconciliation_work_package_id_fk"
      FOREIGN KEY ("work_package_id") REFERENCES "esti_work_package"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_steel_reconciliation_bbs_id_fk') THEN
    ALTER TABLE "esti_steel_reconciliation" ADD CONSTRAINT "esti_steel_reconciliation_bbs_id_fk"
      FOREIGN KEY ("bbs_id") REFERENCES "esti_bbs"("id") ON DELETE SET NULL;
  END IF;
END $$;
