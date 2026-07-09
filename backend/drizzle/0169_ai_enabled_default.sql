-- Enable Ask ESTI / AI Studio for all existing firms (2026-07 default-on policy).
UPDATE "esti_orgsettings"
SET "ai_settings" = jsonb_set(
  COALESCE("ai_settings", '{}'::jsonb),
  '{enabled}',
  'true'::jsonb,
  true
)
WHERE ("ai_settings"->>'enabled') IS DISTINCT FROM 'true';
