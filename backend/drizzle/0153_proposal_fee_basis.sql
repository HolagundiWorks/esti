-- 0153 — Proposal fee basis. A proposal's professional fee can now be derived
-- as a COA percentage of cost of works (default, existing behaviour), a rate per
-- square metre of built-up area, or a lumpsum. The COA minimum benchmark is still
-- computed for all three. Idempotent.
ALTER TABLE "esti_proposal" ADD COLUMN IF NOT EXISTS "fee_basis" text NOT NULL DEFAULT 'COA_PERCENT';
ALTER TABLE "esti_proposal" ADD COLUMN IF NOT EXISTS "built_up_area_sqm" double precision;
ALTER TABLE "esti_proposal" ADD COLUMN IF NOT EXISTS "rate_per_sqm_paise" bigint;
