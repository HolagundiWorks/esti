-- Normalize AI Studio settings for Ollama-only gateway (Phase 11 fix-up).
UPDATE esti_orgsettings
SET ai_settings = jsonb_strip_nulls(
  jsonb_build_object(
    'enabled', COALESCE((ai_settings->>'enabled')::boolean, false),
    'provider', 'ollama',
    'model', 'llama3.2',
    'ollamaBaseUrl', COALESCE(ai_settings->>'ollamaBaseUrl', 'http://ollama:11434'),
    'redactPii', COALESCE((ai_settings->>'redactPii')::boolean, true)
  )
)
WHERE ai_settings->>'model' IN (
  'gpt-4o-mini', 'gpt-4o', 'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'
)
   OR ai_settings->>'provider' IN ('openai', 'openai_compatible')
   OR ai_settings->>'provider' = 'mock';
