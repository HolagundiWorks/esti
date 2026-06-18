-- Phase 4D: link purchase-order lines to project specification / catalogue rows.

ALTER TABLE "esti_po_item"
  ADD COLUMN IF NOT EXISTS "spec_item_id" uuid REFERENCES "esti_specitem"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "esti_po_item"
  ADD COLUMN IF NOT EXISTS "catalog_item_id" uuid REFERENCES "esti_spec_catalog_item"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_po_item_spec" ON "esti_po_item" ("spec_item_id");
