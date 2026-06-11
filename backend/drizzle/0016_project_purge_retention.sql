ALTER TABLE "esti_projectoffice"
  ADD COLUMN IF NOT EXISTS "purge_after" date,
  ADD COLUMN IF NOT EXISTS "purged_at" timestamp with time zone;
