import { describe, expect, it } from "vitest";
import { AI_DRAFT_KIND_LABEL, parseAiSettings, AiDraftKind } from "./ai.js";

describe("ai contracts", () => {
  it("parses ai settings with defaults", () => {
    const s = parseAiSettings(null);
    expect(s.enabled).toBe(false);
    expect(s.provider).toBe("ollama");
    expect(s.model).toBe("llama3.2");
    expect(s.redactPii).toBe(true);
  });

  it("migrates legacy cloud model names to llama3.2", () => {
    const s = parseAiSettings({
      enabled: true,
      provider: "ollama",
      model: "gpt-4o-mini",
      allowExternalTransmit: false,
    });
    expect(s.model).toBe("llama3.2");
    expect(s.provider).toBe("ollama");
  });
    for (const k of AiDraftKind.options) {
      expect(AI_DRAFT_KIND_LABEL[k].length).toBeGreaterThan(3);
    }
  });
});
