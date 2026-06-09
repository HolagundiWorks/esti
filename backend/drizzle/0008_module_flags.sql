ALTER TABLE "esti_orgsettings" ADD COLUMN "financial_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "esti_orgsettings" ADD COLUMN "project_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "esti_orgsettings" ADD COLUMN "admin_enabled" boolean DEFAULT true NOT NULL;