ALTER TABLE "esti_user" ADD COLUMN IF NOT EXISTS "ai_api_key" text;
ALTER TABLE "esti_user" ADD COLUMN IF NOT EXISTS "use_personal_ai_key" boolean NOT NULL DEFAULT false;
