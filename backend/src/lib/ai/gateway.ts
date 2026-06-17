import type { AiSettings } from "@esti/contracts";
import { assembleAiContext, generateMockOutput } from "./context.js";
import type { DB } from "../../db/index.js";
import type { AiDraftKind, AiSourceRef } from "@esti/contracts";

export type GatewayInput = {
  kind: AiDraftKind;
  projectId?: string;
  prompt?: string;
  contextQuery?: string;
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
  return (
    settings.ollamaBaseUrl?.trim() ||
    process.env.OLLAMA_BASE_URL?.trim() ||
    "http://127.0.0.1:11434"
  );
}

function resolveRuntime(settings: AiSettings, isDemo: boolean): RuntimeMode {
  const model = settings.model || process.env.OLLAMA_MODEL || "llama3.2";

  if (isDemo || settings.provider === "mock") {
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

async function callOllamaChat(input: {
  baseUrl: string;
  model: string;
  system: string;
  user: string;
}): Promise<{ text: string; tokens: number | null }> {
  const url = `${input.baseUrl.replace(/\/$/, "")}/api/chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  const data = (await res.json()) as {
    message?: { content?: string };
    eval_count?: number;
  };
  const text = data.message?.content?.trim() ?? "";
  if (!text) throw new Error("Ollama returned empty content — pull the model with `ollama pull`");
  return { text, tokens: data.eval_count ?? null };
}

export async function runAiGateway(
  db: DB,
  user: { id: string; role: string; isDemo?: boolean },
  settings: AiSettings,
  input: GatewayInput,
): Promise<GatewayResult> {
  if (!settings.enabled) {
    throw new Error("AI Studio is disabled for this firm");
  }

  const runtime = resolveRuntime(settings, !!user.isDemo);
  const bundle = await assembleAiContext(db, user, input);

  if (runtime.mode === "ollama") {
    try {
      const { text, tokens } = await callOllamaChat({
        baseUrl: runtime.baseUrl,
        model: runtime.model,
        system: bundle.systemPrompt,
        user: bundle.userPrompt,
      });
      return {
        output: text,
        sources: bundle.sources,
        promptSummary: bundle.promptSummary,
        provider: runtime.provider,
        model: runtime.model,
        usedExternalApi: false,
        tokenEstimate: tokens,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ollama call failed";
      throw new Error(`${msg} — check Ollama is running and the model is pulled`);
    }
  }

  const mock = await generateMockOutput(db, user, input);
  return {
    output: mock.output,
    sources: mock.sources,
    promptSummary: mock.promptSummary,
    provider: "mock",
    model: "template",
    usedExternalApi: false,
    tokenEstimate: null,
  };
}
