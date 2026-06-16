import { describe, expect, it } from "vitest";
import {
  buildAspRfKpiScores,
  computeClientImpactKpi,
  computeCollaborationKpi,
  computeDeliveryPredictability,
  computeLearningKpi,
  computeQualityKpi,
  computeReliabilityKpi,
  computeWellbeingKpi,
} from "./asprf.js";

describe("ASPRF reliability KPI", () => {
  it("scores perfect delivery predictability when hours match estimates", () => {
    expect(
      computeDeliveryPredictability([
        { estimatedHours: 8, actualHours: 8 },
        { estimatedHours: 4, actualHours: 4 },
      ]),
    ).toBe(100);
  });

  it("penalises overruns and underruns symmetrically", () => {
    const score = computeDeliveryPredictability([{ estimatedHours: 10, actualHours: 20 }]);
    expect(score).toBe(50);
  });

  it("blends commitment with delivery predictability", () => {
    expect(computeReliabilityKpi(8, 10, 100)).toBe(90);
    expect(computeReliabilityKpi(10, 10, 80)).toBe(90);
  });
});

describe("ASPRF dimension KPIs", () => {
  it("computes quality from rework rate and completion", () => {
    expect(computeQualityKpi(2, 10, 8, 10)).toBeLessThan(100);
    expect(computeQualityKpi(0, 5, 5, 5)).toBe(100);
  });

  it("computes client impact from first-pass approvals and client drag", () => {
    expect(computeClientImpactKpi(4, 5, 1, 10)).toBeGreaterThan(70);
    expect(computeClientImpactKpi(0, 5, 5, 10)).toBeLessThan(50);
  });

  it("computes collaboration from review participation", () => {
    expect(computeCollaborationKpi(3, 4, 3)).toBeGreaterThan(80);
    expect(computeCollaborationKpi(0, 4, 0)).toBeLessThan(35);
  });

  it("rewards ~10% training task share", () => {
    expect(computeLearningKpi(1, 10)).toBe(100);
    expect(computeLearningKpi(0, 10)).toBe(0);
  });

  it("penalises overdue and heavy workload for wellbeing", () => {
    expect(
      computeWellbeingKpi({
        overdueTasks: 0,
        openTasks: 5,
        heavyDueDays: 0,
        windowDays: 30,
      }),
    ).toBe(100);
    expect(
      computeWellbeingKpi({
        overdueTasks: 3,
        openTasks: 5,
        heavyDueDays: 10,
        windowDays: 30,
      }),
    ).toBeLessThan(65);
  });

  it("includes wellbeing only when opted in", () => {
    const off = buildAspRfKpiScores({
      totalTasks: 10,
      completedTasks: 8,
      onTimeTasks: 8,
      deliveryPredictability: 90,
      trainingTasks: 1,
      reviewsCompleted: 2,
      reviewsAssigned: 2,
      reviewsOnTime: 2,
      internalRevisions: 0,
      totalRevisions: 2,
      clientDrivenDecisions: 0,
      firstPassApproved: 2,
      decidedSubmissions: 2,
      overdueTasks: 0,
      openTasks: 2,
      heavyDueDays: 0,
      windowDays: 30,
      wellbeingOptIn: false,
    });
    expect(off.wellbeing).toBeNull();

    const on = buildAspRfKpiScores({
      ...{
        totalTasks: 10,
        completedTasks: 8,
        onTimeTasks: 8,
        deliveryPredictability: 90,
        trainingTasks: 1,
        reviewsCompleted: 2,
        reviewsAssigned: 2,
        reviewsOnTime: 2,
        internalRevisions: 0,
        totalRevisions: 2,
        clientDrivenDecisions: 0,
        firstPassApproved: 2,
        decidedSubmissions: 2,
        overdueTasks: 0,
        openTasks: 2,
        heavyDueDays: 0,
        windowDays: 30,
      },
      wellbeingOptIn: true,
    });
    expect(on.wellbeing).toBe(100);
  });
});
