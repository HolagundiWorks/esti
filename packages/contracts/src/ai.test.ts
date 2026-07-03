import { describe, expect, it } from "vitest";
import {
  AI_DRAFT_KIND_LABEL,
  AiDraftKind,
  isCadAiDraftKind,
  parseAiSettings,
  parseMomRevisionSuggestions,
} from "./ai.js";

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

  it("labels every draft kind", () => {
    for (const k of AiDraftKind.options) {
      expect(AI_DRAFT_KIND_LABEL[k].length).toBeGreaterThan(3);
    }
  });

  it("identifies CAD draft kinds", () => {
    expect(isCadAiDraftKind("CAD_NAMING")).toBe(true);
    expect(isCadAiDraftKind("PROPOSAL")).toBe(false);
  });
});

describe("parseMomRevisionSuggestions", () => {
  it("parses a bare JSON array", () => {
    const out = parseMomRevisionSuggestions(
      JSON.stringify([
        { title: "Shift kitchen window", details: "Move 600mm east per discussion", category: "MINOR" },
        { title: "Rework staircase", details: "Client wants a spiral stair", category: "MAJOR" },
      ]),
    );
    expect(out).toHaveLength(2);
    expect(out![1]!.category).toBe("MAJOR");
  });

  it("parses fenced output with prose and an items wrapper", () => {
    const out = parseMomRevisionSuggestions(
      'Here are the suggestions:\n```json\n{"items": [{"title": "T", "details": "D", "category": "critical"}]}\n```\nLet me know.',
    );
    expect(out).toHaveLength(1);
    expect(out![0]!.category).toBe("CRITICAL");
  });

  it("defaults unknown categories to MINOR and drops invalid entries", () => {
    const out = parseMomRevisionSuggestions(
      JSON.stringify([
        { title: "Valid", details: "Something", category: "HUGE" },
        { title: "", details: "missing title" },
      ]),
    );
    expect(out).toHaveLength(1);
    expect(out![0]!.category).toBe("MINOR");
  });

  it("returns null on unparseable output", () => {
    expect(parseMomRevisionSuggestions("I could not find any changes.")).toBeNull();
    expect(parseMomRevisionSuggestions("[not json")).toBeNull();
  });

  it("caps the list at 10 suggestions", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ title: `T${i}`, details: "D" }));
    expect(parseMomRevisionSuggestions(JSON.stringify(many))).toHaveLength(10);
  });
});
