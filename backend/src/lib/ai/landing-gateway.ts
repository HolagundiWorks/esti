import {
  callOllamaChat,
  checkOllamaHealth,
  ollamaBaseUrlFromEnv,
  ollamaModelFromEnv,
} from "@hcw/aorms-ai-kit/ollama";
import { LANDING_ANSWER_FORMAT, LANDING_SALES_SYSTEM } from "./landing-prompt.js";

export type LandingAskSuccess = {
  answer: string;
  model: string;
};

/** Public landing AI — Ollama + sales persona. No firm data, no mock fallback. */
export async function runLandingAsk(prompt: string): Promise<LandingAskSuccess> {
  const baseUrl = ollamaBaseUrlFromEnv();
  const model = ollamaModelFromEnv();

  const health = await checkOllamaHealth({ baseUrl, model });
  if (!health.ok) {
    throw new Error(health.error ?? "Ollama unavailable");
  }

  const { text } = await callOllamaChat({
    baseUrl,
    model,
    system: `${LANDING_SALES_SYSTEM}\n\n${LANDING_ANSWER_FORMAT}`,
    user: prompt,
  });

  return { answer: text, model };
}
