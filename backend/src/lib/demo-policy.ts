import type { AiGenerateMode } from "@esti/contracts";
import type { AuthUser } from "../auth/session.js";

export const DEMO_AI_DRAFT_MESSAGE =
  "AI document drafts are disabled on the demo account — use the ESTI agent (Alt+A) for read-only guidance.";
export const DEMO_AI_SETTINGS_MESSAGE = "AI settings cannot be changed on the demo account.";

/** AI Studio draft generation — not the ESTI read-only agent. */
export function demoBlocksAiDraft(user: Pick<AuthUser, "isDemo">, mode: AiGenerateMode = "draft"): boolean {
  return user.isDemo && mode !== "agent";
}

export function demoBlocksAiSettings(user: Pick<AuthUser, "isDemo">): boolean {
  return user.isDemo;
}
