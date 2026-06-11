import { describe, expect, it } from "vitest";
import { requireDeletableStatus, requireUnissuedDocument } from "./retention.js";

describe("retention rules", () => {
  it("allows unissued or failed draft document cleanup", () => {
    expect(() => requireUnissuedDocument({ pdfStatus: "NONE", pdfKey: null }, "Letter")).not.toThrow();
    expect(() => requireUnissuedDocument({ pdfStatus: "FAILED", pdfKey: null }, "Letter")).not.toThrow();
  });

  it("retains pending, rendered, and stored documents", () => {
    expect(() => requireUnissuedDocument({ pdfStatus: "PENDING", pdfKey: null }, "Letter")).toThrowError(
      "Letter has been issued or rendered and must be retained",
    );
    expect(() => requireUnissuedDocument({ pdfStatus: "READY", pdfKey: "pdf/letter.pdf" }, "Letter")).toThrow();
  });

  it("allows only explicitly deletable lifecycle states", () => {
    expect(() => requireDeletableStatus("DRAFT", ["DRAFT", "CANCELLED"], "Purchase order")).not.toThrow();
    expect(() => requireDeletableStatus("CANCELLED", ["DRAFT", "CANCELLED"], "Purchase order")).not.toThrow();
    expect(() => requireDeletableStatus("ISSUED", ["DRAFT", "CANCELLED"], "Purchase order")).toThrowError(
      "Purchase order in ISSUED status must be retained",
    );
  });
});
