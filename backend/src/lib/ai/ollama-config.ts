import { parseAiSettings, type AiSettings } from "@esti/contracts";
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

/** In Docker dev, org settings often still point at localhost — prefer the container URL. */
export function resolveOllamaBaseUrlForDocker(stored: string | null | undefined): string {
  const envUrl = ollamaBaseUrlFromEnv();
  const s = stored?.trim();
  if (!s) return envUrl;
  if (/localhost|127\.0\.0\.1/.test(s)) return envUrl;
  return s;
}

export async function ensureOllamaAiSettings(db: DB): Promise<AiSettings> {
  const [row] = await db.select().from(orgSettings).limit(1);
  if (!row) return defaultOllamaAiSettings();

  const current = parseAiSettings(row.aiSettings);
  const next = defaultOllamaAiSettings({
    enabled: current.enabled,
    redactPii: current.redactPii,
    provider: "ollama",
    model: current.model?.trim() || ollamaModelFromEnv(),
    ollamaBaseUrl: resolveOllamaBaseUrlForDocker(current.ollamaBaseUrl),
  });

  await db
    .update(orgSettings)
    .set({ aiSettings: next })
    .where(eq(orgSettings.id, row.id));

  return next;
}
