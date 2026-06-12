import {
  Button,
  ClickableTile,
  Column,
  Grid,
  InlineLoading,
  Stack,
  Tag,
  Tile,
  Toggle,
} from "@carbon/react";
import {
  DonutChart,
  HeatmapChart,
  SimpleBarChart,
  TreemapChart,
} from "@carbon/charts-react";
import { ScaleTypes } from "@carbon/charts";
import type { HeatmapChartOptions, TreemapChartOptions } from "@carbon/charts-react";
import {
  Banking,
  ChartLine,
  type Pictogram,
  Receipt,
} from "@carbon/pictograms-react";
import { ACTIVITY_DOMAIN_TAG, activityDomain, can, formatINRShort } from "@esti/contracts";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClockLeavesWidget } from "../components/ClockLeavesWidget.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

// ─── constants ────────────────────────────────────────────────────────────────

const DOW_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Mon–Sun order for the weekly heatmap x-axis
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];

const STATUS_LABEL: Record<string, string> = {
  ENQUIRY: "Enquiry", PROPOSAL: "Proposal", ACTIVE: "Active",
  ON_HOLD: "On hold", COMPLETED: "Completed", CANCELLED: "Cancelled",
};

// ─── date helpers ─────────────────────────────────────────────────────────────

function daysUntil(iso: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - today.getTime()) / 86400000);
}
function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function nextMonthlyDue(day: number): string {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  let y = now.getFullYear(), m = now.getMonth();
  if (now.getDate() > day) { m += 1; if (m > 11) { m = 0; y += 1; } }
  return isoDate(y, m, day);
}
function nextTdsReturnDue(): string {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const deadlines = [{ m: 6, d: 31 }, { m: 9, d: 31 }, { m: 0, d: 31 }, { m: 4, d: 31 }];
  const y = now.getFullYear();
  const cands: Date[] = [];
  for (const off of [0, 1]) for (const dl of deadlines) cands.push(new Date(y + off, dl.m, dl.d));
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

// ─── FilingDueBoard ──────────────────────────────────────────────────────────

function FilingDueBoard({ title, Pictogram, rows }: {
  title: string; Pictogram: Pictogram; rows: { label: string; iso: string }[];
}) {
  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <Stack orientation="horizontal" gap={4}>
          <Pictogram width={32} height={32} />
          <h3>{title}</h3>
        </Stack>
        <Stack gap={4}>
          {rows.map((r) => {
            const days = daysUntil(r.iso);
            return (
              <Stack key={r.label} orientation="horizontal" gap={4}>
                <div className="esti-grow"><p>{r.label}</p><p>{fmt(r.iso)}</p></div>
                <Tag type={dueTagType(days)}>{dueLabel(days)}</Tag>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Tile>
  );
}

// ─── KpiChip ─────────────────────────────────────────────────────────────────

function KpiChip({ label, value, tagType, tagText, onClick, loading }: {
  label: string; value: string | number;
  tagType?: "green" | "red" | "magenta" | "blue" | "gray" | "teal";
  tagText?: string; onClick?: () => void; loading?: boolean;
}) {
  const body = (
    <Stack gap={3}>
      <p>{label}</p>
      <h3>{loading ? "…" : value}</h3>
      {tagType && tagText && <Tag type={tagType} size="sm">{tagText}</Tag>}
    </Stack>
  );
  return onClick
    ? <ClickableTile className="esti-fill" onClick={onClick}>{body}</ClickableTile>
    : <Tile className="esti-fill">{body}</Tile>;
}

// ─── HBarBoard ───────────────────────────────────────────────────────────────

function HBarBoard({ title, data, loading, error, formatValue }: {
  title: string; data: { group: string; value: number }[];
  loading?: boolean; error?: boolean; formatValue?: (v: number) => string;
}) {
  const h = `${Math.max(160, data.length * 44)}px`;
  const options = {
    axes: {
      left: { mapsTo: "group", scaleType: ScaleTypes.LABELS },
      bottom: { mapsTo: "value", scaleType: ScaleTypes.LINEAR },
    },
    height: h,
    toolbar: { enabled: false },
    legend: { enabled: false },
    ...(formatValue ? { tooltip: { valueFormatter: formatValue } } : {}),
  };
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <h3>{title}</h3>
        {loading
          ? <InlineLoading description="Loading…" />
          : error
            ? <Tag type="red">Data unavailable</Tag>
            : data.length === 0
              ? <p>No data available.</p>
              : <SimpleBarChart data={data} options={options} />}
      </Stack>
    </Tile>
  );
}

// ─── FinancialDonut ──────────────────────────────────────────────────────────

type FinancialData = {
  activePipelinePaise: number; proposalPipelinePaise: number;
  readyToBillPaise: number; outstandingPaise: number; collectedFyPaise: number;
};

function FinancialDonut({ data, loading }: { data?: FinancialData; loading: boolean }) {
  const chartData = data ? [
    { group: "Active pipeline",   value: data.activePipelinePaise },
    { group: "Proposal pipeline", value: data.proposalPipelinePaise },
    { group: "Ready to bill",     value: data.readyToBillPaise },
    { group: "Outstanding",       value: data.outstandingPaise },
    { group: "Collected FY",      value: data.collectedFyPaise },
  ].filter((d) => d.value > 0) : [];
  const options = {
    data: { groupMapsTo: "group" },
    donut: { center: { label: "Revenue" }, alignment: "center" },
    height: "260px",
    toolbar: { enabled: false },
    legend: { enabled: true, position: "bottom" as const },
    tooltip: { valueFormatter: (v: number) => formatINRShort(v) },
  };
  if (loading) return <InlineLoading description="Loading financial data…" />;
  if (chartData.length === 0) return <p>No financial data yet.</p>;
  return <DonutChart data={chartData} options={options} />;
}

// ─── ProjectStatusNumbers ────────────────────────────────────────────────────
// Simple number display — Active / On Hold / Closed. No chart.

function ProjectStatusNumbers({ byStatus, loading, error, onOpen }: {
  byStatus: Record<string, number>; loading?: boolean; error?: boolean; onOpen: () => void;
}) {
  const active  = byStatus.ACTIVE ?? 0;
  const onHold  = byStatus.ON_HOLD ?? 0;
  const closed  = (byStatus.COMPLETED ?? 0) + (byStatus.CANCELLED ?? 0);
  const cells = [
    { label: "Active",   value: active,  tagType: "blue"    as const, tagText: "Live pipeline" },
    { label: "On hold",  value: onHold,  tagType: "magenta" as const, tagText: "Paused"        },
    { label: "Closed",   value: closed,  tagType: "gray"    as const, tagText: "Done / cancelled" },
  ];
  return (
    <ClickableTile className="esti-fill" onClick={onOpen}>
      <Stack gap={5}>
        <Stack gap={3}><p>Projects</p><h2>Status overview</h2></Stack>
        {loading ? <InlineLoading description="Loading…" />
          : error ? <Tag type="red">Unavailable</Tag>
          : (
            <Stack orientation="horizontal" gap={6}>
              {cells.map((c) => (
                <Stack key={c.label} gap={3}>
                  <p>{c.label}</p>
                  <h2>{c.value}</h2>
                  <Tag type={c.tagType} size="sm">{c.tagText}</Tag>
                </Stack>
              ))}
            </Stack>
          )}
      </Stack>
    </ClickableTile>
  );
}

// ─── PhaseDonut ──────────────────────────────────────────────────────────────

function PhaseDonut({ data, loading, error }: {
  data: { label: string; count: number }[]; loading?: boolean; error?: boolean;
}) {
  const chartData = data.map((p) => ({ group: p.label, value: p.count }));
  const options = {
    data: { groupMapsTo: "group" },
    donut: { center: { label: "Stages" }, alignment: "center" },
    height: "280px",
    toolbar: { enabled: false },
    legend: { enabled: true, position: "bottom" as const },
    tooltip: { valueFormatter: (v: number) => `${v} project${v !== 1 ? "s" : ""}` },
    accessibility: { svgAriaLabel: "Projects by current stage" },
  };
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <Stack gap={3}><p>Current stage distribution</p><h2>Projects by phase</h2></Stack>
        {loading ? <InlineLoading description="Loading…" />
          : error ? <Tag type="red">Data unavailable</Tag>
          : chartData.length === 0 ? <p>No active projects.</p>
          : <DonutChart data={chartData} options={options} />}
      </Stack>
    </Tile>
  );
}

// ─── TypeTreemap ─────────────────────────────────────────────────────────────
// Treemap visualising project count by architecture type.
// Mono-colour: Carbon data-viz-01 family with pairing option 1.

function TypeTreemap({ data, loading, error }: {
  data: { type: string; count: number }[]; loading?: boolean; error?: boolean;
}) {
  const chartData = data.map((t) => ({ name: t.type, value: t.count }));
  const options: TreemapChartOptions = {
    toolbar: { enabled: false },
    height: "320px",
    color: { pairing: { option: 1, numberOfVariants: Math.max(data.length, 2) } } as TreemapChartOptions["color"],
    tooltip: { valueFormatter: (v: unknown) => `${v} project${Number(v) !== 1 ? "s" : ""}` },
    accessibility: { svgAriaLabel: "Projects by architecture type" },
  };
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <Stack gap={3}><p>Architecture category</p><h2>Projects by type</h2></Stack>
        {loading ? <InlineLoading description="Loading…" />
          : error ? <Tag type="red">Data unavailable</Tag>
          : chartData.length === 0 ? <p>No projects yet.</p>
          : <TreemapChart data={chartData} options={options} />}
      </Stack>
    </Tile>
  );
}

// ─── WorkloadHeatmap ─────────────────────────────────────────────────────────
// HeatmapChart: person (y) × day (x) = open-task count.
// Toggle between daily (next 14 days) and weekly (by weekday pattern).

type HeatRow = { assignee: string; dow: number; count: number };
type DayRow  = { assignee: string; day: string; count: number };

function WorkloadHeatmap({ weekly, daily, loading, error }: {
  weekly: HeatRow[]; daily: DayRow[]; loading?: boolean; error?: boolean;
}) {
  const [mode, setMode] = useState<"weekly" | "daily">("weekly");

  const weeklyData = DOW_ORDER
    .flatMap((dow) => {
      const label = DOW_LABEL[dow]!;
      const assignees = [...new Set(weekly.map((r) => r.assignee))];
      return assignees.map((a) => ({
        group: a,
        day: label,
        value: weekly.find((r) => r.assignee === a && r.dow === dow)?.count ?? 0,
      }));
    });

  const dailyData = daily.map((r) => ({ group: r.assignee, day: r.day, value: r.count }));

  const activeData = mode === "weekly" ? weeklyData : dailyData;

  const opts: HeatmapChartOptions = {
    axes: {
      bottom: { title: mode === "weekly" ? "Weekday" : "Due date", mapsTo: "day", scaleType: ScaleTypes.LABELS },
      left:   { title: "Person", mapsTo: "group", scaleType: ScaleTypes.LABELS },
    },
    heatmap: { colorLegend: { type: "linear" as const } },
    height: `${Math.max(200, [...new Set(activeData.map((d) => d.group))].length * 40 + 80)}px`,
    toolbar: { enabled: false },
    legend: { enabled: false },
    tooltip: { valueFormatter: (v: unknown) => `${v} task${Number(v) !== 1 ? "s" : ""}` },
    accessibility: { svgAriaLabel: `Workload heatmap — ${mode} view` },
  };

  const noData = mode === "weekly" ? weekly.length === 0 : daily.length === 0;

  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <Stack orientation="horizontal" gap={4}>
          <div className="esti-grow">
            <p>Open tasks per person</p>
            <h2>Workload heatmap</h2>
          </div>
          <Toggle
            id="heatmap-mode"
            size="sm"
            labelText=""
            labelA="Weekly"
            labelB="Daily"
            toggled={mode === "daily"}
            onToggle={(on) => setMode(on ? "daily" : "weekly")}
          />
        </Stack>
        {loading ? <InlineLoading description="Loading workload…" />
          : error ? <Tag type="red">Data unavailable</Tag>
          : noData ? <p>No open tasks with due dates assigned.</p>
          : <HeatmapChart data={activeData} options={opts} />}
      </Stack>
    </Tile>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const summary   = trpc.dashboard.summary.useQuery();
  const boardsQ   = trpc.dashboard.boards.useQuery();
  const acQ       = trpc.dashboard.actionCenter.useQuery();
  const fhQ       = trpc.dashboard.financialHealth.useQuery();
  const phQ       = trpc.dashboard.projectHealth.useQuery();
  const ciQ       = trpc.dashboard.clientIntelligence.useQuery();
  const tiQ       = trpc.dashboard.teamIntelligence.useQuery();
  const activityQ = trpc.activity.listOffice.useQuery({ limit: 8, visibility: "STAFF" });

  const s = summary.data;
  const b = boardsQ.data;
  const summaryLoading = summary.isLoading && !s;
  const boardsLoading  = boardsQ.isLoading && !b;
  const summaryError   = summary.isError && !s;
  const boardsError    = boardsQ.isError && !b;

  const byPhase = b?.byPhase ?? [];
  const byType  = b?.byType ?? [];

  const canFees = can(user?.role, "fees:manage");
  const canHr   = can(user?.role, "hr:manage");
  const isAdmin = can(user?.role, "firm:admin");

  const utils = trpc.useUtils();
  const settingsQ = trpc.settings.get.useQuery();
  const showFinancial = settingsQ.data?.financialEnabled ?? true;
  const showProject   = settingsQ.data?.projectEnabled ?? true;
  const setModule = trpc.settings.setModuleEnabled.useMutation({
    onSuccess: () => utils.settings.get.invalidate(),
  });

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const acTotal = (acQ.data?.billingReadyPhases.length ?? 0)
    + (acQ.data?.overdueInvoices.length ?? 0)
    + (acQ.data?.pendingApprovals.length ?? 0);

  // Chart data ─────────────────────────────────────────────────────────────
  const agingData = [
    { group: "0–30 days", value: b?.receivablesAging.d0_30 ?? 0 },
    { group: "31–60 days", value: b?.receivablesAging.d31_60 ?? 0 },
    { group: "60+ days",   value: b?.receivablesAging.d60p ?? 0 },
  ];

  return (
    <Grid fullWidth className="esti-dash">

      {/* ── Header row ───────────────────────────────────────────────────── */}
      <Column lg={12} md={6} sm={4}>
        <Stack orientation="horizontal" gap={5}>
          <ChartLine width={44} height={44} />
          <div>
            <h1>Office dashboard</h1>
            <p>{user?.fullName ? `Welcome, ${user.fullName.split(" ")[0]} · ` : ""}{today}</p>
          </div>
        </Stack>
      </Column>
      <Column lg={4} md={2} sm={4}>
        <ClockLeavesWidget />
      </Column>

      {/* ── Global KPI Bar ───────────────────────────────────────────────── */}
      <Column lg={16} md={8} sm={4}>
        <Grid narrow>
          <Column lg={3} md={4} sm={2}>
            <KpiChip label="Revenue due" value={formatINRShort(fhQ.data?.outstandingPaise ?? 0)}
              tagType="red" tagText="Outstanding" onClick={() => navigate("/invoices")} loading={fhQ.isLoading} />
          </Column>
          <Column lg={3} md={4} sm={2}>
            <KpiChip label="Ready to bill" value={formatINRShort(fhQ.data?.readyToBillPaise ?? 0)}
              tagType="green" tagText={`${acQ.data?.billingReadyPhases.length ?? 0} phases`}
              onClick={() => navigate("/invoices")} loading={fhQ.isLoading || acQ.isLoading} />
          </Column>
          <Column lg={2} md={4} sm={2}>
            <KpiChip label="Overdue >30d" value={formatINRShort(fhQ.data?.overdue30dPaise ?? 0)}
              tagType={(fhQ.data?.overdue30dPaise ?? 0) > 0 ? "red" : "gray"}
              tagText={(fhQ.data?.overdue30dPaise ?? 0) > 0 ? "Past due" : "Clear"}
              onClick={() => navigate("/invoices")} loading={fhQ.isLoading} />
          </Column>
          <Column lg={3} md={4} sm={2}>
            <KpiChip label="Active projects" value={s?.projects.byStatus.ACTIVE ?? 0}
              tagType="blue" tagText="Live pipeline"
              onClick={() => navigate("/projects")} loading={summaryLoading} />
          </Column>
          <Column lg={2} md={4} sm={2}>
            <KpiChip label="Pending approvals" value={acQ.data?.pendingApprovals.length ?? 0}
              tagType={(acQ.data?.pendingApprovals.length ?? 0) > 0 ? "magenta" : "gray"}
              tagText="Awaiting response"
              onClick={() => navigate("/projects")} loading={acQ.isLoading} />
          </Column>
          <Column lg={3} md={4} sm={4}>
            <KpiChip label="Revision risk" value={acQ.data?.revisionRiskCount ?? 0}
              tagType={(acQ.data?.revisionRiskCount ?? 0) > 0 ? "magenta" : "gray"}
              tagText="Active decisions"
              onClick={() => navigate("/projects")} loading={acQ.isLoading} />
          </Column>
        </Grid>
      </Column>

      {/* ── Action Center ────────────────────────────────────────────────── */}
      <Column lg={16} md={8} sm={4}>
        <Tile>
          <Stack gap={6}>
            <Stack orientation="horizontal" gap={4}>
              <div className="esti-grow">
                <p>What needs attention now</p>
                <h2>Action Center</h2>
              </div>
              {acQ.data && (
                <Tag type={acTotal > 0 ? "red" : "green"}>{acTotal} items</Tag>
              )}
            </Stack>
            {acQ.isLoading ? <InlineLoading description="Loading action items…" /> : (
              <Grid narrow>
                <Column lg={6} md={4} sm={4}>
                  <Stack gap={4}>
                    <Stack orientation="horizontal" gap={3}>
                      <h3>Ready to bill</h3>
                      <Tag type="green" size="sm">{acQ.data?.billingReadyPhases.length ?? 0}</Tag>
                    </Stack>
                    {(acQ.data?.billingReadyPhases.length ?? 0) === 0
                      ? <p>No phases awaiting invoice.</p>
                      : <Stack gap={4}>{acQ.data!.billingReadyPhases.map((ph) => (
                          <Stack key={ph.id} orientation="horizontal" gap={3}>
                            <div className="esti-grow">
                              <Link to={`/projects/${ph.projectId}?tab=phases`}>{ph.projectRef}</Link>
                              <p>{ph.label} · {ph.billingPct}%</p>
                            </div>
                            <Tag type="green" size="sm">{ph.status}</Tag>
                          </Stack>
                        ))}</Stack>}
                  </Stack>
                </Column>
                <Column lg={5} md={4} sm={4}>
                  <Stack gap={4}>
                    <Stack orientation="horizontal" gap={3}>
                      <h3>Overdue collections</h3>
                      <Tag type="red" size="sm">{acQ.data?.overdueInvoices.length ?? 0}</Tag>
                    </Stack>
                    {(acQ.data?.overdueInvoices.length ?? 0) === 0
                      ? <p>No invoices overdue beyond 30 days.</p>
                      : <Stack gap={4}>{acQ.data!.overdueInvoices.map((inv) => (
                          <Stack key={inv.id} orientation="horizontal" gap={3}>
                            <div className="esti-grow">
                              <Link to={`/projects/${inv.projectId}?tab=invoices`}>{inv.ref}</Link>
                              <p>{inv.projectRef} · {formatINRShort(inv.netReceivablePaise)}</p>
                            </div>
                            <Tag type="red" size="sm">{inv.daysOverdue}d overdue</Tag>
                          </Stack>
                        ))}</Stack>}
                  </Stack>
                </Column>
                <Column lg={5} md={4} sm={4}>
                  <Stack gap={4}>
                    <Stack orientation="horizontal" gap={3}>
                      <h3>Pending approvals</h3>
                      <Tag type="magenta" size="sm">{acQ.data?.pendingApprovals.length ?? 0}</Tag>
                    </Stack>
                    {(acQ.data?.pendingApprovals.length ?? 0) === 0
                      ? <p>No items awaiting response.</p>
                      : <Stack gap={4}>{acQ.data!.pendingApprovals.map((ap) => (
                          <Stack key={ap.id} orientation="horizontal" gap={3}>
                            <div className="esti-grow">
                              <Link to={`/projects/${ap.projectId}?tab=approvals`}>{ap.projectRef}</Link>
                              <p>{ap.title}</p>
                            </div>
                            <Tag type="magenta" size="sm">{ap.daysWaiting}d waiting</Tag>
                          </Stack>
                        ))}</Stack>}
                  </Stack>
                </Column>
              </Grid>
            )}
          </Stack>
        </Tile>
      </Column>

      {/* ── Financial Health ─────────────────────────────────────────────── */}
      {canFees && showFinancial && (
        <>
          <Column lg={8} md={8} sm={4}>
            <Tile className="esti-fill">
              <Stack gap={5}>
                <Stack gap={3}><p>Firm financials</p><h2>Financial health</h2></Stack>
                <FinancialDonut data={fhQ.data} loading={fhQ.isLoading} />
              </Stack>
            </Tile>
          </Column>
          <Column lg={8} md={8} sm={4}>
            <Tile className="esti-fill">
              <Stack gap={5}>
                <Stack gap={3}><p>Breakdown</p><h2>Revenue pipeline</h2></Stack>
                {fhQ.isLoading ? <InlineLoading description="Loading…" /> : (
                  <Grid narrow>
                    {[
                      { label: "Active pipeline",   value: fhQ.data?.activePipelinePaise ?? 0,   tag: "blue"    as const, desc: "Active projects" },
                      { label: "Proposal pipeline", value: fhQ.data?.proposalPipelinePaise ?? 0, tag: "teal"    as const, desc: "Proposals" },
                      { label: "Ready to bill",     value: fhQ.data?.readyToBillPaise ?? 0,      tag: "green"   as const, desc: "Unbilled approved phases" },
                      { label: "Outstanding",       value: fhQ.data?.outstandingPaise ?? 0,      tag: (fhQ.data?.outstandingPaise ?? 0) > 0 ? "red" as const : "gray" as const, desc: "Issued & unpaid" },
                      { label: "Overdue >30d",      value: fhQ.data?.overdue30dPaise ?? 0,       tag: (fhQ.data?.overdue30dPaise ?? 0) > 0 ? "red" as const : "gray" as const, desc: (fhQ.data?.overdue30dPaise ?? 0) > 0 ? "At risk" : "Clear" },
                      { label: "Collected FY",      value: fhQ.data?.collectedFyPaise ?? 0,      tag: "green"   as const, desc: `FY ${fhQ.data?.fyStart?.slice(0,4) ?? ""}` },
                    ].map((m) => (
                      <Column key={m.label} lg={8} md={4} sm={4}>
                        <Stack gap={3}>
                          <p>{m.label}</p>
                          <h3>{formatINRShort(m.value)}</h3>
                          <Tag type={m.tag} size="sm">{m.desc}</Tag>
                        </Stack>
                      </Column>
                    ))}
                  </Grid>
                )}
              </Stack>
            </Tile>
          </Column>
        </>
      )}

      {/* ── Project Status Numbers + Project Health ───────────────────────── */}
      {showProject && (
        <>
          <Column lg={8} md={8} sm={4}>
            <ProjectStatusNumbers
              byStatus={s?.projects.byStatus ?? {}}
              loading={summaryLoading} error={summaryError}
              onOpen={() => navigate("/projects")}
            />
          </Column>
          <Column lg={8} md={8} sm={4}>
            <Tile className="esti-fill">
              <Stack gap={5}>
                <Stack gap={3}><p>Project intelligence</p><h2>Project health</h2></Stack>
                {phQ.isLoading ? <InlineLoading description="Loading project health…" />
                  : (phQ.data?.length ?? 0) === 0 ? <p>No active projects.</p>
                  : <Stack gap={4}>{phQ.data!.map((ph) => (
                      <Stack key={ph.id} orientation="horizontal" gap={4}>
                        <Tag type={ph.health === "RED" ? "red" : ph.health === "YELLOW" ? "magenta" : "green"} size="sm">
                          {ph.health}
                        </Tag>
                        <div className="esti-grow">
                          <Link to={`/projects/${ph.id}`}>{ph.ref}</Link>
                          <p>{ph.title}</p>
                        </div>
                        {ph.overdueInvoices > 0 && <Tag type="red" size="sm">{ph.overdueInvoices} inv overdue</Tag>}
                        {ph.overdueTasks > 0 && <Tag type="magenta" size="sm">{ph.overdueTasks} tasks late</Tag>}
                        {ph.unbilledPhases > 0 && <Tag type="green" size="sm">{ph.unbilledPhases} to bill</Tag>}
                        {ph.staleApprovals > 0 && <Tag type="magenta" size="sm">{ph.staleApprovals} stale approval</Tag>}
                      </Stack>
                    ))}</Stack>}
              </Stack>
            </Tile>
          </Column>
        </>
      )}

      {/* ── Client Intelligence + Team Intelligence ───────────────────────── */}
      <Column lg={8} md={8} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={5}>
            <Stack gap={3}><p>Client signals</p><h2>Client intelligence</h2></Stack>
            {ciQ.isLoading ? <InlineLoading description="Loading client data…" />
              : (ciQ.data?.length ?? 0) === 0 ? <p>No clients with active projects.</p>
              : <Stack gap={4}>{ciQ.data!.map((c) => (
                  <Stack key={c.id} orientation="horizontal" gap={4}>
                    <Tag type={c.risk === "HIGH" ? "red" : c.risk === "MEDIUM" ? "magenta" : "green"} size="sm">
                      {c.risk}
                    </Tag>
                    <div className="esti-grow">
                      <p>{c.name}</p>
                      <p>{c.activeProjects} project{c.activeProjects !== 1 ? "s" : ""}</p>
                    </div>
                    {c.outstandingPaise > 0 && (
                      <Tag type={c.oldestInvoiceDays > 30 ? "red" : "gray"} size="sm">
                        {formatINRShort(c.outstandingPaise)} · {c.oldestInvoiceDays}d
                      </Tag>
                    )}
                    {c.revisionRequests > 0 && (
                      <Tag type="magenta" size="sm">{c.revisionRequests} revisions</Tag>
                    )}
                  </Stack>
                ))}</Stack>}
          </Stack>
        </Tile>
      </Column>
      <Column lg={8} md={8} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={5}>
            <Stack gap={3}><p>Team capacity</p><h2>Team intelligence</h2></Stack>
            {tiQ.isLoading ? <InlineLoading description="Loading team data…" />
              : (tiQ.data?.length ?? 0) === 0 ? <p>No open tasks assigned.</p>
              : <Stack gap={4}>{tiQ.data!.map((m) => (
                  <Stack key={m.assignee} orientation="horizontal" gap={4}>
                    <Tag type={m.capacity === "OVERLOADED" ? "red" : m.capacity === "BUSY" ? "magenta" : "green"} size="sm">
                      {m.capacity}
                    </Tag>
                    <div className="esti-grow">
                      <p>{m.assignee}</p>
                      <p>{m.totalOpen} open · {m.highPriorityCount} high priority</p>
                    </div>
                    {m.overdueCount > 0 && <Tag type="red" size="sm">{m.overdueCount} overdue</Tag>}
                  </Stack>
                ))}</Stack>}
          </Stack>
        </Tile>
      </Column>

      {/* ── Projects by phase (DonutChart) + Projects by type (Treemap) ──── */}
      {showProject && (
        <>
          <Column lg={8} md={8} sm={4}>
            <PhaseDonut data={byPhase} loading={boardsLoading} error={boardsError} />
          </Column>
          <Column lg={8} md={8} sm={4}>
            <TypeTreemap data={byType} loading={boardsLoading} error={boardsError} />
          </Column>
        </>
      )}

      {/* ── Workload Heatmap + Receivables aging ─────────────────────────── */}
      {showProject && (
        <Column lg={8} md={8} sm={4}>
          <WorkloadHeatmap
            weekly={b?.workloadWeekly ?? []}
            daily={b?.workloadDaily ?? []}
            loading={boardsLoading} error={boardsError}
          />
        </Column>
      )}
      {canFees && showFinancial && (
        <Column lg={8} md={8} sm={4}>
          <HBarBoard
            title="Receivables aging"
            data={agingData}
            loading={boardsLoading} error={boardsError}
            formatValue={(v) => formatINRShort(v)}
          />
        </Column>
      )}

      {/* ── Statutory filing deadlines ────────────────────────────────────── */}
      {showFinancial && (
        <Column lg={4} md={4} sm={4}>
          <FilingDueBoard title="GST filing due" Pictogram={Receipt} rows={[
            { label: "GSTR-1 (outward)",  iso: nextMonthlyDue(11) },
            { label: "GSTR-3B (summary)", iso: nextMonthlyDue(20) },
          ]} />
        </Column>
      )}
      {showFinancial && (
        <Column lg={4} md={4} sm={4}>
          <FilingDueBoard title="TDS filing due" Pictogram={Banking} rows={[
            { label: "TDS payment (challan)",  iso: nextMonthlyDue(7) },
            { label: "TDS return (quarterly)", iso: nextTdsReturnDue() },
          ]} />
        </Column>
      )}

      {/* Admin board-group toggles */}
      {isAdmin && (
        <Column lg={8} md={8} sm={4}>
          <Tile>
            <Stack gap={4}>
              <p>Show board groups</p>
              <Stack orientation="horizontal" gap={6}>
                <Toggle id="db-financial" size="sm" labelText="Financial" labelA="Off" labelB="On"
                  toggled={showFinancial} disabled={setModule.isPending || settingsQ.isLoading}
                  onToggle={(c) => setModule.mutate({ module: "financial", enabled: c })} />
                <Toggle id="db-project" size="sm" labelText="Project" labelA="Off" labelB="On"
                  toggled={showProject} disabled={setModule.isPending || settingsQ.isLoading}
                  onToggle={(c) => setModule.mutate({ module: "project", enabled: c })} />
              </Stack>
            </Stack>
          </Tile>
        </Column>
      )}

      {/* ── Activity Feed ─────────────────────────────────────────────────── */}
      <Column lg={16} md={8} sm={4}>
        <Tile>
          <Stack gap={5}>
            <Stack orientation="horizontal" gap={4}>
              <div className="esti-grow">
                <p>Recent activity</p>
                <h2>Activity Feed</h2>
              </div>
              <Tag type="blue">{activityQ.data?.rows.length ?? 0} events</Tag>
            </Stack>
            {activityQ.isLoading ? <InlineLoading description="Loading activity…" />
              : (activityQ.data?.rows.length ?? 0) === 0 ? <p>No activity yet.</p>
              : (
                <Grid narrow>
                  {activityQ.data!.rows.map((item) => (
                    <Column key={item.id} lg={8} md={8} sm={4}>
                      <Stack gap={3}>
                        <Stack orientation="horizontal" gap={3}>
                          <Tag size="sm" type={ACTIVITY_DOMAIN_TAG[activityDomain(item.eventType)]}>
                            {activityDomain(item.eventType)}
                          </Tag>
                          <Tag size="sm" type="gray">{item.eventType}</Tag>
                          <span>{new Date(item.createdAt as unknown as string).toLocaleString("en-IN", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                          })}</span>
                        </Stack>
                        <p>{item.summary}</p>
                        <p>{item.projectRef ? `${item.projectRef} · ` : ""}{item.actorName ?? "System"}</p>
                        {item.projectId && <Link to={`/projects/${item.projectId}`}>Open project</Link>}
                      </Stack>
                    </Column>
                  ))}
                </Grid>
              )}
            <Button kind="ghost" size="sm" onClick={() => navigate("/activity")}>
              Open Activity Center
            </Button>
          </Stack>
        </Tile>
      </Column>

    </Grid>
  );
}
