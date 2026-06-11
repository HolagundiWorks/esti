import { describe, expect, it } from "vitest";
import {
  CoaWorkCategory,
  coaMinimumFee,
  coaRatio,
  isBelowCoaMinimum,
} from "./coa.js";

describe("COA scale of charges", () => {
  it("individual house min fee is 7.5% of cost of works", () => {
    // ₹1,00,00,000 cost of works → 7.5% = ₹7,50,000 = 75,000,000 paise
    expect(coaMinimumFee(CoaWorkCategory.RESIDENTIAL_INDIVIDUAL, 1000000000)).toBe(75000000);
  });
  it("non-housing min fee is 5%", () => {
    expect(coaMinimumFee(CoaWorkCategory.NON_HOUSING, 1000000000)).toBe(50000000);
  });
  it("ratio and below-minimum flag", () => {
    const min = coaMinimumFee(CoaWorkCategory.NON_HOUSING, 1000000000); // 50,000,000
    expect(coaRatio(43500000, min)).toBeCloseTo(0.87, 2);
    expect(isBelowCoaMinimum(43500000, min)).toBe(true);
    expect(isBelowCoaMinimum(50000000, min)).toBe(false);
  });
});
