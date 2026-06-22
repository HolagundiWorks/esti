import { describe, expect, it } from "vitest";
import {
  officeScore,
  scoreApproval,
  scoreFinance,
  scoreProject,
  scoreTeam,
} from "./scoring.js";

describe("cognition scoring", () => {
  it("marks restricted finance as inactive", () => {
    const out = scoreFinance({
      outstandingPaise: 10_000_000,
      overdue30dPaise: 2_000_000,
      readyToBillPaise: 0,
      canSee: false,
    });

    expect(out.inactive).toBe(true);
    expect(out.severity).toBe("inactive");
  });

  it("downgrades approval health when approvals are blocked", () => {
    const out = scoreApproval({
      pendingApprovals: 4,
      maxWaitDays: 16,
      blockedApprovals: 2,
    });

    expect(out.score).toBeLessThan(65);
    expect(out.severity).toMatch(/friction|critical/);
  });

  it("excludes inactive domains from office score denominator", () => {
    const office = officeScore([
      scoreFinance({ outstandingPaise: 0, overdue30dPaise: 0, readyToBillPaise: 0, canSee: false }),
      scoreProject({ totalProjects: 2, redProjects: 0, yellowProjects: 0, delayedProjects: 0, staleApprovals: 0, openRevisions: 0 }),
      scoreTeam({ totalMembers: 2, overloaded: 0, busy: 0, overdueTasks: 0, hrEnabled: true }),
    ]);

    expect(office.score).toBeGreaterThan(90);
    expect(office.severity).toBe("stable");
  });
});
