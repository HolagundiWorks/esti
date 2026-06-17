import {
  PeriodFilterInput,
  financialYear,
  fyDateRange,
  quarterDateRange,
  resolvePeriodRange,
} from "./fy.js";

describe("resolvePeriodRange", () => {
  const today = new Date("2026-08-15T12:00:00Z");

  it("defaults to current FY", () => {
    const r = resolvePeriodRange(undefined, today);
    expect(r.from).toBe("2026-04-01");
    expect(r.to).toBe("2027-03-31");
    expect(r.label).toContain("2026-27");
  });

  it("resolves FY quarter Q2", () => {
    const r = resolvePeriodRange(
      { preset: "QUARTER", fy: "2026-27", quarter: "Q2" },
      today,
    );
    expect(r.from).toBe("2026-07-01");
    expect(r.to).toBe("2026-09-30");
  });

  it("resolves calendar month", () => {
    const r = resolvePeriodRange({ preset: "MONTH", month: "2026-01" }, today);
    expect(r.from).toBe("2026-01-01");
    expect(r.to).toBe("2026-01-31");
  });

  it("fyDateRange matches financialYear", () => {
    expect(fyDateRange(financialYear(today)).from).toBe("2026-04-01");
    expect(quarterDateRange("2025-26", "Q4").to).toBe("2026-03-31");
  });
});

describe("PeriodFilterInput", () => {
  it("parses custom range", () => {
    const p = PeriodFilterInput.parse({
      preset: "CUSTOM",
      fromDate: "2026-01-01",
      toDate: "2026-06-30",
    });
    const r = resolvePeriodRange(p);
    expect(r.from).toBe("2026-01-01");
    expect(r.to).toBe("2026-06-30");
  });
});
