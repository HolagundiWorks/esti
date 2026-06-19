import { describe, expect, it } from "vitest";
import { formatINR, formatINRShort, parseINR, parseRupeeInput, roundToRupee } from "./money.js";
import { computeGst, GstSystem } from "./gst.js";
import { financialYear } from "./fy.js";

describe("money", () => {
  it("formats Indian grouping", () => {
    expect(formatINR(12345678050)).toBe("₹12,34,56,780.50");
    expect(formatINR(100000, { paise: false })).toBe("₹1,000");
  });
  it("short form uses crore/lakh/thousand", () => {
    expect(formatINRShort(1500000000)).toBe("₹1.50 Cr"); // ₹1.5 crore = 150,00,00,000 paise
    expect(formatINRShort(123400000)).toBe("₹12.34 L"); // ₹12.34 lakh = 12,34,00,000 paise
    expect(formatINRShort(4500000)).toBe("₹45k"); // ₹45,000
    expect(formatINRShort(550000)).toBe("₹5.5k"); // ₹5,500
  });
  it("round-trips parse", () => {
    expect(parseINR("₹1,23,456.50")).toBe(12345650);
  });
  it("parseRupeeInput is safe for empty form fields", () => {
    expect(parseRupeeInput("")).toBe(0);
    expect(parseRupeeInput("abc")).toBe(0);
    expect(parseRupeeInput("8500")).toBe(850_000);
  });
  it("rounds to rupee half-up", () => {
    expect(roundToRupee(150)).toBe(200);
    expect(roundToRupee(149)).toBe(100);
  });
});

describe("gst", () => {
  it("regular 18% splits CGST/SGST intra-state", () => {
    const b = computeGst(GstSystem.REGULAR, 1000000, false); // ₹10,000
    expect(b.gstTotal).toBe(180000);
    expect(b.cgst).toBe(90000);
    expect(b.sgst).toBe(90000);
    expect(b.grandTotal).toBe(1180000);
  });
  it("regular inter-state uses IGST", () => {
    const b = computeGst(GstSystem.REGULAR, 1000000, true);
    expect(b.igst).toBe(180000);
    expect(b.cgst).toBe(0);
  });
  it("composition is a 6% levy (CGST 3%+SGST 3%), not added to the bill", () => {
    const b = computeGst(GstSystem.COMPOSITION, 1000000, false);
    expect(b.documentKind).toBe("BILL_OF_SUPPLY");
    expect(b.compositionLevy).toBe(60000);
    expect(b.grandTotal).toBe(1000000);
  });
  it("not-applicable adds no tax", () => {
    const b = computeGst(GstSystem.NOT_APPLICABLE, 1000000, false);
    expect(b.gstTotal).toBe(0);
    expect(b.grandTotal).toBe(1000000);
  });
});

describe("financial year", () => {
  it("April starts the FY", () => {
    expect(financialYear(new Date("2026-04-01T00:00:00Z"))).toBe("2026-27");
    expect(financialYear(new Date("2026-03-31T00:00:00Z"))).toBe("2025-26");
  });
});
