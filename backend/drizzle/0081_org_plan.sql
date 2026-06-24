-- Subscription edition (Lite / Core / Enterprise) on the single-firm org settings.
-- Gates features and quotas; defaults LITE for new installs.
ALTER TABLE "esti_orgsettings" ADD COLUMN IF NOT EXISTS "plan" text NOT NULL DEFAULT 'LITE';
