import { describe, expect, it } from "vitest";
import { CPI_SECTIONS, CpiSectionId, parseCpiReport } from "./cpi.js";

describe("CPI sections", () => {
  it("orders all 20 form sections with unique ids", () => {
    expect(CPI_SECTIONS).toHaveLength(20);
    expect(new Set(CPI_SECTIONS.map((s) => s.id)).size).toBe(20);
    expect(CPI_SECTIONS.map((s) => s.no)).toEqual([...Array(20)].map((_, i) => i + 1));
    for (const s of CPI_SECTIONS) expect(CpiSectionId.parse(s.id)).toBe(s.id);
  });
});

describe("parseCpiReport", () => {
  const full = {
    designDna: "Warm Contemporary with Minimalist influences",
    colourPalette: "Warm neutrals, muted greens, natural oak, black accents",
    materialPreferences: "Wood, limestone, brushed brass, textured plaster",
    spatialPreferences: "Open-plan living with intimate private areas",
    lightingPreferences: "Warm, layered, indirect illumination",
    lifestyleDrivers: "Frequent entertaining, low-maintenance finishes",
    luxuryPriorities: "Kitchen, primary bathroom, and living room",
    avoidances: "High-gloss finishes, excessive ornamentation",
    summary: "A warm contemporary home.",
  };

  it("parses a bare JSON object", () => {
    expect(parseCpiReport(JSON.stringify(full))).toEqual(full);
  });

  it("parses a fenced object wrapped in prose", () => {
    const text = "Here is the report:\n```json\n" + JSON.stringify(full) + "\n```\nDone.";
    expect(parseCpiReport(text)).toEqual(full);
  });

  it("defaults missing fields to empty strings", () => {
    const r = parseCpiReport('{"designDna": "Minimal"}');
    expect(r?.designDna).toBe("Minimal");
    expect(r?.summary).toBe("");
  });

  it("returns null for unparseable output", () => {
    expect(parseCpiReport("no json here")).toBeNull();
    expect(parseCpiReport("{broken")).toBeNull();
  });
});
