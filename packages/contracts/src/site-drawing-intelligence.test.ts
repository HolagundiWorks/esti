import { describe, expect, it } from "vitest";
import { computeSiteDrawingIntelligence } from "./site-drawing-intelligence.js";

describe("computeSiteDrawingIntelligence", () => {
  it("computes site query rate against issued drawings", () => {
    const r = computeSiteDrawingIntelligence({
      totalDrawings: 50,
      issuedDrawings: 20,
      internalErrors: 2,
      techQueries: 4,
      queriedDrawings: 3,
      repeatQueryDrawings: 1,
      totalDecisions: 10,
    });
    expect(r.siteQueryRate).toBe(20); // 4/20
    expect(r.repeatQueryRate).toBe(33); // 1/3
    expect(r.drawingAccuracyPct).toBe(80); // 1 - 2/10
    expect(r.drawingClarityScore).toBeLessThan(100);
  });

  it("returns zero rates when no issued drawings", () => {
    const r = computeSiteDrawingIntelligence({
      totalDrawings: 5,
      issuedDrawings: 0,
      internalErrors: 0,
      techQueries: 0,
      queriedDrawings: 0,
      repeatQueryDrawings: 0,
      totalDecisions: 0,
    });
    expect(r.siteQueryRate).toBe(0);
    expect(r.repeatQueryRate).toBe(0);
    expect(r.drawingClarityScore).toBe(100);
  });
});
