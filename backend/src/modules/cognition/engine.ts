import { sql } from "drizzle-orm";
import type { DB } from "../../db/index.js";

type Severity = "stable" | "watch" | "friction" | "critical";
type Domain = "CLIENT" | "FINANCE" | "PROJECT" | "TEAM" | "APPROVAL" | "MEETING" | "SYSTEM";

export type OfficeEventDraft = {
  sourceKey: string;
  domain: Domain;
  eventType: string;
  subjectType: string;
  subjectId?: string | null;
  subjectLabel: string;
  projectId?: string | null;
  severity: Severity;
  occurredAt?: string | Date | null;
  urgencyScore?: number;
  financialImpactPaise?: number;
  dependencyRiskScore?: number;
  teamBlockageScore?: number;
  meetingProximityScore?: number;
  deadlineRiskScore?: number;
  safeDeferralScore?: number;
  evidence?: Record<string, unknown>;
};

export type BehaviorProfileDraft = {
  subjectType: string;
  subjectId: string;
  label: string;
  signalType: string;
  sampleCount: number;
  confidencePct: number;
  metrics: Record<string, unknown>;
  lastObservedAt?: string | Date | null;
};

export type PriorityFeatureInput = {
  urgencyScore?: number;
  financialImpactPaise?: number;
  dependencyRiskScore?: number;
  teamBlockageScore?: number;
  meetingProximityScore?: number;
  deadlineRiskScore?: number;
  safeDeferralScore?: number;
};

export type PriorityQueueItem = {
  id: string;
  eventId: string;
  title: string;
  recommendedAction: string;
  howTo: string[];
  expectedBenefit: string;
  priorityScore: number;
  status: string;
  sourceKey: string;
  domain: Domain;
  eventType: string;
  subjectLabel: string;
  severity: Severity;
  evidence: unknown;
};

const nowIso = () => new Date().toISOString();
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

export function priorityScore(input: PriorityFeatureInput): number {
  const financialImpact =
    input.financialImpactPaise && input.financialImpactPaise > 0
      ? Math.min(30, Math.log10(Math.max(input.financialImpactPaise / 100, 1)) * 5)
      : 0;
  return clamp(
    (input.urgencyScore ?? 0) +
      financialImpact +
      (input.dependencyRiskScore ?? 0) +
      (input.teamBlockageScore ?? 0) +
      (input.meetingProximityScore ?? 0) +
      (input.deadlineRiskScore ?? 0) -
      (input.safeDeferralScore ?? 0),
  );
}

function priorityCopy(event: OfficeEventDraft) {
  switch (event.eventType) {
    case "approval.waiting":
      return {
        title: `Clear approval: ${event.subjectLabel}`,
        recommendedAction: "Get the client decision recorded so the project can move again.",
        howTo: [
          "Open the pending approval evidence.",
          "Send one decision-focused reminder.",
          "Record the approval, rejection, or escalation outcome.",
        ],
        expectedBenefit: "Project delivery and downstream billing become unblocked.",
      };
    case "invoice.overdue":
      return {
        title: `Recover payment: ${event.subjectLabel}`,
        recommendedAction: "Prepare a payment follow-up and update the invoice state after recovery.",
        howTo: [
          "Open the overdue invoice.",
          "Contact the client with invoice reference and due amount.",
          "Mark the recovered invoice as paid when confirmed.",
        ],
        expectedBenefit: "Finance pressure reduces and receivables ageing improves.",
      };
    case "team.overloaded":
      return {
        title: `Rebalance work: ${event.subjectLabel}`,
        recommendedAction: "Move selected overdue or heavy tasks to the most available active member.",
        howTo: [
          "Open the assignee workload.",
          "Choose overdue or high-friction tasks.",
          "Move work to an available teammate and review the new load.",
        ],
        expectedBenefit: "Delivery risk stops concentrating around one person.",
      };
    case "project.health":
      return {
        title: `Review project: ${event.subjectLabel}`,
        recommendedAction: "Run a short owner review and assign one recovery owner.",
        howTo: [
          "Open the project evidence.",
          "Close already-finished overdue tasks.",
          "Assign one accountable owner for remaining recovery work.",
        ],
        expectedBenefit: "Project risk becomes owned instead of passively observed.",
      };
    case "meeting.near":
      return {
        title: `Prepare meeting: ${event.subjectLabel}`,
        recommendedAction: "Review agenda and client/project context before the meeting.",
        howTo: [
          "Open the meeting item.",
          "Review relevant project notes.",
          "Confirm the decision needed before the meeting starts.",
        ],
        expectedBenefit: "Owner attention shifts cleanly into the meeting without operational residue.",
      };
    default:
      return {
        title: `Review ${event.subjectLabel}`,
        recommendedAction: "Review the signal and record the next action.",
        howTo: ["Open the related record.", "Confirm whether action is needed.", "Record the outcome."],
        expectedBenefit: "The office signal is resolved or safely deferred.",
      };
  }
}

export function buildOfficeEvents(input: {
  actionCenter: any;
  financialHealth: any;
  projectHealth: any[];
  clientIntelligence: any[];
  teamIntelligence: any[];
}): OfficeEventDraft[] {
  const events: OfficeEventDraft[] = [];

  for (const approval of input.actionCenter?.pendingApprovals ?? []) {
    const days = Number(approval.daysWaiting ?? 0);
    events.push({
      sourceKey: `approval:${approval.id}:waiting`,
      domain: "APPROVAL",
      eventType: "approval.waiting",
      subjectType: "approval",
      subjectId: approval.id,
      subjectLabel: `${approval.projectRef ?? "Project"} / ${approval.title}`,
      projectId: approval.projectId,
      severity: days > 14 ? "critical" : days > 7 ? "friction" : "watch",
      occurredAt: approval.sentDate ?? nowIso(),
      urgencyScore: Math.min(28, days * 2),
      dependencyRiskScore: days > 7 ? 20 : 10,
      deadlineRiskScore: days > 14 ? 20 : 8,
      safeDeferralScore: days <= 2 ? 12 : 0,
      evidence: approval,
    });
  }

  for (const invoice of input.actionCenter?.overdueInvoices ?? []) {
    const days = Number(invoice.daysOverdue ?? 0);
    const amount = Number(invoice.netReceivablePaise ?? 0);
    events.push({
      sourceKey: `invoice:${invoice.id}:overdue`,
      domain: "FINANCE",
      eventType: "invoice.overdue",
      subjectType: "invoice",
      subjectId: invoice.id,
      subjectLabel: `${invoice.ref} / ${invoice.projectRef ?? "Project"}`,
      projectId: invoice.projectId,
      severity: days > 60 || amount > 5_000_000 ? "critical" : days > 30 ? "friction" : "watch",
      occurredAt: invoice.dateInvoice ?? nowIso(),
      urgencyScore: Math.min(30, Math.max(10, days)),
      financialImpactPaise: amount,
      dependencyRiskScore: 6,
      safeDeferralScore: days < 35 ? 8 : 0,
      evidence: invoice,
    });
  }

  for (const phase of input.actionCenter?.billingReadyPhases ?? []) {
    events.push({
      sourceKey: `phase:${phase.id}:billing-ready`,
      domain: "FINANCE",
      eventType: "billing.ready",
      subjectType: "phase",
      subjectId: phase.id,
      subjectLabel: `${phase.projectRef ?? "Project"} / ${phase.label}`,
      projectId: phase.projectId,
      severity: "watch",
      occurredAt: nowIso(),
      urgencyScore: 12,
      financialImpactPaise: Math.round(Number(phase.contractValuePaise ?? 0) * (Number(phase.billingPct ?? 0) / 100)),
      safeDeferralScore: 8,
      evidence: phase,
    });
  }

  for (const project of input.projectHealth ?? []) {
    if (project.health !== "RED" && project.health !== "YELLOW") continue;
    events.push({
      sourceKey: `project:${project.id}:health:${project.health}`,
      domain: "PROJECT",
      eventType: "project.health",
      subjectType: "project",
      subjectId: project.id,
      subjectLabel: `${project.ref ?? "Project"} / ${project.title ?? ""}`,
      projectId: project.id,
      severity: project.health === "RED" ? "critical" : "watch",
      occurredAt: nowIso(),
      urgencyScore: project.health === "RED" ? 26 : 14,
      dependencyRiskScore: Number(project.staleApprovals ?? 0) > 0 ? 18 : 8,
      deadlineRiskScore: Math.min(24, Number(project.overdueTasks ?? 0) * 4),
      evidence: project,
    });
  }

  for (const member of input.teamIntelligence ?? []) {
    if (member.capacity !== "OVERLOADED" && member.capacity !== "BUSY") continue;
    events.push({
      sourceKey: `team:${member.assignee}:capacity:${member.capacity}`,
      domain: "TEAM",
      eventType: member.capacity === "OVERLOADED" ? "team.overloaded" : "team.busy",
      subjectType: "assignee",
      subjectId: member.assignee,
      subjectLabel: member.assignee,
      severity: member.capacity === "OVERLOADED" ? "friction" : "watch",
      occurredAt: nowIso(),
      urgencyScore: member.capacity === "OVERLOADED" ? 20 : 10,
      teamBlockageScore: member.capacity === "OVERLOADED" ? 24 : 10,
      deadlineRiskScore: Math.min(20, Number(member.overdueCount ?? 0) * 4),
      safeDeferralScore: member.capacity === "BUSY" ? 10 : 0,
      evidence: member,
    });
  }

  for (const meeting of input.actionCenter?.meetingFocus ?? []) {
    const days = Number(meeting.daysUntil ?? 999);
    events.push({
      sourceKey: `meeting:${meeting.id}:near`,
      domain: "MEETING",
      eventType: "meeting.near",
      subjectType: "task",
      subjectId: meeting.id,
      subjectLabel: meeting.title,
      projectId: meeting.projectId,
      severity: days <= 1 ? "friction" : "watch",
      occurredAt: meeting.dueDate ?? nowIso(),
      urgencyScore: days <= 1 ? 26 : 12,
      meetingProximityScore: days <= 1 ? 25 : Math.max(0, 18 - days * 2),
      safeDeferralScore: days > 3 ? 12 : 0,
      evidence: meeting,
    });
  }

  for (const client of input.clientIntelligence ?? []) {
    if (client.risk === "LOW") continue;
    events.push({
      sourceKey: `client:${client.id}:behavior-risk`,
      domain: "CLIENT",
      eventType: "client.behavior-risk",
      subjectType: "client",
      subjectId: client.id,
      subjectLabel: client.name,
      severity: client.risk === "HIGH" ? "friction" : "watch",
      occurredAt: nowIso(),
      urgencyScore: client.risk === "HIGH" ? 18 : 10,
      financialImpactPaise: Number(client.outstandingPaise ?? 0),
      dependencyRiskScore: Number(client.avgApprovalDays ?? 0) > 10 ? 14 : 6,
      safeDeferralScore: client.risk === "MEDIUM" ? 8 : 0,
      evidence: client,
    });
  }

  return events.map((event) => ({ ...event, priorityScore: priorityScore(event) } as OfficeEventDraft));
}

export function buildBehaviorProfiles(input: {
  clientIntelligence: any[];
  teamIntelligence: any[];
  actionCenter: any;
}): BehaviorProfileDraft[] {
  const profiles: BehaviorProfileDraft[] = [];

  for (const client of input.clientIntelligence ?? []) {
    const approvalDays = Number(client.avgApprovalDays ?? 0);
    const revisions = Number(client.revisionRequests ?? 0);
    const invoiceDays = Number(client.oldestInvoiceDays ?? 0);
    profiles.push({
      subjectType: "client",
      subjectId: client.id,
      label: client.name,
      signalType: "client-response-pattern",
      sampleCount: Number(client.activeProjects ?? 0) + revisions,
      confidencePct: clamp(45 + Number(client.activeProjects ?? 0) * 10 + revisions * 5, 0, 92),
      metrics: {
        avgApprovalDays: approvalDays,
        revisionRequests: revisions,
        oldestInvoiceDays: invoiceDays,
        risk: client.risk,
        learnedPattern:
          approvalDays > 10
            ? "approval_delay"
            : invoiceDays > 30
              ? "payment_delay"
              : revisions >= 2
                ? "revision_churn"
                : "normal",
      },
    });
  }

  for (const member of input.teamIntelligence ?? []) {
    profiles.push({
      subjectType: "assignee",
      subjectId: member.assignee,
      label: member.assignee,
      signalType: "team-load-pattern",
      sampleCount: Number(member.totalOpen ?? 0),
      confidencePct: clamp(40 + Number(member.totalOpen ?? 0) * 4 + Number(member.overdueCount ?? 0) * 8, 0, 90),
      metrics: {
        capacity: member.capacity,
        totalOpen: Number(member.totalOpen ?? 0),
        overdueCount: Number(member.overdueCount ?? 0),
        highPriorityCount: Number(member.highPriorityCount ?? 0),
        learnedPattern:
          member.capacity === "OVERLOADED"
            ? "overload"
            : Number(member.overdueCount ?? 0) > 0
              ? "deadline_slip"
              : "balanced",
      },
    });
  }

  const pending = input.actionCenter?.pendingApprovals ?? [];
  if (pending.length > 0) {
    profiles.push({
      subjectType: "office",
      subjectId: "approval-system",
      label: "Approval system",
      signalType: "approval-backlog-pattern",
      sampleCount: pending.length,
      confidencePct: clamp(55 + pending.length * 6, 0, 88),
      metrics: {
        pendingApprovals: pending.length,
        maxWaitDays: Math.max(...pending.map((p: any) => Number(p.daysWaiting ?? 0))),
        learnedPattern: "approval_queue_backlog",
      },
    });
  }

  return profiles;
}

export async function ingestCognitionEvents(
  db: DB,
  input: {
    actionCenter: any;
    financialHealth: any;
    projectHealth: any[];
    clientIntelligence: any[];
    teamIntelligence: any[];
  },
) {
  const events = buildOfficeEvents(input);
  const behaviors = buildBehaviorProfiles(input);

  for (const event of events) {
    const copy = priorityCopy(event);
    const score = priorityScore(event);
    const evidence = JSON.stringify(event.evidence ?? {});
    const howTo = JSON.stringify(copy.howTo);
    await db.execute(sql`
      with upserted as (
        insert into esti_cognition_event (
          source_key, domain, event_type, subject_type, subject_id, subject_label,
          project_id, severity, status, occurred_at, observed_at,
          urgency_score, financial_impact_paise, dependency_risk_score,
          team_blockage_score, meeting_proximity_score, deadline_risk_score,
          safe_deferral_score, priority_score, evidence, updated_at
        )
        values (
          ${event.sourceKey}, ${event.domain}, ${event.eventType}, ${event.subjectType},
          ${event.subjectId ?? null}, ${event.subjectLabel}, ${event.projectId ?? null},
          ${event.severity}, 'ACTIVE', ${new Date(event.occurredAt ?? Date.now()).toISOString()}, now(),
          ${event.urgencyScore ?? 0}, ${event.financialImpactPaise ?? 0}, ${event.dependencyRiskScore ?? 0},
          ${event.teamBlockageScore ?? 0}, ${event.meetingProximityScore ?? 0}, ${event.deadlineRiskScore ?? 0},
          ${event.safeDeferralScore ?? 0}, ${score}, ${evidence}::jsonb, now()
        )
        on conflict (source_key) do update set
          domain = excluded.domain,
          event_type = excluded.event_type,
          subject_type = excluded.subject_type,
          subject_id = excluded.subject_id,
          subject_label = excluded.subject_label,
          project_id = excluded.project_id,
          severity = excluded.severity,
          status = 'ACTIVE',
          observed_at = now(),
          urgency_score = excluded.urgency_score,
          financial_impact_paise = excluded.financial_impact_paise,
          dependency_risk_score = excluded.dependency_risk_score,
          team_blockage_score = excluded.team_blockage_score,
          meeting_proximity_score = excluded.meeting_proximity_score,
          deadline_risk_score = excluded.deadline_risk_score,
          safe_deferral_score = excluded.safe_deferral_score,
          priority_score = excluded.priority_score,
          evidence = excluded.evidence,
          updated_at = now()
        returning id
      )
      insert into esti_cognition_priority_item (
        event_id, title, recommended_action, how_to, expected_benefit, priority_score, status, updated_at
      )
      select id, ${copy.title}, ${copy.recommendedAction}, ${howTo}::jsonb, ${copy.expectedBenefit}, ${score}, 'OPEN', now()
      from upserted
      where ${score} >= 18
      on conflict (event_id) do update set
        title = excluded.title,
        recommended_action = excluded.recommended_action,
        how_to = excluded.how_to,
        expected_benefit = excluded.expected_benefit,
        priority_score = excluded.priority_score,
        status = 'OPEN',
        updated_at = now()
    `);
  }

  for (const profile of behaviors) {
    const metrics = JSON.stringify(profile.metrics);
    await db.execute(sql`
      insert into esti_cognition_behavior_profile (
        subject_type, subject_id, label, signal_type, sample_count, confidence_pct,
        metrics, last_observed_at, updated_at
      )
      values (
        ${profile.subjectType}, ${profile.subjectId}, ${profile.label}, ${profile.signalType},
        ${profile.sampleCount}, ${profile.confidencePct}, ${metrics}::jsonb,
        ${new Date(profile.lastObservedAt ?? Date.now()).toISOString()}, now()
      )
      on conflict (subject_type, subject_id, signal_type) do update set
        label = excluded.label,
        sample_count = excluded.sample_count,
        confidence_pct = excluded.confidence_pct,
        metrics = excluded.metrics,
        last_observed_at = excluded.last_observed_at,
        updated_at = now()
    `);
  }

  return { events: events.length, behaviorProfiles: behaviors.length };
}

export async function loadCognitionQueue(db: DB, limit = 8): Promise<PriorityQueueItem[]> {
  const rows = (await db.execute(sql`
    select
      pi.id, pi.event_id, pi.title, pi.recommended_action, pi.how_to, pi.expected_benefit,
      pi.priority_score, pi.status,
      ev.source_key, ev.domain, ev.event_type, ev.subject_label, ev.severity, ev.evidence
    from esti_cognition_priority_item pi
    join esti_cognition_event ev on ev.id = pi.event_id
    where pi.status = 'OPEN' and ev.status = 'ACTIVE'
    order by pi.priority_score desc, ev.occurred_at asc
    limit ${limit}
  `)) as unknown as Array<{
    id: string;
    event_id: string;
    title: string;
    recommended_action: string;
    how_to: string[] | unknown;
    expected_benefit: string;
    priority_score: number;
    status: string;
    source_key: string;
    domain: Domain;
    event_type: string;
    subject_label: string;
    severity: Severity;
    evidence: unknown;
  }>;

  return rows.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    recommendedAction: row.recommended_action,
    howTo: Array.isArray(row.how_to) ? (row.how_to as string[]) : [],
    expectedBenefit: row.expected_benefit,
    priorityScore: Number(row.priority_score),
    status: row.status,
    sourceKey: row.source_key,
    domain: row.domain,
    eventType: row.event_type,
    subjectLabel: row.subject_label,
    severity: row.severity,
    evidence: row.evidence,
  }));
}

export async function loadBehaviorProfiles(db: DB, limit = 12) {
  const rows = (await db.execute(sql`
    select subject_type, subject_id, label, signal_type, sample_count, confidence_pct, metrics, last_observed_at
    from esti_cognition_behavior_profile
    order by confidence_pct desc, last_observed_at desc
    limit ${limit}
  `)) as unknown as Array<{
    subject_type: string;
    subject_id: string;
    label: string;
    signal_type: string;
    sample_count: number;
    confidence_pct: number;
    metrics: unknown;
    last_observed_at: Date;
  }>;

  return rows.map((row) => ({
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    label: row.label,
    signalType: row.signal_type,
    sampleCount: Number(row.sample_count),
    confidencePct: Number(row.confidence_pct),
    metrics: row.metrics,
    lastObservedAt: row.last_observed_at,
  }));
}

export function buildReasoningFrame(input: {
  queue: PriorityQueueItem[];
  behaviorProfiles: Awaited<ReturnType<typeof loadBehaviorProfiles>>;
}) {
  const top = input.queue[0] ?? null;
  const learnedPatterns = input.behaviorProfiles
    .filter((profile) => {
      const metrics = profile.metrics as Record<string, unknown> | null;
      return metrics?.learnedPattern && metrics.learnedPattern !== "normal" && metrics.learnedPattern !== "balanced";
    })
    .slice(0, 6)
    .map((profile) => ({
      subjectType: profile.subjectType,
      label: profile.label,
      signalType: profile.signalType,
      confidencePct: profile.confidencePct,
      pattern: (profile.metrics as Record<string, unknown>)?.learnedPattern,
      metrics: profile.metrics,
    }));

  return {
    rule: "DETERMINISTIC_REASONING_LLM_EXPLAINS_ONLY" as const,
    generatedAt: new Date().toISOString(),
    nextBestAction: top
      ? {
          title: top.title,
          recommendedAction: top.recommendedAction,
          priorityScore: top.priorityScore,
          reason: `${top.domain.toLowerCase()} signal from ${top.subjectLabel}`,
          expectedBenefit: top.expectedBenefit,
          howTo: top.howTo,
          evidence: top.evidence,
        }
      : {
          title: "No immediate intervention required",
          recommendedAction: "Continue planned work and let the system monitor office signals.",
          priorityScore: 0,
          reason: "No active cognition event crossed the intervention threshold.",
          expectedBenefit: "Owner attention stays protected.",
          howTo: ["Review normal office activity when convenient."],
          evidence: null,
        },
    learnedPatterns,
    safeToIgnore: input.queue
      .filter((item) => item.priorityScore < 35)
      .slice(0, 4)
      .map((item) => ({
        title: item.title,
        reason: "Priority score is low enough to defer safely today.",
        priorityScore: item.priorityScore,
      })),
  };
}
