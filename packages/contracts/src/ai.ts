import { z } from "zod";

/** Draft kinds the AI Studio can generate — mapped to office/project documents. */
export const AiDraftKind = z.enum([
  "PROPOSAL",
  "SCOPE",
  "AGREEMENT",
  "SPEC",
  "SITE_REPORT",
  "MOM",
  "RFI_RESPONSE",
  "SUMMARY",
  "BILLING_ASSISTANT",
  "CRIF_SUMMARY",
  "CRIF_IMPACT",
  "CRIF_RISK",
]);
export type AiDraftKind = z.infer<typeof AiDraftKind>;

export const AI_DRAFT_KIND_LABEL: Record<AiDraftKind, string> = {
  PROPOSAL: "Fee proposal narrative",
  SCOPE: "Scope of services",
  AGREEMENT: "Agreement clause draft",
  SPEC: "Specification note",
  SITE_REPORT: "Site report narrative",
  MOM: "Meeting minutes",
  RFI_RESPONSE: "RFI / consultant response",
  SUMMARY: "Project summary",
  BILLING_ASSISTANT: "Billing assistant",
  CRIF_SUMMARY: "CRIF revision summary",
  CRIF_IMPACT: "CRIF impact statement",
  CRIF_RISK: "CRIF risk flags",
};

export const AiProvider = z.enum(["mock", "ollama"]);
export type AiProvider = z.infer<typeof AiProvider>;

export const AiApprovalState = z.enum(["DRAFT", "APPROVED", "REJECTED", "ISSUED"]);
export type AiApprovalState = z.infer<typeof AiApprovalState>;

export const AiSourceRef = z.object({
  entityType: z.string().min(1).max(40),
  entityId: z.string().uuid().optional(),
  label: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional(),
});
export type AiSourceRef = z.infer<typeof AiSourceRef>;

export const AiSettings = z.object({
  enabled: z.boolean().default(false),
  /** Ollama on the server — no cloud API keys. */
  provider: AiProvider.default("ollama"),
  model: z.string().min(1).max(80).default("llama3.2"),
  /** Ollama HTTP base URL (no /api suffix). Falls back to OLLAMA_BASE_URL env. */
  ollamaBaseUrl: z.string().max(200).optional(),
  redactPii: z.boolean().default(true),
});
export type AiSettings = z.infer<typeof AiSettings>;

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  provider: "ollama",
  model: "llama3.2",
  redactPii: true,
};

export function parseAiSettings(raw: unknown): AiSettings {
  let normalized = raw;
  if (raw && typeof raw === "object") {
    const o = { ...(raw as Record<string, unknown>) };
    const p = o.provider;
    if (p === "openai" || p === "openai_compatible") o.provider = "ollama";
    normalized = o;
  }
  const parsed = AiSettings.safeParse(normalized);
  return parsed.success ? parsed.data : DEFAULT_AI_SETTINGS;
}

export const AiGenerateInput = z.object({
  kind: AiDraftKind,
  projectId: z.string().uuid().optional(),
  prompt: z.string().max(4000).optional(),
  contextQuery: z.string().max(200).optional(),
});
export type AiGenerateInput = z.infer<typeof AiGenerateInput>;

export const AiGenerateResult = z.object({
  runId: z.string().uuid(),
  kind: AiDraftKind,
  provider: z.string(),
  model: z.string(),
  output: z.string(),
  sources: z.array(AiSourceRef),
  approvalState: AiApprovalState,
  usedExternalApi: z.boolean(),
});
export type AiGenerateResult = z.infer<typeof AiGenerateResult>;

export const AiRunUpdate = z.object({
  id: z.string().uuid(),
  output: z.string().max(100_000).optional(),
  approvalState: AiApprovalState.optional(),
});
export type AiRunUpdate = z.infer<typeof AiRunUpdate>;
