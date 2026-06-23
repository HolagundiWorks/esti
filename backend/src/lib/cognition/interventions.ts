import type { CognitionDomain, CognitionScore, CognitionSeverity } from "./scoring.js";

export type CognitionIntervention = {
  id: string;
  source: CognitionDomain;
  severity: Exclude<CognitionSeverity, "stable" | "inactive">;
  recoveryLevel: 1 | 2 | 3 | 4 | 5;
  impactPct: number;
  title: string;
  suggestedAction: string;
  howTo: string[];
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

function impact(base: number, signal: number): number {
  return Math.max(4, Math.min(18, Math.round(base + signal)));
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
      recoveryLevel: 4,
      impactPct: impact(8, input.overdueInvoices * 2),
      title: "Run collection recovery on overdue invoices",
      suggestedAction: "Mark recovered invoices as paid after the client follow-up is complete.",
      howTo: [
        "Open the overdue invoice register.",
        "Call or email the client with the payment reference.",
        "Mark recovered invoices as paid so finance pressure clears.",
      ],
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
      recoveryLevel: 4,
      impactPct: impact(6, input.billingReadyCount),
      title: "Convert billing-ready phases into invoices",
      suggestedAction: "Create invoices for completed phases that are ready to bill.",
      howTo: [
        "Review the ready-to-bill phase list.",
        "Confirm scope completion and tax treatment.",
        "Generate invoices and send them to the client.",
      ],
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
      recoveryLevel: 1,
      impactPct: impact(9, input.blockedApprovals * 2),
      title: "Escalate stale client approvals",
      suggestedAction: "Clear stale approvals by recording the client decision or escalation outcome.",
      howTo: [
        "Open approvals waiting longer than a week.",
        "Send one decision-focused escalation message.",
        "Record the approval outcome so project blockage is removed.",
      ],
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
      recoveryLevel: 5,
      impactPct: impact(8, input.redProjects * 3 + input.delayedProjects),
      title: "Run owner review for red or delayed projects",
      suggestedAction: "Close overdue delivery tasks or assign a recovery owner for each red project.",
      howTo: [
        "Open red and delayed project evidence.",
        "Complete already-finished overdue tasks.",
        "Assign one owner to the remaining recovery path.",
      ],
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
      recoveryLevel: 2,
      impactPct: impact(7, input.overloadedAssignees * 3),
      title: "Redistribute overloaded staff tasks",
      suggestedAction: "Move overdue or overloaded tasks to the most available active team member.",
      howTo: [
        "Find the most overloaded assignee.",
        "Move selected overdue tasks to the least loaded active member.",
        "Review the new workload before the next stand-up.",
      ],
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
      recoveryLevel: 5,
      impactPct: impact(10, input.blockedApprovals + input.delayedProjects * 2),
      title: "Treat approval lag as a project-delivery cause",
      suggestedAction: "Resolve stale approvals first, then close the linked overdue project tasks.",
      howTo: [
        "Start with the oldest pending client decision.",
        "Record the decision or escalation note.",
        "Then complete the affected overdue delivery tasks.",
      ],
      expectedEffect: "Connects client follow-up with delivery recovery instead of managing them as separate issues.",
      confidence: confidence(0.7, Math.min((input.pendingApprovals + input.delayedProjects) * 0.03, 0.15)),
      riskIfIgnored: "The office may chase task progress while the real constraint remains unresolved client response.",
    });
  }

  return out
    .sort((a, b) => {
      const rank = { critical: 3, friction: 2, watch: 1 };
      return rank[b.severity] - rank[a.severity] || b.impactPct - a.impactPct || b.confidence - a.confidence;
    })
    .slice(0, 6);
}
