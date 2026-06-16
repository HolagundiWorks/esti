import { describe, expect, it } from "vitest";
import { pdfPollInterval, pdfUiState } from "./pdfUi.js";

describe("pdfUi", () => {
  it("polls while PDF is pending or processing", () => {
    expect(pdfPollInterval("NONE")).toBe(false);
    expect(pdfPollInterval("READY")).toBe(false);
    expect(pdfPollInterval("PENDING")).toBe(1500);
    expect(pdfPollInterval("PROCESSING")).toBe(1500);
    expect(pdfPollInterval("FAILED")).toBe(false);
  });

  it("maps worker status to button states", () => {
    expect(pdfUiState("READY", "https://example.test/doc.pdf")).toBe("open");
    expect(pdfUiState("READY", null)).toBe("generate");
    expect(pdfUiState("PENDING", null)).toBe("generating");
    expect(pdfUiState("PROCESSING", null)).toBe("generating");
    expect(pdfUiState("FAILED", null)).toBe("retry");
    expect(pdfUiState("NONE", null)).toBe("generate");
  });
});
