import { describe, expect, it } from "vitest";
import { cmsAmountPaise, computeQuantity } from "./cms.js";

describe("computeQuantity", () => {
  it("VOLUME = L×H×T (mm → m³)", () => {
    // Brickwork 5000 × 3000 × 230 mm → 3.45 m³ (blueprint example)
    expect(computeQuantity("VOLUME", { length: 5000, height: 3000, thickness: 230 })).toBe(3.45);
  });
  it("AREA = L×H (mm → m²)", () => {
    expect(computeQuantity("AREA", { length: 5000, height: 3000 })).toBe(15);
  });
  it("LENGTH = L (mm → m)", () => {
    expect(computeQuantity("LENGTH", { length: 5000 })).toBe(5);
  });
  it("COUNT = nos", () => {
    expect(computeQuantity("COUNT", { nos: 12 })).toBe(12);
  });
  it("is zero when the needed dimensions are absent", () => {
    expect(computeQuantity("VOLUME", { length: 5000, height: 3000 })).toBe(0); // no thickness
    expect(computeQuantity("AREA", {})).toBe(0);
  });
});

describe("cmsAmountPaise", () => {
  it("quantity × rate, rounded to the paisa", () => {
    // 3.45 m³ × ₹6,700 = ₹23,115
    expect(cmsAmountPaise(3.45, 670000)).toBe(2311500);
  });
  it("is zero when quantity or rate is zero", () => {
    expect(cmsAmountPaise(0, 670000)).toBe(0);
    expect(cmsAmountPaise(3.45, 0)).toBe(0);
  });
});
