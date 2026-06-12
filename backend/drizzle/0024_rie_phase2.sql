-- Phase 4A: RIE POST_DESIGN mode, violation engine, relaxation inputs
ALTER TABLE esti_site_assessment
  ADD COLUMN IF NOT EXISTS assessment_phase text NOT NULL DEFAULT 'PRE_DESIGN',
  ADD COLUMN IF NOT EXISTS violations jsonb,
  ADD COLUMN IF NOT EXISTS relaxations jsonb;
