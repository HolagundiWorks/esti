-- Firm wellness settings — snack/lunch break reminder times (WellnessSettings).
ALTER TABLE "esti_orgsettings"
  ADD COLUMN IF NOT EXISTS "wellness" jsonb NOT NULL DEFAULT '{"snackBreak":null,"lunchBreak":null}'::jsonb;
