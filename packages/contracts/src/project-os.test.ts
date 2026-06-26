import { describe, expect, it } from "vitest";
import { computeRiskScore, riskBandFor } from "./project-dna.js";
import { computeAssessment } from "./pre-project-assessment.js";
import { conversionProbability } from "./negotiation.js";
import { canTransition, evaluateActivationGate } from "./project-os.js";

describe("computeRiskScore", () => {
  it("scores a calm low-risk brief at zero", () => {
    const r = computeRiskScore({
      budgetMode: "FLEXIBLE",
      vastuRequirement: "NONE",
      designFlexibility: "ARCHITECT_FREEDOM",
      decisionMakers: "SINGLE_OWNER",
      timelineCriticality: "FLEXIBLE",
      revisionTolerance: "LOW",
      jurisdiction: "OTHER",
    });
    expect(r.score).toBe(0);
    expect(r.band).toBe("LOW");
    expect(r.factors).toHaveLength(0);
  });

  it("sums weights and clamps at 100", () => {
    const r = computeRiskScore({
      budgetMode: "VERY_STRICT", // 20
      vastuRequirement: "STRICT_TRADITIONAL", // 15
      designFlexibility: "STRICT_REQUIREMENT", // 10
      decisionMakers: "CORPORATE_COMMITTEE", // 10
      timelineCriticality: "URGENT", // 15
      revisionTolerance: "UNLIMITED", // 15
      jurisdiction: "BBMP", // 15
    });
    // 20+15+10+10+15+15+15 = 100
    expect(r.score).toBe(100);
    expect(r.band).toBe("HIGH_FRICTION");
    expect(r.factors).toHaveLength(7);
  });

  it("bands the boundaries correctly", () => {
    expect(riskBandFor(0)).toBe("LOW");
    expect(riskBandFor(29)).toBe("LOW");
    expect(riskBandFor(30)).toBe("MODERATE");
    expect(riskBandFor(59)).toBe("MODERATE");
    expect(riskBandFor(60)).toBe("COMPLEX");
    expect(riskBandFor(79)).toBe("COMPLEX");
    expect(riskBandFor(80)).toBe("HIGH_FRICTION");
    expect(riskBandFor(100)).toBe("HIGH_FRICTION");
  });

  it("ignores unknown jurisdictions", () => {
    const r = computeRiskScore({
      budgetMode: "FLEXIBLE",
      vastuRequirement: "NONE",
      designFlexibility: "ARCHITECT_FREEDOM",
      decisionMakers: "SINGLE_OWNER",
      timelineCriticality: "FLEXIBLE",
      revisionTolerance: "LOW",
      jurisdiction: "SOME_PANCHAYAT",
    });
    expect(r.score).toBe(0);
  });
});

describe("computeAssessment", () => {
  it("computes a square-plot feasibility end to end", () => {
    const d = computeAssessment({
      siteLength: 12, // m
      siteWidth: 9, // m  → 108 sqm
      farFactor: 1.75, // → 189 sqm permissible
      frontSetback: 3,
      rearSetback: 1.5,
      leftSetback: 1,
      rightSetback: 1,
      groundCoveragePct: 60, // → 64.8 sqm
      superBuiltupFactor: 1.25,
      constructionRatePaise: 2_000_000, // ₹20,000 / sqm
    });
    expect(d.siteAreaSqm).toBeCloseTo(108);
    expect(d.permissibleFarArea).toBeCloseTo(189);
    // netLength = 12-3-1.5=7.5, netWidth = 9-1-1=7 → 52.5
    expect(d.setbackBuildableArea).toBeCloseTo(52.5);
    expect(d.coverageArea).toBeCloseTo(64.8);
    // min(52.5, 64.8) = 52.5
    expect(d.actualGroundCoverage).toBeCloseTo(52.5);
    // 189 / 52.5 = 3.6
    expect(d.possibleFloors).toBeCloseTo(3.6);
    // 189 × 1.25 = 236.25
    expect(d.superBuiltupArea).toBeCloseTo(236.25);
    // 236.25 × 2,000,000 = 472,500,000 paise
    expect(d.estimatedProjectCostPaise).toBe(472_500_000);
  });

  it("uses manual area and coverage when no plot dimensions given", () => {
    const d = computeAssessment({
      manualArea: 200,
      farFactor: 2,
      groundCoveragePct: 50,
      superBuiltupFactor: 1.2,
      constructionRatePaise: 0,
    });
    expect(d.siteAreaSqm).toBe(200);
    expect(d.permissibleFarArea).toBe(400);
    expect(d.coverageArea).toBe(100);
    // no dims → actualGroundCoverage falls back to coverageArea
    expect(d.actualGroundCoverage).toBe(100);
    expect(d.possibleFloors).toBe(4);
    expect(d.superBuiltupArea).toBe(480);
    expect(d.estimatedProjectCostPaise).toBe(0);
  });

  it("never divides by zero", () => {
    const d = computeAssessment({ farFactor: 1.5, groundCoveragePct: 0 });
    expect(d.possibleFloors).toBe(0);
    expect(d.estimatedProjectCostPaise).toBe(0);
  });
});

describe("conversionProbability", () => {
  it("starts high and erodes with rounds and discount", () => {
    expect(conversionProbability({ rounds: 0, totalDiscountPct: 0 })).toBe(80);
    expect(conversionProbability({ rounds: 1, totalDiscountPct: 0 })).toBe(70);
    expect(conversionProbability({ rounds: 2, totalDiscountPct: 5 })).toBe(50);
    expect(conversionProbability({ rounds: 10, totalDiscountPct: 50 })).toBe(0);
  });
});

describe("canTransition", () => {
  it("allows the forward funnel", () => {
    expect(canTransition("ENQUIRY", "PROPOSAL")).toBe(true);
    expect(canTransition("ACTIVE", "ON_HOLD")).toBe(true);
    expect(canTransition("ON_HOLD", "ACTIVE")).toBe(true);
  });
  it("blocks illegal jumps", () => {
    // ENQUIRY → ACTIVE is not a manual transition (activation gate only)
    expect(canTransition("ENQUIRY", "ACTIVE")).toBe(false);
    expect(canTransition("PROPOSAL", "ACTIVE")).toBe(false);
    expect(canTransition("COMPLETED", "ACTIVE")).toBe(false);
  });
  it("treats a no-op as allowed", () => {
    expect(canTransition("ACTIVE", "ACTIVE")).toBe(true);
  });
});

describe("evaluateActivationGate", () => {
  const pass = {
    status: "PROPOSAL" as const,
    hasDna: true,
    hasAssessment: true,
    feeApproved: true,
    onboardingComplete: true,
    advancePaid: true,
  };
  it("passes when every gate is met", () => {
    const r = evaluateActivationGate(pass);
    expect(r.ok).toBe(true);
    expect(r.blockingReason).toBeNull();
    expect(r.checks.every((c) => c.ok)).toBe(true);
  });
  it("blocks on the first unmet gate", () => {
    const r = evaluateActivationGate({ ...pass, advancePaid: false });
    expect(r.ok).toBe(false);
    expect(r.blockingReason).toMatch(/Advance payment/);
  });
  it("requires PROPOSAL stage", () => {
    const r = evaluateActivationGate({ ...pass, status: "ENQUIRY" });
    expect(r.ok).toBe(false);
    expect(r.blockingReason).toMatch(/PROPOSAL/);
  });
});
