-- 0153 — Dependency derivation. A KB dependency edge now carries a derivation
-- formula (how the child's measurement is computed from the parent's), and an
-- estimate line is flagged when it was auto-created from a derivation. Idempotent.
ALTER TABLE "esti_kb_item_dependency" ADD COLUMN IF NOT EXISTS "derivation" text NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "esti_estimate_line" ADD COLUMN IF NOT EXISTS "derived" boolean NOT NULL DEFAULT false;
