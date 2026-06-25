-- Phase 7 cleanup: persist the spec → rate-book mapping. A specification
-- catalogue item can now reference the rate-book (DSR) item it is costed
-- against. ON DELETE SET NULL so removing a rate item just clears the link.
ALTER TABLE "esti_spec_catalog_item"
  ADD COLUMN IF NOT EXISTS "rate_item_id" uuid;

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so guard it for idempotent boot.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'esti_spec_catalog_item_rate_item_id_fk'
  ) THEN
    ALTER TABLE "esti_spec_catalog_item"
      ADD CONSTRAINT "esti_spec_catalog_item_rate_item_id_fk"
      FOREIGN KEY ("rate_item_id") REFERENCES "esti_dsr_item"("id") ON DELETE SET NULL;
  END IF;
END $$;
