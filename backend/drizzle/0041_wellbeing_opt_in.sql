-- ASPRF wellbeing dimension opt-in (per team member).
ALTER TABLE "esti_teammember"
  ADD COLUMN IF NOT EXISTS "wellbeing_opt_in" boolean NOT NULL DEFAULT false;
