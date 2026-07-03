/**
 * Configure and verify on-server Ollama for AI Studio.
 *
 *   pnpm --filter @esti/backend setup:ollama
 *   podman exec esti-backend sh -c "cd /app/esti/backend && pnpm setup:ollama"
 */
import { parseAiSettings } from "@esti/contracts";
import { db } from "../db/index.js";
import { getOrgSettings } from "../lib/settings.js";
import {
  checkOllamaHealth,
  ensureOllamaAiSettings,
  ollamaBaseUrlFromEnv,
  ollamaModelFromEnv,
  probeOllamaChat,
} from "../lib/ai/ollama-config.js";

async function main(): Promise<void> {
  const baseUrl = ollamaBaseUrlFromEnv();
  const model = ollamaModelFromEnv();

  console.log(`Ollama base URL: ${baseUrl}`);
  console.log(`Expected model:  ${model}`);

  const health = await checkOllamaHealth({ baseUrl, model });
  if (!health.ok) {
    console.error(`\n✗ Ollama check failed: ${health.error ?? "unknown"}`);
    if (health.modelsAvailable.length) {
      console.error(`  Models on server: ${health.modelsAvailable.join(", ")}`);
    }
    console.error(`\nPull the model in the Ollama container:`);
    console.error(`  podman exec esti-ollama ollama pull ${model}`);
    process.exit(1);
  }
  console.log(`✓ Ollama reachable — models: ${health.modelsAvailable.join(", ")}`);

  const settings = await ensureOllamaAiSettings(db);
  const org = await getOrgSettings(db);
  const parsed = parseAiSettings(org.aiSettings);
  console.log("✓ AI Studio org settings updated:");
  console.log(`    enabled:  ${settings.enabled}`);
  console.log(`    provider: ${parsed.provider}`);
  console.log(`    model:    ${parsed.model}`);
  console.log(`    url:      ${settings.ollamaBaseUrl ?? baseUrl}`);

  console.log("\nProbing chat (may take ~30s on first run)…");
  const chat = await probeOllamaChat({ baseUrl, model });
  if (!chat.ok) {
    console.error(`✗ Chat probe failed: ${chat.error}`);
    process.exit(1);
  }
  console.log(`✓ Chat probe reply: ${chat.reply?.slice(0, 80)}`);
  console.log("\nOllama is configured. Non-demo staff accounts will use live AI when AI Studio is enabled.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
