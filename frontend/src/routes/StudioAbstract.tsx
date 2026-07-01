/**
 * AORMS Studio Intelligence — home screen of the system.
 *
 * IBM Carbon dashboard layout: attention band · connected KPI grid ·
 * action items + zone health · project health · work + approvals.
 * Single scrolling page, no tabs. Pure Carbon components only.
 *
 * Route: /  (root)
 */
import {
  Column,
  Grid,
  ProgressBar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from "@carbon/react";
import { can, formatINRShort } from "@esti/contracts";
import { StatusSymbol } from "../components/dashboard/abstractShell.js";
import { STATE_WORD } from "../components/dashboard/zoneState.js";
import type { ZoneState } from "../components/dashboard/zoneState.js";
import { CAPACITY_LABEL } from "../components/dashboard/dashboardUi.js";
import { PageHeader } from "../components/PageHeader.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { useNavigate } from "react-router-dom";

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

// ── Health percentages ────────────────────────────────────────────────────────

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

// ── OVERVIEW TAB — cognitive command flow ────────────────────────────────────

function ScreenOverview({
  home, fh, ac, ph, ti, ri, canInvoice, hrEnabled,
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
  const attn   = deriveAttn({ cs, fs, ps, ts, pendingCount, maxWaitDays, riskProjects, overduePaise, billingReadyCount: billingReady.length, overloadedCount: overloaded.length });
  const officeState: ZoneState =
    cognitionState(office?.severity) !== "inactive"
      ? cognitionState(office?.severity)
      : attn.chainColor === ZCOLOR["critical"] ? "critical"
      : attn.chainColor === ZCOLOR["friction"] ? "friction"
      : attn.chainColor === ZCOLOR["watch"] ? "watch" : "stable";

  const tasksOverdue = ph.reduce((s: number, p: any) => s + (p.overdueTasks ?? 0), 0);
  const gst = gstStatus();

  // Top 4 KPI cards.
  const kpis: Kpi[] = [
    { label: "Projects Active",   value: ph.length },
    { label: "Invoices Pending",  value: overdueInvs.length, state: overdueInvs.length > 0 ? "friction" : "stable" },
    { label: "Approvals Pending", value: pendingCount,       state: pendingCount > 0 ? "watch" : "stable" },
    { label: "Tasks Overdue",     value: tasksOverdue,       state: tasksOverdue > 0 ? "friction" : "stable" },
  ];

  // Action-items table (folds Summary's GST + revisions rows in too).
  const rows: TableRowData[] = [
    ...overdueInvs.slice(0, 4).map((inv: any) => ({
      state: "critical" as ZoneState,
      cells: [`Overdue invoice ${inv.ref}`, formatINRShort(inv.netReceivablePaise), `${inv.daysOverdue}d`],
      href: `/projects/${inv.projectId}?tab=invoices&invoiceId=${inv.id}`,
    })),
    ...pending.slice(0, 5).map((ap: any) => ({
      state: (ap.daysWaiting > 14 ? "critical" : "friction") as ZoneState,
      cells: [`${ap.projectRef} — ${ap.title}`, "Approval pending", `${ap.daysWaiting}d`],
      href: `/projects/${ap.projectId}?tab=approvals&approvalId=${ap.id}`,
    })),
    ...riskProjects.slice(0, 5).map((p: any) => ({
      state: "critical" as ZoneState,
      cells: [`${p.ref} — ${p.title}`, "Delivery risk", "—"],
      href: projectIssueHref(p),
    })),
    ...(billingReady.length > 0
      ? [{ state: "watch" as ZoneState, cells: [`${billingReady.length} phase(s) ready to invoice`, "Billing", "—"], href: "/invoices" }]
      : []),
    { state: (gst.state === "stable" ? "stable" : gst.state) as ZoneState, cells: ["GST filing", gst.label, "—"], href: "/filing" },
    { state: "stable" as ZoneState, cells: ["Revisions logged", String(ri?.totalDecisions ?? 0), "—"], href: "/projects?tab=revisions" },
  ];

  return (
    <AbstractScreenShell
      title="Overview"
      state={officeState}
      signal={officeSignal(officeState).detail}
      kpis={kpis}
      tableTitle="ACTION ITEMS"
      headers={["Item", "Detail", "When"]}
      rows={rows}
      empty="No action items — the office is operating normally."
    />
  );
}

// ── PROJECTS TAB ──────────────────────────────────────────────────────────────

function ScreenProjects({
  ph, canInvoice,
}: {
  ph: any[]; ti: any[]; att: any; billingReady: any[]; canInvoice: boolean;
}) {
  const risk    = ph.filter((p: any) => p.health === "RED");
  const watch   = ph.filter((p: any) => p.health === "YELLOW");
  const delayed = ph.filter((p: any) => (p.overdueTasks ?? 0) > 0).length;
  const state   = projectState(ph.length, risk.length);

  const kpis: Kpi[] = [
    { label: "Projects Active", value: ph.length },
    { label: "Critical", value: risk.length, state: risk.length > 0 ? "critical" : "stable" },
    { label: "Watch", value: watch.length, state: watch.length > 0 ? "watch" : "stable" },
    { label: "Delayed", value: delayed, state: delayed > 0 ? "friction" : "stable" },
  ];

  const rows: TableRowData[] = [...risk, ...watch].slice(0, 20).map((p: any) => ({
    state: (p.health === "RED" ? "critical" : "watch") as ZoneState,
    cells: [
      `${p.ref} — ${p.title}`,
      p.currentPhase ?? "—",
      [
        p.overdueTasks > 0 ? `${p.overdueTasks} late` : null,
        p.staleApprovals > 0 ? `${p.staleApprovals} stale appr.` : null,
        canInvoice && p.overdueInvoices > 0 ? `${p.overdueInvoices} inv. overdue` : null,
      ].filter(Boolean).join(" · ") || "—",
      `${p.progressPct ?? 0}%`,
    ],
    href: projectIssueHref(p),
  }));

  return (
    <AbstractScreenShell
      title="Project"
      state={state}
      signal={projectSignal(state).detail}
      kpis={kpis}
      tableTitle="PROJECTS NEEDING ATTENTION"
      headers={["Project", "Phase", "Signals", "Progress"]}
      rows={rows}
      empty="No projects at risk. Delivery on track."
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
      <div className="esti-abstract">
        <Tile><span className="esti-label--secondary">Finance data requires the invoice:manage permission.</span></Tile>
      </div>
    );
  }

  const overdueInvs  = ac?.overdueInvoices    ?? [];
  const billingReady = ac?.billingReadyPhases ?? [];
  const gst          = gstStatus();
  const outstanding  = fh?.outstandingPaise ?? 0;
  const overdue      = fh?.overdue30dPaise  ?? 0;
  const ready        = fh?.readyToBillPaise ?? 0;
  const state        = financeState(outstanding, overdue, canInvoice);

  const kpis: Kpi[] = [
    { label: "Receivables", value: formatINRShort(outstanding) },
    { label: "Overdue Invoices", value: overdueInvs.length, state: overdueInvs.length > 0 ? "critical" : "stable" },
    { label: "Billing Ready", value: formatINRShort(ready), state: ready > 0 ? "watch" : "stable" },
    { label: "GST", value: gst.label, state: gst.state },
  ];

  const rows: TableRowData[] = [
    ...overdueInvs.slice(0, 20).map((inv: any) => ({
      state: (inv.daysOverdue > 30 ? "critical" : "friction") as ZoneState,
      cells: [`Overdue invoice ${inv.ref}`, formatINRShort(inv.netReceivablePaise), `${inv.daysOverdue}d`],
      href: `/projects/${inv.projectId}?tab=invoices&invoiceId=${inv.id}`,
    })),
    ...(billingReady.length > 0
      ? [{ state: "watch" as ZoneState, cells: [`${billingReady.length} phase(s) ready to invoice`, ready > 0 ? formatINRShort(ready) : "—", "—"], href: "/invoices" }]
      : []),
  ];

  return (
    <AbstractScreenShell
      title="Financial"
      state={state}
      signal={financeSignal(state).detail}
      kpis={kpis}
      tableTitle="OVERDUE & BILLING"
      headers={["Item", "Amount", "Age"]}
      rows={rows}
      empty="No invoices overdue. Collections on track."
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
      <div className="esti-abstract">
        <Tile><span className="esti-label--secondary">Team module requires HR to be enabled in settings.</span></Tile>
      </div>
    );
  }

  const overloaded = ti.filter((m: any) => m.capacity === "OVERLOADED");
  const teamLoadPct = ti.length > 0 ? Math.round(ti.reduce((s: number, m: any) => s + loadPct(m.capacity), 0) / ti.length) : 0;
  const state = teamState(overloaded.length, ti.length, hrEnabled);

  const kpis: Kpi[] = [
    { label: "Present Today", value: att?.present ?? "—" },
    { label: "Absent Today", value: att ? `${att.absent}/${att.headcount}` : "—" },
    { label: "Overloaded", value: overloaded.length, state: overloaded.length > 0 ? "critical" : "stable" },
    { label: "Team Load", value: `${teamLoadPct}%`, state: teamLoadPct > 85 ? "friction" : teamLoadPct > 70 ? "watch" : "stable" },
  ];

  const rows: TableRowData[] = ti.slice(0, 20).map((m: any) => ({
    state: (m.capacity === "OVERLOADED" ? "critical" : m.capacity === "BUSY" ? "watch" : "stable") as ZoneState,
    cells: [m.assignee, `${m.totalOpen} open`, `${m.overdueCount ?? 0} late`, CAPACITY_LABEL[m.capacity] ?? m.capacity],
    href: taskHref(m.focusTaskId, m.focusProjectId),
  }));

  return (
    <AbstractScreenShell
      title="Team"
      state={state}
      signal={teamSignal(state).detail}
      kpis={kpis}
      tableTitle="CAPACITY"
      headers={["Member", "Open", "Late", "Capacity"]}
      rows={rows}
      empty="No team data available."
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

  const kpis: Kpi[] = [
    { label: "Pending", value: pendingCount, state: pendingCount > 0 ? "watch" : "stable" },
    { label: "Stale (>10d)", value: stale, state: stale > 0 ? "friction" : "stable" },
    { label: "Oldest Wait", value: `${maxWait}d`, state: maxWait > 14 ? "critical" : maxWait > 7 ? "friction" : "stable" },
    { label: "All Clear", value: pendingCount === 0 ? "Yes" : "No", state: pendingCount === 0 ? "stable" : "watch" },
  ];

  const rows: TableRowData[] = pending.slice(0, 20).map((ap: any) => ({
    state: (ap.daysWaiting > 14 ? "critical" : ap.daysWaiting > 7 ? "friction" : "watch") as ZoneState,
    cells: [`${ap.projectRef} — ${ap.title}`, `${ap.daysWaiting}d`],
    href: `/projects/${ap.projectId}?tab=approvals&approvalId=${ap.id}`,
  }));

  return (
    <AbstractScreenShell
      title="Approval"
      state={state}
      signal={clientSignal(state).detail}
      kpis={kpis}
      tableTitle="PENDING APPROVALS"
      headers={["Approval", "Waiting"]}
      rows={rows}
      empty="No approvals pending. All client responses received."
    />
  );
}

// ── REPORTS TAB ───────────────────────────────────────────────────────────────

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

// Dashboard sidebar (STUDIO screen only): AI recommendation on top (~30%) over the
// last 10 office-log events (record history, spec §8.8). Not a tab.
function DashboardSidebar({ home }: { home: any }) {
  const interventions = home?.cognition?.interventions ?? [];
  const primary = interventions[0];
  const logQ = trpc.activity.listOffice.useQuery({ limit: 10, visibility: "STAFF" }, { staleTime: 30_000 });
  const rows = logQ.data?.rows ?? [];

  return (
    <div className="esti-dash-aside">
      <Tile className="esti-dash-aside__ai">
        <Stack gap={3}>
          <span className="esti-label esti-label--secondary">AI RECOMMENDATION</span>
          {primary ? (
            <>
              <p>{primary.title}</p>
              {primary.suggestedAction && (
                <span className="esti-label--secondary">{primary.suggestedAction}</span>
              )}
            </>
          ) : (
            <span className="esti-label--secondary">No recommendation — the office is operating normally.</span>
          )}
        </Stack>
      </Tile>
      <Tile className="esti-dash-aside__log">
        <Stack gap={4}>
          <span className="esti-label esti-label--secondary">OFFICE LOG · LAST 10</span>
          {rows.length === 0 ? (
            <span className="esti-label--secondary">No recent office activity.</span>
          ) : (
            <Stack gap={3}>
              {rows.slice(0, 10).map((a) => (
                <div key={a.id} className="esti-log-item">
                  <span>{a.summary}</span>
                  <span className="esti-label--helper">
                    {a.actorName ?? "System"}
                    {a.projectRef ? ` · ${a.projectRef}` : ""} · {relTime(a.createdAt)}
                  </span>
                </div>
              ))}
            </Stack>
          )}
        </Stack>
      </Tile>
    </div>
  );
}

// ── WORK QUEUE TAB ────────────────────────────────────────────────────────────

function ScreenWorkQueue() {
  const queueQ = trpc.tasks.todayQueue.useQuery({ myTasks: false, limit: 25 }, { staleTime: 30_000 });
  const tasks  = queueQ.data ?? [];
  const today  = new Date().toISOString().slice(0, 10);
  const overdue  = tasks.filter((t) => t.dueDate && t.dueDate < today).length;
  const dueToday = tasks.filter((t) => t.dueDate === today).length;
  const blocked  = tasks.filter((t) => t.status === "BLOCKED").length;
  const state: ZoneState = blocked > 0 || overdue > 5 ? "friction" : overdue > 0 ? "watch" : "stable";

  const kpis: Kpi[] = [
    { label: "Open Tasks", value: tasks.length },
    { label: "Due Today", value: dueToday, state: dueToday > 0 ? "watch" : "stable" },
    { label: "Overdue", value: overdue, state: overdue > 0 ? "friction" : "stable" },
    { label: "Blocked", value: blocked, state: blocked > 0 ? "critical" : "stable" },
  ];

  const rows: TableRowData[] = tasks.slice(0, 25).map((t) => ({
    state: (t.status === "BLOCKED" ? "critical" : t.priority === "CRITICAL" || t.priority === "HIGH" ? "friction" : "watch") as ZoneState,
    cells: [t.title, t.projectRef ?? "—", t.dueDate ?? "—", t.status],
    href: taskHref(t.id),
  }));

  return (
    <AbstractScreenShell
      title="Work"
      state={state}
      signal={`${tasks.length} tasks · ${overdue} overdue · ${blocked} blocked`}
      kpis={kpis}
      tableTitle="TASK QUEUE"
      headers={["Task", "Project", "Due", "Status"]}
      rows={rows}
      empty="No active tasks in the queue."
    />
  );
}

// ── Tag type helper ─────────────────────────────────────────────────────────

function tagKind(state: ZoneState): "green" | "warm-gray" | "magenta" | "red" | "gray" {
  if (state === "stable")   return "green";
  if (state === "watch")    return "warm-gray";
  if (state === "friction") return "magenta";
  if (state === "critical") return "red";
  return "gray";
}

// ── Studio Intelligence shell ───────────────────────────────────────────────

export function StudioAbstract() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const homeQ     = trpc.dashboard.home.useQuery(undefined, { staleTime: 60_000 });
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const tiQ       = trpc.dashboard.teamIntelligence.useQuery(undefined, { enabled: hrEnabled });
  const attQ      = trpc.dashboard.attendanceToday.useQuery(undefined, { enabled: hrEnabled });
  const queueQ    = trpc.tasks.todayQueue.useQuery({ myTasks: false, limit: 20 }, { staleTime: 30_000 });

  const home = homeQ.data;
  const ac   = home?.actionCenter;
  const fh   = home?.financialHealth ?? null;
  const ph   = home?.projectHealth   ?? [];
  const ri   = home?.revisionIntelligence ?? null;
  const ti   = tiQ.data  ?? [];
  const att  = attQ.data ?? null;
  const tasks = queueQ.data ?? [];

  const canInvoice = can(user?.role, "invoice:manage");
  const canWrite   = can(user?.role, "write");

  // ── Zone state derivation ──────────────────────────────────────────────
  const pending      = ac?.pendingApprovals   ?? [];
  const pendingCount = pending.length;
  const maxWaitDays  = pendingCount > 0 ? Math.max(...pending.map((a: any) => a.daysWaiting ?? 0)) : 0;
  const overdueInvs  = ac?.overdueInvoices      ?? [];
  const billingReady = ac?.billingReadyPhases    ?? [];
  const overduePaise = fh?.overdue30dPaise ?? 0;
  const riskProjects = ph.filter((p: any) => p.health === "RED");
  const watchProjects = ph.filter((p: any) => p.health === "YELLOW");
  const atRiskProjects = [...riskProjects, ...watchProjects];
  const overloaded   = ti.filter((m: any) => m.capacity === "OVERLOADED");

  const cs = clientState(pendingCount, maxWaitDays);
  const fs = financeState(fh?.outstandingPaise ?? 0, overduePaise, canInvoice);
  const ps = projectState(ph.length, riskProjects.length);
  const ts = teamState(overloaded.length, ti.length, hrEnabled);

  const attn = deriveAttn({
    cs, fs, ps, ts, pendingCount, maxWaitDays, riskProjects, overduePaise,
    billingReadyCount: billingReady.length, overloadedCount: overloaded.length,
  });

  const officeState: ZoneState =
    attn.chainColor === ZCOLOR["critical"] ? "critical" :
    attn.chainColor === ZCOLOR["friction"] ? "friction" :
    attn.chainColor === ZCOLOR["watch"]    ? "watch" : "stable";

  // ── Unified action items ───────────────────────────────────────────────
  type ActionRow = { key: string; item: string; detail: string; when: string; href?: string; state: ZoneState };
  const actionRows: ActionRow[] = [
    ...overdueInvs.slice(0, 5).map((inv: any): ActionRow => ({
      key: `inv-${inv.id}`,
      item: `Invoice ${inv.ref}`,
      detail: formatINRShort(inv.netReceivablePaise),
      when: `${inv.daysOverdue}d overdue`,
      href: `/projects/${inv.projectId}?tab=invoices&invoiceId=${inv.id}`,
      state: inv.daysOverdue > 30 ? "critical" : "friction",
    })),
    ...pending.slice(0, 5).map((ap: any): ActionRow => ({
      key: `ap-${ap.id}`,
      item: `${ap.projectRef} — ${ap.title}`,
      detail: "Approval pending",
      when: `${ap.daysWaiting}d`,
      href: `/projects/${ap.projectId}?tab=approvals&approvalId=${ap.id}`,
      state: ap.daysWaiting > 14 ? "critical" : "friction",
    })),
    ...riskProjects.slice(0, 5).map((p: any): ActionRow => ({
      key: `proj-${p.id}`,
      item: `${p.ref} — ${p.title}`,
      detail: "Delivery risk",
      when: "—",
      href: projectIssueHref(p),
      state: "critical",
    })),
    ...(billingReady.length > 0 ? [{
      key: "billing-ready",
      item: `${billingReady.length} phase${billingReady.length > 1 ? "s" : ""} ready to invoice`,
      detail: fh?.readyToBillPaise ? formatINRShort(fh.readyToBillPaise) : "—",
      when: "—",
      href: "/invoices",
      state: "watch" as ZoneState,
    }] : []),
  ];

  // ── KPIs ───────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const tasksOverdue = tasks.filter((t) => t.dueDate && t.dueDate < today).length;
  const teamLoadPct  = ti.length > 0
    ? Math.round(ti.reduce((s: number, m: any) => s + ({ OVERLOADED: 95, HIGH: 75, MODERATE: 55, AVAILABLE: 30 }[m.capacity] ?? 50), 0) / ti.length)
    : 0;

  const kpis = [
    { label: "Active Projects",  value: ph.length,               state: ps !== "stable" ? ps : undefined },
    { label: "Overdue Invoices", value: overdueInvs.length,      state: overdueInvs.length > 0 ? ("critical" as ZoneState) : undefined },
    { label: "Approvals Pending", value: pendingCount,           state: pendingCount > 0 ? ("watch" as ZoneState) : undefined },
    { label: "Tasks Overdue",    value: tasksOverdue,             state: tasksOverdue > 0 ? ("friction" as ZoneState) : undefined },
  ];

  const zones = [
    { label: "Client",   state: cs, signal: clientSignal(cs)  },
    { label: "Finance",  state: fs, signal: financeSignal(fs) },
    { label: "Projects", state: ps, signal: projectSignal(ps) },
    ...(hrEnabled ? [{ label: "Team", state: ts, signal: teamSignal(ts) }] : []),
  ];

  const gst = gstStatus();

  return (
    <Stack gap={6} className="esti-studio-abstract-page">

      {/* ── Page title ──────────────────────────────────────────────────── */}
      <PageHeader
        title="Studio Intelligence"
        description="Practice health · action items · project, finance and team signals"
      />

      {/* ── Attention band ──────────────────────────────────────────────── */}
      <Tile>
        <Stack orientation="horizontal" gap={5}>
          <StatusSymbol state={officeState} />
          <Stack gap={2} className="esti-grow">
            <p>{attn.issue}</p>
            <p className="esti-label--helper">{attn.action}</p>
          </Stack>
          <Tag type={tagKind(officeState)} size="md">
            {STATE_WORD[officeState]}
          </Tag>
        </Stack>
      </Tile>

      {/* ── Connected KPI grid ──────────────────────────────────────────── */}
      <Grid narrow className="esti-kpi-grid">
        {kpis.map((k) => (
          <Column key={k.label} sm={2} md={2} lg={4}>
            <Tile>
              <Stack gap={2}>
                <span className="esti-label--helper">{k.label}</span>
                <Stack orientation="horizontal" gap={3}>
                  <h3>{k.value}</h3>
                  {k.state && k.state !== "stable" && <StatusSymbol state={k.state} sm />}
                </Stack>
              </Stack>
            </Tile>
          </Column>
        ))}
      </Grid>

      {/* ── Masonry grid — all content tiles pack vertically without gaps ── */}
      <div className="esti-dash-masonry">

        {/* Action items — primary content, column 1 top */}
        <Tile>
          <Stack gap={4}>
            <span className="esti-label esti-label--secondary">ACTION ITEMS</span>
            {actionRows.length === 0 ? (
              <Stack orientation="horizontal" gap={3}>
                <StatusSymbol state="stable" sm />
                <p className="esti-label--secondary">No action items — the office is operating normally.</p>
              </Stack>
            ) : (
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Item</TableHeader>
                    <TableHeader>Detail</TableHeader>
                    <TableHeader>Age</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {actionRows.map((row) => (
                    <TableRow
                      key={row.key}
                      className={row.href ? "esti-row-clickable" : undefined}
                      onClick={row.href ? () => navigate(row.href!) : undefined}
                    >
                      <TableCell>
                        <Stack orientation="horizontal" gap={3}>
                          <StatusSymbol state={row.state} sm />
                          <span>{row.item}</span>
                        </Stack>
                      </TableCell>
                      <TableCell>{row.detail}</TableCell>
                      <TableCell>{row.when}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>
        </Tile>

        {/* Zone health — compact signals tile, column 2 top */}
        <Tile>
          <Stack gap={5}>
            <span className="esti-label esti-label--secondary">ZONE HEALTH</span>
            {zones.map((z) => (
              <Stack key={z.label} orientation="horizontal" gap={3}>
                <StatusSymbol state={z.state} sm />
                <Stack gap={1} className="esti-grow">
                  <span className="esti-label">{z.label}</span>
                  <span className="esti-label--helper">{z.signal.value}</span>
                </Stack>
                <Tag type={tagKind(z.state)} size="sm">{STATE_WORD[z.state]}</Tag>
              </Stack>
            ))}
          </Stack>
        </Tile>

        {/* GST filing */}
        <Tile>
          <Stack gap={3}>
            <span className="esti-label esti-label--secondary">GST FILING</span>
            <Stack orientation="horizontal" gap={3}>
              <StatusSymbol state={gst.state} sm />
              <span className="esti-label esti-grow">
                {gst.state === "stable" ? "On schedule" : `Due in ${gst.daysUntil} days`}
              </span>
              <Tag type={tagKind(gst.state)} size="sm">{gst.label}</Tag>
            </Stack>
          </Stack>
        </Tile>

        {/* Revisions */}
        {ri && (
          <Tile>
            <Stack gap={3}>
              <span className="esti-label esti-label--secondary">REVISIONS</span>
              <Stack orientation="horizontal" gap={3}>
                <span className="esti-label esti-grow">{ri.totalDecisions ?? 0} logged this cycle</span>
                {(ri.clientDrivenPct ?? 0) > 60 && (
                  <Tag type="magenta" size="sm">{ri.clientDrivenPct}% client-driven</Tag>
                )}
              </Stack>
            </Stack>
          </Tile>
        )}

        {/* Project health — large, conditional */}
        {atRiskProjects.length > 0 && (
          <Tile>
            <Stack gap={4}>
              <Stack orientation="horizontal" gap={5} className="esti-zone-head">
                <Stack orientation="horizontal" gap={3} className="esti-grow">
                  <StatusSymbol state={ps} />
                  <span className="esti-label esti-label--secondary">
                    PROJECT HEALTH — {riskProjects.length} critical · {watchProjects.length} watch
                  </span>
                </Stack>
                <Tag type={tagKind(ps)} size="sm">{projectSignal(ps).value}</Tag>
              </Stack>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Project</TableHeader>
                    <TableHeader>Phase</TableHeader>
                    <TableHeader>Signals</TableHeader>
                    <TableHeader>Progress</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {atRiskProjects.slice(0, 12).map((p: any) => (
                    <TableRow
                      key={p.id}
                      className="esti-row-clickable"
                      onClick={() => navigate(projectIssueHref(p))}
                    >
                      <TableCell>
                        <Stack orientation="horizontal" gap={3}>
                          <StatusSymbol state={p.health === "RED" ? "critical" : "watch"} sm />
                          <span>{p.ref} — {p.title}</span>
                        </Stack>
                      </TableCell>
                      <TableCell>{p.currentPhase ?? "—"}</TableCell>
                      <TableCell className="esti-label--secondary">
                        {[
                          p.overdueTasks > 0 ? `${p.overdueTasks} late` : null,
                          p.staleApprovals > 0 ? `${p.staleApprovals} stale` : null,
                          canInvoice && p.overdueInvoices > 0 ? `${p.overdueInvoices} inv` : null,
                        ].filter(Boolean).join(" · ") || "—"}
                      </TableCell>
                      <TableCell style={{ minWidth: "8rem" }}>
                        <ProgressBar
                          value={p.progressPct ?? 0}
                          max={100}
                          size="small"
                          hideLabel
                          status={p.health === "RED" ? "error" : p.health === "YELLOW" ? "active" : "finished"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </Tile>
        )}

        {/* Work queue */}
        <Tile>
          <Stack gap={4}>
            <Stack orientation="horizontal" gap={3} className="esti-zone-head">
              <span className="esti-label esti-label--secondary esti-grow">WORK QUEUE</span>
              <Tag type={tasksOverdue > 0 ? "warm-gray" : "green"} size="sm">
                {tasks.length} open · {tasksOverdue} overdue
              </Tag>
            </Stack>
            {tasks.length === 0 ? (
              <p className="esti-label--secondary">No active tasks.</p>
            ) : (
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Task</TableHeader>
                    <TableHeader>Project</TableHeader>
                    <TableHeader>Due</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.slice(0, 8).map((t) => (
                    <TableRow
                      key={t.id}
                      className="esti-row-clickable"
                      onClick={() => navigate(taskHref(t.id))}
                    >
                      <TableCell>
                        <Stack orientation="horizontal" gap={3}>
                          <StatusSymbol
                            state={t.status === "BLOCKED" ? "critical" : t.dueDate && t.dueDate < today ? "friction" : "watch"}
                            sm
                          />
                          <span>{t.title}</span>
                        </Stack>
                      </TableCell>
                      <TableCell>{t.projectRef ?? "—"}</TableCell>
                      <TableCell>{t.dueDate ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>
        </Tile>

        {/* Approvals */}
        <Tile>
          <Stack gap={4}>
            <Stack orientation="horizontal" gap={3} className="esti-zone-head">
              <span className="esti-label esti-label--secondary esti-grow">APPROVALS</span>
              <Tag type={pendingCount > 0 ? tagKind(cs) : "green"} size="sm">
                {pendingCount} pending
              </Tag>
            </Stack>
            {pending.length === 0 ? (
              <p className="esti-label--secondary">No approvals pending.</p>
            ) : (
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Item</TableHeader>
                    <TableHeader>Waiting</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pending.slice(0, 8).map((ap: any) => (
                    <TableRow
                      key={ap.id}
                      className="esti-row-clickable"
                      onClick={() => navigate(`/projects/${ap.projectId}?tab=approvals&approvalId=${ap.id}`)}
                    >
                      <TableCell>
                        <Stack orientation="horizontal" gap={3}>
                          <StatusSymbol state={ap.daysWaiting > 14 ? "critical" : "watch"} sm />
                          <span>{ap.projectRef} — {ap.title}</span>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Tag type={ap.daysWaiting > 14 ? "red" : ap.daysWaiting > 7 ? "magenta" : "warm-gray"} size="sm">
                          {ap.daysWaiting}d
                        </Tag>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>
        </Tile>

        {/* Team capacity */}
        {hrEnabled && ti.length > 0 && (
          <Tile>
            <Stack gap={4}>
              <Stack orientation="horizontal" gap={3} className="esti-zone-head">
                <StatusSymbol state={ts} />
                <span className="esti-label esti-label--secondary esti-grow">
                  TEAM CAPACITY — {att ? `${att.present}/${att.headcount} present` : `${ti.length} members`}
                </span>
                <Tag type={tagKind(ts)} size="sm">{teamSignal(ts).value}</Tag>
              </Stack>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Member</TableHeader>
                    <TableHeader>Open</TableHeader>
                    <TableHeader>Late</TableHeader>
                    <TableHeader>Load</TableHeader>
                    <TableHeader>Capacity</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ti.slice(0, 10).map((m: any) => {
                    const mState: ZoneState = m.capacity === "OVERLOADED" ? "critical" : m.capacity === "HIGH" ? "watch" : "stable";
                    return (
                      <TableRow key={m.memberId ?? m.assignee}>
                        <TableCell>{m.assignee}</TableCell>
                        <TableCell>{m.totalOpen}</TableCell>
                        <TableCell>
                          {(m.overdueCount ?? 0) > 0
                            ? <Tag type="magenta" size="sm">{m.overdueCount}</Tag>
                            : "—"
                          }
                        </TableCell>
                        <TableCell style={{ minWidth: "6rem" }}>
                          <ProgressBar
                            value={loadPct(m.capacity)}
                            max={100}
                            size="small"
                            hideLabel
                            status={mState === "critical" ? "error" : mState === "watch" ? "active" : "finished"}
                          />
                        </TableCell>
                        <TableCell>
                          <Tag type={tagKind(mState)} size="sm">
                            {CAPACITY_LABEL[m.capacity] ?? m.capacity}
                          </Tag>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Stack>
          </Tile>
        )}

      </div>

    </Stack>
  );
}
