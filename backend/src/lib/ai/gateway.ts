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
  | { mode: "cloud"; provider: "cloud"; model: string; baseUrl: string; apiKey: string; usedExternalApi: true }
  | { mode: "mock"; provider: "mock"; model: "template"; usedExternalApi: false };

function ollamaBaseUrl(settings: AiSettings): string {
  return settings.ollamaBaseUrl?.trim() || ollamaBaseUrlFromEnv();
}

function resolveRuntime(settings: AiSettings): RuntimeMode {
  const model = settings.model || ollamaModelFromEnv();

  // BYO-API (Enterprise): a firm-supplied OpenAI-compatible cloud provider.
  if (
    settings.provider === "cloud" &&
    settings.cloudBaseUrl?.trim() &&
    settings.cloudApiKey?.trim() &&
    settings.cloudModel?.trim()
  ) {
    return {
      mode: "cloud",
      provider: "cloud",
      model: settings.cloudModel.trim(),
      baseUrl: settings.cloudBaseUrl.trim(),
      apiKey: settings.cloudApiKey.trim(),
      usedExternalApi: true,
    };
  }

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

/** Minimal OpenAI-compatible chat call (OpenAI, Azure, OpenRouter, Together, vLLM, …). */
async function callCloudChat(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  system: string;
  user: string;
}): Promise<{ text: string; tokens: number | null }> {
  const url = `${opts.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`cloud provider ${res.status} ${detail}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { total_tokens?: number };
  };
  return { text: json.choices?.[0]?.message?.content ?? "", tokens: json.usage?.total_tokens ?? null };
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

  if (runtime.mode === "cloud") {
    try {
      const { text, tokens } = await callCloudChat({
        baseUrl: runtime.baseUrl,
        apiKey: runtime.apiKey,
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
        usedExternalApi: true,
        tokenEstimate: tokens,
      };
    } catch (err) {
      const mock = await generateMockOutput(db, user, input);
      const hint = err instanceof Error ? err.message : "Cloud provider unavailable";
      const output =
        cadFallback ?
          normalizeCadJsonOutput(mock.output, cadFallback)
        : `${mock.output}\n\n---\n*Cloud provider fallback (${hint.slice(0, 120)})*`;
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
