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
  Chip,
  FormControlLabel,
  LinearProgress,
  Stack,
  Switch,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useState } from "react";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import Business from "@mui/icons-material/Business";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import Groups2Outlined from "@mui/icons-material/Groups2Outlined";
import HandshakeOutlined from "@mui/icons-material/HandshakeOutlined";
import LibraryBooksOutlined from "@mui/icons-material/LibraryBooksOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import type { ReactNode } from "react";
import { can, formatINRShort } from "@esti/contracts";
import { OfficeHealthGlyph } from "../components/shell/OfficeHealthGlyph.js";
import { STATE_WORD } from "../components/dashboard/zoneState.js";
import type { ZoneState } from "../components/dashboard/zoneState.js";
import { CAPACITY_LABEL } from "../components/dashboard/dashboardUi.js";
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

function greetingFor(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Upcoming Indian statutory filing due dates (TDS 7th · GSTR-1 11th · GSTR-3B 20th). */
function filingDueDates(): { name: string; date: string; days: number }[] {
  const now = new Date();
  const t = now.getTime();
  const m = now.getMonth();
  const y = now.getFullYear();
  const mk = (day: number, name: string) => {
    let d = new Date(y, m, day);
    if (d.getTime() <= t) d = new Date(y, m + 1, day);
    return { name, when: d, days: Math.ceil((d.getTime() - t) / 86_400_000) };
  };
  return [mk(7, "TDS payment"), mk(11, "GSTR-1"), mk(20, "GSTR-3B")]
    .sort((a, b) => a.when.getTime() - b.when.getTime())
    .map((x) => ({ name: x.name, date: x.when.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), days: x.days }));
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

// Ultra-minimal: flat section (no card) — an uppercase eyebrow title + optional
// action, then content.
function SectionCard({
  title, action, children,
}: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ flex: 1, letterSpacing: 1 }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

// An 80%-width hairline separator (replaces card edges in the flat UI).
function Sep() {
  return <Box sx={{ height: "1px", width: "80%", mx: "auto", my: 1.5, bgcolor: "divider" }} />;
}

const GRID_SX = {
  border: 0,
  backgroundColor: "transparent",
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
  icon: SvgIconComponent;
  count: (h: any, g: any) => number | null;
  subtitle: ((n: number) => string) | null;
};

const LAUNCHER_APPS: LauncherApp[] = [
  { label: "Projects", route: "/projects", icon: Business, count: (h) => h.summary?.projects?.byStatus?.ACTIVE ?? h.summary?.projects?.total ?? null, subtitle: (n) => `${n} active` },
  { label: "Tasks", route: "/tasks", icon: TaskAltOutlined, count: (_h, g) => g?.pendingTasks ?? null, subtitle: (n) => `${n} open` },
  { label: "Invoices", route: "/invoices", icon: ReceiptLongOutlined, count: (h) => h.actionCenter?.overdueInvoices?.length ?? null, subtitle: (n) => `${n} overdue` },
  { label: "Clients", route: "/clients", icon: HandshakeOutlined, count: (h) => h.clientIntelligence?.length ?? null, subtitle: (n) => `${n} active` },
  { label: "Proposals", route: "/office/proposals", icon: DescriptionOutlined, count: (h) => h.summary?.proposals?.total ?? null, subtitle: (n) => `${n} total` },
  { label: "Team", route: "/team", icon: Groups2Outlined, count: (h) => h.summary?.hr?.headcount ?? null, subtitle: (n) => `${n} members` },
  { label: "Library", route: "/knowledge-bank", icon: LibraryBooksOutlined, count: () => null, subtitle: null },
  { label: "AI Studio", route: "/office/ai-studio", icon: AutoAwesomeOutlined, count: () => null, subtitle: null },
];

// ── Studio Intelligence ───────────────────────────────────────────────────────

export function StudioAbstract() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const homeQ     = trpc.dashboard.home.useQuery(undefined, { staleTime: 60_000 });
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const firmQ     = trpc.firm.get.useQuery(undefined, { staleTime: 300_000 });
  const tiQ       = trpc.dashboard.teamIntelligence.useQuery(undefined, { enabled: hrEnabled });
  const attQ      = trpc.dashboard.attendanceToday.useQuery(undefined, { enabled: hrEnabled });
  const queueQ    = trpc.tasks.todayQueue.useQuery({ myTasks: false, limit: 20 }, { staleTime: 30_000 });
  const glanceQ   = trpc.dashboard.todayGlance.useQuery(undefined, { staleTime: 60_000 });

  const home = homeQ.data;
  const ac   = home?.actionCenter;
  const fh   = home?.financialHealth ?? null;
  const ph   = home?.projectHealth   ?? [];
  const ri   = home?.revisionIntelligence ?? null;
  const ti   = tiQ.data  ?? [];
  const att  = attQ.data ?? null;
  const tasks = queueQ.data ?? [];

  const canInvoice = can(user?.role, "invoice:manage");

  // Main-screen 30/70 split: left rail carries heading + telemetry + these tabs;
  // the right 70% renders the selected tab's items.
  const [tab, setTab] = useState<"priorities" | "apps" | "projects" | "work" | "team">("priorities");

  // Module toggles (moved off the dock) — admin-only, shown in the page header.
  const isAdmin = can(user?.role, "firm:admin");
  const setModule = trpc.settings.setModuleEnabled.useMutation({
    onSuccess: () => settingsQ.refetch(),
  });
  const financialEnabled = settingsQ.data?.financialEnabled ?? true;
  const projectEnabled = settingsQ.data?.projectEnabled ?? true;
  const moduleToggles = isAdmin ? (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={financialEnabled}
            disabled={setModule.isPending}
            onChange={(e) => setModule.mutate({ module: "financial", enabled: e.target.checked })}
          />
        }
        label="Financial"
      />
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={projectEnabled}
            disabled={setModule.isPending}
            onChange={(e) => setModule.mutate({ module: "project", enabled: e.target.checked })}
          />
        }
        label="Project"
      />
    </Stack>
  ) : undefined;

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
  const firstName = (user?.fullName ?? "").trim().split(/\s+/)[0] || "there";
  const companyName = firmQ.data?.companyName ?? "";
  const firmLogo = firmQ.data?.logoUrl ?? null;
  const filingDue = filingDueDates();

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

  // Rail telemetry — every metric is a flat square tile: office health, the four
  // KPIs, then each statutory filing due date.
  const railTiles: { label: string; value: ReactNode; sub?: ReactNode; glyph?: ZoneState; subColor?: string }[] = [
    { label: "Office health", value: STATE_WORD[officeState], glyph: officeState },
    ...heroKpis.slice(0, 4).map((k) => ({ label: k.label, value: k.value, sub: k.sub })),
    ...filingDue.map((f) => ({
      label: f.name,
      value: f.date,
      sub: `${f.days}d`,
      subColor: f.days <= 3 ? "error.main" : f.days <= 7 ? "warning.main" : "text.secondary",
    })),
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
      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", width: 1 }}>
        {/* ── LEFT 20% — fixed, no scroll, FLAT: logo · greeting · telemetry · filing ── */}
        <Box
          className="esti-dash-rail"
          sx={{
            flex: "0 0 20%", maxWidth: "20%", minWidth: 0,
            position: "sticky", top: 0, alignSelf: "flex-start",
            height: "calc(100vh - 140px)", overflow: "hidden",
            display: "flex", flexDirection: "column", gap: 1.5,
            borderRight: 1, borderColor: "divider", pr: 2,
          }}
        >
          {/* Company logo */}
          {firmLogo ? (
            <Box component="img" src={firmLogo} alt={companyName || "Company"} sx={{ height: 30, width: "auto", maxWidth: "80%", objectFit: "contain", display: "block" }} />
          ) : (
            <Box className="esti-brand esti-brand--esti" role="img" aria-label="AORMS" sx={{ height: 30, width: 30 }} />
          )}

          {/* Greeting */}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 300, lineHeight: 1.15 }}>{greetingFor()},</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, lineHeight: 1.15 }}>{firstName}</Typography>
            {companyName && <Typography variant="caption" color="text.secondary">{companyName}</Typography>}
          </Box>

          <Sep />

          {/* Telemetry — flat square tiles: office health · KPIs · filing due dates */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            {railTiles.map((c, i) => (
              <Box
                key={i}
                sx={{
                  aspectRatio: "1 / 1", minWidth: 0, p: 1.25,
                  display: "flex", flexDirection: "column", justifyContent: "center",
                  borderTop: i >= 2 ? 1 : 0, borderLeft: i % 2 === 1 ? 1 : 0, borderColor: "divider",
                }}
              >
                <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }} noWrap>{c.label}</Typography>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", minWidth: 0 }}>
                  {c.glyph && <OfficeHealthGlyph state={c.glyph} size={14} />}
                  <Typography sx={{ fontWeight: 300, fontSize: "1.35rem", lineHeight: 1.05, textTransform: c.glyph ? "capitalize" : "none" }} noWrap>{c.value}</Typography>
                </Stack>
                {c.sub != null && <Typography variant="caption" sx={{ color: c.subColor ?? "text.secondary" }} noWrap>{c.sub}</Typography>}
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── RIGHT 80% — FLAT content ─────────────────────────────────────────── */}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {/* Attention strip + admin toggles (office health now lives in the rail) */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
              <b>{attn.issue}</b> — {attn.action}
            </Typography>
            {moduleToggles}
          </Stack>

          {/* Horizontal section tabs */}
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab value="priorities" label="Priorities" />
            <Tab value="apps" label="Apps" />
            <Tab value="projects" label="Projects" />
            <Tab value="work" label="Work" />
            {hrEnabled && <Tab value="team" label="Team" />}
          </Tabs>

          {tab === "priorities" && (
            <>
              <SectionCard title="Zone health">
                <Stack spacing={1}>
                  {zones.map((z) => (
                    <Stack key={z.label} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <OfficeHealthGlyph state={z.state} size={12} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2">{z.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{z.signal}</Typography>
                      </Box>
                      <ZoneChip state={z.state} />
                    </Stack>
                  ))}
                </Stack>
              </SectionCard>
              <Sep />
              <SectionCard title="Today">
                <Stack direction="row" spacing={4}>
                  {[
                    { label: "Pending tasks", value: glanceQ.data?.pendingTasks },
                    { label: "Meetings", value: glanceQ.data?.meetingsToday },
                    { label: "Site visits", value: glanceQ.data?.siteVisitsToday },
                  ].map((s) => (
                    <Box key={s.label}>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 300 }}>{s.value ?? "—"}</Typography>
                    </Box>
                  ))}
                </Stack>
              </SectionCard>
              <Sep />
              <SectionCard title="Action items">
                {actionRows.length === 0
                  ? emptyText("No action items — the office is operating normally.")
                  : <DataGrid rows={actionRows} columns={actionCols} onRowClick={(p) => p.row.href && navigate(p.row.href)} {...gridProps} />}
              </SectionCard>
              <Sep />
              <SectionCard title="Top risks">
                {topRisks.length === 0 ? emptyText("No elevated risks right now.") : (
                  <Stack spacing={1}>
                    {topRisks.map((r) => (
                      <Stack key={r.key} direction="row" spacing={1} sx={{ alignItems: "center", cursor: "pointer" }} onClick={() => navigate(r.href)}>
                        <OfficeHealthGlyph state={r.state} size={12} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2">{r.label}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.detail}</Typography>
                        </Box>
                        <ZoneChip state={r.state} />
                      </Stack>
                    ))}
                  </Stack>
                )}
              </SectionCard>
            </>
          )}

          {tab === "apps" && (
            <Box>
              {LAUNCHER_APPS.map((app, i) => {
                const Icon = app.icon;
                const n = home ? app.count(home, glanceQ.data) : null;
                return (
                  <Box
                    key={app.label}
                    onClick={() => navigate(app.route)}
                    sx={{
                      display: "flex", alignItems: "center", gap: 2, py: 1.5, cursor: "pointer",
                      borderTop: i === 0 ? 0 : 1, borderColor: "divider",
                      "&:hover .esti-launch-lbl": { color: "primary.main" },
                    }}
                  >
                    <Icon sx={{ fontSize: 22, color: "text.secondary" }} />
                    <Typography variant="body1" className="esti-launch-lbl" sx={{ flex: 1 }}>{app.label}</Typography>
                    {n != null && app.subtitle && (
                      <Typography variant="body2" color="text.secondary">{app.subtitle(n)}</Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}

          {tab === "projects" && (
            <SectionCard
              title={`Project health — ${riskProjects.length} critical · ${watchProjects.length} watch`}
              action={<ZoneChip state={ps} label={projectSignal(ps)} />}
            >
              {atRiskProjects.length === 0
                ? emptyText("All projects are on track.")
                : <DataGrid rows={phRows} columns={phCols} onRowClick={(p) => navigate(projectIssueHref(p.row))} {...gridProps} />}
            </SectionCard>
          )}

          {tab === "work" && (
            <>
              <SectionCard
                title="Work queue"
                action={<Chip size="small" label={`${tasks.length} open · ${tasksOverdue} overdue`} sx={chipSx(tasksOverdue > 0 ? "warm-gray" : "green")} />}
              >
                {tasks.length === 0 ? emptyText("No active tasks.") : (
                  <DataGrid rows={wqRows} columns={wqCols} onRowClick={(p) => navigate(taskHref(p.row.id))} {...gridProps} />
                )}
              </SectionCard>
              <Sep />
              <SectionCard
                title="Approvals"
                action={<Chip size="small" label={`${pendingCount} pending`} sx={chipSx(pendingCount > 0 ? tagKind(cs) : "green")} />}
              >
                {pending.length === 0 ? emptyText("No approvals pending.") : (
                  <DataGrid rows={apRows} columns={apCols} onRowClick={(p) => navigate(`/projects/${p.row.projectId}?tab=approvals&approvalId=${p.row.id}`)} {...gridProps} />
                )}
              </SectionCard>
            </>
          )}

          {tab === "team" && (
            <SectionCard
              title={`Team capacity — ${att ? `${att.present}/${att.headcount} present` : `${ti.length} members`}`}
              action={<ZoneChip state={ts} label={teamSignal(ts)} />}
            >
              {ti.length === 0
                ? emptyText("No team data yet.")
                : <DataGrid rows={tcRows} columns={tcCols} {...gridProps} sx={{ ...GRID_SX, "& .MuiDataGrid-row": { cursor: "default" } }} />}
            </SectionCard>
          )}
        </Box>
      </Box>
    </Box>
  );
}
