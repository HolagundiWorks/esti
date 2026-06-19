import { describe, expect, it } from "vitest";
import { registerExportRows } from "./readModels.js";

describe("document register", () => {
  it("formats export rows", () => {
    const rows = registerExportRows([
      {
        id: "a",
        entityType: "LETTER",
        ref: "LTR/2026-27/0001",
        title: "Test",
        projectId: null,
        projectRef: null,
        projectTitle: null,
        versionNo: 1,
        status: "ISSUED",
        pdfStatus: "READY",
        createdAt: new Date("2026-06-16"),
      },
    ]);
    expect(rows[0]?.Ref).toBe("LTR/2026-27/0001");
    expect(rows[0]?.Type).toBe("LETTER");
    expect(rows[0]?.Status).toBe("ISSUED");
  });
});
