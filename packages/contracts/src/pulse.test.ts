import { describe, expect, it } from "vitest";
import {
  bandForScore,
  composeStandupQuestion,
  computeConfidenceScore,
  detectMissingParameters,
  dueStandupCycle,
  isOverdueForEscalation,
  missingParameterStatusForResponse,
  nextEscalationRung,
} from "./pulse.js";

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

describe("dueStandupCycle", () => {
  it("matches each default cycle hour exactly", () => {
    expect(dueStandupCycle(9)).toBe("MORNING_PULSE");
    expect(dueStandupCycle(12)).toBe("MIDDAY_BLOCKER");
    expect(dueStandupCycle(15)).toBe("DEPENDENCY_CHECK");
    expect(dueStandupCycle(18)).toBe("CLOSURE_REVIEW");
  });

  it("is null outside the four cycle hours", () => {
    expect(dueStandupCycle(8)).toBeNull();
    expect(dueStandupCycle(10)).toBeNull();
    expect(dueStandupCycle(0)).toBeNull();
    expect(dueStandupCycle(23)).toBeNull();
  });
});

describe("missingParameterStatusForResponse", () => {
  it("resolves CONFIRMED and NOT_REQUIRED responses", () => {
    expect(missingParameterStatusForResponse("CONFIRMED")).toBe("CONFIRMED");
    expect(missingParameterStatusForResponse("NOT_REQUIRED")).toBe("NOT_REQUIRED");
  });

  it("leaves every other response OPEN", () => {
    expect(missingParameterStatusForResponse("BLOCKED")).toBe("OPEN");
    expect(missingParameterStatusForResponse("NEEDS_REVIEW")).toBe("OPEN");
    expect(missingParameterStatusForResponse("ATTACHED_DOCUMENT")).toBe("OPEN");
    expect(missingParameterStatusForResponse("COMMENT_ONLY")).toBe("OPEN");
    expect(missingParameterStatusForResponse("PENDING")).toBe("OPEN");
  });
});

describe("composeStandupQuestion", () => {
  it("matches the spec's worked example format exactly", () => {
    const text = composeStandupQuestion({
      projectTitle: "Residence A",
      taskTitle: "Finalize staircase detail",
      missingParameterLabels: [
        "Site measurement missing",
        "Consultant input missing",
        "Vendor / material decision missing",
      ],
      cutoffLabel: "3 PM",
    });
    expect(text).toBe(
      [
        "Project: Residence A",
        "Task: Finalize staircase detail",
        "Missing:",
        "1. Site measurement missing",
        "2. Consultant input missing",
        "3. Vendor / material decision missing",
        "Please update these before 3 PM.",
      ].join("\n"),
    );
  });

  it("uses singular wording for exactly one gap", () => {
    const text = composeStandupQuestion({
      projectTitle: "Residence A",
      taskTitle: "Issue electrical drawing",
      missingParameterLabels: ["Client approval missing"],
      cutoffLabel: "tomorrow morning",
    });
    expect(text.endsWith("Please update this before tomorrow morning.")).toBe(true);
  });

  it("never emits a generic please-update-your-tasks message", () => {
    const text = composeStandupQuestion({
      projectTitle: "Alpha",
      taskTitle: "Tile selection",
      missingParameterLabels: ["Client approval missing"],
      cutoffLabel: "3 PM",
    });
    expect(text).not.toMatch(/please update your tasks/i);
    expect(text).toContain("Alpha");
    expect(text).toContain("Tile selection");
  });
});

describe("nextEscalationRung", () => {
  it("climbs assignee -> reviewer -> owner -> nowhere", () => {
    expect(nextEscalationRung("ASSIGNEE")).toBe("REVIEWER");
    expect(nextEscalationRung("REVIEWER")).toBe("OWNER");
    expect(nextEscalationRung("OWNER")).toBeNull();
  });
});

describe("isOverdueForEscalation", () => {
  const now = new Date("2026-07-03T12:00:00Z");

  it("is not overdue before the threshold", () => {
    const createdAt = new Date("2026-07-03T00:00:00Z"); // 12h old
    expect(isOverdueForEscalation({ responseStatus: "PENDING", createdAt }, now)).toBe(false);
  });

  it("is overdue once past the default 24h threshold", () => {
    const createdAt = new Date("2026-07-02T11:00:00Z"); // 25h old
    expect(isOverdueForEscalation({ responseStatus: "PENDING", createdAt }, now)).toBe(true);
  });

  it("respects a custom threshold", () => {
    const createdAt = new Date("2026-07-03T06:00:00Z"); // 6h old
    expect(isOverdueForEscalation({ responseStatus: "PENDING", createdAt }, now, 4)).toBe(true);
    expect(isOverdueForEscalation({ responseStatus: "PENDING", createdAt }, now, 8)).toBe(false);
  });

  it("is never overdue once answered", () => {
    const createdAt = new Date("2026-07-01T00:00:00Z"); // very old
    expect(isOverdueForEscalation({ responseStatus: "CONFIRMED", createdAt }, now)).toBe(false);
    expect(isOverdueForEscalation({ responseStatus: "BLOCKED", createdAt }, now)).toBe(false);
  });
});
