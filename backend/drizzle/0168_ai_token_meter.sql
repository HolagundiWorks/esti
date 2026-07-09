-- P3.4 AI usage meter — hosted-only monthly token counter.
-- Incremented on every hosted (Ollama) AI generation; reset at month rollover.
-- BYO-API (firm cloud key) calls are excluded from this counter.

ALTER TABLE "esti_orgsettings"
  ADD COLUMN IF NOT EXISTS "ai_tokens_this_month"   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "ai_tokens_month_start"  timestamptz;
