export async function callOllamaChat(input) {
    const url = `${input.baseUrl.replace(/\/$/, "")}/api/chat`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(input.timeoutMs ?? 120_000),
        body: JSON.stringify({
            model: input.model,
            stream: false,
            messages: [
                { role: "system", content: input.system },
                { role: "user", content: input.user },
            ],
        }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Ollama HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json());
    const text = data.message?.content?.trim() ?? "";
    if (!text) {
        throw new Error("Ollama returned empty content — pull the model with `ollama pull`");
    }
    return { text, tokens: data.eval_count ?? null };
}
