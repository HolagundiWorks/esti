import { describe, expect, it } from "vitest";
import { DEFAULT_ESCALATION_SETTINGS, parseEscalationSettings } from "./notifications.js";

describe("parseEscalationSettings", () => {
  it("returns defaults for invalid stored JSON", () => {
    expect(parseEscalationSettings({ staleApprovalDays: "not-a-number" })).toEqual(
      DEFAULT_ESCALATION_SETTINGS,
    );
  });

  it("merges valid partial overrides", () => {
    expect(parseEscalationSettings({ taskOverdueDays: 5 })).toEqual({
      ...DEFAULT_ESCALATION_SETTINGS,
      taskOverdueDays: 5,
    });
  });
});
