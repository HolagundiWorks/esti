-- 0193 — Typed project briefs: the design-basis parameter set per engagement.
ALTER TABLE esti_cons_engagement
  ADD COLUMN IF NOT EXISTS brief jsonb;
