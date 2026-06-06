import { describe, expect, it } from "vitest";
import { invoiceTax, tds } from "./tax.js";

describe("backend tax", () => {
  it("regular invoice tax on ₹1,00,000", () => {
    const b = invoiceTax(10000000, false);
    expect(b.gstTotal).toBe(1800000);
    expect(b.grandTotal).toBe(11800000);
  });
  it("194J TDS is 10%", () => {
    expect(tds(10000000)).toBe(1000000);
  });
});
