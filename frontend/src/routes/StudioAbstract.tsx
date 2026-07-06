/**
 * AORMS Studio Intelligence — home screen of the system.
 *
 * Material UI + MUI X dashboard: attention banner · KPI cards · module launcher ·
 * billed-vs-collected chart (x-charts) · side signal panels · DataGrids for action
 * items, project health, work queue, approvals and team capacity. Liquid-glass
 * surface (dark g100). Route: /  (root)
 */
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { LineChart } from "@mui/x-charts/LineChart";
import {
  Bot,
  Building,
  Catalog,
  Document,
  Partnership,
  Receipt,
  TaskComplete,
  UserMultiple,
} from "@carbon/icons-react";
import type { CarbonIconType } from "@carbon/icons-react";
import type { ReactNode } from "react";
import { can, formatINRShort } from "@esti/contracts";
import { OfficeHealthGlyph } from "../components/shell/OfficeHealthGlyph.js";
import { STATE_WORD } from "../components/dashboard/zoneState.js";
import type { ZoneState } from "../components/dashboard/zoneState.js";
import { CAPACITY_LABEL } from "../components/dashboard/dashboardUi.js";
import { PageHeader } from "../components/PageHeader.js";
import { confidenceTag } from "../components/work/workHelpers.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { useNavigate } from "react-router-dom";

// ── Zone state ────────────────────────────────────────────────────────────────

const ZCOLOR: Record<ZoneState, string> = {
  stable:   "var(--cds-support-success)",
  watch:    "var(--cds-support-warning)",
  friction: "var(--cds-support-warning-minor)",
  critical: "var(--cds-support-error)",
  inactive: "var(--cds-text-disabled)",
};

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

interface AttnResult { issue: string; action: string; chainColor: string }

function deriveAttn({
  cs, fs, ps, ts, pendingCount, maxWaitDays, riskProjects,
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
      chainColor: ZCOLOR["friction"],
    };
  if (pendingCount > 0 && riskProjects.length > 0)
    return {
      issue:  `Client approval pending ${maxWaitDays > 0 ? `(${maxWaitDays}d oldest)` : ""} — ${riskProjects.length} project${riskProjects.length > 1 ? "s" : ""} at delivery risk`,
      action: "Follow up on client response to unblock delivery",
      chainColor: ZCOLOR[cs === "critical" ? "critical" : "friction"],
    };
  if (fs === "critical" || fs === "friction")
    return {
      issue:  `${formatINRShort(overduePaise)} overdue — collection delay increasing`,
      action: "Contact clients on overdue invoices before end of week",
      chainColor: ZCOLOR[fs],
    };
  if (overloadedCount > 0 && riskProjects.length > 0)
    return {
      issue:  `${overloadedCount} member${overloadedCount > 1 ? "s" : ""} overloaded — delivery risk spreading to ${riskProjects.length} project${riskProjects.length > 1 ? "s" : ""}`,
      action: "Redistribute task load before delivery deadlines",
      chainColor: ZCOLOR[ts],
    };
  if (cs === "watch" || fs === "watch" || ps === "watch" || ts === "watch") {
    const which = [cs==="watch"&&"CLIENT", fs==="watch"&&"FINANCE", ps==="watch"&&"PROJECT", ts==="watch"&&"TEAM"].filter(Boolean).join(" + ");
    return {
      issue:  `${which} signals at watch level — monitor for escalation`,
      action: "Review flagged items before end of day",
      chainColor: ZCOLOR["watch"],
    };
  }
  return {
    issue:  "Practice operating normally. No immediate intervention required.",
    action: "Review weekly performance and plan next sprint",
    chainColor: ZCOLOR["stable"],
  };
}

// ── Signal copy ───────────────────────────────────────────────────────────────

function clientSignal(state: ZoneState): string {
  return { stable: "Responsive", watch: "Waiting", friction: "Approval blocking", critical: "Escalate today", inactive: "No client signal" }[state];
}
function financeSignal(state: ZoneState): string {
  return { stable: "Cash flow stable", watch: "Follow-up pending", friction: "Recovery delayed", critical: "Recover payment", inactive: "Finance restricted" }[state];
}
function projectSignal(state: ZoneState): string {
  return { stable: "On track", watch: "Starting to slow", friction: "Waiting on dependency", critical: "Intervention needed", inactive: "No project signal" }[state];
}
function teamSignal(state: ZoneState): string {
  return { stable: "Workload balanced", watch: "Team is busy", friction: "Load is uneven", critical: "Team bottlenecked", inactive: "No team signal" }[state];
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

// ── Chip helpers (exact Carbon tag colours over the g100 tokens) ──────────────

function tagKind(state: ZoneState): "green" | "warm-gray" | "magenta" | "red" | "gray" {
  if (state === "stable")   return "green";
  if (state === "watch")    return "warm-gray";
  if (state === "friction") return "magenta";
  if (state === "critical") return "red";
  return "gray";
}

const chipSx = (color: string) => ({
  backgroundColor: `var(--cds-tag-background-${color})`,
  color: `var(--cds-tag-color-${color})`,
});

function ZoneChip({ state, label }: { state: ZoneState; label?: string }) {
  return <Chip size="small" label={label ?? STATE_WORD[state]} sx={chipSx(tagKind(state))} />;
}

// ── Card scaffold ─────────────────────────────────────────────────────────────

function SectionCard({
  title, action, children,
}: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card sx={{ height: 1 }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
          <Typography variant="overline" color="text.secondary" sx={{ flex: 1, letterSpacing: 1 }}>
            {title}
          </Typography>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

const GRID_SX = {
  border: 0,
  "& .MuiDataGrid-columnHeaders": { textTransform: "uppercase" },
  "& .MuiDataGrid-row": { cursor: "pointer" },
} as const;

const gridProps = {
  density: "compact" as const,
  autoHeight: true,
  hideFooter: true,
  disableColumnMenu: true,
  disableRowSelectionOnClick: true,
  sx: GRID_SX,
};

const glyphCell = (state: ZoneState, text: ReactNode) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: "center", height: 1 }}>
    <OfficeHealthGlyph state={state} size={10} />
    <span>{text}</span>
  </Stack>
);

// ── Module launcher ───────────────────────────────────────────────────────────

type LauncherApp = {
  label: string;
  route: string;
  icon: CarbonIconType;
  count: (h: any, g: any) => number | null;
  subtitle: ((n: number) => string) | null;
};

const LAUNCHER_APPS: LauncherApp[] = [
  { label: "Projects", route: "/projects", icon: Building, count: (h) => h.summary?.projects?.byStatus?.ACTIVE ?? h.summary?.projects?.total ?? null, subtitle: (n) => `${n} active` },
  { label: "Tasks", route: "/tasks", icon: TaskComplete, count: (_h, g) => g?.pendingTasks ?? null, subtitle: (n) => `${n} open` },
  { label: "Invoices", route: "/invoices", icon: Receipt, count: (h) => h.actionCenter?.overdueInvoices?.length ?? null, subtitle: (n) => `${n} overdue` },
  { label: "Clients", route: "/clients", icon: Partnership, count: (h) => h.clientIntelligence?.length ?? null, subtitle: (n) => `${n} active` },
  { label: "Proposals", route: "/office/proposals", icon: Document, count: (h) => h.summary?.proposals?.total ?? null, subtitle: (n) => `${n} total` },
  { label: "Team", route: "/team", icon: UserMultiple, count: (h) => h.summary?.hr?.headcount ?? null, subtitle: (n) => `${n} members` },
  { label: "Library", route: "/knowledge-bank", icon: Catalog, count: () => null, subtitle: null },
  { label: "AI Studio", route: "/office/ai-studio", icon: Bot, count: () => null, subtitle: null },
];

// ── Studio Intelligence ───────────────────────────────────────────────────────

export function StudioAbstract() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const homeQ     = trpc.dashboard.home.useQuery(undefined, { staleTime: 60_000 });
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const tiQ       = trpc.dashboard.teamIntelligence.useQuery(undefined, { enabled: hrEnabled });
  const attQ      = trpc.dashboard.attendanceToday.useQuery(undefined, { enabled: hrEnabled });
  const queueQ    = trpc.tasks.todayQueue.useQuery({ myTasks: false, limit: 20 }, { staleTime: 30_000 });
  const glanceQ   = trpc.dashboard.todayGlance.useQuery(undefined, { staleTime: 60_000 });
  const trendQ    = trpc.dashboard.trend.useQuery(undefined, { staleTime: 300_000 });

  const home = homeQ.data;
  const ac   = home?.actionCenter;
  const fh   = home?.financialHealth ?? null;
  const ph   = home?.projectHealth   ?? [];
  const ri   = home?.revisionIntelligence ?? null;
  const ti   = tiQ.data  ?? [];
  const att  = attQ.data ?? null;
  const tasks = queueQ.data ?? [];

  const canInvoice = can(user?.role, "invoice:manage");

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

  const today = new Date().toISOString().slice(0, 10);
  const tasksOverdue = tasks.filter((t) => t.dueDate && t.dueDate < today).length;

  const zones = [
    { label: "Client",   state: cs, signal: clientSignal(cs)  },
    { label: "Finance",  state: fs, signal: financeSignal(fs) },
    { label: "Projects", state: ps, signal: projectSignal(ps) },
    ...(hrEnabled ? [{ label: "Team", state: ts, signal: teamSignal(ts) }] : []),
  ];

  const gst = gstStatus();

  const heroKpis: { label: string; value: string; sub: string; danger: string | null }[] =
    canInvoice && fh
      ? [
          { label: "Pipeline", value: formatINRShort(fh.pipelinePaise), sub: `Active ${formatINRShort(fh.activePipelinePaise)}`, danger: null },
          { label: "Outstanding", value: formatINRShort(fh.outstandingPaise), sub: "Receivable", danger: fh.overdue30dPaise > 0 ? `${formatINRShort(fh.overdue30dPaise)} overdue` : null },
          { label: "Collected", value: formatINRShort(fh.collectedFyPaise), sub: `FY ${String(fh.fyStart).slice(0, 4)}`, danger: null },
          { label: "Ready to bill", value: formatINRShort(fh.readyToBillPaise), sub: `${billingReady.length} phase${billingReady.length === 1 ? "" : "s"}`, danger: null },
        ]
      : [
          { label: "Active Projects", value: String(ph.length), sub: "In delivery", danger: null },
          { label: "Overdue Invoices", value: String(overdueInvs.length), sub: "To chase", danger: overdueInvs.length > 0 ? "Action needed" : null },
          { label: "Approvals Pending", value: String(pendingCount), sub: "Awaiting client", danger: null },
          { label: "Tasks Overdue", value: String(tasksOverdue), sub: "Past due", danger: tasksOverdue > 0 ? "Behind" : null },
        ];

  // Top risks
  const clientRisks = (home?.clientIntelligence ?? []).filter((c: any) => c.risk === "HIGH");
  const topRisks = [
    ...riskProjects.map((p: any) => ({ key: `rp-${p.id}`, label: `${p.ref} — ${p.title}`, detail: "Delivery at risk", state: "critical" as ZoneState, href: projectIssueHref(p) })),
    ...watchProjects.slice(0, 3).map((p: any) => ({ key: `wp-${p.id}`, label: `${p.ref} — ${p.title}`, detail: "Needs watching", state: "watch" as ZoneState, href: projectIssueHref(p) })),
    ...clientRisks.slice(0, 3).map((c: any) => ({ key: `cr-${c.id}`, label: c.name, detail: `${c.oldestInvoiceDays ?? 0}d oldest invoice`, state: "friction" as ZoneState, href: "/clients" })),
  ].slice(0, 7);

  // Action items
  const actionRows = [
    ...overdueInvs.slice(0, 5).map((inv: any) => ({ id: `inv-${inv.id}`, item: `Invoice ${inv.ref}`, detail: formatINRShort(inv.netReceivablePaise), when: `${inv.daysOverdue}d overdue`, href: `/projects/${inv.projectId}?tab=invoices&invoiceId=${inv.id}`, state: (inv.daysOverdue > 30 ? "critical" : "friction") as ZoneState })),
    ...pending.slice(0, 5).map((ap: any) => ({ id: `ap-${ap.id}`, item: `${ap.projectRef} — ${ap.title}`, detail: "Approval pending", when: `${ap.daysWaiting}d`, href: `/projects/${ap.projectId}?tab=approvals&approvalId=${ap.id}`, state: (ap.daysWaiting > 14 ? "critical" : "friction") as ZoneState })),
    ...riskProjects.slice(0, 5).map((p: any) => ({ id: `proj-${p.id}`, item: `${p.ref} — ${p.title}`, detail: "Delivery risk", when: "—", href: projectIssueHref(p), state: "critical" as ZoneState })),
    ...(billingReady.length > 0 ? [{ id: "billing-ready", item: `${billingReady.length} phase${billingReady.length > 1 ? "s" : ""} ready to invoice`, detail: fh?.readyToBillPaise ? formatINRShort(fh.readyToBillPaise) : "—", when: "—", href: "/invoices", state: "watch" as ZoneState }] : []),
  ];

  // Trend
  const trend = trendQ.data;
  const months = (trend?.series ?? []).map((r) => r.month);
  const billed = (trend?.series ?? []).map((r) => r.billedPaise / 100);
  const collected = (trend?.series ?? []).map((r) => r.collectedPaise / 100);
  const showTrend = Boolean(trend && trend.financialEnabled && months.length > 0);

  // ── DataGrid column definitions ─────────────────────────────────────────────
  const actionCols: GridColDef[] = [
    { field: "item", headerName: "Item", flex: 2, minWidth: 200, renderCell: (p) => glyphCell(p.row.state, p.row.item) },
    { field: "detail", headerName: "Detail", flex: 1, minWidth: 120 },
    { field: "when", headerName: "Age", width: 120 },
  ];

  const phRows = atRiskProjects.slice(0, 12).map((p: any) => ({ ...p, id: p.id }));
  const phCols: GridColDef[] = [
    { field: "title", headerName: "Project", flex: 2, minWidth: 200, renderCell: (p) => glyphCell(p.row.health === "RED" ? "critical" : "watch", `${p.row.ref} — ${p.row.title}`) },
    { field: "currentPhase", headerName: "Phase", flex: 1, minWidth: 110, valueGetter: (v) => v ?? "—" },
    { field: "signals", headerName: "Signals", flex: 1, minWidth: 120, valueGetter: (_v, row: any) => [row.overdueTasks > 0 ? `${row.overdueTasks} late` : null, row.staleApprovals > 0 ? `${row.staleApprovals} stale` : null, canInvoice && row.overdueInvoices > 0 ? `${row.overdueInvoices} inv` : null].filter(Boolean).join(" · ") || "—" },
    { field: "progressPct", headerName: "Progress", width: 150, sortable: false, renderCell: (p) => (
      <Box sx={{ width: 1, display: "flex", alignItems: "center", height: 1 }}>
        <LinearProgress variant="determinate" value={p.row.progressPct ?? 0} color={p.row.health === "RED" ? "error" : p.row.health === "YELLOW" ? "warning" : "success"} sx={{ width: 1 }} />
      </Box>
    ) },
  ];

  const wqRows = tasks.slice(0, 10).map((t) => ({ ...t, id: t.id }));
  const wqCols: GridColDef[] = [
    { field: "title", headerName: "Task", flex: 2, minWidth: 200, renderCell: (p) => glyphCell(p.row.status === "BLOCKED" ? "critical" : p.row.dueDate && p.row.dueDate < today ? "friction" : "watch", p.row.title) },
    { field: "projectRef", headerName: "Project", flex: 1, minWidth: 100, valueGetter: (v) => v ?? "—" },
    { field: "confidenceScore", headerName: "Conf.", width: 90, renderCell: (p) => <Chip size="small" label={`${p.row.confidenceScore}%`} sx={chipSx(confidenceTag(p.row.confidenceScore))} /> },
    { field: "dueDate", headerName: "Due", width: 110, valueGetter: (v) => v ?? "—" },
  ];

  const apRows = pending.slice(0, 10).map((ap: any) => ({ ...ap, id: ap.id }));
  const apCols: GridColDef[] = [
    { field: "title", headerName: "Item", flex: 2, minWidth: 200, renderCell: (p) => glyphCell(p.row.daysWaiting > 14 ? "critical" : "watch", `${p.row.projectRef} — ${p.row.title}`) },
    { field: "daysWaiting", headerName: "Waiting", width: 110, renderCell: (p) => <Chip size="small" label={`${p.row.daysWaiting}d`} sx={chipSx(p.row.daysWaiting > 14 ? "red" : p.row.daysWaiting > 7 ? "magenta" : "warm-gray")} /> },
  ];

  const tcRows = ti.slice(0, 10).map((m: any) => ({ ...m, id: m.memberId ?? m.assignee }));
  const tcCols: GridColDef[] = [
    { field: "assignee", headerName: "Member", flex: 1, minWidth: 140 },
    { field: "totalOpen", headerName: "Open", width: 80, type: "number" },
    { field: "overdueCount", headerName: "Late", width: 80, renderCell: (p) => ((p.row.overdueCount ?? 0) > 0 ? <Chip size="small" label={p.row.overdueCount} sx={chipSx("magenta")} /> : <span>—</span>) },
    { field: "load", headerName: "Load", width: 130, sortable: false, renderCell: (p) => {
      const st: ZoneState = p.row.capacity === "OVERLOADED" ? "critical" : p.row.capacity === "HIGH" ? "watch" : "stable";
      return (
        <Box sx={{ width: 1, display: "flex", alignItems: "center", height: 1 }}>
          <LinearProgress variant="determinate" value={loadPct(p.row.capacity)} color={st === "critical" ? "error" : st === "watch" ? "warning" : "success"} sx={{ width: 1 }} />
        </Box>
      );
    } },
    { field: "capacity", headerName: "Capacity", width: 130, renderCell: (p) => {
      const st: ZoneState = p.row.capacity === "OVERLOADED" ? "critical" : p.row.capacity === "HIGH" ? "watch" : "stable";
      return <Chip size="small" label={CAPACITY_LABEL[p.row.capacity] ?? p.row.capacity} sx={chipSx(tagKind(st))} />;
    } },
  ];

  const emptyText = (t: string) => <Typography variant="body2" color="text.secondary">{t}</Typography>;

  return (
    <Box className="esti-glass-dash">
      <Stack spacing={3} sx={{ width: 1 }}>
        <PageHeader
          title="Studio Intelligence"
          description="Practice health · action items · project, finance and team signals"
        />

        {/* Attention banner */}
        <Card sx={{ borderLeft: 4, borderLeftColor: attn.chainColor }}>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <OfficeHealthGlyph state={officeState} size={22} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1">{attn.issue}</Typography>
                <Typography variant="body2" color="text.secondary">{attn.action}</Typography>
              </Box>
              <ZoneChip state={officeState} />
            </Stack>
          </CardContent>
        </Card>

        {/* KPI cards */}
        <Grid container spacing={2}>
          {heroKpis.map((k) => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ height: 1 }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">{k.label}</Typography>
                  <Typography variant="h4" sx={{ my: 0.5 }}>{k.value}</Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{k.sub}</Typography>
                    {k.danger && <Chip size="small" label={k.danger} sx={chipSx("red")} />}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Module launcher */}
        <Grid container spacing={2}>
          {LAUNCHER_APPS.map((app) => {
            const Icon = app.icon;
            const n = home ? app.count(home, glanceQ.data) : null;
            return (
              <Grid key={app.label} size={{ xs: 6, sm: 3, lg: 1.5 }}>
                <Card sx={{ height: 1 }}>
                  <CardActionArea onClick={() => navigate(app.route)} sx={{ height: 1, p: 2 }}>
                    <Stack spacing={1}>
                      <Icon size={24} />
                      <Box>
                        <Typography variant="body2">{app.label}</Typography>
                        {n != null && app.subtitle && (
                          <Typography variant="caption" color="text.secondary">{app.subtitle(n)}</Typography>
                        )}
                      </Box>
                    </Stack>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Trend chart + side signal panels */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <SectionCard title="Billed vs collected · last 12 months">
              {showTrend ? (
                <LineChart
                  height={320}
                  series={[
                    { data: billed, label: "Billed", curve: "monotoneX", showMark: false },
                    { data: collected, label: "Collected", curve: "monotoneX", showMark: false },
                  ]}
                  xAxis={[{ scaleType: "point", data: months }]}
                  yAxis={[{ valueFormatter: (v: number) => formatINRShort(v * 100) }]}
                  margin={{ left: 70 }}
                />
              ) : (
                emptyText(
                  trend && !trend.financialEnabled
                    ? "Financials are turned off for this workspace."
                    : "No invoice history yet — raise your first invoice to see the trend.",
                )
              )}
            </SectionCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={2}>
              <SectionCard title="Zone health">
                <Stack spacing={1.5}>
                  {zones.map((z) => (
                    <Stack key={z.label} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <OfficeHealthGlyph state={z.state} size={12} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">{z.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{z.signal}</Typography>
                      </Box>
                      <ZoneChip state={z.state} />
                    </Stack>
                  ))}
                </Stack>
              </SectionCard>
              <SectionCard title="Today">
                <Stack direction="row" spacing={2}>
                  {[
                    { label: "Pending tasks", value: glanceQ.data?.pendingTasks },
                    { label: "Meetings", value: glanceQ.data?.meetingsToday },
                    { label: "Site visits", value: glanceQ.data?.siteVisitsToday },
                  ].map((s) => (
                    <Box key={s.label} sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      <Typography variant="h5">{s.value ?? "—"}</Typography>
                    </Box>
                  ))}
                </Stack>
              </SectionCard>
              <SectionCard title="GST filing" action={<ZoneChip state={gst.state} label={gst.label} />}>
                <Typography variant="body2">
                  {gst.state === "stable" ? "On schedule" : `Due in ${gst.daysUntil} days`}
                </Typography>
              </SectionCard>
              {ri && (
                <SectionCard
                  title="Revisions"
                  action={ri.totalDecisions && Math.round((ri.clientDriven / ri.totalDecisions) * 100) > 60
                    ? <Chip size="small" label={`${Math.round((ri.clientDriven / ri.totalDecisions) * 100)}% client-driven`} sx={chipSx("magenta")} />
                    : undefined}
                >
                  <Typography variant="body2">{ri.totalDecisions ?? 0} logged this cycle</Typography>
                </SectionCard>
              )}
            </Stack>
          </Grid>
        </Grid>

        {/* Action items + top risks */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard title="Action items">
              {actionRows.length === 0
                ? emptyText("No action items — the office is operating normally.")
                : <DataGrid rows={actionRows} columns={actionCols} onRowClick={(p) => p.row.href && navigate(p.row.href)} {...gridProps} />}
            </SectionCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <SectionCard title="Top risks">
              {topRisks.length === 0 ? emptyText("No elevated risks right now.") : (
                <Stack spacing={1.5}>
                  {topRisks.map((r) => (
                    <Stack key={r.key} direction="row" spacing={1} sx={{ alignItems: "center", cursor: "pointer" }} onClick={() => navigate(r.href)}>
                      <OfficeHealthGlyph state={r.state} size={12} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">{r.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.detail}</Typography>
                      </Box>
                      <ZoneChip state={r.state} />
                    </Stack>
                  ))}
                </Stack>
              )}
            </SectionCard>
          </Grid>
        </Grid>

        {/* Project health */}
        {atRiskProjects.length > 0 && (
          <SectionCard
            title={`Project health — ${riskProjects.length} critical · ${watchProjects.length} watch`}
            action={<ZoneChip state={ps} label={projectSignal(ps)} />}
          >
            <DataGrid rows={phRows} columns={phCols} onRowClick={(p) => navigate(projectIssueHref(p.row))} {...gridProps} />
          </SectionCard>
        )}

        {/* Work queue + approvals */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <SectionCard
              title="Work queue"
              action={<Chip size="small" label={`${tasks.length} open · ${tasksOverdue} overdue`} sx={chipSx(tasksOverdue > 0 ? "warm-gray" : "green")} />}
            >
              {tasks.length === 0 ? emptyText("No active tasks.") : (
                <DataGrid rows={wqRows} columns={wqCols} onRowClick={(p) => navigate(taskHref(p.row.id))} {...gridProps} />
              )}
            </SectionCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 5 }}>
            <SectionCard
              title="Approvals"
              action={<Chip size="small" label={`${pendingCount} pending`} sx={chipSx(pendingCount > 0 ? tagKind(cs) : "green")} />}
            >
              {pending.length === 0 ? emptyText("No approvals pending.") : (
                <DataGrid rows={apRows} columns={apCols} onRowClick={(p) => navigate(`/projects/${p.row.projectId}?tab=approvals&approvalId=${p.row.id}`)} {...gridProps} />
              )}
            </SectionCard>
          </Grid>
        </Grid>

        {/* Team capacity */}
        {hrEnabled && ti.length > 0 && (
          <SectionCard
            title={`Team capacity — ${att ? `${att.present}/${att.headcount} present` : `${ti.length} members`}`}
            action={<ZoneChip state={ts} label={teamSignal(ts)} />}
          >
            <DataGrid rows={tcRows} columns={tcCols} {...gridProps} sx={{ ...GRID_SX, "& .MuiDataGrid-row": { cursor: "default" } }} />
          </SectionCard>
        )}
      </Stack>
    </Box>
  );
}
