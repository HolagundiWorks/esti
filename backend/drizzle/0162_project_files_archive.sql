ALTER TABLE "esti_projectoffice" ADD COLUMN IF NOT EXISTS "files_archived_at" timestamptz;
ALTER TABLE "esti_projectoffice" ADD COLUMN IF NOT EXISTS "files_archived_by_id" uuid REFERENCES "esti_user"("id");
ALTER TABLE "esti_projectoffice" ADD COLUMN IF NOT EXISTS "files_archived_bytes" bigint NOT NULL DEFAULT 0;
