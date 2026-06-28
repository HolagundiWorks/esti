import { describe, expect, it } from "vitest";
import { computeLineAmount, estimateTotalPaise } from "./estimation-os.js";

describe("computeLineAmount", () => {
  it("multiplies quantity × rate, rounded to the paisa", () => {
    expect(computeLineAmount(10, 650000)).toBe(6500000); // 10 Cum @ ₹6,500
    expect(computeLineAmount(2.5, 42000)).toBe(105000); // 2.5 × ₹420
  });

  it("rounds half-paisa fractions deterministically", () => {
    expect(computeLineAmount(0.333, 100)).toBe(33); // 33.3 → 33
    expect(computeLineAmount(0.336, 100)).toBe(34); // 33.6 → 34
  });

  it("is zero when quantity or rate is zero", () => {
    expect(computeLineAmount(0, 99999)).toBe(0);
    expect(computeLineAmount(99, 0)).toBe(0);
  });
});

describe("estimateTotalPaise", () => {
  it("sums line amounts", () => {
    expect(
      estimateTotalPaise([{ amountPaise: 6500000 }, { amountPaise: 105000 }, { amountPaise: 0 }]),
    ).toBe(6605000);
  });

  it("is zero for an empty estimate", () => {
    expect(estimateTotalPaise([])).toBe(0);
  });
});
