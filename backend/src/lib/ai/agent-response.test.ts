import { describe, expect, it } from "vitest";
import { buildAgentMockAnswer } from "./agent-response.js";
import { formatOperatorSnapshot, type OperatorSnapshot } from "./operator-context.js";

const sampleSnapshot: OperatorSnapshot = {
  userRole: "PARTNER",
  office: {
    activeProjects: [{ ref: "P-001", title: "Villa", stage: "GFC", clientName: "Client A" }],
    billingReady: [{ projectRef: "P-001", label: "Schematic", billingPct: 30 }],
    overdueInvoices: [{ ref: "INV-01", projectRef: "P-001", daysOverdue: 45 }],
    pendingApprovals: [],
    openTenders: [],
    openConstruction: [],
    myOpenTasks: [{ title: "Review kitchen layout", projectRef: "P-001", dueDate: "2026-06-20", priority: "HIGH" }],
    revisionRiskBand: "LOW",
  },
};

describe("buildAgentMockAnswer", () => {
  it("answers billing questions from snapshot", () => {
    const out = buildAgentMockAnswer(sampleSnapshot, "What should I invoice this week?");
    expect(out).toContain("P-001");
    expect(out).toContain("Schematic");
    expect(out).toContain("INV-01");
    expect(out).toContain("Action Center");
  });

  it("greets on hello", () => {
    const out = buildAgentMockAnswer(sampleSnapshot, "hello");
    expect(out).toContain("ESTI");
  });

  it("formats operator snapshot for LLM context", () => {
    const text = formatOperatorSnapshot(sampleSnapshot);
    expect(text).toContain("Staff role: PARTNER");
    expect(text).toContain("P-001");
    expect(text).toContain("Billing-ready");
  });
});
