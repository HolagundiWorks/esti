export declare const DEFAULT_OLLAMA_MODEL = "llama3.2";
export declare function ollamaBaseUrlFromEnv(): string;
export declare function ollamaModelFromEnv(): string;
export type OllamaHealth = {
    ok: boolean;
    baseUrl: string;
    model: string;
    modelsAvailable: string[];
    error?: string;
};
/** Probe Ollama /api/tags and confirm the configured model is pulled. */
export declare function checkOllamaHealth(input?: {
    baseUrl?: string;
    model?: string;
}): Promise<OllamaHealth>;
export declare function probeOllamaChat(input?: {
    baseUrl?: string;
    model?: string;
}): Promise<{
    ok: boolean;
    reply?: string;
    error?: string;
}>;
//# sourceMappingURL=config.d.ts.map