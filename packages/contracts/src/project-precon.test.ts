import { describe, expect, it } from "vitest";
import {
  ProjectOpportunityCreate,
  ProjectPhaseGateUpsert,
  ProjectRiskCreate,
  canDecidePhaseGate,
} from "./project-precon.js";
import { CONSULTANCY_PHASE_GATE_CHECKLIST } from "./consultancy.js";

describe("Studio project precon schemas", () => {
  it("accepts a risk create payload", () => {
    const parsed = ProjectRiskCreate.parse({
      projectId: "11111111-1111-4111-8111-111111111111",
      title: "Unknown soil",
      likelihood: 4,
      impact: 4,
      response: "REDUCE",
    });
    expect(parsed.response).toBe("REDUCE");
  });

  it("accepts an opportunity create payload", () => {
    const parsed = ProjectOpportunityCreate.parse({
      projectId: "11111111-1111-4111-8111-111111111111",
      title: "Standardise stair detail",
      area: "DESIGN",
      source: "WORKSHOP",
    });
    expect(parsed.response).toBe("ENHANCE");
  });

  it("gates GO on the shared checklist", () => {
    expect(
      canDecidePhaseGate({
        decision: "GO",
        checklist: {},
      }),
    ).toMatchObject({ ok: false });
    const full = Object.fromEntries(
      CONSULTANCY_PHASE_GATE_CHECKLIST.map((c) => [c.key, true]),
    );
    expect(
      ProjectPhaseGateUpsert.parse({
        projectId: "11111111-1111-4111-8111-111111111111",
        gateKey: "CONCEPT",
        checklist: full,
        decision: "GO",
      }).decision,
    ).toBe("GO");
  });
});
