import type { CognitionDomain, CognitionScore, CognitionSeverity } from "./scoring.js";

export type CognitionIntervention = {
  id: string;
  source: CognitionDomain;
  severity: Exclude<CognitionSeverity, "stable" | "inactive">;
  title: string;
  expectedEffect: string;
  confidence: number;
  riskIfIgnored: string;
};

export type CognitionInterventionInput = {
  scores: CognitionScore[];
  overdueInvoices: number;
  overduePaise: number;
  billingReadyCount: number;
  pendingApprovals: number;
  maxWaitDays: number;
  blockedApprovals: number;
  redProjects: number;
  delayedProjects: number;
  overloadedAssignees: number;
};

function scoreByDomain(scores: CognitionScore[], domain: CognitionDomain): CognitionScore | undefined {
  return scores.find((s) => s.domain === domain);
}

function severityFor(score: CognitionScore | undefined): Exclude<CognitionSeverity, "stable" | "inactive"> {
  if (score?.severity === "critical") return "critical";
  if (score?.severity === "friction") return "friction";
  return "watch";
}

function confidence(base: number, evidence: number): number {
  return Math.max(0.55, Math.min(0.95, Number((base + evidence).toFixed(2))));
}

export function deriveCognitionInterventions(input: CognitionInterventionInput): CognitionIntervention[] {
  const out: CognitionIntervention[] = [];
  const finance = scoreByDomain(input.scores, "finance");
  const client = scoreByDomain(input.scores, "client");
  const project = scoreByDomain(input.scores, "project");
  const team = scoreByDomain(input.scores, "team");
  const approval = scoreByDomain(input.scores, "approval");

  if (input.overdueInvoices > 0 || input.overduePaise > 0) {
    out.push({
      id: "finance-recovery",
      source: "finance",
      severity: severityFor(finance),
      title: "Run collection recovery on overdue invoices",
      expectedEffect: "Reduces finance pressure and improves cash recovery visibility within the next review cycle.",
      confidence: confidence(0.68, Math.min(input.overdueInvoices * 0.04, 0.18)),
      riskIfIgnored: "Receivables age further and billing pressure starts masking project delivery health.",
    });
  }

  if (input.billingReadyCount > 0) {
    out.push({
      id: "billing-ready",
      source: "finance",
      severity: finance?.severity === "critical" ? "friction" : "watch",
      title: "Convert billing-ready phases into invoices",
      expectedEffect: "Moves earned work into the receivables pipeline and improves office cash predictability.",
      confidence: confidence(0.7, Math.min(input.billingReadyCount * 0.03, 0.15)),
      riskIfIgnored: "Completed work remains unbilled and finance recovery score understates actual earning progress.",
    });
  }

  if (input.maxWaitDays > 7 || input.blockedApprovals > 0) {
    out.push({
      id: "approval-escalation",
      source: "approval",
      severity: severityFor(approval),
      title: "Escalate stale client approvals",
      expectedEffect: "Clears decision blockage before it converts into project delay and billing slippage.",
      confidence: confidence(0.72, Math.min(input.maxWaitDays / 100, 0.16)),
      riskIfIgnored: "Approval delay continues downstream into delivery delay, revision churn, and delayed invoicing.",
    });
  }

  if (input.redProjects > 0 || input.delayedProjects > 1) {
    out.push({
      id: "project-owner-review",
      source: "project",
      severity: severityFor(project),
      title: "Run owner review for red or delayed projects",
      expectedEffect: "Identifies the delivery constraint and assigns an accountable intervention path.",
      confidence: confidence(0.66, Math.min((input.redProjects + input.delayedProjects) * 0.04, 0.18)),
      riskIfIgnored: "Schedule variance becomes normalised and intervention shifts from preventive to corrective.",
    });
  }

  if (input.overloadedAssignees > 0) {
    out.push({
      id: "team-load-redistribution",
      source: "team",
      severity: severityFor(team),
      title: "Redistribute overloaded staff tasks",
      expectedEffect: "Reduces bottleneck risk and protects delivery commitments from individual overload.",
      confidence: confidence(0.64, Math.min(input.overloadedAssignees * 0.06, 0.18)),
      riskIfIgnored: "Overdue work concentrates around overloaded assignees and project health degrades.",
    });
  }

  if (input.pendingApprovals > 2 && input.delayedProjects > 0) {
    out.push({
      id: "client-project-causal-chain",
      source: "client",
      severity: severityFor(client),
      title: "Treat approval lag as a project-delivery cause",
      expectedEffect: "Connects client follow-up with delivery recovery instead of managing them as separate issues.",
      confidence: confidence(0.7, Math.min((input.pendingApprovals + input.delayedProjects) * 0.03, 0.15)),
      riskIfIgnored: "The office may chase task progress while the real constraint remains unresolved client response.",
    });
  }

  return out
    .sort((a, b) => {
      const rank = { critical: 3, friction: 2, watch: 1 };
      return rank[b.severity] - rank[a.severity] || b.confidence - a.confidence;
    })
    .slice(0, 6);
}
