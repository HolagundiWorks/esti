import type { db } from "../db/index.js";
import { ensureOllamaAiSettings } from "../lib/ai/ollama-config.js";

type Db = typeof db;

/** Enable AI Studio with on-server Ollama defaults. */
export async function ensureAiStudioEnabled(database: Db): Promise<void> {
  await ensureOllamaAiSettings(database);
}
