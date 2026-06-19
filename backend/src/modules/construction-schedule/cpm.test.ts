import { describe, expect, it } from "vitest";
import { CpmCycleError, runCpm } from "./cpm.js";

describe("runCpm", () => {
  it("schedules a linear FS chain", () => {
    const activities = [
      { id: "a", durationDays: 5 },
      { id: "b", durationDays: 3 },
      { id: "c", durationDays: 4 },
    ];
    const deps = [
      { predecessorId: "a", successorId: "b", type: "FS" as const, lagDays: 0 },
      { predecessorId: "b", successorId: "c", type: "FS" as const, lagDays: 0 },
    ];
    const result = runCpm(activities, deps);
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(byId.a!.earlyStart).toBe(0);
    expect(byId.a!.earlyFinish).toBe(4);
    expect(byId.b!.earlyStart).toBe(5);
    expect(byId.c!.earlyStart).toBe(8);
    expect(byId.a!.isCritical).toBe(true);
    expect(byId.c!.isCritical).toBe(true);
  });

  it("handles parallel paths with float on non-critical branch", () => {
    const activities = [
      { id: "a", durationDays: 2 },
      { id: "b", durationDays: 10 },
      { id: "c", durationDays: 3 },
      { id: "d", durationDays: 1 },
    ];
    const deps = [
      { predecessorId: "a", successorId: "b", type: "FS" as const, lagDays: 0 },
      { predecessorId: "a", successorId: "c", type: "FS" as const, lagDays: 0 },
      { predecessorId: "b", successorId: "d", type: "FS" as const, lagDays: 0 },
      { predecessorId: "c", successorId: "d", type: "FS" as const, lagDays: 0 },
    ];
    const result = runCpm(activities, deps);
    const c = result.find((r) => r.id === "c")!;
    expect(c.totalFloat).toBeGreaterThan(0);
    expect(c.isCritical).toBe(false);
    const b = result.find((r) => r.id === "b")!;
    expect(b.isCritical).toBe(true);
  });

  it("applies lag on FS dependencies", () => {
    const activities = [
      { id: "a", durationDays: 5 },
      { id: "b", durationDays: 2 },
    ];
    const deps = [
      { predecessorId: "a", successorId: "b", type: "FS" as const, lagDays: 3 },
    ];
    const result = runCpm(activities, deps);
    const b = result.find((r) => r.id === "b")!;
    expect(b.earlyStart).toBe(8);
  });

  it("rejects dependency cycles", () => {
    const activities = [
      { id: "a", durationDays: 2 },
      { id: "b", durationDays: 2 },
    ];
    const deps = [
      { predecessorId: "a", successorId: "b", type: "FS" as const, lagDays: 0 },
      { predecessorId: "b", successorId: "a", type: "FS" as const, lagDays: 0 },
    ];
    expect(() => runCpm(activities, deps)).toThrow(CpmCycleError);
  });
});
