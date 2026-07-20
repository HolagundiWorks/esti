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
  // Client portal: ESTI reads an issued MoM and drafts the revision requests
  // the client would otherwise have to write (strict-JSON output).
  "MOM_REVISIONS",
  // CPI: synthesize the residential questionnaire into the Client
  // Intelligence Report (strict-JSON output; contracts/cpi.ts).
  "CPI_REPORT",
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
  MOM_REVISIONS: "Client revision suggestions (from minutes)",
  CPI_REPORT: "Client Intelligence Report (CPI synthesis)",
};

// ── MoM → client revision suggestions (MOM_REVISIONS) ────────────────────────
// ESTI reads issued meeting minutes and drafts the change requests the client
// would otherwise have to write. The model must answer with a JSON array of
// these items; the parser below tolerates prose/code-fence wrapping.

export const MomRevisionCategory = z.enum(["MINOR", "MAJOR", "CRITICAL"]);

export const MomRevisionSuggestion = z.object({
  title: z.string().trim().min(1).max(200),
  details: z.string().trim().min(1).max(4000),
  category: MomRevisionCategory.catch("MINOR"),
});
export type MomRevisionSuggestion = z.infer<typeof MomRevisionSuggestion>;

export const MOM_REVISION_MAX_SUGGESTIONS = 10;

/**
 * Parse the model's MOM_REVISIONS output into validated suggestions.
 * Accepts a bare JSON array, an `{"items": [...]}` object, or either wrapped
 * in prose / ```json fences. Returns null when nothing parseable is found;
 * invalid entries are dropped rather than failing the whole draft.
 */
export function parseMomRevisionSuggestions(text: string): MomRevisionSuggestion[] | null {
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.search(/[[{]/);
  if (start === -1) return null;
  const slice = stripped.slice(start, findJsonEnd(stripped, start) + 1);
  let raw: unknown;
  try {
    raw = JSON.parse(slice);
  } catch {
    return null;
  }
  const list = Array.isArray(raw) ? raw : (raw as { items?: unknown[] })?.items;
  if (!Array.isArray(list)) return null;
  const out: MomRevisionSuggestion[] = [];
  for (const entry of list) {
    if (out.length >= MOM_REVISION_MAX_SUGGESTIONS) break;
    let norm: unknown = entry;
    if (entry && typeof entry === "object") {
      const e = entry as { title?: unknown; details?: unknown; category?: unknown };
      const title = typeof e.title === "string" ? e.title.trim() : "";
      const details = typeof e.details === "string" ? e.details.trim() : "";
      norm = {
        ...e,
        // Small local models (e.g. llama3.2) frequently emit `title` but omit
        // the required `details` — fall back to the title so the suggestion
        // survives validation instead of being silently dropped.
        details: details || title,
        category: typeof e.category === "string" ? e.category.trim().toUpperCase() : undefined,
      };
    }
    const parsed = MomRevisionSuggestion.safeParse(norm);
    if (parsed.success) out.push(parsed.data);
  }
  return out.length > 0 ? out : null;
}

/** Index of the bracket that closes the JSON value opening at `start`. */
function findJsonEnd(text: string, start: number): number {
  const open = text[start]!;
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return text.length - 1;
}

export const AiProvider = z.enum(["mock", "ollama", "cloud"]);
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
  enabled: z.boolean().default(true),
  /** ollama = on-server (Core+); cloud = bring-your-own OpenAI-compatible API (Enterprise). */
  provider: AiProvider.default("ollama"),
  model: z.string().min(1).max(80).default("llama3.2"),
  /** Ollama HTTP base URL (no /api suffix). Falls back to OLLAMA_BASE_URL env. */
  ollamaBaseUrl: z.string().max(200).optional(),
  // BYO-API (Enterprise) — an OpenAI-compatible cloud provider the firm supplies.
  /** Base URL ending in /v1, e.g. https://api.openai.com/v1 or an OpenRouter/vLLM endpoint. */
  cloudBaseUrl: z.string().max(300).optional(),
  /**
   * Secret API key — persisted but never returned by read APIs.
   *
   * This bound has to cover the value **as stored**, which is the sealed
   * ciphertext (`enc:v1:` + base64 of IV + tag + body), roughly 4/3 of the
   * plaintext plus 45 chars. A tighter bound here fails on read rather than on
   * write: parseAiSettings falls back to DEFAULT_AI_SETTINGS, and the next boot
   * writes those defaults back, destroying the firm's provider and key.
   * MAX_CLOUD_API_KEY_CHARS is the limit applied to the plaintext on the way in.
   */
  cloudApiKey: z.string().max(4000).optional(),
  /** Cloud model id, e.g. gpt-4o-mini. */
  cloudModel: z.string().max(120).optional(),
  redactPii: z.boolean().default(true),
});
export type AiSettings = z.infer<typeof AiSettings>;

/**
 * Longest plaintext API key accepted. Generous — Azure/vLLM bearer tokens and
 * JWT-style keys run long — while leaving ample headroom under the 4000-char
 * stored bound once sealed.
 */
export const MAX_CLOUD_API_KEY_CHARS = 1024;

/** AI settings with the cloud secret stripped + a configured flag — for read APIs. */
export interface AiSettingsPublic extends Omit<AiSettings, "cloudApiKey"> {
  cloudApiKeyConfigured: boolean;
}

export function toPublicAiSettings(s: AiSettings): AiSettingsPublic {
  const { cloudApiKey, ...rest } = s;
  return { ...rest, cloudApiKeyConfigured: !!cloudApiKey };
}

/** Cloud BYO-API config is complete enough to use. */
export function cloudAiConfigError(s: AiSettings): string | null {
  if (s.provider !== "cloud") return null;
  if (!s.cloudBaseUrl?.trim()) return "A cloud endpoint URL (…/v1) is required.";
  if (!s.cloudModel?.trim()) return "A cloud model id is required.";
  return null;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: true,
  provider: "ollama",
  model: "llama3.2",
  redactPii: true,
};

/** Legacy OpenAI-style model IDs stored before Ollama-only gateway. */
const LEGACY_CLOUD_MODELS = new Set([
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
  "claude-3-sonnet",
]);

export function normalizeAiSettingsRaw(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = { ...(raw as Record<string, unknown>) };
  const p = o.provider;
  if (p === "openai" || p === "openai_compatible") o.provider = "ollama";
  // Migration 0048 defaulted to mock — live installs use on-server Ollama when enabled.
  if (p === "mock" && o.enabled === true) o.provider = "ollama";
  const model = o.model;
  if (typeof model === "string" && LEGACY_CLOUD_MODELS.has(model)) {
    o.model = DEFAULT_AI_SETTINGS.model;
  }
  delete o.allowExternalTransmit;
  delete o.allowPersonalApiKeys;
  return o;
}

export function parseAiSettings(raw: unknown): AiSettings {
  const parsed = AiSettings.safeParse(normalizeAiSettingsRaw(raw));
  return parsed.success ? parsed.data : DEFAULT_AI_SETTINGS;
}

export const AiGenerateMode = z.enum(["draft", "agent"]);
export type AiGenerateMode = z.infer<typeof AiGenerateMode>;

export const AiGenerateInput = z.object({
  kind: AiDraftKind,
  /** draft = document template; agent = ESTI command-bar Q&A (live AORMS context). */
  mode: AiGenerateMode.default("draft"),
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

