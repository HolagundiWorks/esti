import { describe, expect, it } from "vitest";
import {
  canonicalUnit,
  detectFormat,
  normName,
  parseRatePaise,
  parseRateText,
} from "./rate-import.js";

describe("canonicalUnit", () => {
  it("maps metric + Indian variants to lowercase-metric canonicals", () => {
    expect(canonicalUnit("Sqm")).toBe("m2");
    expect(canonicalUnit("sq.m")).toBe("m2");
    expect(canonicalUnit("M2")).toBe("m2");
    expect(canonicalUnit("Cum")).toBe("m3");
    expect(canonicalUnit("cu.m")).toBe("m3");
    expect(canonicalUnit("Rmt")).toBe("m");
    expect(canonicalUnit("RM")).toBe("m");
    expect(canonicalUnit("Nos")).toBe("no");
    expect(canonicalUnit("no.")).toBe("no");
    expect(canonicalUnit("Bag")).toBe("bag");
  });
  it("returns null for unknown units", () => {
    expect(canonicalUnit("widgets")).toBeNull();
    expect(canonicalUnit("")).toBeNull();
    expect(canonicalUnit(null)).toBeNull();
  });
});

describe("normName (dedup key)", () => {
  it("collapses punctuation/case/whitespace + strips leading codes so variants match", () => {
    expect(normName("OPC 53 Cement")).toBe(normName("opc  53   cement"));
    expect(normName("Cement, OPC-53")).toBe("cement opc 53");
    expect(normName("1. AC sheet 6 mm")).toBe("ac sheet 6 mm");
    expect(normName("7.23.1.1 12 mm thick")).toBe("12 mm thick");
  });
});

describe("parseRatePaise", () => {
  it("parses rupee strings (with thousands commas) to integer paise", () => {
    expect(parseRatePaise("160.00")).toBe(16000);
    expect(parseRatePaise("4,683.00")).toBe(468300);
    expect(parseRatePaise("250")).toBe(25000);
  });
  it("rejects non-numbers", () => {
    expect(parseRatePaise("m2")).toBeNull();
    expect(parseRatePaise("")).toBeNull();
  });
});

describe("detectFormat", () => {
  it("flags hierarchical DSR codes as schedule", () => {
    const text = `7.16 Providing & fixing pressed clay tiles m2 565.00
7.23.1.1 12 mm thick m2 638.00`;
    expect(detectFormat(text)).toBe("schedule");
  });
  it("flags a numbered material list as material", () => {
    const text = `1. AC sheet 6 mm thick corrugated m2 160.00
2. Acrylic Exterior Paint l 250.00`;
    expect(detectFormat(text)).toBe("material");
  });
});

describe("parseRateText — material", () => {
  it("splits sl-no / description / unit / rate and canonicalises the unit", () => {
    const text = `1. AC sheet 6 mm thick corrugated   Sqm   160.00
2. AAC blocks 200x100x600 mm         Cum   4683.00`;
    const res = parseRateText(text, "material");
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0]).toMatchObject({
      slNo: "1",
      description: "AC sheet 6 mm thick corrugated",
      rawUnit: "Sqm",
      unit: "m2",
      ratePaise: 16000,
      isMeasurable: true,
    });
    expect(res.rows[1]).toMatchObject({ unit: "m3", ratePaise: 468300 });
    expect(res.errorCount).toBe(0);
  });

  it("joins multi-line descriptions before the unit+rate", () => {
    const text = `1. Providing and laying cement concrete
   1:2:4 nominal mix   Cum   6200.00`;
    const res = parseRateText(text, "material");
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.description).toBe("Providing and laying cement concrete 1:2:4 nominal mix");
    expect(res.rows[0]!.unit).toBe("m3");
    expect(res.rows[0]!.ratePaise).toBe(620000);
  });

  it("flags a short unknown unit as a warning, not an error", () => {
    const text = `1. Mystery item   xyz   100.00`;
    const res = parseRateText(text, "material");
    expect(res.rows[0]!.description).toBe("Mystery item");
    expect(res.rows[0]!.rawUnit).toBe("xyz");
    expect(res.rows[0]!.unit).toBeNull();
    expect(res.rows[0]!.flags).toContain("unknown-unit");
    expect(res.warningCount).toBe(1);
    expect(res.errorCount).toBe(0);
  });

  it("does not eat a single-word description as a unit when there is no unit", () => {
    const text = `1. Sand   4500.00`;
    const res = parseRateText(text, "material");
    expect(res.rows[0]!.description).toBe("Sand");
    expect(res.rows[0]!.rawUnit).toBeNull();
    expect(res.rows[0]!.ratePaise).toBe(450000);
  });
});

describe("parseRateText — schedule", () => {
  it("keeps section headers (no unit/rate) as valid non-measurable parents", () => {
    const text = `7.23 Providing and fixing insulating board ceiling
7.23.1 Natural colour insulating board
7.23.1.1 12 mm thick   Sqm   638.00`;
    const res = parseRateText(text, "schedule");
    expect(res.rows).toHaveLength(3);
    expect(res.rows[0]).toMatchObject({ code: "7.23", isMeasurable: false, level: 2 });
    expect(res.rows[1]).toMatchObject({ code: "7.23.1", parentCode: "7.23", level: 3 });
    expect(res.rows[2]).toMatchObject({
      code: "7.23.1.1",
      parentCode: "7.23.1",
      unit: "m2",
      ratePaise: 63800,
      isMeasurable: true,
      level: 4,
    });
    // headers without rate are NOT errors
    expect(res.errorCount).toBe(0);
  });
});
