/**
 * AORMS Studio Abstract — home screen of the system.
 *
 * Tabs: STUDIO ABSTRACT · LEAD REGISTER · PROJECT ABSTRACT · FINANCIAL ABSTRACT ·
 *       TEAM ABSTRACT · WORK REGISTER · APPROVAL REGISTER · SUMMARY SHEETS ·
 *       OFFICE LOG   (ESTI is embedded per-screen as "ESTI Observation", not a tab)
 *
 * Route: /  (root)
 * tRPC: dashboard.home bundle (KPIs, Action Center, financial/project health)
 */
import { Column, Grid, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Tile } from "@carbon/react";
import { can, formatINRShort } from "@esti/contracts";
import {
  AbstractScreenShell,
  ActivePressureList,
  CurrentStateBlock,
  EstiObservationPanel,
  EvidenceActionBlock,
  RegisterSnapshot,
  ScreenHeader,
  type EvidenceRow,
  type Pressure,
  type SnapshotRow,
} from "../components/dashboard/abstractShell.js";
import { CAPACITY_LABEL } from "../components/dashboard/dashboardUi.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { Leads } from "./Leads.js";

// ── Zone state ────────────────────────────────────────────────────────────────

type ZoneState = "stable" | "watch" | "friction" | "critical" | "inactive";

const ZCOLOR: Record<ZoneState, string> = {
  stable:   "var(--cds-support-success)",
  watch:    "var(--cds-support-warning)",
  friction: "var(--cds-support-warning-minor)",
  critical: "var(--cds-support-error)",
  inactive: "var(--cds-text-disabled)",
};

// Identity colours per tile — Carbon tag-background tokens

// Team load colours and capacity bar mapping — shared by DetailRow / ScreenProjects / ScreenTeam
const loadPct = (c: string): number =>
  ({ OVERLOADED: 95, HIGH: 75, MODERATE: 55, AVAILABLE: 30 }[c] ?? 50);

// ── State derivation ──────────────────────────────────────────────────────────

function clientState(pendingCount: number, maxWaitDays: number): ZoneState {
  if (pendingCount === 0) return "stable";
  if (maxWaitDays > 14 || pendingCount >= 5) return "critical";
  if (maxWaitDays > 7  || pendingCount >= 3) return "friction";
  return "watch";
}

function financeState(outstandingPaise: number, overdue30dPaise: number, canSee: boolean): ZoneState {
  if (!canSee) return "inactive";
  if (overdue30dPaise > 5_000_000)  return "critical";
  if (overdue30dPaise > 1_000_000 || outstandingPaise > 20_000_000) return "friction";
  if (overdue30dPaise > 0 || outstandingPaise > 5_000_000) return "watch";
  return "stable";
}

function projectState(total: number, atRisk: number): ZoneState {
  if (total === 0) return "inactive";
  if (atRisk >= 3) return "critical";
  if (atRisk >= 2) return "friction";
  if (atRisk >= 1) return "watch";
  return "stable";
}

function teamState(overloaded: number, total: number, hrEnabled: boolean): ZoneState {
  if (!hrEnabled || total === 0) return "inactive";
  if (overloaded >= total / 2)  return "critical";
  if (overloaded >= 2)          return "friction";
  if (overloaded === 1)         return "watch";
  return "stable";
}

function officeHealth(cs: ZoneState, fs: ZoneState, ps: ZoneState, ts: ZoneState): number {
  const p: Record<ZoneState, number> = { critical: 50, friction: 30, watch: 15, stable: 0, inactive: 0 };
  return Math.max(0, Math.round(100 - (p[cs] * 0.25 + p[fs] * 0.30 + p[ps] * 0.25 + p[ts] * 0.20)));
}

function healthBand(score: number): { label: string; color: string } {
  if (score >= 88) return { label: "Stable",              color: "var(--cds-support-success)" };
  if (score >= 72) return { label: "Flowing",             color: "var(--cds-interactive)" };
  if (score >= 55) return { label: "Review soon",         color: "var(--cds-support-warning)" };
  if (score >= 38) return { label: "Needs attention",     color: "var(--cds-support-warning-minor)" };
  return               { label: "Owner action needed", color: "var(--cds-support-error)" };
}

// ── Health percentages ────────────────────────────────────────────────────────

function clientHealthPct(pendingCount: number, maxWaitDays: number, blocked: number): number {
  if (pendingCount === 0 && blocked === 0) return 92;
  let score = 100;
  score -= Math.min(pendingCount * 7, 25);
  score -= Math.min(maxWaitDays * 1.5, 30);
  score -= blocked * 12;
  return Math.max(8, Math.round(score));
}

function financeHealthPct(outstandingPaise: number, overduePaise: number, canSee: boolean): number {
  if (!canSee) return 0;
  if (outstandingPaise === 0) return 95;
  const overdueRatio = overduePaise / Math.max(outstandingPaise, 1);
  return Math.max(8, Math.round(100 - overdueRatio * 75 - (outstandingPaise > 20_000_000 ? 15 : 0)));
}

function projectHealthPct(total: number, atRisk: number, delayed: number): number {
  if (total === 0) return 0;
  return Math.max(8, Math.round(100 - (atRisk / total) * 60 - (delayed / total) * 25));
}

// ── GST status ────────────────────────────────────────────────────────────────

function gstStatus(): { label: string; daysUntil: number; state: "stable" | "watch" | "friction" } {
  const today    = new Date();
  const m        = today.getMonth();
  const y        = today.getFullYear();
  const todayMs  = today.getTime();
  const cands    = [new Date(y,m,11), new Date(y,m,20), new Date(y,m+1,11), new Date(y,m+1,20)];
  const next     = cands.find((d) => d.getTime() > todayMs) ?? cands[2]!;
  const days     = Math.ceil((next.getTime() - todayMs) / 86_400_000);
  if (days <= 3) return { label: "DUE SOON", daysUntil: days, state: "friction" };
  if (days <= 7) return { label: `${days}d`,  daysUntil: days, state: "watch"    };
  return               { label: "OK",          daysUntil: days, state: "stable"   };
}

// ── Attention vector ──────────────────────────────────────────────────────────

interface AttnResult {
  issue:      string;
  action:     string;
  chain:      Array<{ id: string; on: boolean }>;
  chainColor: string;
}

function deriveAttn({
  cs, fs, ps, ts,
  pendingCount, maxWaitDays, riskProjects,
  overduePaise, billingReadyCount, overloadedCount,
}: {
  cs: ZoneState; fs: ZoneState; ps: ZoneState; ts: ZoneState;
  pendingCount: number; maxWaitDays: number;
  riskProjects: Array<{ ref: string }>;
  overduePaise: number; billingReadyCount: number; overloadedCount: number;
}): AttnResult {

  if (pendingCount > 0 && riskProjects.length > 0 && billingReadyCount > 0)
    return {
      issue:  `Client approval delay cascading into ${riskProjects.length > 1 ? `${riskProjects.length} projects` : (riskProjects[0]?.ref ?? "active delivery")} — billing queue blocked`,
      action: "Escalate pending client approvals today",
      chain:  [{ id: "CLIENTS", on: true }, { id: "PROJECTS", on: true }, { id: "FINANCE", on: true }, { id: "TEAM", on: false }],
      chainColor: ZCOLOR["friction"],
    };

  if (pendingCount > 0 && riskProjects.length > 0)
    return {
      issue:  `Client approval pending ${maxWaitDays > 0 ? `(${maxWaitDays}d oldest)` : ""} — ${riskProjects.length} project${riskProjects.length > 1 ? "s" : ""} at delivery risk`,
      action: "Follow up on client response to unblock delivery",
      chain:  [{ id: "CLIENTS", on: true }, { id: "PROJECTS", on: true }, { id: "FINANCE", on: false }, { id: "TEAM", on: false }],
      chainColor: ZCOLOR[cs === "critical" ? "critical" : "friction"],
    };

  if (fs === "critical" || fs === "friction")
    return {
      issue:  `${formatINRShort(overduePaise)} overdue — collection delay increasing`,
      action: "Contact clients on overdue invoices before end of week",
      chain:  [{ id: "CLIENTS", on: false }, { id: "PROJECTS", on: false }, { id: "FINANCE", on: true }, { id: "TEAM", on: false }],
      chainColor: ZCOLOR[fs],
    };

  if (overloadedCount > 0 && riskProjects.length > 0)
    return {
      issue:  `${overloadedCount} member${overloadedCount > 1 ? "s" : ""} overloaded — delivery risk spreading to ${riskProjects.length} project${riskProjects.length > 1 ? "s" : ""}`,
      action: "Redistribute task load before delivery deadlines",
      chain:  [{ id: "CLIENTS", on: false }, { id: "PROJECTS", on: true }, { id: "FINANCE", on: false }, { id: "TEAM", on: true }],
      chainColor: ZCOLOR[ts],
    };

  if (cs === "watch" || fs === "watch" || ps === "watch" || ts === "watch") {
    const which = [cs==="watch"&&"CLIENT", fs==="watch"&&"FINANCE", ps==="watch"&&"PROJECT", ts==="watch"&&"TEAM"].filter(Boolean).join(" + ");
    return {
      issue:  `${which} signals at watch level — monitor for escalation`,
      action: "Review flagged items before end of day",
      chain:  [{ id: "CLIENTS", on: cs==="watch" }, { id: "PROJECTS", on: ps==="watch" }, { id: "FINANCE", on: fs==="watch" }, { id: "TEAM", on: ts==="watch" }],
      chainColor: ZCOLOR["watch"],
    };
  }

  return {
    issue:  "Practice operating normally. No immediate intervention required.",
    action: "Review weekly performance and plan next sprint",
    chain:  [{ id: "CLIENTS", on: false }, { id: "PROJECTS", on: false }, { id: "FINANCE", on: false }, { id: "TEAM", on: false }],
    chainColor: ZCOLOR["stable"],
  };
}

// ── Cognitive overview primitives ────────────────────────────────────────────

// ── Cognitive load protection helpers ─────────────────────────────────────────

// Neutral by design — recovery readout stays white, not colour-coded.

function calmnessLabel(score: number): string {
  if (score >= 88) return "Everything under control";
  if (score >= 72) return "Operations running smoothly";
  if (score >= 55) return "Small delays detected";
  if (score >= 38) return "Dependencies slowing progress";
  return "Multiple workflows blocked";
}

type SignalCopy = {
  value: string;
  detail: string;
};

function officeSignal(state: ZoneState): SignalCopy {
  if (state === "stable") return { value: "Stable", detail: "The office is under control." };
  if (state === "watch") return { value: "Minor friction", detail: "A few items may slow the day." };
  if (state === "friction") return { value: "Needs attention", detail: "Dependencies are slowing progress." };
  if (state === "critical") return { value: "Recovery required", detail: "Several workflows need owner attention." };
  return { value: "Reviewing", detail: "The system is still reading office signals." };
}

function clientSignal(state: ZoneState): SignalCopy {
  if (state === "stable") return { value: "Responsive", detail: "Client communication is healthy." };
  if (state === "watch") return { value: "Waiting", detail: "A normal client response is pending." };
  if (state === "friction") return { value: "Approval blocking", detail: "A client decision is affecting progress." };
  if (state === "critical") return { value: "Escalate today", detail: "A follow-up is needed to unblock work." };
  return { value: "No client signal", detail: "Client activity is not available yet." };
}

function financeSignal(state: ZoneState): SignalCopy {
  if (state === "stable") return { value: "Cash flow stable", detail: "Billing is moving normally." };
  if (state === "watch") return { value: "Follow-up pending", detail: "A payment reminder is recommended." };
  if (state === "friction") return { value: "Recovery delayed", detail: "The billing cycle is slowing down." };
  if (state === "critical") return { value: "Recover payment", detail: "Payment recovery needs attention today." };
  return { value: "Finance restricted", detail: "Finance signals are not available for this role." };
}

function projectSignal(state: ZoneState): SignalCopy {
  if (state === "stable") return { value: "On track", detail: "Project delivery is moving normally." };
  if (state === "watch") return { value: "Starting to slow", detail: "Early delay signals are appearing." };
  if (state === "friction") return { value: "Waiting on dependency", detail: "A blocker is slowing project progress." };
  if (state === "critical") return { value: "Intervention needed", detail: "A project is stalled and needs review." };
  return { value: "No project signal", detail: "No active project signal is available." };
}

function teamSignal(state: ZoneState): SignalCopy {
  if (state === "stable") return { value: "Workload balanced", detail: "Team capacity is distributed well." };
  if (state === "watch") return { value: "Team is busy", detail: "Workload is increasing but manageable." };
  if (state === "friction") return { value: "Load is uneven", detail: "Reallocation is recommended." };
  if (state === "critical") return { value: "Team bottlenecked", detail: "Overload is blocking progress." };
  return { value: "No team signal", detail: "Team capacity data is not available." };
}

function cognitionState(severity?: string): ZoneState {
  return severity === "critical" || severity === "friction" || severity === "watch" || severity === "stable" || severity === "inactive"
    ? severity
    : "inactive";
}

function domainLabel(domain?: string): string {
  if (domain === "finance") return "FINANCE";
  if (domain === "client") return "CLIENT";
  if (domain === "project") return "PROJECT";
  if (domain === "team") return "TEAM";
  if (domain === "approval") return "APPROVAL";
  return "OFFICE";
}

function taskHref(taskId?: string | null, projectId?: string | null): string {
  const params = new URLSearchParams({ tab: "tasks" });
  if (taskId) params.set("taskId", taskId);
  if (projectId) params.set("projectId", projectId);
  return `/tasks?${params.toString()}`;
}

function projectIssueHref(p: any): string {
  if (p.focusTaskId) return taskHref(p.focusTaskId, p.id);
  if (p.focusInvoiceId) return `/projects/${p.id}?tab=invoices&invoiceId=${p.focusInvoiceId}`;
  if (p.focusApprovalId) return `/projects/${p.id}?tab=approvals&approvalId=${p.focusApprovalId}`;
  if ((p.overdueInvoices ?? 0) > 0) return `/projects/${p.id}?tab=invoices`;
  if ((p.staleApprovals ?? 0) > 0) return `/projects/${p.id}?tab=approvals`;
  return `/projects/${p.id}?tab=overview`;
}

function fallbackCognitiveInterventions(input: {
  pendingCount: number;
  maxWaitDays: number;
  overduePaise: number;
  billingReadyCount: number;
  meetingCount: number;
  riskProjects: number;
  delayedProjects: number;
  overloadedCount: number;
}): any[] {
  const items: any[] = [];
  if (input.meetingCount > 0 && (input.pendingCount > 0 || input.riskProjects > 0 || input.delayedProjects > 0)) {
    items.push({
      id: "meeting-focus-prep",
      source: "project",
      severity: "watch",
      recoveryLevel: 1,
      impactPct: 7,
      title: "Prepare meeting context before switching attention",
      suggestedAction: "Review only meeting-relevant project notes, approvals, and blockers before the next meeting.",
      howTo: ["Open the meeting project evidence.", "Read unresolved blockers only.", "Hide finance and HR items until the meeting is complete."],
      confidence: 0.76,
      riskIfIgnored: "Unrelated operational pressure can create attentional residue before the meeting.",
    });
  }
  if (input.maxWaitDays > 7 || input.pendingCount >= 2) {
    items.push({
      id: "approval-escalation",
      source: "approval",
      severity: input.maxWaitDays > 14 ? "critical" : "friction",
      recoveryLevel: 1,
      impactPct: input.maxWaitDays > 14 ? 14 : 10,
      title: "Escalate stale client approvals",
      suggestedAction: "Clear the oldest waiting approvals first so project and billing pressure can reduce.",
      howTo: ["Open client approvals.", "Send one decision-focused escalation.", "Record the response or escalation outcome."],
      confidence: 0.78,
      riskIfIgnored: "Client response delay will keep project and billing signals under pressure.",
    });
  }
  if (input.overduePaise > 0) {
    items.push({
      id: "finance-recovery",
      source: "finance",
      severity: input.overduePaise > 5_000_000 ? "critical" : "friction",
      recoveryLevel: 4,
      impactPct: input.overduePaise > 5_000_000 ? 16 : 10,
      title: "Run collection recovery on overdue invoices",
      suggestedAction: "Recover overdue invoice status after client follow-up is complete.",
      howTo: ["Open billing evidence.", "Follow up on the overdue invoice reference.", "Mark recovered invoices as paid."],
      confidence: 0.74,
      riskIfIgnored: "Aging receivables will continue to lower office calmness.",
    });
  }
  if (input.overloadedCount > 0) {
    items.push({
      id: "team-load-redistribution",
      source: "team",
      severity: input.overloadedCount > 2 ? "critical" : "friction",
      recoveryLevel: 2,
      impactPct: input.overloadedCount > 2 ? 15 : 9,
      title: "Redistribute overloaded staff tasks",
      suggestedAction: "Move overdue or overloaded work to the most available active team member.",
      howTo: ["Find the most overloaded assignee.", "Move selected overdue tasks.", "Review the new workload before stand-up."],
      confidence: 0.72,
      riskIfIgnored: "Work will stay concentrated around overloaded people and project health will degrade.",
    });
  }
  if (input.riskProjects > 0 || input.delayedProjects > 0) {
    items.push({
      id: "project-owner-review",
      source: "project",
      severity: input.riskProjects > 2 ? "critical" : "friction",
      recoveryLevel: 5,
      impactPct: input.riskProjects > 2 ? 16 : 11,
      title: "Run owner review for delayed projects",
      suggestedAction: "Close completed overdue tasks and assign one recovery owner for remaining blockers.",
      howTo: ["Open red project evidence.", "Close already-finished overdue tasks.", "Assign one owner to the recovery path."],
      confidence: 0.7,
      riskIfIgnored: "Schedule pressure will move from preventive recovery into correction.",
    });
  }
  if (input.billingReadyCount > 0) {
    items.push({
      id: "billing-ready",
      source: "finance",
      severity: "watch",
      recoveryLevel: 4,
      impactPct: 6,
      title: "Convert billing-ready phases into invoices",
      suggestedAction: "Turn completed phases into invoices before they become hidden finance load.",
      howTo: ["Review ready-to-bill phases.", "Confirm scope completion.", "Generate and send invoices."],
      confidence: 0.72,
      riskIfIgnored: "Earned work remains outside the receivables pipeline.",
    });
  }
  const rank = { critical: 3, friction: 2, watch: 1 };
  return items.sort((a, b) => rank[b.severity as keyof typeof rank] - rank[a.severity as keyof typeof rank] || b.impactPct - a.impactPct).slice(0, 6);
}

// ── OVERVIEW TAB — cognitive command flow ────────────────────────────────────

function ScreenOverview({
  home, fh, ac, ph, ti, canInvoice, hrEnabled,
}: {
  home: any; fh: any; ac: any; ph: any[]; ti: any[]; att: any; ri: any;
  canInvoice: boolean; hrEnabled: boolean;
}) {
  const pending      = ac?.pendingApprovals   ?? [];
  const pendingCount = pending.length;
  const maxWaitDays  = pendingCount > 0 ? Math.max(...pending.map((a: any) => a.daysWaiting ?? 0)) : 0;
  const billingReady = ac?.billingReadyPhases  ?? [];
  const overdueInvs  = ac?.overdueInvoices      ?? [];
  const overduePaise = fh?.overdue30dPaise ?? 0;
  const riskProjects = ph.filter((p: any) => p.health === "RED");
  const overloaded   = ti.filter((m: any) => m.capacity === "OVERLOADED");

  const cs = clientState(pendingCount, maxWaitDays);
  const fs = financeState(fh?.outstandingPaise ?? 0, overduePaise, canInvoice);
  const ps = projectState(ph.length, riskProjects.length);
  const ts = teamState(overloaded.length, ti.length, hrEnabled);

  const office = home?.cognition?.office;
  const score  = office?.score ?? officeHealth(cs, fs, ps, ts);
  const attn   = deriveAttn({ cs, fs, ps, ts, pendingCount, maxWaitDays, riskProjects, overduePaise, billingReadyCount: billingReady.length, overloadedCount: overloaded.length });
  const officeState: ZoneState =
    cognitionState(office?.severity) !== "inactive"
      ? cognitionState(office?.severity)
      : attn.chainColor === ZCOLOR["critical"] ? "critical"
      : attn.chainColor === ZCOLOR["friction"] ? "friction"
      : attn.chainColor === ZCOLOR["watch"] ? "watch" : "stable";

  const backendInterventions = home?.cognition?.interventions ?? [];
  const interventions = backendInterventions.length > 0
    ? backendInterventions
    : fallbackCognitiveInterventions({
        pendingCount, maxWaitDays, overduePaise,
        billingReadyCount: billingReady.length,
        meetingCount: (ac?.meetingFocus ?? []).length,
        riskProjects: riskProjects.length,
        delayedProjects: ph.filter((p: any) => (p.overdueTasks ?? 0) > 0).length,
        overloadedCount: overloaded.length,
      });
  const primary = interventions[0];

  // Active Pressures — max 3, highest impact first (the shell caps + places the one ■).
  const pressures: Pressure[] = interventions.slice(0, 3).map((item: any) => ({
    domain: domainLabel(item.source),
    issue: item.title,
    impact: item.riskIfIgnored,
    action: item.suggestedAction ?? "Review and act.",
    state: cognitionState(item.severity),
  }));

  // Register snapshot — plain counts, no charts (spec §7).
  const tasksOverdue = ph.reduce((s: number, p: any) => s + (p.overdueTasks ?? 0), 0);
  const teamLoadPct  = ti.length > 0 ? Math.round(ti.reduce((s: number, m: any) => s + loadPct(m.capacity), 0) / ti.length) : 0;
  const snapshot: SnapshotRow[] = [
    { label: "Projects Active",   value: ph.length },
    { label: "Invoices Pending",  value: overdueInvs.length, state: overdueInvs.length > 0 ? "friction" : "stable" },
    { label: "Approvals Pending", value: pendingCount,       state: pendingCount > 0 ? "watch" : "stable" },
    { label: "Tasks Overdue",     value: tasksOverdue,       state: tasksOverdue > 0 ? "friction" : "stable" },
    ...(hrEnabled
      ? [{ label: "Team Load", value: `${teamLoadPct}%`, state: (teamLoadPct > 85 ? "friction" : teamLoadPct > 70 ? "watch" : "stable") as ZoneState }]
      : []),
  ];

  // Evidence — the facts behind the signal.
  const evidenceRows: EvidenceRow[] = [
    ...overdueInvs.slice(0, 2).map((inv: any) => ({
      fact: `Overdue invoice ${inv.ref}`,
      value: formatINRShort(inv.netReceivablePaise),
      state: "critical" as ZoneState,
      age: `${inv.daysOverdue}d`,
      href: `/projects/${inv.projectId}?tab=invoices&invoiceId=${inv.id}`,
    })),
    ...pending.slice(0, 2).map((ap: any) => ({
      fact: `${ap.projectRef} — ${ap.title}`,
      state: (ap.daysWaiting > 14 ? "critical" : "friction") as ZoneState,
      age: `${ap.daysWaiting}d`,
      href: `/projects/${ap.projectId}?tab=approvals&approvalId=${ap.id}`,
    })),
    ...riskProjects.slice(0, 2).map((p: any) => ({
      fact: `${p.ref} at delivery risk`,
      value: p.title,
      state: "critical" as ZoneState,
      href: projectIssueHref(p),
    })),
  ];

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Studio Abstract" state={officeState} signal={officeSignal(officeState).detail} />}
      currentState={
        <CurrentStateBlock
          condition={officeSignal(officeState).value}
          state={officeState}
          band={healthBand(score).label}
          balancePct={score}
          signal={attn.issue}
        />
      }
      activePressures={<ActivePressureList pressures={pressures} />}
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={<EvidenceActionBlock cause={attn.issue} action={attn.action} rows={evidenceRows} />}
      observation={
        <EstiObservationPanel
          observation={`${calmnessLabel(score)}. ${officeSignal(officeState).detail}`}
          action={primary?.suggestedAction ?? "Review weekly performance and plan the next sprint."}
        />
      }
    />
  );
}

// ── PROJECTS TAB ──────────────────────────────────────────────────────────────

function ScreenProjects({
  ph, ti, canInvoice,
}: {
  ph: any[]; ti: any[]; att: any; billingReady: any[]; canInvoice: boolean;
}) {
  const risk    = ph.filter((p: any) => p.health === "RED");
  const watch   = ph.filter((p: any) => p.health === "YELLOW");
  const delayed = ph.filter((p: any) => (p.overdueTasks ?? 0) > 0).length;
  const stale   = ph.reduce((s: number, p: any) => s + (p.staleApprovals ?? 0), 0);
  const state   = projectState(ph.length, risk.length);
  const overloaded = ti.filter((m: any) => m.capacity === "OVERLOADED").length;

  const pressures: Pressure[] = risk.slice(0, 3).map((p: any) => ({
    domain: "Project",
    issue: `${p.ref} — ${p.title}`,
    impact:
      [
        p.overdueTasks > 0 ? `${p.overdueTasks} late tasks` : null,
        p.staleApprovals > 0 ? `${p.staleApprovals} stale approvals` : null,
        canInvoice && p.overdueInvoices > 0 ? `${p.overdueInvoices} invoices overdue` : null,
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
    action: "Owner review — clear the blocker on the critical path",
    state: "critical",
    href: projectIssueHref(p),
  }));

  const snapshot: SnapshotRow[] = [
    { label: "Projects Active", value: ph.length },
    { label: "Delayed Projects", value: delayed, state: delayed > 0 ? "friction" : "stable" },
    { label: "Critical Projects", value: risk.length, state: risk.length > 0 ? "critical" : "stable" },
    { label: "Watch Projects", value: watch.length, state: watch.length > 0 ? "watch" : "stable" },
    { label: "Stale Approvals", value: stale, state: stale > 0 ? "friction" : "stable" },
  ];

  const evidenceRows: EvidenceRow[] = [...risk, ...watch].slice(0, 6).map((p: any) => ({
    fact: `${p.ref} — ${p.title}`,
    value: p.currentPhase ?? undefined,
    state: (p.health === "RED" ? "critical" : "watch") as ZoneState,
    age: `${p.progressPct ?? 0}%`,
    href: projectIssueHref(p),
  }));

  const observation =
    risk.length > 0
      ? `${risk.length} project${risk.length > 1 ? "s are" : " is"} at delivery risk${overloaded > 0 ? `, with ${overloaded} member${overloaded > 1 ? "s" : ""} overloaded` : ""}.`
      : "Delivery is on track across the active portfolio.";

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Project Abstract" state={state} signal={`${ph.length} active · ${risk.length} critical · ${watch.length} watch`} />}
      currentState={
        <CurrentStateBlock
          condition={projectSignal(state).value}
          state={state}
          band={`${delayed} delayed`}
          balancePct={projectHealthPct(ph.length, risk.length, delayed)}
          signal={projectSignal(state).detail}
        />
      }
      activePressures={<ActivePressureList pressures={pressures} />}
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={
        <EvidenceActionBlock
          cause={risk.length > 0 ? `${risk.length} project${risk.length > 1 ? "s" : ""} at delivery risk` : undefined}
          action="Clear the blocker on each critical path before delivery deadlines."
          rows={evidenceRows}
          empty="No projects at risk. Delivery on track."
        />
      }
      observation={
        <EstiObservationPanel
          observation={observation}
          action={risk.length > 0 ? "Assign one recovery owner per critical project." : undefined}
        />
      }
    />
  );
}

// ── FINANCE TAB ───────────────────────────────────────────────────────────────

function ScreenFinance({
  fh, ac, canInvoice,
}: {
  fh: any; ac: any; canInvoice: boolean; canFees: boolean; home: any;
}) {
  if (!canInvoice) {
    return (
      <Grid fullWidth className="esti-abstract">
        <Column lg={16} md={8} sm={4}>
          <Tile>
            <Stack gap={3}>
              <span className="esti-label--secondary">Finance data requires the invoice:manage permission.</span>
            </Stack>
          </Tile>
        </Column>
      </Grid>
    );
  }

  const overdueInvs  = ac?.overdueInvoices    ?? [];
  const billingReady = ac?.billingReadyPhases ?? [];
  const gst          = gstStatus();
  const outstanding  = fh?.outstandingPaise ?? 0;
  const overdue      = fh?.overdue30dPaise  ?? 0;
  const ready        = fh?.readyToBillPaise ?? 0;
  const state        = financeState(outstanding, overdue, canInvoice);

  const pressures: Pressure[] = [
    ...overdueInvs.slice(0, 2).map((inv: any) => ({
      domain: "Finance",
      issue: `Overdue invoice ${inv.ref}`,
      impact: `${formatINRShort(inv.netReceivablePaise)} · ${inv.daysOverdue}d`,
      action: "Contact the client on the overdue payment before the billing cycle closes.",
      state: (inv.daysOverdue > 30 ? "critical" : "friction") as ZoneState,
      href: `/projects/${inv.projectId}?tab=invoices&invoiceId=${inv.id}`,
    })),
    ...(billingReady.length > 0
      ? [{
          domain: "Finance",
          issue: `${billingReady.length} phase${billingReady.length > 1 ? "s" : ""} ready to invoice`,
          impact: ready > 0 ? formatINRShort(ready) : undefined,
          action: "Convert billing-ready phases into invoices.",
          state: "watch" as ZoneState,
          href: "/invoices",
        }]
      : []),
  ];

  const snapshot: SnapshotRow[] = [
    { label: "Receivables", value: formatINRShort(outstanding) },
    { label: "Overdue Invoices", value: overdueInvs.length, state: overdueInvs.length > 0 ? "critical" : "stable" },
    { label: "Billing Ready", value: formatINRShort(ready), state: ready > 0 ? "watch" : "stable" },
    { label: "Ready Phases", value: billingReady.length },
    { label: "GST Status", value: gst.label, state: gst.state },
  ];

  const evidenceRows: EvidenceRow[] = overdueInvs.slice(0, 6).map((inv: any) => ({
    fact: `Overdue invoice ${inv.ref}`,
    value: formatINRShort(inv.netReceivablePaise),
    state: (inv.daysOverdue > 30 ? "critical" : "friction") as ZoneState,
    age: `${inv.daysOverdue}d`,
    href: `/projects/${inv.projectId}?tab=invoices&invoiceId=${inv.id}`,
  }));

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Financial Abstract" state={state} signal={`${formatINRShort(outstanding)} receivable · ${overdueInvs.length} overdue`} />}
      currentState={
        <CurrentStateBlock
          condition={financeSignal(state).value}
          state={state}
          band={overdue > 0 ? `${formatINRShort(overdue)} overdue 30d+` : "No overdue"}
          balancePct={financeHealthPct(outstanding, overdue, canInvoice)}
          signal={financeSignal(state).detail}
        />
      }
      activePressures={<ActivePressureList pressures={pressures} />}
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={
        <EvidenceActionBlock
          cause={overdue > 0 ? `${formatINRShort(overdue)} in receivables is 30+ days overdue` : undefined}
          action="Recover overdue invoices before generating the next billing set."
          rows={evidenceRows}
          empty="No invoices overdue. Collections on track."
        />
      }
      observation={
        <EstiObservationPanel
          observation={financeSignal(state).detail}
          action={ready > 0 ? "Bill the ready phases so earned work enters the receivables pipeline." : undefined}
        />
      }
    />
  );
}

// ── TEAM TAB ──────────────────────────────────────────────────────────────────

function ScreenTeam({
  ti, att, hrEnabled,
}: {
  ti: any[]; att: any; hrEnabled: boolean;
}) {
  if (!hrEnabled) {
    return (
      <Grid fullWidth className="esti-abstract">
        <Column lg={16} md={8} sm={4}>
          <Tile>
            <Stack gap={3}>
              <span className="esti-label--secondary">Team module requires HR to be enabled in settings.</span>
            </Stack>
          </Tile>
        </Column>
      </Grid>
    );
  }

  const overloaded = ti.filter((m: any) => m.capacity === "OVERLOADED");
  const teamLoadPct = ti.length > 0 ? Math.round(ti.reduce((s: number, m: any) => s + loadPct(m.capacity), 0) / ti.length) : 0;
  const state = teamState(overloaded.length, ti.length, hrEnabled);

  const pressures: Pressure[] = overloaded.slice(0, 3).map((m: any) => ({
    domain: "Team",
    issue: `${m.assignee} is overloaded`,
    impact: `${m.totalOpen} open · ${m.overdueCount ?? 0} late`,
    action: "Redistribute overdue work to an available member.",
    state: "critical",
    href: taskHref(m.focusTaskId, m.focusProjectId),
  }));

  const snapshot: SnapshotRow[] = [
    { label: "Present Today", value: att?.present ?? "—" },
    { label: "Absent Today", value: att ? `${att.absent}/${att.headcount}` : "—" },
    { label: "WFH Today", value: att?.wfh ?? "—" },
    { label: "Overloaded Members", value: overloaded.length, state: overloaded.length > 0 ? "critical" : "stable" },
    { label: "Team Load", value: `${teamLoadPct}%`, state: teamLoadPct > 85 ? "friction" : teamLoadPct > 70 ? "watch" : "stable" },
  ];

  const evidenceRows: EvidenceRow[] = ti.slice(0, 6).map((m: any) => ({
    fact: m.assignee,
    value: `${m.totalOpen} open`,
    state: (m.capacity === "OVERLOADED" ? "critical" : m.capacity === "BUSY" ? "watch" : "stable") as ZoneState,
    age: CAPACITY_LABEL[m.capacity] ?? m.capacity,
    href: taskHref(m.focusTaskId, m.focusProjectId),
  }));

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Team Abstract" state={state} signal={`${ti.length} members · ${overloaded.length} overloaded`} />}
      currentState={
        <CurrentStateBlock
          condition={teamSignal(state).value}
          state={state}
          band={`${teamLoadPct}% load`}
          balancePct={100 - teamLoadPct}
          signal={teamSignal(state).detail}
        />
      }
      activePressures={<ActivePressureList pressures={pressures} />}
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={
        <EvidenceActionBlock
          cause={overloaded.length > 0 ? `${overloaded.length} member${overloaded.length > 1 ? "s" : ""} overloaded` : undefined}
          action="Move overdue work away from overloaded members before stand-up."
          rows={evidenceRows}
          empty="No team data available."
        />
      }
      observation={
        <EstiObservationPanel
          observation={teamSignal(state).detail}
          action={overloaded.length > 0 ? "Rebalance the workload to protect delivery." : undefined}
        />
      }
    />
  );
}

// ── APPROVALS TAB ─────────────────────────────────────────────────────────────

function ScreenApprovals({ ac }: { ac: any; home: any }) {
  const pending      = ac?.pendingApprovals ?? [];
  const pendingCount = pending.length;
  const maxWait      = pendingCount > 0 ? Math.max(...pending.map((a: any) => a.daysWaiting ?? 0)) : 0;
  const stale        = pending.filter((a: any) => (a.daysWaiting ?? 0) > 10).length;
  const state        = clientState(pendingCount, maxWait);

  const pressures: Pressure[] = pending
    .filter((a: any) => (a.daysWaiting ?? 0) > 10)
    .slice(0, 3)
    .map((ap: any) => ({
      domain: "Approval",
      issue: `${ap.projectRef} — ${ap.title}`,
      impact: `waiting ${ap.daysWaiting}d`,
      action: "Escalate the decision so project and billing can move.",
      state: (ap.daysWaiting > 14 ? "critical" : "friction") as ZoneState,
      href: `/projects/${ap.projectId}?tab=approvals&approvalId=${ap.id}`,
    }));

  const snapshot: SnapshotRow[] = [
    { label: "Approvals Pending", value: pendingCount, state: pendingCount > 0 ? "watch" : "stable" },
    { label: "Stale (>10d)", value: stale, state: stale > 0 ? "friction" : "stable" },
    { label: "Oldest Wait", value: `${maxWait}d`, state: maxWait > 14 ? "critical" : maxWait > 7 ? "friction" : "stable" },
  ];

  const evidenceRows: EvidenceRow[] = pending.slice(0, 6).map((ap: any) => ({
    fact: `${ap.projectRef} — ${ap.title}`,
    state: (ap.daysWaiting > 14 ? "critical" : ap.daysWaiting > 7 ? "friction" : "watch") as ZoneState,
    age: `${ap.daysWaiting}d`,
    href: `/projects/${ap.projectId}?tab=approvals&approvalId=${ap.id}`,
  }));

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Approval Register" state={state} signal={`${pendingCount} pending · oldest ${maxWait}d`} />}
      currentState={
        <CurrentStateBlock
          condition={clientSignal(state).value}
          state={state}
          band={stale > 0 ? `${stale} stale` : "None stale"}
          balancePct={clientHealthPct(pendingCount, maxWait, stale)}
          signal={clientSignal(state).detail}
        />
      }
      activePressures={<ActivePressureList pressures={pressures} />}
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={
        <EvidenceActionBlock
          cause={stale > 0 ? `${stale} approval${stale > 1 ? "s" : ""} waiting over 10 days` : undefined}
          action="Clear the oldest waiting approvals first."
          rows={evidenceRows}
          empty="No approvals pending. All client responses received."
        />
      }
      observation={
        <EstiObservationPanel
          observation={clientSignal(state).detail}
          action={pendingCount > 0 ? "One decision-focused escalation per stale approval." : undefined}
        />
      }
    />
  );
}

// ── REPORTS TAB ───────────────────────────────────────────────────────────────

function ScreenReports({ fh, ph, ri, canInvoice }: {
  fh: any; ph: any[]; ri: any; canInvoice: boolean; home: any;
}) {
  const red      = ph.filter((p: any) => p.health === "RED").length;
  const delayed  = ph.filter((p: any) => (p.overdueTasks ?? 0) > 0).length;
  const gst      = gstStatus();

  // Report & export center — utility-driven, no pressure section (spec §8.7).
  const snapshot: SnapshotRow[] = [
    { label: "Projects", value: ph.length },
    { label: "At Risk", value: red, state: red > 0 ? "critical" : "stable" },
    { label: "Delayed", value: delayed, state: delayed > 0 ? "friction" : "stable" },
    ...(canInvoice ? [{ label: "Receivables", value: formatINRShort(fh?.outstandingPaise ?? 0) }] : []),
    { label: "Revisions", value: ri?.totalDecisions ?? 0 },
    { label: "GST Status", value: gst.label, state: gst.state },
  ];

  const evidenceRows: EvidenceRow[] = [
    ...(canInvoice ? [{ fact: "GST / TDS filing abstracts", state: "stable" as ZoneState, href: "/filing" }] : []),
    { fact: "Team performance", state: "stable", href: "/performance" },
    { fact: "Office activity log", state: "stable", href: "/tasks?tab=activity" },
  ];

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Summary Sheets" state="stable" signal="Report & export center" />}
      currentState={
        <CurrentStateBlock
          condition="Reports ready"
          state="stable"
          band={`${ph.length} projects`}
          balancePct={100}
          signal="Delivery, financial and revision summaries are up to date."
        />
      }
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={<EvidenceActionBlock action="Open a report to review or export." rows={evidenceRows} empty="No reports available." />}
      observation={<EstiObservationPanel observation="A calm, utility screen — no action pressure. Open a report when you need to review or export." />}
    />
  );
}

// ── ACTIVITY TAB ──────────────────────────────────────────────────────────────

function relTime(input: string | Date): string {
  const t = new Date(input).getTime();
  if (Number.isNaN(t)) return "";
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function ScreenActivity() {
  const q = trpc.activity.listOffice.useQuery({ limit: 30, visibility: "STAFF" }, { staleTime: 30_000 });
  const rows = q.data?.rows ?? [];
  const userActions  = rows.filter((a) => a.actorName).length;
  const systemEvents = rows.length - userActions;

  // Audit / activity trail — record history, not an action center (spec §8.8).
  const snapshot: SnapshotRow[] = [
    { label: "Recent Changes", value: rows.length },
    { label: "User Actions", value: userActions },
    { label: "System Events", value: systemEvents },
  ];

  const evidenceRows: EvidenceRow[] = rows.slice(0, 6).map((a) => ({
    fact: a.summary,
    value: `${a.actorName ?? "System"}${a.projectRef ? ` · ${a.projectRef}` : ""}`,
    state: "stable" as ZoneState,
    age: relTime(a.createdAt),
  }));

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Office Log" state="stable" signal={`${rows.length} recent events`} />}
      currentState={
        <CurrentStateBlock
          condition={q.isLoading ? "Loading…" : "Activity timeline"}
          state="stable"
          band="Record history"
          balancePct={100}
          signal="Immutable audit and activity trail — record history, not an action center."
        />
      }
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={<EvidenceActionBlock rows={evidenceRows} empty="No recent office activity." />}
      observation={<EstiObservationPanel observation="A running record of what changed in the office. No pressure — this is history." />}
    />
  );
}

// ── WORK QUEUE TAB ────────────────────────────────────────────────────────────

function ScreenWorkQueue() {
  const queueQ = trpc.tasks.todayQueue.useQuery({ myTasks: false, limit: 25 }, { staleTime: 30_000 });
  const rows   = queueQ.data ?? [];
  const today  = new Date().toISOString().slice(0, 10);
  const overdue  = rows.filter((t) => t.dueDate && t.dueDate < today).length;
  const dueToday = rows.filter((t) => t.dueDate === today).length;
  const blocked  = rows.filter((t) => t.status === "BLOCKED").length;
  const highPri  = rows.filter((t) => t.priority === "CRITICAL" || t.priority === "HIGH").length;
  const state: ZoneState = blocked > 0 || overdue > 5 ? "friction" : overdue > 0 ? "watch" : "stable";

  const pressures: Pressure[] = rows
    .filter((t) => t.interventionRequired || t.status === "BLOCKED")
    .slice(0, 3)
    .map((t) => ({
      domain: "Work",
      issue: t.title,
      impact: t.projectRef ? `${t.projectRef}${t.dueDate ? ` · due ${t.dueDate}` : ""}` : undefined,
      action: t.status === "BLOCKED" ? "Unblock this task to release dependent project movement." : "Prioritize — intervention required.",
      state: (t.status === "BLOCKED" ? "critical" : "friction") as ZoneState,
      href: taskHref(t.id),
    }));

  const snapshot: SnapshotRow[] = [
    { label: "Open Tasks", value: rows.length },
    { label: "Due Today", value: dueToday, state: dueToday > 0 ? "watch" : "stable" },
    { label: "Overdue", value: overdue, state: overdue > 0 ? "friction" : "stable" },
    { label: "Blocked Tasks", value: blocked, state: blocked > 0 ? "critical" : "stable" },
    { label: "High Priority", value: highPri, state: highPri > 0 ? "watch" : "stable" },
  ];

  const evidenceRows: EvidenceRow[] = rows.slice(0, 6).map((t) => ({
    fact: t.title,
    value: t.projectRef ?? undefined,
    state: (t.status === "BLOCKED" ? "critical" : t.priority === "CRITICAL" || t.priority === "HIGH" ? "friction" : "watch") as ZoneState,
    age: t.dueDate ?? undefined,
    href: taskHref(t.id),
  }));

  return (
    <AbstractScreenShell
      header={<ScreenHeader title="Work Register" state={state} signal={`${rows.length} tasks · ${overdue} overdue`} />}
      currentState={
        <CurrentStateBlock
          condition={overdue > 0 ? "Overdue building" : blocked > 0 ? "Blocked work" : "Queue clear"}
          state={state}
          band={`${blocked} blocked`}
          balancePct={rows.length > 0 ? Math.round(((rows.length - overdue) / rows.length) * 100) : 100}
          signal={overdue > 0 ? "Overdue work is accumulating in the queue." : "The work queue is moving normally."}
        />
      }
      activePressures={<ActivePressureList pressures={pressures} />}
      registerSnapshot={<RegisterSnapshot rows={snapshot} />}
      evidence={<EvidenceActionBlock action="Clear blocked and overdue tasks first." rows={evidenceRows} empty="No active tasks in the queue." />}
      observation={
        <EstiObservationPanel
          observation={overdue > 0 || blocked > 0 ? "Blocked and overdue tasks are holding queue movement." : "The execution queue is healthy."}
          action={blocked > 0 ? "Unblock the blocked tasks to release dependent work." : undefined}
        />
      }
    />
  );
}

// ── Studio Abstract shell ─────────────────────────────────────────────────────

export function StudioAbstract() {
  const { user } = useAuth();

  const homeQ     = trpc.dashboard.home.useQuery(undefined, { staleTime: 60_000 });
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;

  const tiQ  = trpc.dashboard.teamIntelligence.useQuery(undefined, { enabled: hrEnabled });
  const attQ = trpc.dashboard.attendanceToday.useQuery(undefined, { enabled: hrEnabled });

  const home = homeQ.data;
  const ac   = home?.actionCenter;
  const fh   = home?.financialHealth ?? null;
  const ph   = home?.projectHealth   ?? [];
  const ri   = home?.revisionIntelligence ?? null;
  const ti   = tiQ.data  ?? [];
  const att  = attQ.data ?? null;

  const canInvoice = can(user?.role, "invoice:manage");
  const canFees    = can(user?.role, "fees:manage");
  const canWrite   = can(user?.role, "write");

  const billingReady = ac?.billingReadyPhases ?? [];

  return (
    <div className="esti-studio-abstract-page">
      <Tabs>
        <TabList aria-label="Studio Abstract navigation">
          <Tab>STUDIO ABSTRACT</Tab>
          <Tab disabled={!canWrite}>LEAD REGISTER</Tab>
          <Tab>PROJECT ABSTRACT</Tab>
          <Tab disabled={!canInvoice}>FINANCIAL ABSTRACT</Tab>
          <Tab disabled={!hrEnabled}>TEAM ABSTRACT</Tab>
          <Tab>WORK REGISTER</Tab>
          <Tab>APPROVAL REGISTER</Tab>
          <Tab>SUMMARY SHEETS</Tab>
          <Tab>OFFICE LOG</Tab>
        </TabList>

        <TabPanels>
          <TabPanel style={{ padding: 0 }}>
            <ScreenOverview
              home={home} fh={fh} ac={ac} ph={ph} ti={ti} att={att} ri={ri}
              canInvoice={canInvoice} hrEnabled={hrEnabled}
            />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            {canWrite ? <Leads /> : null}
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenProjects ph={ph} ti={ti} att={att} billingReady={billingReady} canInvoice={canInvoice} />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenFinance fh={fh} ac={ac} canInvoice={canInvoice} canFees={canFees} home={home} />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenTeam ti={ti} att={att} hrEnabled={hrEnabled} />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenWorkQueue />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenApprovals ac={ac} home={home} />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenReports fh={fh} ph={ph} ri={ri} canInvoice={canInvoice} home={home} />
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <ScreenActivity />
          </TabPanel>
        </TabPanels>
      </Tabs>

    </div>
  );
}
