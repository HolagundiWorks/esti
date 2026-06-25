-- Construction Cost OS Phase A+B — item-wise (BOQ-line) tendering + award bridge.
-- A tender can carry BOQ line items (carved from a frozen estimate version, or
-- added manually); contractors quote a rate per line; award seeds a work package
-- from the winning rates. All statements are additive + idempotent (safe to
-- re-run on boot): existing lump-sum tenders, bids, the contractor portal, and
-- the Phase-4 work-package / running-bill spine keep working unchanged. Money is
-- integer paise.

ALTER TABLE "esti_tender" ADD COLUMN IF NOT EXISTS "estimate_version_id" uuid;
--> statement-breakpoint
ALTER TABLE "esti_work_package" ADD COLUMN IF NOT EXISTS "tender_id" uuid;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_tender_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tender_id" uuid NOT NULL REFERENCES "esti_tender"("id") ON DELETE CASCADE,
  "boq_item_id" uuid,
  "component_id" uuid,
  "description" text NOT NULL,
  "unit" text NOT NULL,
  "qty" double precision NOT NULL DEFAULT 0,
  "est_rate_paise" bigint NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_tender_bid_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invitation_id" uuid NOT NULL REFERENCES "esti_tender_invitation"("id") ON DELETE CASCADE,
  "tender_item_id" uuid NOT NULL REFERENCES "esti_tender_item"("id") ON DELETE CASCADE,
  "rate_paise" bigint NOT NULL DEFAULT 0,
  "amount_paise" bigint NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Soft FKs for the cross-module estimate links (mirrors the schema's plain uuid
-- columns; added here to keep referential integrity without an import cycle).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_tender_estimate_version_id_fk') THEN
    ALTER TABLE "esti_tender" ADD CONSTRAINT "esti_tender_estimate_version_id_fk"
      FOREIGN KEY ("estimate_version_id") REFERENCES "esti_estimate_version"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_work_package_tender_id_fk') THEN
    ALTER TABLE "esti_work_package" ADD CONSTRAINT "esti_work_package_tender_id_fk"
      FOREIGN KEY ("tender_id") REFERENCES "esti_tender"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_tender_item_boq_item_id_fk') THEN
    ALTER TABLE "esti_tender_item" ADD CONSTRAINT "esti_tender_item_boq_item_id_fk"
      FOREIGN KEY ("boq_item_id") REFERENCES "esti_estimate_item"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'esti_tender_item_component_id_fk') THEN
    ALTER TABLE "esti_tender_item" ADD CONSTRAINT "esti_tender_item_component_id_fk"
      FOREIGN KEY ("component_id") REFERENCES "esti_component"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
-- One rate per (invitation, tender item) — the code upserts against this.
CREATE UNIQUE INDEX IF NOT EXISTS "esti_tender_bid_item_invitation_item_uq"
  ON "esti_tender_bid_item" ("invitation_id", "tender_item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_tender_item_tender_idx" ON "esti_tender_item" ("tender_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_tender_bid_item_item_idx" ON "esti_tender_bid_item" ("tender_item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_work_package_tender_idx" ON "esti_work_package" ("tender_id");
