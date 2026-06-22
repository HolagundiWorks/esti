export type CognitionSeverity = "stable" | "watch" | "friction" | "critical" | "inactive";
export type CognitionDomain = "finance" | "client" | "project" | "team" | "approval";

export type CognitionScore = {
  domain: CognitionDomain;
  label: string;
  score: number;
  severity: CognitionSeverity;
  inactive?: boolean;
  drivers: string[];
};

export type FinanceScoreInput = {
  outstandingPaise: number;
  overdue30dPaise: number;
  readyToBillPaise: number;
  canSee: boolean;
};

export type ClientScoreInput = {
  pendingApprovals: number;
  maxWaitDays: number;
  highRiskClients: number;
  mediumRiskClients: number;
  revisionRiskBand: "LOW" | "MEDIUM" | "HIGH";
};

export type ProjectScoreInput = {
  totalProjects: number;
  redProjects: number;
  yellowProjects: number;
  delayedProjects: number;
  staleApprovals: number;
  openRevisions: number;
};

export type TeamScoreInput = {
  totalMembers: number;
  overloaded: number;
  busy: number;
  overdueTasks: number;
  hrEnabled: boolean;
};

export type ApprovalScoreInput = {
  pendingApprovals: number;
  maxWaitDays: number;
  blockedApprovals: number;
};

const clampScore = (score: number): number => Math.max(0, Math.min(100, Math.round(score)));

export function severityFromScore(score: number, inactive = false): CognitionSeverity {
  if (inactive) return "inactive";
  if (score < 45) return "critical";
  if (score < 65) return "friction";
  if (score < 82) return "watch";
  return "stable";
}

function score(
  domain: CognitionDomain,
  label: string,
  value: number,
  drivers: string[],
  inactive = false,
): CognitionScore {
  const finalScore = inactive ? 0 : clampScore(value);
  return {
    domain,
    label,
    score: finalScore,
    severity: severityFromScore(finalScore, inactive),
    inactive,
    drivers,
  };
}

export function scoreFinance(input: FinanceScoreInput): CognitionScore {
  if (!input.canSee) return score("finance", "Finance recovery", 0, ["Financial module restricted"], true);

  const overdueRatio = input.outstandingPaise > 0 ? input.overdue30dPaise / input.outstandingPaise : 0;
  const drivers: string[] = [];
  let value = 95;

  if (input.outstandingPaise > 20_000_000) {
    value -= 14;
    drivers.push("Outstanding receivables above ₹20L");
  } else if (input.outstandingPaise > 5_000_000) {
    value -= 7;
    drivers.push("Outstanding receivables above ₹5L");
  }

  if (input.overdue30dPaise > 5_000_000) {
    value -= 34;
    drivers.push("Overdue 30d collections above ₹5L");
  } else if (input.overdue30dPaise > 1_000_000) {
    value -= 22;
    drivers.push("Overdue 30d collections above ₹1L");
  } else if (input.overdue30dPaise > 0) {
    value -= 12;
    drivers.push("Some invoices are overdue beyond 30 days");
  }

  value -= overdueRatio * 28;

  if (input.readyToBillPaise > 0) {
    value += 4;
    drivers.push("Ready-to-bill value available");
  }

  if (drivers.length === 0) drivers.push("Receivables and billing queue are within expected range");
  return score("finance", "Finance recovery", value, drivers);
}

export function scoreClient(input: ClientScoreInput): CognitionScore {
  const drivers: string[] = [];
  let value = 94;

  if (input.pendingApprovals > 0) {
    value -= Math.min(input.pendingApprovals * 6, 24);
    drivers.push(`${input.pendingApprovals} approval${input.pendingApprovals === 1 ? "" : "s"} pending`);
  }

  if (input.maxWaitDays > 14) {
    value -= 28;
    drivers.push(`Longest approval wait is ${input.maxWaitDays} days`);
  } else if (input.maxWaitDays > 7) {
    value -= 16;
    drivers.push(`Approval wait above 7 days`);
  }

  if (input.highRiskClients > 0) {
    value -= Math.min(input.highRiskClients * 14, 28);
    drivers.push(`${input.highRiskClients} high-risk client signal${input.highRiskClients === 1 ? "" : "s"}`);
  }
  if (input.mediumRiskClients > 0) {
    value -= Math.min(input.mediumRiskClients * 6, 18);
    drivers.push(`${input.mediumRiskClients} medium-risk client signal${input.mediumRiskClients === 1 ? "" : "s"}`);
  }

  if (input.revisionRiskBand === "HIGH") {
    value -= 18;
    drivers.push("Revision risk band is high");
  } else if (input.revisionRiskBand === "MEDIUM") {
    value -= 8;
    drivers.push("Revision risk band is medium");
  }

  if (drivers.length === 0) drivers.push("Client approvals and revision pressure are controlled");
  return score("client", "Client attention", value, drivers);
}

export function scoreProject(input: ProjectScoreInput): CognitionScore {
  if (input.totalProjects === 0) return score("project", "Project health", 0, ["No active projects"], true);

  const drivers: string[] = [];
  let value = 96;
  value -= Math.min((input.redProjects / input.totalProjects) * 55, 55);
  value -= Math.min((input.yellowProjects / input.totalProjects) * 22, 22);
  value -= Math.min((input.delayedProjects / input.totalProjects) * 20, 20);
  value -= Math.min(input.staleApprovals * 4, 16);
  value -= Math.min(input.openRevisions * 2, 12);

  if (input.redProjects > 0) drivers.push(`${input.redProjects} project${input.redProjects === 1 ? "" : "s"} in red health`);
  if (input.yellowProjects > 0) drivers.push(`${input.yellowProjects} project${input.yellowProjects === 1 ? "" : "s"} in watch health`);
  if (input.delayedProjects > 0) drivers.push(`${input.delayedProjects} project${input.delayedProjects === 1 ? "" : "s"} with overdue tasks`);
  if (input.staleApprovals > 0) drivers.push(`${input.staleApprovals} stale approval blocker${input.staleApprovals === 1 ? "" : "s"}`);
  if (input.openRevisions > 0) drivers.push(`${input.openRevisions} open revision signal${input.openRevisions === 1 ? "" : "s"}`);
  if (drivers.length === 0) drivers.push("Active projects are within delivery tolerance");

  return score("project", "Project health", value, drivers);
}

export function scoreTeam(input: TeamScoreInput): CognitionScore {
  if (!input.hrEnabled) return score("team", "Team capacity", 0, ["HR module disabled"], true);
  if (input.totalMembers === 0) return score("team", "Team capacity", 0, ["No team workload data"], true);

  const drivers: string[] = [];
  let value = 95;
  value -= Math.min((input.overloaded / input.totalMembers) * 55, 55);
  value -= Math.min((input.busy / input.totalMembers) * 22, 22);
  value -= Math.min(input.overdueTasks * 3, 24);

  if (input.overloaded > 0) drivers.push(`${input.overloaded} overloaded assignee${input.overloaded === 1 ? "" : "s"}`);
  if (input.busy > 0) drivers.push(`${input.busy} busy assignee${input.busy === 1 ? "" : "s"}`);
  if (input.overdueTasks > 0) drivers.push(`${input.overdueTasks} overdue assigned task${input.overdueTasks === 1 ? "" : "s"}`);
  if (drivers.length === 0) drivers.push("Team workload is balanced");

  return score("team", "Team capacity", value, drivers);
}

export function scoreApproval(input: ApprovalScoreInput): CognitionScore {
  const drivers: string[] = [];
  let value = 96;

  value -= Math.min(input.pendingApprovals * 7, 35);
  value -= Math.min(input.blockedApprovals * 14, 35);
  value -= Math.min(input.maxWaitDays * 1.5, 30);

  if (input.pendingApprovals > 0) drivers.push(`${input.pendingApprovals} approval${input.pendingApprovals === 1 ? "" : "s"} waiting`);
  if (input.blockedApprovals > 0) drivers.push(`${input.blockedApprovals} approval${input.blockedApprovals === 1 ? "" : "s"} blocked beyond 7 days`);
  if (input.maxWaitDays > 0) drivers.push(`Maximum wait is ${input.maxWaitDays} days`);
  if (drivers.length === 0) drivers.push("No approval blockage detected");

  return score("approval", "Approval blockage", value, drivers);
}

export function officeScore(scores: CognitionScore[]): { score: number; severity: CognitionSeverity } {
  const weights: Record<CognitionDomain, number> = {
    finance: 0.25,
    client: 0.20,
    project: 0.25,
    team: 0.15,
    approval: 0.15,
  };
  const active = scores.filter((s) => !s.inactive);
  const denominator = active.reduce((sum, s) => sum + weights[s.domain], 0);
  if (denominator === 0) return { score: 0, severity: "inactive" };

  const weighted = active.reduce((sum, s) => sum + s.score * weights[s.domain], 0);
  const value = clampScore(weighted / denominator);
  return { score: value, severity: severityFromScore(value) };
}
