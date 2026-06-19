import { callOllamaChat } from "@hcw/aorms-ai-kit/ollama";
import type { AiCadContext, AiSettings } from "@esti/contracts";
import { isCadAiDraftKind } from "@esti/contracts";
import { assembleCadAiContext } from "./cad-context.js";
import { assembleAiContext, generateMockOutput } from "./context.js";
import { ollamaBaseUrlFromEnv, ollamaModelFromEnv } from "./ollama-config.js";
import type { DB } from "../../db/index.js";
import type { AiDraftKind, AiSourceRef } from "@esti/contracts";

export type GatewayInput = {
  kind: AiDraftKind;
  mode?: "draft" | "agent";
  projectId?: string;
  drawingId?: string;
  prompt?: string;
  contextQuery?: string;
  /** ESTICAD context bundle (Phase 13D). */
  cadContext?: AiCadContext;
};

export type GatewayResult = {
  output: string;
  sources: AiSourceRef[];
  promptSummary: string;
  provider: string;
  model: string;
  usedExternalApi: boolean;
  tokenEstimate: number | null;
};

type RuntimeMode =
  | { mode: "ollama"; provider: "ollama"; model: string; baseUrl: string; usedExternalApi: false }
  | { mode: "mock"; provider: "mock"; model: "template"; usedExternalApi: false };

function ollamaBaseUrl(settings: AiSettings): string {
  return settings.ollamaBaseUrl?.trim() || ollamaBaseUrlFromEnv();
}

function resolveRuntime(settings: AiSettings): RuntimeMode {
  const model = settings.model || ollamaModelFromEnv();

  if (settings.provider === "mock") {
    return { mode: "mock", provider: "mock", model: "template", usedExternalApi: false };
  }

  return {
    mode: "ollama",
    provider: "ollama",
    model,
    baseUrl: ollamaBaseUrl(settings),
    usedExternalApi: false,
  };
}

function normalizeCadJsonOutput(text: string, fallbackJson: string): string {
  try {
    const parsed = JSON.parse(text) as { proposals?: unknown };
    if (parsed && Array.isArray(parsed.proposals)) {
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    /* use fallback */
  }
  return fallbackJson;
}

export async function runAiGateway(
  db: DB,
  user: { id: string; role: string; email?: string; fullName?: string; isDemo?: boolean },
  settings: AiSettings,
  input: GatewayInput,
): Promise<GatewayResult> {
  if (!settings.enabled) {
    throw new Error("AI Studio is disabled for this firm");
  }

  const runtime = resolveRuntime(settings);
  const bundle =
    isCadAiDraftKind(input.kind) ?
      await assembleCadAiContext(db, user, {
        kind: input.kind,
        projectId: input.projectId,
        drawingId: input.drawingId,
        prompt: input.prompt,
        context: input.cadContext,
      })
    : await assembleAiContext(db, user, input);

  const cadFallback = isCadAiDraftKind(input.kind) ?
    (bundle as Awaited<ReturnType<typeof assembleCadAiContext>>).templateJson
  : undefined;

  if (runtime.mode === "ollama") {
    try {
      const { text, tokens } = await callOllamaChat({
        baseUrl: runtime.baseUrl,
        model: runtime.model,
        system: bundle.systemPrompt,
        user: bundle.userPrompt,
      });
      return {
        output: cadFallback ? normalizeCadJsonOutput(text, cadFallback) : text,
        sources: bundle.sources,
        promptSummary: bundle.promptSummary,
        provider: runtime.provider,
        model: runtime.model,
        usedExternalApi: false,
        tokenEstimate: tokens,
      };
    } catch (err) {
      const mock = await generateMockOutput(db, user, input);
      const hint =
        err instanceof Error ? err.message : "Ollama unavailable";
      const output =
        cadFallback ?
          normalizeCadJsonOutput(mock.output, cadFallback)
        : `${mock.output}\n\n---\n*Ollama fallback (${hint.slice(0, 120)})*`;
      return {
        output,
        sources: mock.sources,
        promptSummary: mock.promptSummary,
        provider: "mock",
        model: "template-fallback",
        usedExternalApi: false,
        tokenEstimate: null,
      };
    }
  }

  const mock = await generateMockOutput(db, user, input);
  return {
    output: cadFallback ? normalizeCadJsonOutput(mock.output, cadFallback) : mock.output,
    sources: mock.sources,
    promptSummary: mock.promptSummary,
    provider: "mock",
    model: "template",
    usedExternalApi: false,
    tokenEstimate: null,
  };
}
