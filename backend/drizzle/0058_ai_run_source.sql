-- Phase 13D: distinguish AORMS web AI runs from ESTICAD companion runs.
ALTER TABLE "esti_ai_run" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'aorms';
