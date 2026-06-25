-- AORMS-Lite fixed workspace: client activate/deactivate + storage metering.
ALTER TABLE "esti_client" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "esti_orgsettings" ADD COLUMN IF NOT EXISTS "storage_bytes_used" bigint DEFAULT 0 NOT NULL;
