-- Repair migrations skipped when journal entries were missing on some VPS DBs.
ALTER TABLE "esti_teammember"
  ADD COLUMN IF NOT EXISTS "wellbeing_opt_in" boolean NOT NULL DEFAULT false;
