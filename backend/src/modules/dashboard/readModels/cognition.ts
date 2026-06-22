import { deriveCognitionInterventions } from "../../../lib/cognition/interventions.js";
import {
  officeScore,
  scoreApproval,
  scoreClient,
  scoreFinance,
  scoreProject,
  scoreTeam,
  type CognitionScore,
} from "../../../lib/cognition/scoring.js";

type ActionCenter = {
  revisionRiskBand: "LOW" | "MEDIUM" | "HIGH";
  billingReadyPhases: unknown[];
  overdueInvoices: { daysOverdue: number; netReceivablePaise: number }[];
  pendingApprovals: { daysWaiting: number }[];
};

type FinancialHealth = {
  outstandingPaise: number;
  overdue30dPaise: number;
  readyToBillPaise: number;
} | null;

type ProjectHealth = {
  health: "GREEN" | "YELLOW" | "RED";
  overdueTasks: number;
  staleApprovals: number;
  revisionsOpen: number;
}[];

type ClientIntelligence = {
  risk: "LOW" | "MEDIUM" | "HIGH";
}[];

type TeamIntelligence = {
  capacity: "HEALTHY" | "BUSY" | "OVERLOADED" | string;
  overdueCount: number;
}[];

export type CognitionSnapshot = {
  generatedAt: string;
  office: {
    score: number;
    severity: CognitionScore["severity"];
  };
  domains: CognitionScore[];
  signals: {
    pendingApprovals: number;
    blockedApprovals: number;
    maxApprovalWaitDays: number;
    overdueInvoices: number;
    overduePaise: number;
    billingReadyCount: number;
    redProjects: number;
    delayedProjects: number;
    overloadedAssignees: number;
  };
  interventions: ReturnType<typeof deriveCognitionInterventions>;
  explanationInput: {
    rule: "LLM_EXPLAINS_ONLY";
    officeScore: number;
    domainScores: Pick<CognitionScore, "domain" | "score" | "severity" | "drivers">[];
    interventions: ReturnType<typeof deriveCognitionInterventions>;
  };
};

export function buildCognitionSnapshot(input: {
  actionCenter: ActionCenter;
  financialHealth: FinancialHealth;
  projectHealth: ProjectHealth;
  clientIntelligence: ClientIntelligence;
  teamIntelligence: TeamIntelligence;
  canSeeFinance: boolean;
  hrEnabled: boolean;
}): CognitionSnapshot {
  const pendingApprovals = input.actionCenter.pendingApprovals.length;
  const maxApprovalWaitDays = pendingApprovals > 0
    ? Math.max(...input.actionCenter.pendingApprovals.map((a) => Number(a.daysWaiting ?? 0)))
    : 0;
  const blockedApprovals = input.actionCenter.pendingApprovals.filter((a) => Number(a.daysWaiting ?? 0) > 7).length;

  const overdueInvoices = input.actionCenter.overdueInvoices.length;
  const overduePaise = input.financialHealth?.overdue30dPaise
    ?? input.actionCenter.overdueInvoices.reduce((sum, inv) => sum + Number(inv.netReceivablePaise ?? 0), 0);
  const billingReadyCount = input.actionCenter.billingReadyPhases.length;

  const redProjects = input.projectHealth.filter((p) => p.health === "RED").length;
  const yellowProjects = input.projectHealth.filter((p) => p.health === "YELLOW").length;
  const delayedProjects = input.projectHealth.filter((p) => Number(p.overdueTasks ?? 0) > 0).length;
  const staleApprovals = input.projectHealth.reduce((sum, p) => sum + Number(p.staleApprovals ?? 0), 0);
  const openRevisions = input.projectHealth.reduce((sum, p) => sum + Number(p.revisionsOpen ?? 0), 0);

  const highRiskClients = input.clientIntelligence.filter((c) => c.risk === "HIGH").length;
  const mediumRiskClients = input.clientIntelligence.filter((c) => c.risk === "MEDIUM").length;

  const overloadedAssignees = input.teamIntelligence.filter((m) => m.capacity === "OVERLOADED").length;
  const busyAssignees = input.teamIntelligence.filter((m) => m.capacity === "BUSY").length;
  const overdueAssignedTasks = input.teamIntelligence.reduce((sum, m) => sum + Number(m.overdueCount ?? 0), 0);

  const domains = [
    scoreFinance({
      outstandingPaise: input.financialHealth?.outstandingPaise ?? 0,
      overdue30dPaise: overduePaise,
      readyToBillPaise: input.financialHealth?.readyToBillPaise ?? 0,
      canSee: input.canSeeFinance && !!input.financialHealth,
    }),
    scoreClient({
      pendingApprovals,
      maxWaitDays: maxApprovalWaitDays,
      highRiskClients,
      mediumRiskClients,
      revisionRiskBand: input.actionCenter.revisionRiskBand,
    }),
    scoreProject({
      totalProjects: input.projectHealth.length,
      redProjects,
      yellowProjects,
      delayedProjects,
      staleApprovals,
      openRevisions,
    }),
    scoreTeam({
      totalMembers: input.teamIntelligence.length,
      overloaded: overloadedAssignees,
      busy: busyAssignees,
      overdueTasks: overdueAssignedTasks,
      hrEnabled: input.hrEnabled,
    }),
    scoreApproval({
      pendingApprovals,
      maxWaitDays: maxApprovalWaitDays,
      blockedApprovals,
    }),
  ];

  const office = officeScore(domains);
  const signals = {
    pendingApprovals,
    blockedApprovals,
    maxApprovalWaitDays,
    overdueInvoices,
    overduePaise,
    billingReadyCount,
    redProjects,
    delayedProjects,
    overloadedAssignees,
  };
  const interventions = deriveCognitionInterventions({
    scores: domains,
    overdueInvoices,
    overduePaise,
    billingReadyCount,
    pendingApprovals,
    maxWaitDays: maxApprovalWaitDays,
    blockedApprovals,
    redProjects,
    delayedProjects,
    overloadedAssignees,
  });

  return {
    generatedAt: new Date().toISOString(),
    office,
    domains,
    signals,
    interventions,
    explanationInput: {
      rule: "LLM_EXPLAINS_ONLY",
      officeScore: office.score,
      domainScores: domains.map(({ domain, score, severity, drivers }) => ({ domain, score, severity, drivers })),
      interventions,
    },
  };
}
