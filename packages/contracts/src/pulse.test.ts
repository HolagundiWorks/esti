import { describe, expect, it } from "vitest";
import { bandForScore, computeConfidenceScore, detectMissingParameters } from "./pulse.js";

describe("bandForScore", () => {
  it("maps the full 0-100 range to the five consequence bands", () => {
    expect(bandForScore(100)).toBe("CRITICAL");
    expect(bandForScore(80)).toBe("CRITICAL");
    expect(bandForScore(79)).toBe("ACTION_TODAY");
    expect(bandForScore(60)).toBe("ACTION_TODAY");
    expect(bandForScore(59)).toBe("WATCH");
    expect(bandForScore(40)).toBe("WATCH");
    expect(bandForScore(39)).toBe("NORMAL");
    expect(bandForScore(20)).toBe("NORMAL");
    expect(bandForScore(19)).toBe("BACKLOG");
    expect(bandForScore(0)).toBe("BACKLOG");
  });
});

describe("computeConfidenceScore", () => {
  const healthy = {
    status: "IN_PROGRESS",
    openMissingParameterCount: 0,
    hasUnresolvedBlockingDependency: false,
    hasAssignee: true,
    hasDueDate: true,
    daysSinceUpdate: 0,
  };

  it("is fully confident for a clean, fresh task", () => {
    expect(computeConfidenceScore(healthy)).toBe(100);
  });

  it("is always 100 for DONE or CANCELLED regardless of gaps", () => {
    expect(
      computeConfidenceScore({ ...healthy, status: "DONE", openMissingParameterCount: 4, hasAssignee: false }),
    ).toBe(100);
    expect(computeConfidenceScore({ ...healthy, status: "CANCELLED", daysSinceUpdate: 40 })).toBe(100);
  });

  it("penalises each open missing parameter, capped at 5", () => {
    expect(computeConfidenceScore({ ...healthy, openMissingParameterCount: 1 })).toBe(88);
    expect(computeConfidenceScore({ ...healthy, openMissingParameterCount: 5 })).toBe(40);
    expect(computeConfidenceScore({ ...healthy, openMissingParameterCount: 9 })).toBe(40);
  });

  it("penalises an unresolved blocking dependency", () => {
    expect(computeConfidenceScore({ ...healthy, hasUnresolvedBlockingDependency: true })).toBe(80);
  });

  it("penalises missing assignee and missing due date", () => {
    expect(computeConfidenceScore({ ...healthy, hasAssignee: false })).toBe(90);
    expect(computeConfidenceScore({ ...healthy, hasDueDate: false })).toBe(95);
  });

  it("penalises staleness in two tiers", () => {
    expect(computeConfidenceScore({ ...healthy, daysSinceUpdate: 3 })).toBe(95);
    expect(computeConfidenceScore({ ...healthy, daysSinceUpdate: 6.9 })).toBe(95);
    expect(computeConfidenceScore({ ...healthy, daysSinceUpdate: 7 })).toBe(85);
  });

  it("matches the worked example from the spec (Issue electrical drawing)", () => {
    // Open, due tomorrow, missing client fixture approval only.
    const score = computeConfidenceScore({
      status: "TODO",
      openMissingParameterCount: 1,
      hasUnresolvedBlockingDependency: false,
      hasAssignee: true,
      hasDueDate: true,
      daysSinceUpdate: 0,
    });
    expect(score).toBe(88);
  });

  it("clamps at zero and never goes negative", () => {
    expect(
      computeConfidenceScore({
        status: "BLOCKED",
        openMissingParameterCount: 9,
        hasUnresolvedBlockingDependency: true,
        hasAssignee: false,
        hasDueDate: false,
        daysSinceUpdate: 30,
      }),
    ).toBe(0);
  });
});

describe("detectMissingParameters", () => {
  const base = {
    status: "TODO",
    dueDate: "2026-08-01" as string | null,
    assigneeId: "11111111-1111-1111-1111-111111111111" as string | null,
    updatedAt: new Date().toISOString(),
    hasUnresolvedBlockingDependency: false,
    hasAnyMissingParameter: false,
  };

  it("finds nothing for a clean, fresh task", () => {
    expect(detectMissingParameters(base)).toEqual([]);
  });

  it("flags a missing due date", () => {
    expect(detectMissingParameters({ ...base, dueDate: null })).toEqual(["NO_DUE_DATE"]);
  });

  it("flags a missing assignee", () => {
    expect(detectMissingParameters({ ...base, assigneeId: null })).toEqual(["NO_ASSIGNEE"]);
  });

  it("flags a stale update at 5+ days, not before", () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(detectMissingParameters({ ...base, updatedAt: fourDaysAgo })).toEqual([]);
    expect(detectMissingParameters({ ...base, updatedAt: fiveDaysAgo })).toEqual(["STALE_UPDATE"]);
  });

  it("flags an unresolved blocking dependency", () => {
    expect(detectMissingParameters({ ...base, hasUnresolvedBlockingDependency: true })).toEqual([
      "UNRESOLVED_DEPENDENCY",
    ]);
  });

  it("flags BLOCKED_NO_REASON only when blocked with no dependency and no recorded gap", () => {
    expect(detectMissingParameters({ ...base, status: "BLOCKED" })).toEqual(["BLOCKED_NO_REASON"]);
    expect(
      detectMissingParameters({ ...base, status: "BLOCKED", hasUnresolvedBlockingDependency: true }),
    ).toEqual(["UNRESOLVED_DEPENDENCY"]);
    expect(detectMissingParameters({ ...base, status: "BLOCKED", hasAnyMissingParameter: true })).toEqual([]);
  });

  it("raises nothing for DONE or CANCELLED tasks, however stale or ungapped", () => {
    const monthAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      detectMissingParameters({
        ...base,
        status: "DONE",
        dueDate: null,
        assigneeId: null,
        updatedAt: monthAgo,
      }),
    ).toEqual([]);
    expect(detectMissingParameters({ ...base, status: "CANCELLED", dueDate: null })).toEqual([]);
  });

  it("stacks multiple simultaneous gaps", () => {
    const found = detectMissingParameters({
      ...base,
      dueDate: null,
      assigneeId: null,
      hasUnresolvedBlockingDependency: true,
    });
    expect(found).toEqual(["NO_DUE_DATE", "NO_ASSIGNEE", "UNRESOLVED_DEPENDENCY"]);
  });
});
