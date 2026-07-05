ALTER TABLE "esti_orgsettings" ADD COLUMN IF NOT EXISTS "storage_purchased_bytes" bigint NOT NULL DEFAULT 0;
