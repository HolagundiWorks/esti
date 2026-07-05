ALTER TABLE "esti_org_settings" ADD COLUMN IF NOT EXISTS "storage_purchased_bytes" bigint NOT NULL DEFAULT 0;
