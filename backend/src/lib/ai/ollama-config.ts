import { DEFAULT_AI_SETTINGS, parseAiSettings, type AiSettings } from "@esti/contracts";
import {
  checkOllamaHealth,
  ollamaBaseUrlFromEnv,
  ollamaModelFromEnv,
  probeOllamaChat,
  type OllamaHealth,
} from "@hcw/aorms-ai-kit/ollama";
import { eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { orgSettings } from "../../db/schema.js";

export {
  checkOllamaHealth,
  ollamaBaseUrlFromEnv,
  ollamaModelFromEnv,
  probeOllamaChat,
  type OllamaHealth,
};

/** Canonical AI Studio settings for on-server Ollama. */
export function defaultOllamaAiSettings(overrides: Partial<AiSettings> = {}): AiSettings {
  return {
    enabled: true,
    provider: "ollama",
    model: ollamaModelFromEnv(),
    ollamaBaseUrl: ollamaBaseUrlFromEnv(),
    redactPii: true,
    ...overrides,
  };
}

export async function ensureOllamaAiSettings(db: DB): Promise<AiSettings> {
  const [row] = await db.select().from(orgSettings).limit(1);
  if (!row) return defaultOllamaAiSettings({ enabled: false });

  const current = parseAiSettings(row.aiSettings);
  const next = defaultOllamaAiSettings({
    enabled: current.enabled || true,
    redactPii: current.redactPii,
    ollamaBaseUrl: current.ollamaBaseUrl ?? ollamaBaseUrlFromEnv(),
  });

  await db
    .update(orgSettings)
    .set({ aiSettings: next })
    .where(eq(orgSettings.id, row.id));

  return next;
}
