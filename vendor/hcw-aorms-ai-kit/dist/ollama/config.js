export const DEFAULT_OLLAMA_MODEL = "llama3.2";
export function ollamaBaseUrlFromEnv() {
    return (process.env.OLLAMA_BASE_URL?.trim() ||
        process.env.OLLAMA_HOST?.trim() ||
        "http://127.0.0.1:11434");
}
export function ollamaModelFromEnv() {
    return process.env.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL;
}
/** Probe Ollama /api/tags and confirm the configured model is pulled. */
export async function checkOllamaHealth(input) {
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
        const data = (await res.json());
        const names = (data.models ?? []).map((m) => m.name);
        const hasModel = names.some((n) => n === model || n.startsWith(`${model}:`));
        return {
            ok: hasModel,
            baseUrl,
            model,
            modelsAvailable: names,
            error: hasModel ? undefined : `Model "${model}" not pulled — run: ollama pull ${model}`,
        };
    }
    catch (err) {
        return {
            ok: false,
            baseUrl,
            model,
            modelsAvailable: [],
            error: err instanceof Error ? err.message : "Ollama unreachable",
        };
    }
}
export async function probeOllamaChat(input) {
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
        const data = (await res.json());
        const reply = data.message?.content?.trim();
        if (!reply)
            return { ok: false, error: "Empty response from Ollama" };
        return { ok: true, reply };
    }
    catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Chat probe failed" };
    }
}
