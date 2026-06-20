import { callOllamaChat } from "../ollama/chat.js";
import { checkOllamaHealth, ollamaBaseUrlFromEnv, ollamaModelFromEnv, } from "../ollama/config.js";
import { LANDING_ANSWER_RULES, LANDING_AORMS_SYSTEM } from "../prompts/landing.js";
/** Public landing AI — Ollama only, no mock fallback. */
export async function runLandingAsk(prompt) {
    const baseUrl = ollamaBaseUrlFromEnv();
    const model = ollamaModelFromEnv();
    const health = await checkOllamaHealth({ baseUrl, model });
    if (!health.ok) {
        throw new Error(health.error ?? "Ollama unavailable");
    }
    const { text } = await callOllamaChat({
        baseUrl,
        model,
        system: `${LANDING_AORMS_SYSTEM}\n\n${LANDING_ANSWER_RULES}`,
        user: prompt,
    });
    return { answer: text, model };
}
