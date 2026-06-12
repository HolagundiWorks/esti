import { describe, expect, it } from "vitest";
import {
  ReinforcementArrangement,
  StructuralElementTemplate,
} from "./knowledge-bank.js";

describe("knowledge bank structural templates", () => {
  it("accepts a versioned beam reinforcement template", () => {
    const result = StructuralElementTemplate.safeParse({
      code: "BM-RECT-01",
      name: "Rectangular beam",
      family: "BEAM",
      type: "RECTANGULAR",
      version: "1.0",
      geometry: { widthMm: 230, depthMm: 450, spanMm: 4000 },
      reinforcement: [
        {
          role: "MAIN",
          barMark: "B1",
          diaMm: 16,
          count: 4,
          coverMm: 25,
        },
        {
          role: "STIRRUP",
          barMark: "S1",
          diaMm: 8,
          spacingMm: 150,
          coverMm: 25,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("requires either count or spacing for each reinforcement row", () => {
    const result = ReinforcementArrangement.safeParse({
      role: "MAIN",
      barMark: "B1",
      diaMm: 16,
      coverMm: 25,
    });

    expect(result.success).toBe(false);
  });
});
