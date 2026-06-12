import {
  Button,
  ClickableTile,
  Column,
  Grid,
  InlineLoading,
  Stack,
  StructuredListWrapper,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  Tag,
  Tile,
  Toggle,
} from "@carbon/react";
import {
  DonutChart,
  GaugeChart,
  GroupedBarChart,
  HeatmapChart,
  RadarChart,
  SimpleBarChart,
  TreemapChart,
} from "@carbon/charts-react";
import { ScaleTypes } from "@carbon/charts";
import type {
  GaugeChartOptions,
  HeatmapChartOptions,
  RadarChartOptions,
  TreemapChartOptions,
} from "@carbon/charts-react";
import {
  Analytics,
  AuditTrail,
  Banking,
  Building,
  ChartBar,
  ChartDonut,
  ChartLine,
  CollaborateWithTeams,
  DataInsights,
  FinanceAndOperations,
  Performance,
  Receipt,
  TeamAlignment,
  Time,
  Warning_01,
  Workflows,
  type Pictogram,
} from "@carbon/pictograms-react";
import { ACTIVITY_DOMAIN_TAG, activityDomain, can, formatINRShort } from "@esti/contracts";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { useAppTheme } from "../lib/theme-context.js";
import { trpc } from "../lib/trpc.js";

// ─── constants ────────────────────────────────────────────────────────────────

const DOW_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];

const HEALTH_LABEL: Record<string, string> = { RED: "At risk", YELLOW: "Watch", GREEN: "On track" };
const HEALTH_TAG: Record<string, "red" | "magenta" | "green"> = {
  RED: "red",
  YELLOW: "magenta",
  GREEN: "green",
};
const CAPACITY_LABEL: Record<string, string> = {
  OVERLOADED: "Overloaded",
  BUSY: "Busy",
  AVAILABLE: "Available",
};
const CAPACITY_TAG: Record<string, "red" | "magenta" | "green"> = {
  OVERLOADED: "red",
  BUSY: "magenta",
  AVAILABLE: "green",
};

function formatEventType(et: string): string {
  return et
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

// ─── date helpers ─────────────────────────────────────────────────────────────

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

// ─── TileHeader ───────────────────────────────────────────────────────────────
// Resource-card style: category Tag at top, then pictogram + h3 title.

function TileHeader({
  Pict,
  sub,
  title,
  statusTag,
}: {
  Pict: Pictogram;
  sub: string;
  title: string;
  statusTag?: { text: string; type: "red" | "green" | "blue" | "magenta" | "gray" | "teal" | "cyan" | "purple" };
}) {
  return (
    <Stack gap={3}>
      <Stack orientation="horizontal" gap={2}>
        <Tag type="gray" size="sm">
          {sub}
        </Tag>
        {statusTag && (
          <Tag type={statusTag.type} size="sm">
            {statusTag.text}
          </Tag>
        )}
      </Stack>
      <Stack orientation="horizontal" gap={3}>
        <Pict width={32} height={32} />
        <h3>{title}</h3>
      </Stack>
    </Stack>
  );
}

// ─── FilingDueBoard ──────────────────────────────────────────────────────────

function FilingDueBoard({
  title,
  Pictogram: Pict,
  rows,
  onOpen,
}: {
  title: string;
  Pictogram: Pictogram;
  rows: { label: string; iso: string }[];
  onOpen?: () => void;
}) {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <TileHeader Pict={Pict} sub="Compliance" title={title} />
        <Stack gap={4}>
          {rows.map((r) => {
            const days = daysUntil(r.iso);
            return (
              <Stack key={r.label} orientation="horizontal" gap={4}>
                <div className="esti-grow">
                  <p>{r.label}</p>
                  <p>{fmt(r.iso)}</p>
                </div>
                <Tag type={dueTagType(days)}>{dueLabel(days)}</Tag>
              </Stack>
            );
          })}
        </Stack>
        {onOpen && (
          <Button kind="ghost" size="sm" onClick={onOpen}>
            Open compliance
          </Button>
        )}
      </Stack>
    </Tile>
  );
}

// ─── KpiChip ─────────────────────────────────────────────────────────────────

function KpiChip({
  label,
  value,
  tagType,
  tagText,
  onClick,
  loading,
}: {
  label: string;
  value: string | number;
  tagType?: "green" | "red" | "magenta" | "blue" | "gray" | "teal";
  tagText?: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  const body = (
    <Stack gap={3}>
      <p>{label}</p>
      <h2>{loading ? "…" : value}</h2>
      {tagType && tagText && (
        <Tag type={tagType} size="sm">
          {tagText}
        </Tag>
      )}
    </Stack>
  );
  return onClick ? (
    <ClickableTile className="esti-fill" onClick={onClick}>
      {body}
    </ClickableTile>
  ) : (
    <Tile className="esti-fill">{body}</Tile>
  );
}

// ─── HBarBoard ───────────────────────────────────────────────────────────────

function HBarBoard({
  Pict,
  sub,
  title,
  data,
  loading,
  error,
  formatValue,
  onOpen,
}: {
  Pict?: Pictogram;
  sub?: string;
  title: string;
  data: { group: string; value: number }[];
  loading?: boolean;
  error?: boolean;
  formatValue?: (v: number) => string;
  onOpen?: () => void;
}) {
  const chartTheme = useAppTheme();
  const h = `${Math.max(160, data.length * 44)}px`;
  const options = {
    axes: {
      left: { mapsTo: "group", scaleType: ScaleTypes.LABELS },
      bottom: { mapsTo: "value", scaleType: ScaleTypes.LINEAR },
    },
    height: h,
    theme: chartTheme,
    toolbar: { enabled: false },
    legend: { enabled: false },
    ...(formatValue ? { tooltip: { valueFormatter: formatValue } } : {}),
  };
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        {Pict && sub ? (
          <TileHeader Pict={Pict} sub={sub} title={title} />
        ) : (
          <h3>{title}</h3>
        )}
        {loading ? (
          <InlineLoading description="Loading…" />
        ) : error ? (
          <Tag type="red">Data unavailable</Tag>
        ) : data.length === 0 ? (
          <p>No data available.</p>
        ) : (
          <SimpleBarChart data={data} options={options} />
        )}
        {onOpen && (
          <Button kind="ghost" size="sm" onClick={onOpen}>
            View details
          </Button>
        )}
      </Stack>
    </Tile>
  );
}

// ─── FinancialDonut ──────────────────────────────────────────────────────────

type FinancialData = {
  activePipelinePaise: number;
  proposalPipelinePaise: number;
  readyToBillPaise: number;
  outstandingPaise: number;
  collectedFyPaise: number;
};

function FinancialDonut({
  data,
  loading,
  onOpen,
}: {
  data?: FinancialData;
  loading: boolean;
  onOpen?: () => void;
}) {
  const chartTheme = useAppTheme();
  const chartData = data
    ? [
        { group: "Active pipeline", value: data.activePipelinePaise },
        { group: "Proposal pipeline", value: data.proposalPipelinePaise },
        { group: "Ready to bill", value: data.readyToBillPaise },
        { group: "Outstanding", value: data.outstandingPaise },
        { group: "Collected FY", value: data.collectedFyPaise },
      ].filter((d) => d.value > 0)
    : [];
  const options = {
    data: { groupMapsTo: "group" },
    donut: { center: { label: "Revenue" }, alignment: "center" },
    height: "260px",
    theme: chartTheme,
    toolbar: { enabled: false },
    legend: { enabled: true, position: "bottom" as const },
    tooltip: { valueFormatter: (v: number) => formatINRShort(v) },
  };
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <TileHeader Pict={FinanceAndOperations} sub="Firm financials" title="Financial health" />
        {loading ? (
          <InlineLoading description="Loading financial data…" />
        ) : chartData.length === 0 ? (
          <p>No financial data yet.</p>
        ) : (
          <DonutChart data={chartData} options={options} />
        )}
        {onOpen && (
          <Button kind="ghost" size="sm" onClick={onOpen}>
            Open invoices
          </Button>
        )}
      </Stack>
    </Tile>
  );
}

// ─── RevenuePipelineBar ──────────────────────────────────────────────────────

function RevenuePipelineBar({
  data,
  loading,
  onOpen,
}: {
  data?: FinancialData;
  loading: boolean;
  onOpen?: () => void;
}) {
  const chartTheme = useAppTheme();
  const chartData = data
    ? [
        { group: "Active pipeline", key: "Pipeline", value: data.activePipelinePaise },
        { group: "Proposal pipeline", key: "Pipeline", value: data.proposalPipelinePaise },
        { group: "Ready to bill", key: "Billing", value: data.readyToBillPaise },
        { group: "Outstanding", key: "Receivables", value: data.outstandingPaise },
        { group: "Collected FY", key: "Collected", value: data.collectedFyPaise },
      ].filter((d) => d.value > 0)
    : [];
  const options = {
    axes: {
      left: { mapsTo: "key", scaleType: ScaleTypes.LABELS },
      bottom: { mapsTo: "value", scaleType: ScaleTypes.LINEAR },
    },
    height: "300px",
    theme: chartTheme,
    toolbar: { enabled: false },
    legend: { enabled: true, position: "bottom" as const },
    tooltip: { valueFormatter: (v: number) => formatINRShort(v) },
    accessibility: { svgAriaLabel: "Revenue pipeline by category" },
  };
  if (!loading && chartData.length === 0) return null;
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <TileHeader Pict={ChartBar} sub="Breakdown by category" title="Revenue pipeline" />
        {loading ? (
          <InlineLoading description="Loading…" />
        ) : (
          <GroupedBarChart data={chartData} options={options} />
        )}
        {onOpen && (
          <Button kind="ghost" size="sm" onClick={onOpen}>
            Open accounting
          </Button>
        )}
      </Stack>
    </Tile>
  );
}

// ─── ClientRadar ─────────────────────────────────────────────────────────────

type ClientSignal = {
  id: string;
  name: string;
  activeProjects: number;
  outstandingPaise: number;
  oldestInvoiceDays: number;
  revisionRequests: number;
};

function ClientRadar({
  data,
  loading,
  onOpen,
}: {
  data?: ClientSignal[];
  loading: boolean;
  onOpen?: () => void;
}) {
  const chartTheme = useAppTheme();
  const chartData = (data ?? []).flatMap((c) => [
    { group: c.name, key: "Payment risk", value: Math.min(c.outstandingPaise / 1_00_00_000, 1) * 100 },
    { group: c.name, key: "Invoice age", value: Math.min(c.oldestInvoiceDays / 90, 1) * 100 },
    { group: c.name, key: "Revisions", value: Math.min(c.revisionRequests / 10, 1) * 100 },
    { group: c.name, key: "Project load", value: Math.min(c.activeProjects / 5, 1) * 100 },
  ]);
  const options: RadarChartOptions = {
    radar: { axes: { angle: "key", value: "value" } },
    height: "320px",
    theme: chartTheme,
    toolbar: { enabled: false },
    legend: { enabled: true, position: "bottom" as const },
    tooltip: { valueFormatter: (v: unknown) => `${Math.round(Number(v))}%` },
    accessibility: { svgAriaLabel: "Client risk radar" },
  };
  if (!loading && (data?.length ?? 0) === 0) return null;
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <TileHeader Pict={Analytics} sub="Client signals" title="Client intelligence" />
        {loading ? (
          <InlineLoading description="Loading client data…" />
        ) : (
          <RadarChart data={chartData} options={options} />
        )}
        {onOpen && (
          <Button kind="ghost" size="sm" onClick={onOpen}>
            Open clients
          </Button>
        )}
      </Stack>
    </Tile>
  );
}

// ─── ProjectStatusNumbers ────────────────────────────────────────────────────

function ProjectStatusNumbers({
  byStatus,
  loading,
  error,
  onOpen,
}: {
  byStatus: Record<string, number>;
  loading?: boolean;
  error?: boolean;
  onOpen: () => void;
}) {
  const active = byStatus.ACTIVE ?? 0;
  const onHold = byStatus.ON_HOLD ?? 0;
  const closed = (byStatus.COMPLETED ?? 0) + (byStatus.CANCELLED ?? 0);
  const cells = [
    { label: "Active", value: active, tagType: "blue" as const, tagText: "Live" },
    { label: "On hold", value: onHold, tagType: "magenta" as const, tagText: "Paused" },
    { label: "Closed", value: closed, tagType: "gray" as const, tagText: "Done" },
  ];
  return (
    <ClickableTile className="esti-fill" onClick={onOpen}>
      <Stack gap={5}>
        <TileHeader Pict={Building} sub="Projects" title="Status overview" />
        {loading ? (
          <InlineLoading description="Loading…" />
        ) : error ? (
          <Tag type="red">Unavailable</Tag>
        ) : (
          <Stack orientation="horizontal" gap={5}>
            {cells.map((c) => (
              <Stack key={c.label} gap={2}>
                <p>{c.label}</p>
                <h2>{c.value}</h2>
                <Tag type={c.tagType} size="sm">
                  {c.tagText}
                </Tag>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </ClickableTile>
  );
}

// ─── PhaseDonut ──────────────────────────────────────────────────────────────

function PhaseDonut({
  data,
  loading,
  error,
  onOpen,
}: {
  data: { label: string; count: number }[];
  loading?: boolean;
  error?: boolean;
  onOpen?: () => void;
}) {
  const chartTheme = useAppTheme();
  const chartData = data.map((p) => ({ group: p.label, value: p.count }));
  const options = {
    data: { groupMapsTo: "group" },
    donut: { center: { label: "Stages" }, alignment: "center" },
    height: "260px",
    theme: chartTheme,
    toolbar: { enabled: false },
    legend: { enabled: true, position: "bottom" as const },
    tooltip: { valueFormatter: (v: number) => `${v} project${v !== 1 ? "s" : ""}` },
    accessibility: { svgAriaLabel: "Projects by current stage" },
  };
  if (!loading && !error && chartData.length === 0) return null;
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <TileHeader
          Pict={ChartDonut}
          sub="Current stage distribution"
          title="Projects by phase"
        />
        {loading ? (
          <InlineLoading description="Loading…" />
        ) : error ? (
          <Tag type="red">Data unavailable</Tag>
        ) : (
          <DonutChart data={chartData} options={options} />
        )}
        {onOpen && (
          <Button kind="ghost" size="sm" onClick={onOpen}>
            Open projects
          </Button>
        )}
      </Stack>
    </Tile>
  );
}

// ─── TypeTreemap ─────────────────────────────────────────────────────────────

function TypeTreemap({
  data,
  loading,
  error,
  onOpen,
}: {
  data: { type: string; count: number }[];
  loading?: boolean;
  error?: boolean;
  onOpen?: () => void;
}) {
  const chartTheme = useAppTheme();
  const chartData = data.map((t) => ({ name: t.type, value: t.count }));
  const options: TreemapChartOptions = {
    toolbar: { enabled: false },
    height: "280px",
    theme: chartTheme,
    color: {
      pairing: { option: 1, numberOfVariants: Math.max(data.length, 2) },
    } as TreemapChartOptions["color"],
    tooltip: {
      valueFormatter: (v: unknown) =>
        `${v} project${Number(v) !== 1 ? "s" : ""}`,
    },
    accessibility: { svgAriaLabel: "Projects by architecture type" },
  };
  if (!loading && !error && chartData.length === 0) return null;
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <TileHeader Pict={DataInsights} sub="Architecture category" title="Projects by type" />
        {loading ? (
          <InlineLoading description="Loading…" />
        ) : error ? (
          <Tag type="red">Data unavailable</Tag>
        ) : (
          <TreemapChart data={chartData} options={options} />
        )}
        {onOpen && (
          <Button kind="ghost" size="sm" onClick={onOpen}>
            Open projects
          </Button>
        )}
      </Stack>
    </Tile>
  );
}

// ─── DailyTaskGauges ─────────────────────────────────────────────────────────

const GAUGE_MAX = 10;

function DailyTaskGauges({
  data,
  loading,
  error,
}: {
  data: { assignee: string; count: number }[];
  loading?: boolean;
  error?: boolean;
}) {
  const chartTheme = useAppTheme();
  if (!loading && !error && data.length === 0) return null;
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <TileHeader Pict={Time} sub="Tasks due today — per person" title="Daily task load" />
        {loading ? (
          <InlineLoading description="Loading daily load…" />
        ) : error ? (
          <Tag type="red">Data unavailable</Tag>
        ) : (
          <Grid narrow>
            {data.map((d) => {
              const pct = (Math.min(d.count, GAUGE_MAX) / GAUGE_MAX) * 100;
              const status =
                d.count >= 8 ? "danger" : d.count >= 5 ? "warning" : undefined;
              const tagType =
                status === "danger"
                  ? ("red" as const)
                  : status === "warning"
                    ? ("magenta" as const)
                    : ("green" as const);
              const opts: GaugeChartOptions = {
                gauge: {
                  type: "semi",
                  arcWidth: 20,
                  showPercentageSymbol: false,
                  numberFormatter: () => String(d.count),
                  ...(status ? { status } : {}),
                },
                height: "160px",
                theme: chartTheme,
                toolbar: { enabled: false },
                legend: { enabled: false },
                accessibility: {
                  svgAriaLabel: `${d.assignee}: ${d.count} tasks today`,
                },
              };
              return (
                <Column key={d.assignee} lg={4} md={4} sm={4}>
                  <Stack gap={3}>
                    <p>{d.assignee}</p>
                    <GaugeChart
                      data={[
                        { group: "value", value: pct },
                        { group: "remaining", value: 100 - pct },
                      ]}
                      options={opts}
                    />
                    <Tag type={tagType} size="sm">
                      {d.count} task{d.count !== 1 ? "s" : ""} today
                    </Tag>
                  </Stack>
                </Column>
              );
            })}
          </Grid>
        )}
      </Stack>
    </Tile>
  );
}

// ─── WorkloadHeatmap ─────────────────────────────────────────────────────────

type HeatRow = { assignee: string; dow: number; count: number };
type DayRow = { assignee: string; day: string; count: number };

function WorkloadHeatmap({
  weekly,
  daily,
  loading,
  error,
  onOpen,
}: {
  weekly: HeatRow[];
  daily: DayRow[];
  loading?: boolean;
  error?: boolean;
  onOpen?: () => void;
}) {
  const chartTheme = useAppTheme();
  const [mode, setMode] = useState<"weekly" | "daily">("weekly");

  const weeklyData = DOW_ORDER.flatMap((dow) => {
    const label = DOW_LABEL[dow]!;
    const assignees = [...new Set(weekly.map((r) => r.assignee))];
    return assignees.map((a) => ({
      group: a,
      day: label,
      value: weekly.find((r) => r.assignee === a && r.dow === dow)?.count ?? 0,
    }));
  });
  const dailyData = daily.map((r) => ({
    group: r.assignee,
    day: r.day,
    value: r.count,
  }));
  const activeData = mode === "weekly" ? weeklyData : dailyData;
  const noData = mode === "weekly" ? weekly.length === 0 : daily.length === 0;

  const opts: HeatmapChartOptions = {
    axes: {
      bottom: {
        title: mode === "weekly" ? "Weekday" : "Due date",
        mapsTo: "day",
        scaleType: ScaleTypes.LABELS,
      },
      left: { title: "Person", mapsTo: "group", scaleType: ScaleTypes.LABELS },
    },
    heatmap: { colorLegend: { type: "linear" as const } },
    height: `${Math.max(200, [...new Set(activeData.map((d) => d.group))].length * 40 + 80)}px`,
    theme: chartTheme,
    toolbar: { enabled: false },
    legend: { enabled: false },
    tooltip: {
      valueFormatter: (v: unknown) =>
        `${v} task${Number(v) !== 1 ? "s" : ""}`,
    },
    accessibility: { svgAriaLabel: `Workload heatmap — ${mode} view` },
  };

  if (!loading && !error && weekly.length === 0 && daily.length === 0) return null;

  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <Stack orientation="horizontal" gap={4}>
          <div className="esti-grow">
            <TileHeader
              Pict={CollaborateWithTeams}
              sub="Open tasks per person"
              title="Workload heatmap"
            />
          </div>
          <Toggle
            id="heatmap-mode"
            size="sm"
            labelText="View mode"
            labelA="Weekly"
            labelB="Daily"
            toggled={mode === "daily"}
            onToggle={(on) => setMode(on ? "daily" : "weekly")}
          />
        </Stack>
        {loading ? (
          <InlineLoading description="Loading workload…" />
        ) : error ? (
          <Tag type="red">Data unavailable</Tag>
        ) : noData ? (
          <p>No open tasks with due dates assigned.</p>
        ) : (
          <HeatmapChart data={activeData} options={opts} />
        )}
        {onOpen && (
          <Button kind="ghost" size="sm" onClick={onOpen}>
            Open workload
          </Button>
        )}
      </Stack>
    </Tile>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const summary = trpc.dashboard.summary.useQuery();
  const boardsQ = trpc.dashboard.boards.useQuery();
  const acQ = trpc.dashboard.actionCenter.useQuery();
  const fhQ = trpc.dashboard.financialHealth.useQuery();
  const phQ = trpc.dashboard.projectHealth.useQuery();
  const ciQ = trpc.dashboard.clientIntelligence.useQuery();
  const tiQ = trpc.dashboard.teamIntelligence.useQuery();
  const riQ = trpc.dashboard.revisionIntelligence.useQuery();
  const techIQ = trpc.dashboard.technicalIntelligence.useQuery();
  const activityQ = trpc.activity.listOffice.useQuery({ limit: 8, visibility: "STAFF" });

  const s = summary.data;
  const b = boardsQ.data;
  const summaryLoading = summary.isLoading && !s;
  const boardsLoading = boardsQ.isLoading && !b;
  const summaryError = summary.isError && !s;
  const boardsError = boardsQ.isError && !b;

  const byPhase = b?.byPhase ?? [];
  const byType = b?.byType ?? [];

  const canFees = can(user?.role, "fees:manage");
  const isAdmin = can(user?.role, "firm:admin");

  const utils = trpc.useUtils();
  const settingsQ = trpc.settings.get.useQuery();
  const showFinancial = settingsQ.data?.financialEnabled ?? true;
  const showProject = settingsQ.data?.projectEnabled ?? true;
  const setModule = trpc.settings.setModuleEnabled.useMutation({
    onSuccess: () => utils.settings.get.invalidate(),
  });

  const acTotal =
    (acQ.data?.billingReadyPhases.length ?? 0) +
    (acQ.data?.overdueInvoices.length ?? 0) +
    (acQ.data?.pendingApprovals.length ?? 0);

  const agingData = [
    { group: "0–30 days", value: b?.receivablesAging.d0_30 ?? 0 },
    { group: "31–60 days", value: b?.receivablesAging.d31_60 ?? 0 },
    { group: "60+ days", value: b?.receivablesAging.d60p ?? 0 },
  ];
  const agingEmpty = agingData.every((d) => d.value === 0);

  const hasActivity = (activityQ.data?.rows.length ?? 0) > 0;

  return (
    <Grid fullWidth className="esti-dash">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <Column lg={16} md={8} sm={4}>
        <Stack orientation="horizontal" gap={5}>
          <ChartLine width={44} height={44} />
          <div>
            <h1>Office dashboard</h1>
            {user?.fullName && (
              <p>Welcome, Ar. {user.fullName.split(" ")[0]}</p>
            )}
          </div>
        </Stack>
      </Column>

      {/* ═══ Zone 1: Action Center ═════════════════════════════════════════ */}
      <Column lg={16} md={8} sm={4}>
        <Tile>
          <Stack gap={6}>
            {/* Resource-card header: status Tag + title */}
            <Stack gap={3}>
              <Stack orientation="horizontal" gap={2}>
                <Tag type="gray" size="sm">Action Center</Tag>
                {acQ.data && !acQ.isLoading && (
                  <Tag type={acTotal > 0 ? "red" : "green"} size="sm">
                    {acTotal > 0
                      ? `${acTotal} item${acTotal !== 1 ? "s" : ""}`
                      : "All clear"}
                  </Tag>
                )}
              </Stack>
              <Stack orientation="horizontal" gap={3}>
                <Warning_01 width={32} height={32} />
                <h3>What needs attention now</h3>
              </Stack>
            </Stack>

            {acQ.isLoading ? (
              <InlineLoading description="Loading action items…" />
            ) : acTotal === 0 ? (
              <p>All clear — no outstanding items.</p>
            ) : (
              <Grid narrow>
                <Column lg={4} md={4} sm={4}>
                  <Stack gap={4}>
                    <h4>Ready to bill</h4>
                    {(acQ.data?.billingReadyPhases.length ?? 0) === 0 ? (
                      <p>No phases awaiting invoice.</p>
                    ) : (
                      <Stack gap={3}>
                        <h2>{acQ.data!.billingReadyPhases.length}</h2>
                        <p>Phases awaiting invoice</p>
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => navigate("/invoices")}
                        >
                          Open invoices
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </Column>
                <Column lg={6} md={4} sm={4}>
                  <Stack gap={4}>
                    <Stack orientation="horizontal" gap={3}>
                      <h4>Overdue collections</h4>
                      <Tag type="red" size="sm">
                        {acQ.data?.overdueInvoices.length ?? 0}
                      </Tag>
                    </Stack>
                    {(acQ.data?.overdueInvoices.length ?? 0) === 0 ? (
                      <p>No invoices overdue beyond 30 days.</p>
                    ) : (
                      <StructuredListWrapper isCondensed>
                        <StructuredListBody>
                          {acQ.data!.overdueInvoices.map((inv) => (
                            <StructuredListRow key={inv.id}>
                              <StructuredListCell>
                                <Link
                                  to={`/projects/${inv.projectId}?tab=invoices`}
                                >
                                  {inv.ref}
                                </Link>
                                <p>
                                  {inv.projectRef} ·{" "}
                                  {formatINRShort(inv.netReceivablePaise)}
                                </p>
                              </StructuredListCell>
                              <StructuredListCell noWrap>
                                <Tag type="red" size="sm">
                                  {inv.daysOverdue}d overdue
                                </Tag>
                              </StructuredListCell>
                            </StructuredListRow>
                          ))}
                        </StructuredListBody>
                      </StructuredListWrapper>
                    )}
                  </Stack>
                </Column>
                <Column lg={6} md={4} sm={4}>
                  <Stack gap={4}>
                    <Stack orientation="horizontal" gap={3}>
                      <h4>Pending approvals</h4>
                      <Tag type="magenta" size="sm">
                        {acQ.data?.pendingApprovals.length ?? 0}
                      </Tag>
                    </Stack>
                    {(acQ.data?.pendingApprovals.length ?? 0) === 0 ? (
                      <p>No items awaiting response.</p>
                    ) : (
                      <StructuredListWrapper isCondensed>
                        <StructuredListBody>
                          {acQ.data!.pendingApprovals.map((ap) => (
                            <StructuredListRow key={ap.id}>
                              <StructuredListCell>
                                <Link
                                  to={`/projects/${ap.projectId}?tab=approvals`}
                                >
                                  {ap.projectRef}
                                </Link>
                                <p>{ap.title}</p>
                              </StructuredListCell>
                              <StructuredListCell noWrap>
                                <Tag type="magenta" size="sm">
                                  {ap.daysWaiting}d waiting
                                </Tag>
                              </StructuredListCell>
                            </StructuredListRow>
                          ))}
                        </StructuredListBody>
                      </StructuredListWrapper>
                    )}
                  </Stack>
                </Column>
              </Grid>
            )}
          </Stack>
        </Tile>
      </Column>

      {/* ═══ Zone 2: Key metrics — 4 equal chips ═══════════════════════════ */}
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Revenue due"
          value={formatINRShort(fhQ.data?.outstandingPaise ?? 0)}
          tagType="red"
          tagText="Outstanding"
          onClick={() => navigate("/invoices")}
          loading={fhQ.isLoading}
        />
      </Column>
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Ready to bill"
          value={formatINRShort(fhQ.data?.readyToBillPaise ?? 0)}
          tagType="green"
          tagText={`${acQ.data?.billingReadyPhases.length ?? 0} phases`}
          onClick={() => navigate("/invoices")}
          loading={fhQ.isLoading || acQ.isLoading}
        />
      </Column>
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Active projects"
          value={s?.projects.byStatus.ACTIVE ?? 0}
          tagType="blue"
          tagText="Live pipeline"
          onClick={() => navigate("/projects")}
          loading={summaryLoading}
        />
      </Column>
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Revision risk"
          value={riQ.data?.revisionRiskBand ?? "—"}
          tagType={
            riQ.data?.revisionRiskBand === "HIGH" ? "red"
              : riQ.data?.revisionRiskBand === "MEDIUM" ? "magenta"
              : "green"
          }
          tagText={`Health ${riQ.data?.healthScore ?? "—"}`}
          onClick={() => navigate("/projects")}
          loading={acQ.isLoading || riQ.isLoading}
        />
      </Column>

      {/* ═══ Zone 3: Portfolio & Workload ══════════════════════════════════ */}
      {showProject && (
        <>
          <Column lg={16} md={8} sm={4}>
            <h4>Portfolio &amp; workload</h4>
          </Column>

          {/* Row A: project health (lg=4) + status overview (lg=4) + phase donut (lg=8) */}
          <Column lg={4} md={4} sm={4}>
            <Tile className="esti-fill">
              <Stack gap={5}>
                <TileHeader
                  Pict={Performance}
                  sub="Project intelligence"
                  title="Project health"
                />
                {phQ.isLoading ? (
                  <InlineLoading description="Loading…" />
                ) : (phQ.data?.length ?? 0) === 0 ? (
                  <p>No active projects.</p>
                ) : (
                  <Stack gap={5}>
                    {(["RED", "YELLOW", "GREEN"] as const).map((k) => {
                      const count = phQ.data!.filter((p) => p.health === k).length;
                      return (
                        <Stack key={k} gap={2}>
                          <p>{HEALTH_LABEL[k]}</p>
                          <h2>{count}</h2>
                          <Tag type={HEALTH_TAG[k]} size="sm">
                            {count} project{count !== 1 ? "s" : ""}
                          </Tag>
                        </Stack>
                      );
                    })}
                  </Stack>
                )}
                <Button
                  kind="ghost"
                  size="sm"
                  onClick={() => navigate("/projects")}
                >
                  View projects
                </Button>
              </Stack>
            </Tile>
          </Column>

          <Column lg={4} md={4} sm={4}>
            <ProjectStatusNumbers
              byStatus={s?.projects.byStatus ?? {}}
              loading={summaryLoading}
              error={summaryError}
              onOpen={() => navigate("/projects")}
            />
          </Column>

          <Column lg={8} md={8} sm={4}>
            <PhaseDonut
              data={byPhase}
              loading={boardsLoading}
              error={boardsError}
              onOpen={() => navigate("/projects")}
            />
          </Column>

          {/* Row B: type treemap (lg=8) + workload heatmap (lg=8) */}
          <Column lg={8} md={8} sm={4}>
            <TypeTreemap
              data={byType}
              loading={boardsLoading}
              error={boardsError}
              onOpen={() => navigate("/projects")}
            />
          </Column>

          <Column lg={8} md={8} sm={4}>
            <WorkloadHeatmap
              weekly={b?.workloadWeekly ?? []}
              daily={b?.workloadDaily ?? []}
              loading={boardsLoading}
              error={boardsError}
              onOpen={() => navigate("/tasks?tab=workload")}
            />
          </Column>

          {/* Row C: team intelligence (lg=8) + daily task gauges (lg=8) */}
          <Column lg={8} md={8} sm={4}>
            <Tile className="esti-fill">
              <Stack gap={5}>
                <TileHeader
                  Pict={TeamAlignment}
                  sub="Team capacity"
                  title="Team intelligence"
                />
                {tiQ.isLoading ? (
                  <InlineLoading description="Loading team data…" />
                ) : (tiQ.data?.length ?? 0) === 0 ? (
                  <p>No open tasks assigned.</p>
                ) : (
                  <Stack gap={4}>
                    {tiQ.data!.map((m) => (
                      <Stack key={m.assignee} orientation="horizontal" gap={4}>
                        <Tag
                          type={CAPACITY_TAG[m.capacity] ?? "gray"}
                          size="sm"
                        >
                          {CAPACITY_LABEL[m.capacity] ?? m.capacity}
                        </Tag>
                        <div className="esti-grow">
                          <p>{m.assignee}</p>
                          <p>
                            {m.totalOpen} open · {m.highPriorityCount} high
                            priority
                          </p>
                        </div>
                        {m.overdueCount > 0 && (
                          <Tag type="red" size="sm">
                            {m.overdueCount} overdue
                          </Tag>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                )}
                <Button
                  kind="ghost"
                  size="sm"
                  onClick={() => navigate("/tasks?tab=workload")}
                >
                  Open workload
                </Button>
              </Stack>
            </Tile>
          </Column>

          <Column lg={8} md={8} sm={4}>
            <DailyTaskGauges
              data={b?.dailyLoad ?? []}
              loading={boardsLoading}
              error={boardsError}
            />
          </Column>

          {/* Row D: revision intelligence (lg=8) + technical intelligence (lg=8) */}
          <Column lg={8} md={8} sm={4}>
            <Tile className="esti-fill">
              <Stack gap={5}>
                <TileHeader
                  Pict={DataInsights}
                  sub="Decision ledger"
                  title="Revision intelligence"
                />
                {riQ.isLoading ? (
                  <InlineLoading description="Loading…" />
                ) : !riQ.data || riQ.data.totalDecisions === 0 ? (
                  <p>No decisions recorded yet.</p>
                ) : (
                  <Stack gap={4}>
                    <Stack orientation="horizontal" gap={4}>
                      <Tag type="blue" size="sm">Client driven</Tag>
                      <p>{riQ.data.clientDriven}</p>
                    </Stack>
                    <Stack orientation="horizontal" gap={4}>
                      <Tag type="red" size="sm">Internal error</Tag>
                      <p>{riQ.data.internalError}</p>
                    </Stack>
                    <Stack orientation="horizontal" gap={4}>
                      <Tag type="teal" size="sm">Technical query</Tag>
                      <p>{riQ.data.technicalQuery}</p>
                    </Stack>
                    <Stack orientation="horizontal" gap={4}>
                      <Tag type="magenta" size="sm">Scope change</Tag>
                      <p>{riQ.data.scopeChange}</p>
                    </Stack>
                    <Stack orientation="horizontal" gap={4}>
                      <p>Scope drift</p>
                      <Tag
                        type={riQ.data.scopeDriftPct > 20 ? "red" : riQ.data.scopeDriftPct > 10 ? "magenta" : "green"}
                        size="sm"
                      >
                        {riQ.data.scopeDriftPct}%
                      </Tag>
                    </Stack>
                    <Stack orientation="horizontal" gap={4}>
                      <p>Health score</p>
                      <Tag
                        type={riQ.data.revisionRiskBand === "HIGH" ? "red" : riQ.data.revisionRiskBand === "MEDIUM" ? "magenta" : "green"}
                        size="sm"
                      >
                        {riQ.data.revisionRiskBand} · {riQ.data.healthScore}
                      </Tag>
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </Tile>
          </Column>

          <Column lg={8} md={8} sm={4}>
            <Tile className="esti-fill">
              <Stack gap={5}>
                <TileHeader
                  Pict={Workflows}
                  sub="Drawing & site queries"
                  title="Technical intelligence"
                />
                {techIQ.isLoading ? (
                  <InlineLoading description="Loading…" />
                ) : !techIQ.data ? (
                  <p>No data.</p>
                ) : (
                  <Stack gap={4}>
                    <Stack orientation="horizontal" gap={4}>
                      <p>Drawing accuracy</p>
                      <Tag
                        type={techIQ.data.drawingAccuracyPct >= 90 ? "green" : techIQ.data.drawingAccuracyPct >= 75 ? "magenta" : "red"}
                        size="sm"
                      >
                        {techIQ.data.drawingAccuracyPct}%
                      </Tag>
                    </Stack>
                    <Stack orientation="horizontal" gap={4}>
                      <p>Site query rate</p>
                      <Tag
                        type={techIQ.data.siteQueryRate <= 10 ? "green" : techIQ.data.siteQueryRate <= 25 ? "magenta" : "red"}
                        size="sm"
                      >
                        {techIQ.data.siteQueryRate}%
                      </Tag>
                    </Stack>
                    <Stack orientation="horizontal" gap={4}>
                      <Tag type="red" size="sm">Internal errors</Tag>
                      <p>{techIQ.data.internalErrors} decision{techIQ.data.internalErrors !== 1 ? "s" : ""}</p>
                    </Stack>
                    <Stack orientation="horizontal" gap={4}>
                      <Tag type="teal" size="sm">Technical queries</Tag>
                      <p>{techIQ.data.techQueries} decision{techIQ.data.techQueries !== 1 ? "s" : ""}</p>
                    </Stack>
                    <Stack orientation="horizontal" gap={4}>
                      <Tag type="blue" size="sm">Total drawings</Tag>
                      <p>{techIQ.data.totalDrawings}</p>
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </Tile>
          </Column>
        </>
      )}

      {/* ═══ Zone 4: Clients & financials ══════════════════════════════════ */}
      <Column lg={16} md={8} sm={4}>
        <h4>Clients{canFees && showFinancial ? " & financials" : ""}</h4>
      </Column>

      {/* Row A: client radar + financial donut */}
      {(ciQ.data?.length ?? 0) > 0 || ciQ.isLoading ? (
        <Column lg={canFees && showFinancial ? 8 : 16} md={8} sm={4}>
          <ClientRadar
            data={ciQ.data}
            loading={ciQ.isLoading}
            onOpen={() => navigate("/clients")}
          />
        </Column>
      ) : null}

      {canFees && showFinancial && (
        <Column lg={8} md={8} sm={4}>
          <FinancialDonut
            data={fhQ.data}
            loading={fhQ.isLoading}
            onOpen={() => navigate("/invoices")}
          />
        </Column>
      )}

      {/* Row B: revenue pipeline + receivables aging */}
      {canFees && showFinancial && (
        <>
          <Column lg={8} md={8} sm={4}>
            <RevenuePipelineBar
              data={fhQ.data}
              loading={fhQ.isLoading}
              onOpen={() => navigate("/accounting/fees")}
            />
          </Column>
          {!agingEmpty && (
            <Column lg={8} md={8} sm={4}>
              <HBarBoard
                Pict={AuditTrail}
                sub="Overdue breakdown"
                title="Receivables aging"
                data={agingData}
                loading={boardsLoading}
                error={boardsError}
                formatValue={(v) => formatINRShort(v)}
                onOpen={() => navigate("/invoices")}
              />
            </Column>
          )}
        </>
      )}

      {/* ═══ Zone 5: Compliance & activity ═════════════════════════════════ */}
      <Column lg={16} md={8} sm={4}>
        <h4>Compliance &amp; activity</h4>
      </Column>

      {showFinancial && (
        <Column lg={4} md={4} sm={4}>
          <FilingDueBoard
            title="GST filing due"
            Pictogram={Receipt}
            rows={[
              { label: "GSTR-1 (outward)", iso: nextMonthlyDue(11) },
              { label: "GSTR-3B (summary)", iso: nextMonthlyDue(20) },
            ]}
            onOpen={() => navigate("/filing")}
          />
        </Column>
      )}
      {showFinancial && (
        <Column lg={4} md={4} sm={4}>
          <FilingDueBoard
            title="TDS filing due"
            Pictogram={Banking}
            rows={[
              { label: "TDS payment (challan)", iso: nextMonthlyDue(7) },
              { label: "TDS return (quarterly)", iso: nextTdsReturnDue() },
            ]}
            onOpen={() => navigate("/filing")}
          />
        </Column>
      )}

      {hasActivity && (
        <Column lg={showFinancial ? 8 : 16} md={8} sm={4}>
          <Tile className="esti-fill">
            <Stack gap={5}>
              {/* Resource-card header */}
              <Stack gap={3}>
                <Stack orientation="horizontal" gap={2}>
                  <Tag type="gray" size="sm">Recent activity</Tag>
                  <Tag type="blue" size="sm">
                    {activityQ.data!.rows.length} events
                  </Tag>
                </Stack>
                <Stack orientation="horizontal" gap={3}>
                  <Workflows width={32} height={32} />
                  <h3>Activity feed</h3>
                </Stack>
              </Stack>

              {activityQ.isLoading ? (
                <InlineLoading description="Loading activity…" />
              ) : (
                <Stack gap={4}>
                  {activityQ.data!.rows.map((item) => (
                    <Stack key={item.id} gap={2}>
                      <Stack orientation="horizontal" gap={3}>
                        <Tag
                          size="sm"
                          type={
                            ACTIVITY_DOMAIN_TAG[activityDomain(item.eventType)]
                          }
                        >
                          {activityDomain(item.eventType)}
                        </Tag>
                        <Tag size="sm" type="gray">
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
                      <p>
                        {item.projectRef ? `${item.projectRef} · ` : ""}
                        {item.actorName ?? "System"}
                      </p>
                      {item.projectId && (
                        <Link to={`/projects/${item.projectId}`}>
                          Open project
                        </Link>
                      )}
                    </Stack>
                  ))}
                </Stack>
              )}
              <Button
                kind="ghost"
                size="sm"
                onClick={() => navigate("/tasks?tab=activity")}
              >
                Open Activity Center
              </Button>
            </Stack>
          </Tile>
        </Column>
      )}

      {/* Admin module toggles */}
      {isAdmin && (
        <Column lg={16} md={8} sm={4}>
          <Tile>
            <Stack gap={4}>
              <Stack gap={3}>
                <Tag type="gray" size="sm">Admin</Tag>
                <h3>Dashboard sections</h3>
              </Stack>
              <Stack orientation="horizontal" gap={6}>
                <Toggle
                  id="db-financial"
                  size="sm"
                  labelText="Financial"
                  labelA="Off"
                  labelB="On"
                  toggled={showFinancial}
                  disabled={setModule.isPending || settingsQ.isLoading}
                  onToggle={(c) =>
                    setModule.mutate({ module: "financial", enabled: c })
                  }
                />
                <Toggle
                  id="db-project"
                  size="sm"
                  labelText="Project"
                  labelA="Off"
                  labelB="On"
                  toggled={showProject}
                  disabled={setModule.isPending || settingsQ.isLoading}
                  onToggle={(c) =>
                    setModule.mutate({ module: "project", enabled: c })
                  }
                />
              </Stack>
            </Stack>
          </Tile>
        </Column>
      )}
    </Grid>
  );
}
