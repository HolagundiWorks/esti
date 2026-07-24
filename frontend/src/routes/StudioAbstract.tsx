/**
 * AORMS Studio Intelligence — home screen of the system.
 *
 * Material UI + MUI X dashboard: attention banner · KPI cards · module launcher ·
 * billed-vs-collected chart (x-charts) · side signal panels · DataGrids for action
 * items, project health, work queue, approvals and team capacity. Liquid-glass
 * surface (dark g100). Route: /  (root)
 */
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  LinearProgress,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { can, formatINRShort, PRIORITY_BAND_LABEL } from "@esti/contracts";
import { OfficeHealthGlyph } from "../components/shell/OfficeHealthGlyph.js";
import { StatusDot } from "../components/StatusTag.js";
import { EstiOrchestrationStatus } from "../components/EstiOrchestrationStatus.js";
import { STATE_WORD } from "../components/dashboard/zoneState.js";
import type { ZoneState } from "../components/dashboard/zoneState.js";
import { StudioBreath } from "../components/dashboard/StudioBreath.js";
import { StudioTeamPanel } from "../components/dashboard/StudioTeamPanel.js";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import BusinessOutlined from "@mui/icons-material/BusinessOutlined";
import ExpandMore from "@mui/icons-material/ExpandMore";
import FitnessCenter from "@mui/icons-material/FitnessCenter";
import RemoveRedEye from "@mui/icons-material/RemoveRedEye";
import WaterDropOutlined from "@mui/icons-material/WaterDropOutlined";
import { setWellnessPrefs, useWellnessPrefs } from "../lib/wellnessPrefs.js";
import { confidenceTag, PRIORITY_BAND_TAG } from "../components/work/workHelpers.js";
import { ZonalComplianceCalculator } from "../components/compliance/ZonalComplianceCalculator.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { useNavigate } from "react-router-dom";
import { TYPE_SCALE, useScreenActions } from "@hcw/ui-kit";
import { AORMS_STUDIO } from "../lib/product-nomenclature.js";

// ── Zone state ────────────────────────────────────────────────────────────────

const ZCOLOR: Record<ZoneState, string> = {
  stable:   "var(--cds-support-success)",
  watch:    "var(--cds-support-warning)",
  friction: "var(--cds-support-warning-minor)",
  critical: "var(--cds-support-error)",
  inactive: "var(--cds-text-disabled)",
};

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

function pulseBandState(band: string): ZoneState {
  if (band === "CRITICAL" || band === "ACTION_TODAY") return "critical";
  if (band === "WATCH") return "watch";
  return "stable";
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

function ZoneChip({ state, label }: { state: ZoneState; label?: string }) {
  return <StatusDot color={tagKind(state)} label={label ?? STATE_WORD[state]} />;
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

// Per-tab split — the tab's heading/summary "items" sit in a 20% column, its data
// (grid/list) fills the 80%.
function TabSplit({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, alignItems: "flex-start" }}>
      <Box sx={{ flex: { xs: "1 1 auto", md: "0 0 20%" }, width: { xs: 1, md: "auto" }, maxWidth: { xs: "100%", md: "20%" }, minWidth: 0, borderRight: { xs: 0, md: 1 }, borderColor: "divider", pr: { xs: 0, md: 1.5 } }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>{title}</Typography>
        {action && <Box sx={{ mt: 1 }}>{action}</Box>}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, width: { xs: 1, md: "auto" } }}>{children}</Box>
    </Box>
  );
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

// ── Studio Intelligence ───────────────────────────────────────────────────────

export function StudioAbstract() {
  const { user }  = useAuth();
  const wellnessPrefs = useWellnessPrefs();
  const navigate  = useNavigate();

  useEffect(() => {
    document.title = `Studio Intelligence — ${AORMS_STUDIO.title}`;
  }, []);

  const homeQ     = trpc.dashboard.home.useQuery(undefined, { staleTime: 60_000 });
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const firmQ     = trpc.firm.get.useQuery(undefined, { staleTime: 300_000 });
  const tiQ       = trpc.dashboard.teamIntelligence.useQuery(undefined, { enabled: hrEnabled });
  const attQ      = trpc.dashboard.attendanceToday.useQuery(undefined, { enabled: hrEnabled });
  const queueQ    = trpc.tasks.todayQueue.useQuery({ myTasks: false, limit: 20 }, { staleTime: 30_000 });
  const utils     = trpc.useUtils();
  const pulseTopQ = trpc.pulse.topTasks.useQuery(
    { limit: 3 },
    { staleTime: Infinity, retry: false },
  );
  const refreshEstiPriorities = trpc.pulse.refreshTopTasks.useMutation({
    meta: { errorTitle: "Couldn't refresh the rankings" },
    onSuccess: (data) => {
      utils.pulse.topTasks.setData({ limit: 3 }, data);
    },
  });
  const pulseTopUnavailable = pulseTopQ.isError;
  const pulseQueueQ = trpc.pulse.queue.useQuery(
    { limit: 3 },
    { enabled: pulseTopUnavailable, staleTime: Infinity },
  );
  const glanceQ   = trpc.dashboard.todayGlance.useQuery(undefined, { staleTime: 60_000 });

  const home = homeQ.data;
  const homeLoading = homeQ.isLoading && home == null;
  const ac   = home?.actionCenter;
  const fh   = home?.financialHealth ?? null;
  const ph   = home?.projectHealth   ?? [];
  const ti   = tiQ.data  ?? [];
  const att  = attQ.data ?? null;
  const tasks = queueQ.data ?? [];

  const canInvoice = can(user?.role, "invoice:manage");

  // Main-screen 30/70 split: left rail carries heading + telemetry + these tabs;
  // the right 70% renders the selected tab's items.
  const [tab, setTab] = useState<"priorities" | "projects" | "work" | "team" | "zoning">("priorities");
  const [estiExpanded, setEstiExpanded] = useState(false);

  useScreenActions(
    tab === "priorities"
      ? [
          {
            id: "refresh-esti-rankings",
            zone: "right",
            tone: "primary",
            label: refreshEstiPriorities.isPending ? "Ranking…" : "Refresh rankings",
            icon: <AutoAwesomeOutlined />,
            disabled: refreshEstiPriorities.isPending,
            onClick: () => refreshEstiPriorities.mutate({ limit: 3 }),
          },
        ]
      : [],
    [tab, refreshEstiPriorities.isPending],
  );

  useEffect(() => {
    if (tab !== "priorities") setEstiExpanded(false);
  }, [tab]);

  // Module toggles (moved off the dock) — admin-only, shown in the page header.
  const isAdmin = can(user?.role, "firm:admin");
  const setModule = trpc.settings.setModuleEnabled.useMutation({
    meta: { errorTitle: "Couldn't update the module setting" },
    onSuccess: () => settingsQ.refetch(),
  });
  const financialEnabled = settingsQ.data?.financialEnabled ?? true;
  const projectEnabled = settingsQ.data?.projectEnabled ?? true;
  const railToggleSwitchSx = { transform: "scale(0.75)", transformOrigin: "center right" } as const;
  const moduleToggles = isAdmin ? (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 38 }}>
        <AccountBalanceOutlined fontSize="small" color="action" />
        <Typography variant="body2" sx={{ flex: 1 }} noWrap>Financial</Typography>
        <Switch
          size="small"
          sx={railToggleSwitchSx}
          checked={financialEnabled}
          disabled={setModule.isPending}
          onChange={(e) => setModule.mutate({ module: "financial", enabled: e.target.checked })}
          slotProps={{ input: { "aria-label": "Financial module" } }}
        />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 38 }}>
        <BusinessOutlined fontSize="small" color="action" />
        <Typography variant="body2" sx={{ flex: 1 }} noWrap>Project</Typography>
        <Switch
          size="small"
          sx={railToggleSwitchSx}
          checked={projectEnabled}
          disabled={setModule.isPending}
          onChange={(e) => setModule.mutate({ module: "project", enabled: e.target.checked })}
          slotProps={{ input: { "aria-label": "Project module" } }}
        />
      </Box>
    </>
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

  const firstName =
    user?.greetingGivenName ??
    ((user?.fullName ?? "").trim().split(/\s+/)[0] || "there");
  const companyName = firmQ.data?.companyName ?? "";
  const filingDue = filingDueDates();

  const heroKpis: { label: string; value: string; sub: string; danger: string | null }[] =
    homeLoading
      ? [
          { label: "—", value: "—", sub: "Loading", danger: null },
          { label: "—", value: "—", sub: "Loading", danger: null },
          { label: "—", value: "—", sub: "Loading", danger: null },
          { label: "—", value: "—", sub: "Loading", danger: null },
        ]
      : canInvoice && fh
      ? [
          { label: "Pipeline", value: formatINRShort(fh.pipelinePaise), sub: `Active ${formatINRShort(fh.activePipelinePaise)}`, danger: null },
          { label: "Outstanding", value: formatINRShort(fh.outstandingPaise), sub: "Receivable", danger: fh.overdue30dPaise > 0 ? `${formatINRShort(fh.overdue30dPaise)} overdue` : null },
          {
            label: "Fee recovery",
            value: `${fh.feeRecoveryPct ?? 0}%`,
            sub: `Invoiced ${formatINRShort(fh.invoicedTotalPaise)}`,
            danger: (fh.feeRecoveryPct ?? 0) < 40 && fh.activePipelinePaise > 0 ? "Below 40%" : null,
          },
          { label: "Ready to bill", value: formatINRShort(fh.readyToBillPaise), sub: `${billingReady.length} phase${billingReady.length === 1 ? "" : "s"}`, danger: null },
        ]
      : [
          { label: "Active Projects", value: String(ph.length), sub: "In delivery", danger: null },
          { label: "Overdue Invoices", value: String(overdueInvs.length), sub: "To chase", danger: overdueInvs.length > 0 ? "Action needed" : null },
          { label: "Approvals Pending", value: String(pendingCount), sub: "Awaiting client", danger: null },
          { label: "Tasks Overdue", value: String(tasksOverdue), sub: "Past due", danger: tasksOverdue > 0 ? "Behind" : null },
        ];

  // Stage header KPIs — Pipeline · Outstanding · Collected · Ready to bill (or ops fallback).
  const kpiTiles: { id: string; label: string; value: ReactNode; sub?: ReactNode }[] =
    homeLoading
      ? Array.from({ length: 4 }, (_, i) => ({
          id: `kpi-loading-${i}`,
          label: "Loading",
          value: <Skeleton variant="text" width={72} sx={{ fontSize: TYPE_SCALE.kpi }} />,
          sub: i === 0 ? "Office metrics" : undefined,
        }))
      : heroKpis.slice(0, 4).map((k) => ({ id: `kpi-${k.label}`, label: k.label, value: k.value, sub: k.sub }));

  // Top risks
  const clientRisks = (home?.clientIntelligence ?? []).filter((c: any) => c.risk === "HIGH");
  const topRisks = [
    ...riskProjects.map((p: any) => ({ key: `rp-${p.id}`, label: `${p.ref} — ${p.title}`, detail: "Delivery at risk", state: "critical" as ZoneState, href: projectIssueHref(p) })),
    ...watchProjects.slice(0, 3).map((p: any) => ({ key: `wp-${p.id}`, label: `${p.ref} — ${p.title}`, detail: "Needs watching", state: "watch" as ZoneState, href: projectIssueHref(p) })),
    ...clientRisks.slice(0, 3).map((c: any) => ({ key: `cr-${c.id}`, label: c.name, detail: `${c.oldestInvoiceDays ?? 0}d oldest invoice`, state: "friction" as ZoneState, href: "/clients" })),
  ].slice(0, 7);

  // Action items — ESTI Pulse top 3 (on-demand ranked) + office ops
  const estiTopTasks = (
    pulseTopQ.isSuccess ? pulseTopQ.data ?? [] : pulseQueueQ.data ?? []
  ).slice(0, 3);

  const estiActionRows = estiTopTasks.map((t, i) => ({
    id: `pulse-${t.id}`,
    estiRank: i + 1,
    item: t.title,
    detail: ("gapSummary" in t && t.gapSummary) ? t.gapSummary : `${t.projectRef ?? "—"} · ${PRIORITY_BAND_LABEL[t.band] ?? t.band}`,
    when: t.dueDate ?? "—",
    priorityScore: t.priorityScore,
    confidenceScore: t.confidenceScore,
    band: t.band,
    href: t.projectId ? `/projects/${t.projectId}?tab=tasks` : undefined,
    state: pulseBandState(t.band),
  }));

  const officeActionRows = [
    ...overdueInvs.slice(0, 5).map((inv: any) => ({ id: `inv-${inv.id}`, item: `Invoice ${inv.ref}`, detail: formatINRShort(inv.netReceivablePaise), when: `${inv.daysOverdue}d overdue`, href: `/projects/${inv.projectId}?tab=invoices&invoiceId=${inv.id}`, state: (inv.daysOverdue > 30 ? "critical" : "friction") as ZoneState })),
    ...pending.slice(0, 5).map((ap: any) => ({ id: `ap-${ap.id}`, item: `${ap.projectRef} — ${ap.title}`, detail: "Approval pending", when: `${ap.daysWaiting}d`, href: `/projects/${ap.projectId}?tab=approvals&approvalId=${ap.id}`, state: (ap.daysWaiting > 14 ? "critical" : "friction") as ZoneState })),
    ...riskProjects.slice(0, 5).map((p: any) => ({ id: `proj-${p.id}`, item: `${p.ref} — ${p.title}`, detail: "Delivery risk", when: "—", href: projectIssueHref(p), state: "critical" as ZoneState })),
    ...(billingReady.length > 0 ? [{ id: "billing-ready", item: `${billingReady.length} phase${billingReady.length > 1 ? "s" : ""} ready to invoice`, detail: fh?.readyToBillPaise ? formatINRShort(fh.readyToBillPaise) : "—", when: "—", href: "/invoices", state: "watch" as ZoneState }] : []),
  ];

  const estiSuggestCols: GridColDef[] = [
    {
      field: "item",
      headerName: "Task",
      flex: 2,
      minWidth: 200,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", height: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 14, fontWeight: 600 }}>
            {p.row.estiRank}
          </Typography>
          {glyphCell(p.row.state, p.row.item)}
        </Stack>
      ),
    },
    { field: "detail", headerName: "Detail", flex: 1, minWidth: 120, sortable: false },
    {
      field: "priorityScore",
      headerName: "Priority",
      width: 100,
      sortable: false,
      renderCell: (p) => (
        <StatusDot color={PRIORITY_BAND_TAG[p.row.band] ?? "gray"} label={`P${p.row.priorityScore}`} />
      ),
    },
    {
      field: "confidenceScore",
      headerName: "Conf.",
      width: 90,
      sortable: false,
      renderCell: (p) => (
        <StatusDot color={confidenceTag(p.row.confidenceScore)} label={`${p.row.confidenceScore}%`} />
      ),
    },
    { field: "when", headerName: "Due", width: 110, sortable: false },
  ];

  const officeActionCols: GridColDef[] = [
    { field: "item", headerName: "Item", flex: 2, minWidth: 200, sortable: false, renderCell: (p) => glyphCell(p.row.state, p.row.item) },
    { field: "detail", headerName: "Detail", flex: 1, minWidth: 120, sortable: false },
    { field: "when", headerName: "Due / age", width: 120, sortable: false },
  ];

  const actionGridProps = { ...gridProps, disableColumnSorting: true };

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
    { field: "confidenceScore", headerName: "Conf.", width: 90, renderCell: (p) => <StatusDot color={confidenceTag(p.row.confidenceScore)} label={`${p.row.confidenceScore}%`} /> },
    { field: "dueDate", headerName: "Due", width: 110, valueGetter: (v) => v ?? "—" },
  ];

  const apRows = pending.slice(0, 10).map((ap: any) => ({ ...ap, id: ap.id }));
  const apCols: GridColDef[] = [
    { field: "title", headerName: "Item", flex: 2, minWidth: 200, renderCell: (p) => glyphCell(p.row.daysWaiting > 14 ? "critical" : "watch", `${p.row.projectRef} — ${p.row.title}`) },
    { field: "daysWaiting", headerName: "Waiting", width: 110, renderCell: (p) => <StatusDot color={p.row.daysWaiting > 14 ? "red" : p.row.daysWaiting > 7 ? "magenta" : "warm-gray"} label={`${p.row.daysWaiting}d`} /> },
  ];

  const emptyText = (t: string) => <Typography variant="body2" color="text.secondary">{t}</Typography>;

  /** Zone health + finance snapshot — lives inside the ESTI tab only. */
  const estiSignalsPanel = (
    <Box className="esti-esti-signals" sx={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
      <Box
        sx={{
          borderTop: 1,
          borderBottom: 1,
          borderColor: "divider",
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: { xs: 1.5, md: 2 },
          flexWrap: { xs: "wrap", md: "nowrap" },
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ flexShrink: 0, lineHeight: 1, whiteSpace: "nowrap" }}
        >
          Zone health
        </Typography>
        <Box
          className="esti-dash-stage-head__zones"
          sx={{
            flex: 1,
            minWidth: 0,
            display: { xs: "grid", md: "flex" },
            gridTemplateColumns: { xs: "repeat(2, 1fr)" },
            justifyContent: { md: "space-evenly" },
            alignItems: "center",
            gap: { xs: 1, md: 0 },
          }}
        >
          {zones.map((z) => (
            <Box key={z.label} className="esti-zone-health__item" title={z.signal} sx={{ px: 1 }}>
              <OfficeHealthGlyph state={z.state} variant="glass" title={z.signal} />
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: TYPE_SCALE.micro, maxWidth: 1 }}>
                {z.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Accordion className="esti-dash-kpi-accordion" disableGutters elevation={0} defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMore fontSize="small" />} aria-controls="dash-kpi-panel" id="dash-kpi-header">
          <Typography variant="overline" color="text.secondary">
            {canInvoice && fh ? "Finance snapshot" : "Office snapshot"}
          </Typography>
        </AccordionSummary>
        <AccordionDetails id="dash-kpi-panel">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
              gap: 0,
              width: 1,
            }}
          >
            {kpiTiles.map((c, i) => (
              <Box
                key={c.id}
                sx={{
                  minWidth: 0,
                  p: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  borderTop: { xs: i >= 2 ? 1 : 0, md: 0 },
                  borderLeft: { xs: i % 2 !== 0 ? 1 : 0, md: i > 0 ? 1 : 0 },
                  borderColor: "divider",
                }}
              >
                <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }} noWrap>{c.label}</Typography>
                <Typography sx={{ fontWeight: 300, fontSize: TYPE_SCALE.kpi, lineHeight: 1.05 }} noWrap>{c.value}</Typography>
                {c.sub != null && (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: TYPE_SCALE.micro }} noWrap>
                    {c.sub}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  return (
    <Box
      className="esti-glass-dash"
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: { xs: "visible", md: "hidden" },
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Ambient resonant-breathing contour field (behind content; a passive pacer). */}
      <StudioBreath />
      {/* Desktop: rail fixed in pane; stage scrolls independently. Mobile: stack. */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          flex: 1,
          minHeight: 0,
          overflow: { xs: "visible", md: "hidden" },
          gap: 2,
          alignItems: "stretch",
          width: 1,
        }}
      >
        {/* Spacer reserves rail width while the rail is fixed full-viewport height. */}
        <Box
          aria-hidden
          sx={{
            display: { xs: "none", md: "block" },
            flex: "0 0 20%",
            maxWidth: "20%",
            flexShrink: 0,
          }}
        />
        {/* ── RAIL (20%) — greeting · Today · zones · status · toggles ── */}
        <Box
          className="esti-dash-rail"
          sx={{
            flex: { xs: "0 0 auto", md: "0 0 20%" },
            maxWidth: { md: "20%" },
            minWidth: 0,
            width: { xs: "100%", md: "auto" },
            overflowY: { xs: "visible", md: "auto" },
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          {/* Greeting — top of the rail */}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 300, lineHeight: 1.15, mt: 0 }}>{greetingFor()},</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, lineHeight: 1.15 }}>{firstName}</Typography>
            {companyName && <Typography variant="caption" color="text.secondary">{companyName}</Typography>}
          </Box>

          {/* Orchestration lives in the rail — visible only while ESTI is working. */}
          <EstiOrchestrationStatus />

          {/* Attention update — below the greeting */}
          <Typography variant="body2" color="text.secondary">
            {attn.issue} — {attn.action}
          </Typography>

          {/* Today */}
          <Box>
            <Typography variant="overline" color="text.secondary">Today</Typography>
            <Box sx={{ mt: 0.5, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", width: 1 }}>
              {[
                { label: "Tasks", value: glanceQ.data?.pendingTasks },
                { label: "Meetings", value: glanceQ.data?.meetingsToday },
                { label: "Visits", value: glanceQ.data?.siteVisitsToday },
              ].map((s, i) => (
                <Box
                  key={s.label}
                  sx={{
                    minWidth: 0,
                    px: 0.5,
                    textAlign: "center",
                    borderLeft: i > 0 ? 1 : 0,
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" noWrap>{s.label}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 300 }}>{s.value ?? "—"}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Office health — glass orb (same UI as zone health) */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1, borderTop: 1, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>Office health</Typography>
            <Box sx={{ flex: 1 }} />
            <OfficeHealthGlyph state={officeState} variant="glass" title={STATE_WORD[officeState]} />
            <Typography sx={{ fontWeight: 300, textTransform: "capitalize" }} noWrap>{STATE_WORD[officeState]}</Typography>
          </Box>

          {/* Due dates — all statutory filings in a single row */}
          <Box>
            <Typography variant="overline" color="text.secondary">Due dates</Typography>
            <Box sx={{ mt: 0.5, display: "grid", gridTemplateColumns: `repeat(${filingDue.length}, 1fr)` }}>
              {filingDue.map((f, i) => (
                <Box key={f.name} sx={{ minWidth: 0, p: 0.5, borderLeft: i > 0 ? 1 : 0, borderColor: "divider" }}>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: TYPE_SCALE.micro, display: "block" }}>{f.name}</Typography>
                  <Typography sx={{ fontWeight: 300, fontSize: TYPE_SCALE.body2, lineHeight: 1.1 }} noWrap>{f.date}</Typography>
                  <Typography variant="caption" noWrap sx={{ fontSize: TYPE_SCALE.micro, color: f.days <= 3 ? "error.main" : f.days <= 7 ? "warning.main" : "text.secondary" }}>{f.days}d</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Module toggles + hydration — bottom of the rail; one row each */}
          <Box sx={{ mt: "auto", pt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            {moduleToggles}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 38 }}>
              <WaterDropOutlined fontSize="small" color="action" />
              <Typography variant="body2" sx={{ flex: 1 }} noWrap>Hydration reminder</Typography>
              <Switch
                size="small"
                sx={railToggleSwitchSx}
                checked={wellnessPrefs.hydrationEnabled}
                onChange={(e) => setWellnessPrefs({ hydrationEnabled: e.target.checked })}
                slotProps={{ input: { "aria-label": "Hydration reminder" } }}
              />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 38 }}>
              <FitnessCenter fontSize="small" color="action" />
              <Typography variant="body2" sx={{ flex: 1 }} noWrap>Stretch reminder</Typography>
              <Switch
                size="small"
                sx={railToggleSwitchSx}
                checked={wellnessPrefs.stretchEnabled}
                onChange={(e) => setWellnessPrefs({ stretchEnabled: e.target.checked })}
                slotProps={{ input: { "aria-label": "Stretch reminder" } }}
              />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 38 }}>
              <RemoveRedEye fontSize="small" color="action" />
              <Typography variant="body2" sx={{ flex: 1 }} noWrap>Eye break reminder</Typography>
              <Switch
                size="small"
                sx={railToggleSwitchSx}
                checked={wellnessPrefs.eyeExerciseEnabled}
                onChange={(e) => setWellnessPrefs({ eyeExerciseEnabled: e.target.checked })}
                slotProps={{ input: { "aria-label": "Eye break reminder" } }}
              />
            </Box>
          </Box>
        </Box>

        {/* ── STAGE (80%) — tabs + tab content ─────────────────────────────── */}
        <Box
          className="esti-dash-stage"
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            height: { md: "100%" },
            overflowY: { xs: "visible", md: "auto" },
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Studio Intelligence sections"
            sx={{
              flexShrink: 0,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Tab value="priorities" label="ESTI" />
            <Tab value="projects" label="Projects" />
            <Tab value="work" label="Work" />
            {hrEnabled && <Tab value="team" label="Team" />}
            <Tab value="zoning" label="Zonal compliance" />
          </Tabs>

          {tab === "priorities" && (
            <Box
              className={`esti-esti-tab${estiExpanded ? " esti-esti-tab--focus" : ""}`}
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              {estiSignalsPanel}

              <Box className="esti-priorities-focus" sx={{ flexShrink: 0 }}>
                <SectionCard
                  title="ESTI priorities"
                  action={(
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                      {estiExpanded ? (
                        <Button size="small" variant="text" onClick={() => setEstiExpanded(false)}>
                          Show all
                        </Button>
                      ) : (
                        <Button size="small" variant="text" onClick={() => setEstiExpanded(true)}>
                          Focus
                        </Button>
                      )}
                    </Stack>
                  )}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    ESTI suggests you do these things first — refresh rankings when you want ESTI to re-score from latest task and site data.
                  </Typography>
                  {estiActionRows.length === 0
                    ? emptyText("No priorities yet — refresh rankings to have ESTI score your active work.")
                    : (
                      <DataGrid
                        rows={estiActionRows}
                        columns={estiSuggestCols}
                        onRowClick={(p) => p.row.href && navigate(p.row.href)}
                        {...actionGridProps}
                      />
                    )}
                </SectionCard>
              </Box>

              {!estiExpanded && (
                <>
                  <Sep />
                  <SectionCard title="Action items">
                    {officeActionRows.length === 0
                      ? emptyText("No office action items — billing, approvals and delivery are on track.")
                      : (
                        <DataGrid
                          rows={officeActionRows}
                          columns={officeActionCols}
                          onRowClick={(p) => p.row.href && navigate(p.row.href)}
                          {...actionGridProps}
                        />
                      )}
                  </SectionCard>
                  <Sep />
                  <SectionCard title="Top risks">
                    {topRisks.length === 0 ? emptyText("No elevated risks right now.") : (
                      <Stack spacing={1}>
                        {topRisks.map((r) => (
                          <Stack
                            key={r.key}
                            direction="row"
                            spacing={1}
                            role="link"
                            tabIndex={0}
                            aria-label={`${r.label} — ${r.detail}`}
                            sx={{ alignItems: "center", cursor: "pointer" }}
                            onClick={() => navigate(r.href)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                navigate(r.href);
                              }
                            }}
                          >
                            <OfficeHealthGlyph state={r.state} size={12} variant="glass" />
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
            </Box>
          )}

          {tab === "projects" && (
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <TabSplit
              title="Project health"
              action={
                <Stack spacing={1}>
                  <ZoneChip state={ps} label={projectSignal(ps)} />
                  <Typography variant="caption" color="text.secondary">
                    {riskProjects.length} critical · {watchProjects.length} watch
                  </Typography>
                </Stack>
              }
            >
              {atRiskProjects.length === 0
                ? emptyText("All projects are on track.")
                : <DataGrid rows={phRows} columns={phCols} onRowClick={(p) => navigate(projectIssueHref(p.row))} {...gridProps} />}
            </TabSplit>
            </Box>
          )}

          {tab === "work" && (
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <>
              <TabSplit
                title="Work queue"
                action={<StatusDot color={tasksOverdue > 0 ? "warm-gray" : "green"} label={`${tasks.length} open · ${tasksOverdue} overdue`} />}
              >
                {tasks.length === 0 ? emptyText("No active tasks.") : (
                  <DataGrid rows={wqRows} columns={wqCols} onRowClick={(p) => navigate(taskHref(p.row.id))} {...gridProps} />
                )}
              </TabSplit>
              <Sep />
              <TabSplit
                title="Approvals"
                action={<StatusDot color={pendingCount > 0 ? tagKind(cs) : "green"} label={`${pendingCount} pending`} />}
              >
                {pending.length === 0 ? emptyText("No approvals pending.") : (
                  <DataGrid rows={apRows} columns={apCols} onRowClick={(p) => navigate(`/projects/${p.row.projectId}?tab=approvals&approvalId=${p.row.id}`)} {...gridProps} />
                )}
              </TabSplit>
            </>
            </Box>
          )}

          {tab === "team" && (
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <TabSplit
              title="Team workload"
              action={
                <Stack spacing={1}>
                  <ZoneChip state={ts} label={teamSignal(ts)} />
                  <Typography variant="caption" color="text.secondary">
                    {att ? `${att.present}/${att.headcount} present` : `${ti.length} members`}
                  </Typography>
                </Stack>
              }
            >
              <StudioTeamPanel members={ti} attendance={att} />
            </TabSplit>
            </Box>
          )}

          {tab === "zoning" && (
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <ZonalComplianceCalculator />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
