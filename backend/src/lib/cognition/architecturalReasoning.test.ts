import { describe, expect, it } from "vitest";
import { reasonAboutTask, type ArchitecturalReasoningInput } from "./architecturalReasoning.js";

const base: ArchitecturalReasoningInput = { taskId: "t1", title: "Untitled task" };

describe("architectural reasoning engine", () => {
  it("uses the dependency graph when both edges are present", () => {
    const out = reasonAboutTask({
      ...base,
      title: "GFC drawing set",
      hasPredecessor: true,
      hasSuccessor: true,
      hasAssignee: true,
      hasDueDate: true,
    });
    expect(out.dependencyStatus).toBe("complete");
    expect(out.reasoningSource).toBe("dependency_graph");
    expect(out.confidence).toBe("high");
    // Known edges are not re-inferred.
    expect(out.inferredPredecessors).toEqual([]);
    expect(out.inferredSuccessors).toEqual([]);
  });

  it("infers from the workflow template when dependencies are partial", () => {
    const out = reasonAboutTask({
      ...base,
      title: "Detailed working drawings",
      hasAssignee: true,
      projectStage: "execution_drawing",
      hasDueDate: true,
    });
    expect(out.dependencyStatus).toBe("partial");
    expect(out.reasoningSource).toBe("workflow_template");
    expect(out.inferredPredecessors.length).toBeGreaterThan(0);
    expect(out.likelyImpactAreas).toContain("project");
  });

  it("matches the spec example: facade drawing, senior architect, client meeting tomorrow", () => {
    const out = reasonAboutTask({
      taskId: "facade-1",
      title: "Final facade drawing",
      hasAssignee: true,
      assigneeRole: "senior_architect",
      daysToNearestMeeting: 1, // meeting tomorrow
    });
    expect(out.likelyImpactAreas).toEqual(expect.arrayContaining(["project", "client", "team"]));
    expect(out.confidence).toBe("medium");
    expect(out.dashboardState).toBe("attention_required");
    expect(out.userFacingSummary.toLowerCase()).toContain("client review");
  });

  it("creates a link-the-sequence nudge when dependency data is missing", () => {
    const out = reasonAboutTask({ taskId: "t2", title: "Some loose task" });
    expect(out.dependencyStatus).toBe("missing");
    expect(out.dashboardState).toBe("attention_required");
    expect(out.suggestedAction.toLowerCase()).toContain("link");
    // Never leaks confidence wording to the user.
    expect(out.userFacingSummary.toLowerCase()).not.toContain("confidence");
    expect(out.userFacingSummary.toLowerCase()).not.toContain("uncertain");
  });

  it("raises overdue work to urgent, but not low-confidence assumptions", () => {
    const overdue = reasonAboutTask({ ...base, title: "Issue site release", hasPredecessor: true, hasSuccessor: true, daysToDue: -3 });
    expect(overdue.dashboardState).toBe("urgent_action");

    // Pure assumption (no stage/role/deadline) stays calm, not urgent.
    const loose = reasonAboutTask({ taskId: "t3", title: "Misc note" });
    expect(loose.dashboardState).not.toBe("urgent_action");
    expect(loose.confidence).toBe("low");
  });

  it("flags billing impact for approval/milestone tasks", () => {
    const out = reasonAboutTask({ ...base, title: "Client approval for milestone 2", hasAssignee: true });
    expect(out.likelyImpactAreas).toContain("billing");
  });

  it("treats a strong historical pattern as high confidence", () => {
    const out = reasonAboutTask({
      ...base,
      title: "Chase client approval",
      clientDelaysApprovals: true,
    });
    expect(out.reasoningSource).toBe("historical_pattern");
    expect(out.confidence).toBe("high");
  });

  it("never marks a done task as needing action", () => {
    const out = reasonAboutTask({ ...base, title: "Final facade drawing", status: "DONE", daysToDue: -5 });
    expect(out.dashboardState).toBe("running_smoothly");
  });
});
