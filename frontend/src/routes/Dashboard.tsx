import {
  Button,
  ClickableTile,
  Column,
  Grid,
  InlineLoading,
  ProgressBar,
  Stack,
  StructuredListWrapper,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { DonutChart, SimpleBarChart } from "@carbon/charts-react";
import { ScaleTypes } from "@carbon/charts";
import {
  ACTIVITY_DOMAIN_TAG,
  activityDomain,
  can,
  formatINRShort,
  PERFORMANCE_BAND_LABEL,
  PERFORMANCE_BAND_TAG,
  type PerformanceBand,
} from "@esti/contracts";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { useAppTheme } from "../lib/theme-context.js";
import { trpc } from "../lib/trpc.js";
import { QualityIntelligenceTiles } from "../components/QualityIntelligenceTiles.js";
import { ClockLeavesWidget } from "../components/ClockLeavesWidget.js";

// ─── constants ────────────────────────────────────────────────────────────────

const CHART_HEIGHT = "240px";

type TagType =
  | "red" | "magenta" | "green" | "blue" | "teal" | "gray"
  | "purple" | "cyan" | "cool-gray" | "warm-gray" | "high-contrast" | "outline";

const HEALTH_LABEL: Record<string, string> = { RED: "At risk", YELLOW: "Watch", GREEN: "Healthy" };
const HEALTH_TAG: Record<string, "red" | "magenta" | "green"> = {
  RED: "red",
  YELLOW: "magenta",
  GREEN: "green",
};
const CAPACITY_LABEL: Record<string, string> = {
  OVERLOADED: "Overloaded",
  BUSY: "Busy",
  HEALTHY: "Available",
};
const CAPACITY_TAG: Record<string, "red" | "magenta" | "green"> = {
  OVERLOADED: "red",
  BUSY: "magenta",
  HEALTHY: "green",
};
const RISK_TAG: Record<"LOW" | "MEDIUM" | "HIGH", "red" | "magenta" | "green"> = {
  HIGH: "red",
  MEDIUM: "magenta",
  LOW: "green",
};

function formatEventType(et: string): string {
  return et
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

// ─── date helpers (statutory filing) ─────────────────────────────────────────

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (new Date(`${iso}T00:00:00`).getTime() - today.getTime()) / 86400000,
  );
}
function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function nextMonthlyDue(day: number): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let y = now.getFullYear(),
    m = now.getMonth();
  if (now.getDate() > day) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return isoDate(y, m, day);
}
function nextTdsReturnDue(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadlines = [
    { m: 6, d: 31 },
    { m: 9, d: 31 },
    { m: 0, d: 31 },
    { m: 4, d: 31 },
  ];
  const y = now.getFullYear();
  const cands: Date[] = [];
  for (const off of [0, 1])
    for (const dl of deadlines) cands.push(new Date(y + off, dl.m, dl.d));
  cands.sort((a, b) => a.getTime() - b.getTime());
  const next = cands.find((c) => c.getTime() >= now.getTime()) ?? cands[0]!;
  return isoDate(next.getFullYear(), next.getMonth(), next.getDate());
}
function dueTagType(days: number): "red" | "magenta" | "blue" {
  return days <= 3 ? "red" : days <= 7 ? "magenta" : "blue";
}
function dueLabel(days: number) {
  return days === 0 ? "Due today" : days < 0 ? `${-days}d overdue` : `${days}d left`;
}

// ─── Health edge — the card's single side signal ─────────────────────────────
// A 3px left border (Carbon notification anatomy) marks whether a card needs
// attention. The edge is the card-level status; coloured tags carry per-item
// meaning. Carbon support tokens only.

type CardHealth = "alert" | "watch" | "ok" | "neutral";

const EDGE_COLOR: Record<CardHealth, string> = {
  alert: "var(--cds-support-error)",
  watch: "var(--cds-support-warning)",
  ok: "var(--cds-support-success)",
  neutral: "var(--cds-border-subtle-01)",
};

function edge(health: CardHealth) {
  return { borderLeft: `3px solid ${EDGE_COLOR[health]}` };
}

// ─── ZoneTile — full-width section header; arrow = navigates to the module ────

function ZoneTile({
  navigate,
  title,
  sub,
  to,
  statusTag,
}: {
  navigate: (to: string) => void;
  title: string;
  sub?: string;
  to?: string;
  statusTag?: { text: string; type: TagType };
}) {
  const inner = (
    <div className="esti-row">
      <div className="esti-grow">
        <Stack gap={3}>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
        </Stack>
      </div>
      {statusTag && (
        <Tag type={statusTag.type} size="sm">
          {statusTag.text}
        </Tag>
      )}
      {to && <ArrowRight size={20} />}
    </div>
  );
  return to ? (
    <ClickableTile className="esti-fill" onClick={() => navigate(to)}>{inner}</ClickableTile>
  ) : (
    <Tile className="esti-fill">{inner}</Tile>
  );
}

// ─── KpiChip — label / value / context tag; arrow signals clickability ───────

function KpiChip({
  label,
  value,
  health,
  tagType,
  tagText,
  onClick,
  loading,
}: {
  label: string;
  value: string | number;
  health: CardHealth;
  tagType: TagType;
  tagText?: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  const body = (
    <Stack gap={3}>
      <div className="esti-row-between">
        <p>{label}</p>
        {onClick && <ArrowRight size={16} />}
      </div>
      <h3>{loading ? "…" : value}</h3>
      {tagText && (
        <Tag type={tagType} size="sm">
          {tagText}
        </Tag>
      )}
    </Stack>
  );
  return onClick ? (
    <ClickableTile className="esti-fill" style={edge(health)} onClick={onClick}>
      {body}
    </ClickableTile>
  ) : (
    <Tile className="esti-fill" style={edge(health)}>
      {body}
    </Tile>
  );
}

// ─── FilingTile — statutory due dates; arrow → filing ────────────────────────

function FilingTile({
  navigate,
  title,
  rows,
}: {
  navigate: (to: string) => void;
  title: string;
  rows: { label: string; iso: string }[];
}) {
  const worst = Math.min(...rows.map((r) => daysUntil(r.iso)));
  const health: CardHealth = worst <= 3 ? "alert" : worst <= 7 ? "watch" : "neutral";
  return (
    <Column lg={4} md={4} sm={4}>
      <ClickableTile
        className="esti-fill"
        style={edge(health)}
        onClick={() => navigate("/filing")}
      >
        <Stack gap={5}>
          <div className="esti-row">
            <h4 className="esti-grow">{title}</h4>
            <ArrowRight size={16} />
          </div>
          <Stack gap={4}>
            {rows.map((r) => {
              const days = daysUntil(r.iso);
              return (
                <Stack key={r.label} orientation="horizontal" gap={3}>
                  <div className="esti-grow">
                    <p>{r.label}</p>
                  </div>
                  <Tag type={dueTagType(days)} size="sm">{dueLabel(days)}</Tag>
                </Stack>
              );
            })}
          </Stack>
        </Stack>
      </ClickableTile>
    </Column>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

// ─── My space — my tasks and leave ───────────────────────────────────────────

const MY_PRIORITY_TAG: Record<string, "red" | "magenta" | "blue" | "gray"> = {
  CRITICAL: "red", HIGH: "magenta", MEDIUM: "blue", LOW: "gray",
};

function MyTasksTile() {
  const navigate = useNavigate();
  const tasksQ = trpc.tasks.list.useQuery({ myTasks: true });
  const today = new Date().toISOString().slice(0, 10);
  const open = (tasksQ.data ?? []).filter((t) => t.status !== "DONE");
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);

  return (
    <Tile className="esti-fill">
      <Stack gap={4}>
        <Stack orientation="horizontal" gap={3}>
          <h3 className="esti-grow">My tasks</h3>
          {!tasksQ.isLoading && <Tag type={overdue.length ? "red" : "blue"} size="sm">{open.length} open</Tag>}
        </Stack>
        {tasksQ.isLoading ? (
          <InlineLoading description="Loading…" />
        ) : open.length === 0 ? (
          <p>No open tasks assigned to you.</p>
        ) : (
          <Stack gap={3}>
            {open.slice(0, 4).map((t) => {
              const isOverdue = t.dueDate ? t.dueDate < today : false;
              return (
                <Stack key={t.id} orientation="horizontal" gap={2}>
                  <div className="esti-grow">
                    <p>{t.title}</p>
                    {t.projectRef && <span className="esti-label esti-label--helper">{t.projectRef}</span>}
                  </div>
                  <Tag type={isOverdue ? "red" : MY_PRIORITY_TAG[t.priority] ?? "gray"} size="sm">
                    {isOverdue ? "Overdue" : t.priority}
                  </Tag>
                </Stack>
              );
            })}
            {open.length > 4 && <span className="esti-label esti-label--helper">+{open.length - 4} more</span>}
          </Stack>
        )}
        <Button kind="ghost" size="sm" renderIcon={ArrowRight} onClick={() => navigate("/tasks?tab=tasks")}>Open Work</Button>
      </Stack>
    </Tile>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const chartTheme = useAppTheme();

  const summary = trpc.dashboard.summary.useQuery();
  const boardsQ = trpc.dashboard.boards.useQuery();
  const acQ = trpc.dashboard.actionCenter.useQuery();
  const fhQ = trpc.dashboard.financialHealth.useQuery();
  const phQ = trpc.dashboard.projectHealth.useQuery();
  const ciQ = trpc.dashboard.clientIntelligence.useQuery();
  const riQ = trpc.dashboard.revisionIntelligence.useQuery();
  const techIQ = trpc.dashboard.technicalIntelligence.useQuery();
  const activityQ = trpc.activity.listOffice.useQuery({ limit: 4, visibility: "STAFF" });

  const settingsQ = trpc.settings.get.useQuery();
  const showFinancial = settingsQ.data?.financialEnabled ?? true;
  const showProject = settingsQ.data?.projectEnabled ?? true;
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;

  const tiQ = trpc.dashboard.teamIntelligence.useQuery(undefined, { enabled: hrEnabled });
  const attQ = trpc.dashboard.attendanceToday.useQuery(undefined, { enabled: hrEnabled });
  const aspQ = trpc.aspRf.teamScores.useQuery(undefined, { enabled: hrEnabled });

  const s = summary.data;
  const b = boardsQ.data;
  const summaryLoading = summary.isLoading && !s;
  const boardsLoading = boardsQ.isLoading && !b;

  const canFees = can(user?.role, "fees:manage");

  // Action Center — five urgency categories (capacity alerts only when HR is on).
  const billingReady = acQ.data?.billingReadyPhases ?? [];
  const overdueInvoices = acQ.data?.overdueInvoices ?? [];
  const pendingApprovals = acQ.data?.pendingApprovals ?? [];
  const riskProjects = (phQ.data ?? []).filter((p) => p.health === "RED");
  const overloadedMembers = hrEnabled
    ? (tiQ.data ?? []).filter((m) => m.capacity === "OVERLOADED")
    : [];
  const acTotal =
    billingReady.length +
    overdueInvoices.length +
    pendingApprovals.length +
    riskProjects.length +
    overloadedMembers.length;

  const readyToBillSum = billingReady.reduce(
    (sum, ph) => sum + Math.round((ph.billingPct * ph.contractValuePaise) / 100),
    0,
  );

  // Financial charts.
  const revenueData = fhQ.data
    ? [
        { group: "Active pipeline", value: fhQ.data.activePipelinePaise },
        { group: "Proposal pipeline", value: fhQ.data.proposalPipelinePaise },
        { group: "Ready to bill", value: fhQ.data.readyToBillPaise },
        { group: "Outstanding", value: fhQ.data.outstandingPaise },
        { group: "Collected FY", value: fhQ.data.collectedFyPaise },
      ].filter((d) => d.value > 0)
    : [];
  const agingData = [
    { group: "0–30 days", value: b?.receivablesAging.d0_30 ?? 0 },
    { group: "31–60 days", value: b?.receivablesAging.d31_60 ?? 0 },
    { group: "60+ days", value: b?.receivablesAging.d60p ?? 0 },
  ];
  const agingEmpty = agingData.every((d) => d.value === 0);

  // Team ASPRF cards — only when HR module is on.
  const capacityByName = new Map((tiQ.data ?? []).map((m) => [m.assignee, m]));
  const teamCards = hrEnabled ? (aspQ.data ?? []).slice(0, 4) : [];

  const hasActivity = (activityQ.data?.rows.length ?? 0) > 0;
  const hasClients = (ciQ.data?.length ?? 0) > 0;

  return (
    <Grid fullWidth condensed className="esti-dash">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <Column lg={16} md={8} sm={4}>
        <Stack gap={3}>
          <h1>Office dashboard</h1>
          {user?.fullName && (
            <p>Welcome, Ar. {user.fullName.replace(/^Ar\.?\s+/i, "").split(" ")[0]}</p>
          )}
        </Stack>
      </Column>

      {/* ═══ Overall · office pulse ═══════════════════════════════════════ */}
      <Column lg={16} md={8} sm={4}>
        <ZoneTile
          navigate={navigate}
          title="Office overview"
          sub={hrEnabled ? "Billing, delivery, and team at a glance." : "Billing and delivery at a glance."}
        />
      </Column>

      {/* KPI strip — four answers, one row ═════════════════════════ */}
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Ready to bill"
          value={formatINRShort(fhQ.data?.readyToBillPaise ?? 0)}
          health={billingReady.length > 0 ? "ok" : "neutral"}
          tagType={billingReady.length > 0 ? "green" : "gray"}
          tagText={`${billingReady.length} phase${billingReady.length !== 1 ? "s" : ""}`}
          onClick={() => navigate("/invoices")}
          loading={fhQ.isLoading || acQ.isLoading}
        />
      </Column>
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Outstanding collections"
          value={formatINRShort(fhQ.data?.outstandingPaise ?? 0)}
          health={(fhQ.data?.overdue30dPaise ?? 0) > 0 ? "alert" : "neutral"}
          tagType={(fhQ.data?.overdue30dPaise ?? 0) > 0 ? "red" : "gray"}
          tagText={
            (fhQ.data?.overdue30dPaise ?? 0) > 0
              ? `${formatINRShort(fhQ.data!.overdue30dPaise)} overdue 30d+`
              : "Nothing overdue"
          }
          onClick={() => navigate("/invoices")}
          loading={fhQ.isLoading}
        />
      </Column>
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Active projects"
          value={s?.projects.byStatus.ACTIVE ?? 0}
          health={riskProjects.length > 0 ? "alert" : "ok"}
          tagType={riskProjects.length > 0 ? "red" : "blue"}
          tagText={
            riskProjects.length > 0
              ? `${riskProjects.length} at risk`
              : "All on track"
          }
          onClick={() => navigate("/projects")}
          loading={summaryLoading || phQ.isLoading}
        />
      </Column>
      <Column lg={4} md={4} sm={2}>
        {hrEnabled ? (
          <KpiChip
            label="Attendance today"
            value={
              attQ.data
                ? `${attQ.data.present + attQ.data.wfh}/${attQ.data.headcount}`
                : "—"
            }
            health={
              attQ.data && attQ.data.absent > 0
                ? "watch"
                : attQ.data && attQ.data.marked >= attQ.data.headcount
                  ? "ok"
                  : "neutral"
            }
            tagType={
              attQ.data && attQ.data.absent > 0
                ? "magenta"
                : attQ.data && attQ.data.marked > 0
                  ? "green"
                  : "gray"
            }
            tagText={
              attQ.data
                ? attQ.data.marked === 0
                  ? "Register not marked"
                  : `${attQ.data.absent} absent · ${attQ.data.wfh} WFH`
                : "No team data"
            }
            onClick={() => navigate("/tasks?tab=attendance")}
            loading={attQ.isLoading}
          />
        ) : (
          <KpiChip
            label="Tasks due today"
            value={b?.tasksDueToday ?? 0}
            health={(b?.tasksDueToday ?? 0) > 0 ? "watch" : "neutral"}
            tagType={(b?.tasksDueToday ?? 0) > 0 ? "magenta" : "gray"}
            tagText={(b?.tasksDueToday ?? 0) > 0 ? "Open or overdue" : "Nothing due"}
            onClick={() => navigate("/tasks?tab=tasks")}
            loading={boardsLoading}
          />
        )}
      </Column>

      {/* ═══ Personal · your workload ═════════════════════════════════════ */}
      <Column lg={16} md={8} sm={4}>
        <ZoneTile
          navigate={navigate}
          title="Personal"
          sub={hrEnabled ? "Tasks assigned to you and leave balance." : "Tasks assigned to you."}
        />
      </Column>
      <Column lg={8} md={4} sm={4}><MyTasksTile /></Column>
      <Column lg={8} md={4} sm={4}><ClockLeavesWidget hrEnabled={hrEnabled} /></Column>

      {/* ═══ Action Center — what needs attention now ═════════════════════ */}
      <Column lg={16} md={8} sm={4}>
        <ZoneTile
          navigate={navigate}
          title="Action Center"
          sub="Billing, approvals, and risk items that need a decision today."
          statusTag={
            !acQ.isLoading && !phQ.isLoading && (!hrEnabled || !tiQ.isLoading)
              ? { text: acTotal > 0 ? `${acTotal} open` : "All clear", type: acTotal > 0 ? "red" : "green" }
              : undefined
          }
        />
      </Column>

      <Column lg={4} md={4} sm={4}>
        <Tile className="esti-fill" style={edge(overdueInvoices.length > 0 ? "alert" : "ok")}>
          <Stack gap={4}>
            <h4>Overdue collections</h4>
            {acQ.isLoading ? (
              <InlineLoading description="Loading…" />
            ) : overdueInvoices.length === 0 ? (
              <p>None beyond 30 days.</p>
            ) : (
              <StructuredListWrapper isCondensed>
                <StructuredListBody>
                  {overdueInvoices.slice(0, 4).map((inv) => (
                    <StructuredListRow key={inv.id}>
                      <StructuredListCell>
                        <Link to={`/projects/${inv.projectId}?tab=invoices`}>
                          {inv.ref}
                        </Link>
                        <p>{formatINRShort(inv.netReceivablePaise)}</p>
                      </StructuredListCell>
                      <StructuredListCell noWrap>
                        <Tag type="red" size="sm">{inv.daysOverdue}d overdue</Tag>
                      </StructuredListCell>
                    </StructuredListRow>
                  ))}
                </StructuredListBody>
              </StructuredListWrapper>
            )}
          </Stack>
        </Tile>
      </Column>

      <Column lg={4} md={4} sm={4}>
        <Tile className="esti-fill" style={edge(pendingApprovals.length > 0 ? "watch" : "ok")}>
          <Stack gap={4}>
            <h4>Approvals pending</h4>
            {acQ.isLoading ? (
              <InlineLoading description="Loading…" />
            ) : pendingApprovals.length === 0 ? (
              <p>None awaiting client response.</p>
            ) : (
              <StructuredListWrapper isCondensed>
                <StructuredListBody>
                  {pendingApprovals.slice(0, 4).map((ap) => (
                    <StructuredListRow key={ap.id}>
                      <StructuredListCell>
                        <Link to={`/projects/${ap.projectId}?tab=approvals`}>
                          {ap.projectRef}
                        </Link>
                        <p>{ap.title}</p>
                      </StructuredListCell>
                      <StructuredListCell noWrap>
                        <Tag type="magenta" size="sm">{ap.daysWaiting}d waiting</Tag>
                      </StructuredListCell>
                    </StructuredListRow>
                  ))}
                </StructuredListBody>
              </StructuredListWrapper>
            )}
          </Stack>
        </Tile>
      </Column>

      <Column lg={4} md={4} sm={4}>
        <ClickableTile
          className="esti-fill"
          style={edge(billingReady.length > 0 ? "ok" : "neutral")}
          onClick={() => navigate("/invoices")}
        >
          <Stack gap={4}>
            <div className="esti-row">
              <h4 className="esti-grow">Ready to bill</h4>
              <ArrowRight size={16} />
            </div>
            {acQ.isLoading ? (
              <InlineLoading description="Loading…" />
            ) : (
              <Stack gap={3}>
                <h3>{billingReady.length}</h3>
                <p>
                  Phase{billingReady.length !== 1 ? "s" : ""} awaiting invoice ·{" "}
                  {formatINRShort(readyToBillSum)} estimated
                </p>
              </Stack>
            )}
          </Stack>
        </ClickableTile>
      </Column>

      <Column lg={4} md={4} sm={4}>
        <Tile
          className="esti-fill"
          style={edge(
            riskProjects.length > 0 || (hrEnabled && overloadedMembers.length > 0) ? "alert" : "ok",
          )}
        >
          <Stack gap={4}>
            <h4>{hrEnabled ? "Risk & capacity" : "Project risk"}</h4>
            <Stack gap={2}>
              <p className="esti-label">High-risk projects</p>
              {riskProjects.length === 0 ? (
                <p>None at risk.</p>
              ) : (
                riskProjects.slice(0, 2).map((p) => (
                  <p key={p.id}>
                    <Link to={`/projects/${p.id}`}>{p.ref}</Link> {p.title}
                  </p>
                ))
              )}
            </Stack>
            {hrEnabled && (
              <Stack gap={2}>
                <p className="esti-label">Capacity alerts</p>
                {overloadedMembers.length === 0 ? (
                  <p>No one overloaded.</p>
                ) : (
                  overloadedMembers.slice(0, 2).map((m) => (
                    <p key={m.assignee}>
                      {m.assignee} — {m.totalOpen} open, {m.overdueCount} overdue
                    </p>
                  ))
                )}
              </Stack>
            )}
          </Stack>
        </Tile>
      </Column>

      {/* ═══ Company · delivery & people ══════════════════════════════════ */}
      <Column lg={16} md={8} sm={4}>
        <ZoneTile
          navigate={navigate}
          title="Company"
          sub={
            hrEnabled
              ? "Projects, clients, team performance, and delivery quality."
              : "Projects, clients, and delivery quality."
          }
        />
      </Column>

      {/* ═══ 4 · Project health ════════════════════════════════════════════ */}
      {showProject && (
        <>
          <Column lg={16} md={8} sm={4}>
            <ZoneTile navigate={navigate} title="Project health" to="/projects" />
          </Column>
          <Column lg={16} md={8} sm={4}>
            <Tile
              className="esti-fill"
              style={edge(
                riskProjects.length > 0
                  ? "alert"
                  : (phQ.data ?? []).some((p) => p.health === "YELLOW")
                    ? "watch"
                    : "ok",
              )}
            >
              <Stack gap={5}>
                {phQ.isLoading ? (
                  <InlineLoading description="Loading projects…" />
                ) : (phQ.data?.length ?? 0) === 0 ? (
                  <p>No active projects.</p>
                ) : (
                  <TableContainer>
                    <Table size="sm">
                      <TableHead>
                        <TableRow>
                          <TableHeader>Project</TableHeader>
                          <TableHeader>Phase</TableHeader>
                          <TableHeader>Progress</TableHeader>
                          <TableHeader>Signals</TableHeader>
                          <TableHeader>Health</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {phQ.data!.slice(0, 8).map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              <Link to={`/projects/${p.id}`}>{p.ref}</Link>
                              <p>{p.title}</p>
                            </TableCell>
                            <TableCell>{p.currentPhase ?? "—"}</TableCell>
                            <TableCell>
                              <ProgressBar
                                label={`${p.ref} progress`}
                                hideLabel
                                size="small"
                                value={p.progressPct}
                                max={100}
                                helperText={`${p.progressPct}%`}
                              />
                            </TableCell>
                            <TableCell>
                              <Stack orientation="horizontal" gap={2}>
                                {p.unbilledPhases > 0 && (
                                  <Tag type="green" size="sm">{p.unbilledPhases} billable</Tag>
                                )}
                                {p.overdueInvoices > 0 && (
                                  <Tag type="red" size="sm">{p.overdueInvoices} overdue inv</Tag>
                                )}
                                {p.overdueTasks > 0 && (
                                  <Tag type="magenta" size="sm">{p.overdueTasks} late tasks</Tag>
                                )}
                                {p.staleApprovals > 0 && (
                                  <Tag type="magenta" size="sm">{p.staleApprovals} stale appr</Tag>
                                )}
                                {p.criticalNotesOpen > 0 && (
                                  <Tag type="red" size="sm">{p.criticalNotesOpen} critical</Tag>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Tag type={HEALTH_TAG[p.health]} size="sm">
                                {HEALTH_LABEL[p.health]}
                              </Tag>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </Tile>
          </Column>
        </>
      )}

      {/* ═══ 5 · Clients ═══════════════════════════════════════════════════ */}
      {hasClients && (
        <>
          <Column lg={16} md={8} sm={4}>
            <ZoneTile navigate={navigate} title="Client signals" to="/clients" />
          </Column>
          <Column lg={16} md={8} sm={4}>
            <Tile
              className="esti-fill"
              style={edge(
                (ciQ.data ?? []).some((c) => c.risk === "HIGH")
                  ? "alert"
                  : (ciQ.data ?? []).some((c) => c.risk === "MEDIUM")
                    ? "watch"
                    : "ok",
              )}
            >
              <Stack gap={5}>
                <TableContainer>
                  <Table size="sm">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Client</TableHeader>
                        <TableHeader>Projects</TableHeader>
                        <TableHeader>Outstanding</TableHeader>
                        <TableHeader>Oldest invoice</TableHeader>
                        <TableHeader>Approval lag</TableHeader>
                        <TableHeader>Revisions</TableHeader>
                        <TableHeader>Risk</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ciQ.data!.slice(0, 6).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.name}</TableCell>
                          <TableCell>{c.activeProjects}</TableCell>
                          <TableCell>
                            {c.outstandingPaise > 0 ? formatINRShort(c.outstandingPaise) : "—"}
                          </TableCell>
                          <TableCell>
                            {c.oldestInvoiceDays > 0 ? `${c.oldestInvoiceDays}d` : "—"}
                          </TableCell>
                          <TableCell>
                            {c.avgApprovalDays > 0 ? `${c.avgApprovalDays}d avg` : "—"}
                          </TableCell>
                          <TableCell>{c.revisionRequests}</TableCell>
                          <TableCell>
                            <Tag type={RISK_TAG[c.risk]} size="sm">{c.risk}</Tag>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            </Tile>
          </Column>
        </>
      )}

      {/* ═══ 6 · Team ══════════════════════════════════════════════════════ */}
      {teamCards.length > 0 && (
        <>
          <Column lg={16} md={8} sm={4}>
            <ZoneTile
              navigate={navigate}
              title="Team performance"
              sub="Rolling 30-day ASPRF scores."
              to="/performance"
            />
          </Column>
          {teamCards.map((m) => {
            const cap = capacityByName.get(m.memberName);
            const band = m.band as PerformanceBand | null;
            const capHealth: CardHealth =
              cap?.capacity === "OVERLOADED" ? "alert" : cap?.capacity === "BUSY" ? "watch" : "ok";
            return (
              <Column key={m.teamMemberId} lg={4} md={4} sm={4}>
                <ClickableTile
                  className="esti-fill"
                  style={edge(capHealth)}
                  onClick={() => navigate("/performance")}
                >
                  <Stack gap={4}>
                    <div className="esti-row-between">
                      <Stack gap={3}>
                        <p>{m.memberRole}</p>
                        <h4>{m.memberName}</h4>
                      </Stack>
                      <ArrowRight size={16} />
                    </div>
                    <h3>{m.score}</h3>
                    <Stack orientation="horizontal" gap={2}>
                      <Tag type={band ? PERFORMANCE_BAND_TAG[band] : "gray"} size="sm">
                        {band ? PERFORMANCE_BAND_LABEL[band] : "Developing"}
                      </Tag>
                      {cap && (
                        <Tag type={CAPACITY_TAG[cap.capacity] ?? "gray"} size="sm">
                          {CAPACITY_LABEL[cap.capacity] ?? cap.capacity}
                        </Tag>
                      )}
                    </Stack>
                    <p>
                      {cap?.totalOpen ?? 0} open · {cap?.overdueCount ?? m.overdueCount} overdue ·{" "}
                      {m.totalPoints} pts
                    </p>
                  </Stack>
                </ClickableTile>
              </Column>
            );
          })}
        </>
      )}

      {/* ═══ 7 · Quality intelligence ══════════════════════════════════════ */}
      <Column lg={16} md={8} sm={4}>
        <ZoneTile
          navigate={navigate}
          title="Quality intelligence"
          sub="Studio quality profile, revision sources, and drawing accuracy from the CRIF ledger."
          to="/projects"
        />
      </Column>

      <Column lg={16} md={8} sm={4}>
        <QualityIntelligenceTiles
          revision={riQ.data ?? null}
          technical={techIQ.data ?? null}
          revisionLoading={riQ.isLoading}
          technicalLoading={techIQ.isLoading}
          chartTheme={chartTheme}
        />
      </Column>

      {hasActivity && (
        <Column lg={16} md={8} sm={4}>
          <ClickableTile
            className="esti-fill"
            style={edge("neutral")}
            onClick={() => navigate("/tasks?tab=activity")}
          >
            <Stack gap={5}>
              <div className="esti-row">
                <h4 className="esti-grow">Recent activity</h4>
                <ArrowRight size={16} />
              </div>
              <Stack gap={4}>
                {activityQ.data!.rows.map((item) => (
                  <Stack key={item.id} gap={2}>
                    <Stack orientation="horizontal" gap={3}>
                      <Tag size="sm" type={ACTIVITY_DOMAIN_TAG[activityDomain(item.eventType)]}>
                        {formatEventType(item.eventType)}
                      </Tag>
                      <p>
                        {new Date(
                          item.createdAt as unknown as string,
                        ).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </Stack>
                    <p>{item.summary}</p>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </ClickableTile>
        </Column>
      )}

      {/* ═══ Financial · revenue & filing ═══════════════════════════════════ */}
      <Column lg={16} md={8} sm={4}>
        <ZoneTile
          navigate={navigate}
          title="Financial"
          sub="Revenue, receivables, and GST/TDS filing."
        />
      </Column>

      {canFees && showFinancial && (
        <>
          <Column lg={16} md={8} sm={4}>
            <ZoneTile navigate={navigate} title="Financial health" to="/invoices" />
          </Column>
          <Column lg={8} md={8} sm={4}>
            <Tile className="esti-fill" style={edge("neutral")}>
              <Stack gap={5}>
                <h4>Revenue breakdown</h4>
                {fhQ.isLoading ? (
                  <InlineLoading description="Loading…" />
                ) : revenueData.length === 0 ? (
                  <p>No financial data yet.</p>
                ) : (
                  <div className="esti-chart-md">
                    <DonutChart
                      data={revenueData}
                      options={{
                        data: { groupMapsTo: "group" },
                        donut: { center: { label: "Revenue" }, alignment: "center" },
                        height: CHART_HEIGHT,
                        theme: chartTheme,
                        toolbar: { enabled: false },
                        legend: { enabled: true, position: "bottom" as const },
                        tooltip: { valueFormatter: (v: number) => formatINRShort(v) },
                      }}
                    />
                  </div>
                )}
              </Stack>
            </Tile>
          </Column>
          <Column lg={8} md={8} sm={4}>
            <Tile className="esti-fill" style={edge(agingEmpty ? "neutral" : "watch")}>
              <Stack gap={5}>
                <h4>Receivables aging</h4>
                {boardsLoading ? (
                  <InlineLoading description="Loading…" />
                ) : agingEmpty ? (
                  <p>No outstanding receivables.</p>
                ) : (
                  <div className="esti-chart-md">
                    <SimpleBarChart
                      data={agingData}
                      options={{
                        axes: {
                          left: { mapsTo: "group", scaleType: ScaleTypes.LABELS },
                          bottom: { mapsTo: "value", scaleType: ScaleTypes.LINEAR },
                        },
                        height: CHART_HEIGHT,
                        theme: chartTheme,
                        toolbar: { enabled: false },
                        legend: { enabled: false },
                        tooltip: { valueFormatter: (v: number) => formatINRShort(v) },
                      }}
                    />
                  </div>
                )}
              </Stack>
            </Tile>
          </Column>
        </>
      )}

      {showFinancial && (
        <>
          <FilingTile
            navigate={navigate}
            title="GST filing"
            rows={[
              { label: "GSTR-1 (outward)", iso: nextMonthlyDue(11) },
              { label: "GSTR-3B (summary)", iso: nextMonthlyDue(20) },
            ]}
          />
          <FilingTile
            navigate={navigate}
            title="TDS filing"
            rows={[
              { label: "TDS payment (challan)", iso: nextMonthlyDue(7) },
              { label: "TDS return (quarterly)", iso: nextTdsReturnDue() },
            ]}
          />
        </>
      )}

    </Grid>
  );
}
