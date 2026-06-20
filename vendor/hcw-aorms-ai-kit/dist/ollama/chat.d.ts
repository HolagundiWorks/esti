export type OllamaChatResult = {
    text: string;
    tokens: number | null;
};
export declare function callOllamaChat(input: {
    baseUrl: string;
    model: string;
    system: string;
    user: string;
    timeoutMs?: number;
}): Promise<OllamaChatResult>;
//# sourceMappingURL=chat.d.ts.map