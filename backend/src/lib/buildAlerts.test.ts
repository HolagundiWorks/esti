import { describe, expect, it } from "vitest";
import {
  ALERT_KINDS,
  assertValidAlert,
  buildDigest,
  isAlertKind,
  mapConstructionAlert,
  type Alert,
} from "./buildAlerts.js";

const today = "2026-06-15";

function sampleAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "task:1",
    kind: "task",
    severity: "high",
    title: "Overdue task: Site visit",
    detail: "Due 2026-06-01",
    projectId: "00000000-0000-0000-0000-000000000010",
    projectRef: "HCW-001",
    date: "2026-06-01",
    immediate: true,
    ...overrides,
  };
}

describe("buildDigest", () => {
  it("returns nothing when digest is disabled", () => {
    const alerts = [sampleAlert(), sampleAlert({ id: "followup:1", kind: "followup", severity: "medium", immediate: false })];
    expect(buildDigest(alerts, false)).toEqual([]);
  });

  it("excludes immediate high-priority alerts when digest is enabled", () => {
    const alerts = [
      sampleAlert(),
      sampleAlert({ id: "followup:2", kind: "followup", severity: "medium", immediate: false }),
    ];
    expect(buildDigest(alerts, true)).toEqual([alerts[1]]);
  });

  it("includes low-severity immediate alerts in the digest", () => {
    const alert = sampleAlert({ severity: "low", immediate: true });
    expect(buildDigest([alert], true)).toEqual([alert]);
  });
});


describe("mapConstructionAlert", () => {
  const base = {
    id: "00000000-0000-0000-0000-000000000002",
    subject: "Tile sample approval",
    createdAt: new Date("2026-06-10T10:00:00Z"),
    projectId: "00000000-0000-0000-0000-000000000010",
    projectRef: "HCW-001",
  };

  it("escalates NCR and RFI to high immediate alerts", () => {
    for (const kind of ["NCR", "RFI"] as const) {
      const alert = mapConstructionAlert({ ...base, kind });
      expect(alert.kind).toBe("construction");
      expect(alert.severity).toBe("high");
      expect(alert.immediate).toBe(true);
      assertValidAlert(alert);
    }
  });

  it("treats submittals as medium digest candidates", () => {
    const alert = mapConstructionAlert({ ...base, kind: "SUBMITTAL" });
    expect(alert.severity).toBe("medium");
    expect(alert.immediate).toBe(false);
    assertValidAlert(alert);
  });
});

describe("alert kinds", () => {
  it("includes construction kind", () => {
    expect(ALERT_KINDS).toContain("construction");
    expect(isAlertKind("construction")).toBe(true);
    expect(isAlertKind("unknown")).toBe(false);
  });
});
