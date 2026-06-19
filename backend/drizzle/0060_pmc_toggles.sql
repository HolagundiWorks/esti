ALTER TABLE "esti_orgsettings" ADD COLUMN IF NOT EXISTS "pmc_enabled" boolean NOT NULL DEFAULT false;

ALTER TABLE "esti_projectoffice" ADD COLUMN IF NOT EXISTS "pmc_enabled" boolean NOT NULL DEFAULT false;
