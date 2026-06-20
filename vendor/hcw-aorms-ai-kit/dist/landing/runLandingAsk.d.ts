export type LandingAskSuccess = {
    answer: string;
    model: string;
};
/** Public landing AI — Ollama only, no mock fallback. */
export declare function runLandingAsk(prompt: string): Promise<LandingAskSuccess>;
//# sourceMappingURL=runLandingAsk.d.ts.map