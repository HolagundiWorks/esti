import { DEFAULT_AI_SETTINGS, parseAiSettings, type AiSettings } from "@esti/contracts";
import { eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { orgSettings } from "../../db/schema.js";

export function ollamaBaseUrlFromEnv(): string {
  return (
    process.env.OLLAMA_BASE_URL?.trim() ||
    process.env.OLLAMA_HOST?.trim() ||
    "http://127.0.0.1:11434"
  );
}

export function ollamaModelFromEnv(): string {
  return process.env.OLLAMA_MODEL?.trim() || DEFAULT_AI_SETTINGS.model;
}

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

export type OllamaHealth = {
  ok: boolean;
  baseUrl: string;
  model: string;
  modelsAvailable: string[];
  error?: string;
};

/** Probe Ollama /api/tags and confirm the configured model is pulled. */
export async function checkOllamaHealth(input?: {
  baseUrl?: string;
  model?: string;
}): Promise<OllamaHealth> {
  const baseUrl = (input?.baseUrl ?? ollamaBaseUrlFromEnv()).replace(/\/$/, "");
  const model = input?.model ?? ollamaModelFromEnv();

  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return {
        ok: false,
        baseUrl,
        model,
        modelsAvailable: [],
        error: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as { models?: { name: string }[] };
    const names = (data.models ?? []).map((m) => m.name);
    const hasModel = names.some((n) => n === model || n.startsWith(`${model}:`));
    return {
      ok: hasModel,
      baseUrl,
      model,
      modelsAvailable: names,
      error: hasModel ? undefined : `Model "${model}" not pulled — run: ollama pull ${model}`,
    };
  } catch (err) {
    return {
      ok: false,
      baseUrl,
      model,
      modelsAvailable: [],
      error: err instanceof Error ? err.message : "Ollama unreachable",
    };
  }
}

export async function probeOllamaChat(input?: {
  baseUrl?: string;
  model?: string;
}): Promise<{ ok: boolean; reply?: string; error?: string }> {
  const baseUrl = (input?.baseUrl ?? ollamaBaseUrlFromEnv()).replace(/\/$/, "");
  const model = input?.model ?? ollamaModelFromEnv();

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({
        model,
        stream: false,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 160)}` };
    }
    const data = (await res.json()) as { message?: { content?: string } };
    const reply = data.message?.content?.trim();
    if (!reply) return { ok: false, error: "Empty response from Ollama" };
    return { ok: true, reply };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Chat probe failed" };
  }
}
