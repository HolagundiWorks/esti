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
  Toggle,
} from "@carbon/react";
import { DonutChart, GroupedBarChart, SimpleBarChart } from "@carbon/charts-react";
import { ScaleTypes } from "@carbon/charts";
import {
  Analytics,
  Banking,
  Building,
  ChartBar,
  ChartDonut,
  ChartLine,
  DataInsights,
  FinanceAndOperations,
  Receipt,
  TeamAlignment,
  Warning_01,
  Workflows,
  type Pictogram,
} from "@carbon/pictograms-react";
import {
  ACTIVITY_DOMAIN_TAG,
  activityDomain,
  can,
  formatINRShort,
  PERFORMANCE_BAND_LABEL,
  PERFORMANCE_BAND_TAG,
  type PerformanceBand,
} from "@esti/contracts";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { useAppTheme } from "../lib/theme-context.js";
import { trpc } from "../lib/trpc.js";

// ─── constants ────────────────────────────────────────────────────────────────

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

// ─── TileHeader ───────────────────────────────────────────────────────────────

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
        <TileHeader Pict={Pict} sub="Statutory" title={title} />
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
            Open filing
          </Button>
        )}
      </Stack>
    </Tile>
  );
}

// ─── Financial Health charts ─────────────────────────────────────────────────

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
        <TileHeader Pict={FinanceAndOperations} sub="Cash flow" title="Revenue breakdown" />
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
    height: "260px",
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
        <TileHeader Pict={ChartBar} sub="Expected → billed → collected" title="Revenue pipeline" />
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

function ReceivablesAging({
  data,
  loading,
  error,
  onOpen,
}: {
  data: { group: string; value: number }[];
  loading?: boolean;
  error?: boolean;
  onOpen?: () => void;
}) {
  const chartTheme = useAppTheme();
  const options = {
    axes: {
      left: { mapsTo: "group", scaleType: ScaleTypes.LABELS },
      bottom: { mapsTo: "value", scaleType: ScaleTypes.LINEAR },
    },
    height: "200px",
    theme: chartTheme,
    toolbar: { enabled: false },
    legend: { enabled: false },
    tooltip: { valueFormatter: (v: number) => formatINRShort(v) },
  };
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <TileHeader Pict={Banking} sub="Overdue breakdown" title="Receivables aging" />
        {loading ? (
          <InlineLoading description="Loading…" />
        ) : error ? (
          <Tag type="red">Data unavailable</Tag>
        ) : (
          <SimpleBarChart data={data} options={options} />
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

// ─── PhaseDonut ──────────────────────────────────────────────────────────────

function PhaseDonut({
  data,
  loading,
  error,
}: {
  data: { label: string; count: number }[];
  loading?: boolean;
  error?: boolean;
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
        <TileHeader Pict={ChartDonut} sub="Phase tracking" title="Projects by stage" />
        {loading ? (
          <InlineLoading description="Loading…" />
        ) : error ? (
          <Tag type="red">Data unavailable</Tag>
        ) : (
          <DonutChart data={chartData} options={options} />
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
  const utilQ = trpc.dashboard.utilization.useQuery();
  const aspQ = trpc.aspRf.teamScores.useQuery();
  const activityQ = trpc.activity.listOffice.useQuery({ limit: 6, visibility: "STAFF" });

  const s = summary.data;
  const b = boardsQ.data;
  const summaryLoading = summary.isLoading && !s;
  const boardsLoading = boardsQ.isLoading && !b;
  const boardsError = boardsQ.isError && !b;

  const canFees = can(user?.role, "fees:manage");
  const isAdmin = can(user?.role, "firm:admin");

  const utils = trpc.useUtils();
  const settingsQ = trpc.settings.get.useQuery();
  const showFinancial = settingsQ.data?.financialEnabled ?? true;
  const showProject = settingsQ.data?.projectEnabled ?? true;
  const setModule = trpc.settings.setModuleEnabled.useMutation({
    onSuccess: () => utils.settings.get.invalidate(),
  });

  // Action Center derived data — the brief's five categories.
  const billingReady = acQ.data?.billingReadyPhases ?? [];
  const overdueInvoices = acQ.data?.overdueInvoices ?? [];
  const pendingApprovals = acQ.data?.pendingApprovals ?? [];
  const riskProjects = (phQ.data ?? []).filter((p) => p.health === "RED");
  const overloadedMembers = (tiQ.data ?? []).filter((m) => m.capacity === "OVERLOADED");
  const acTotal =
    billingReady.length +
    overdueInvoices.length +
    pendingApprovals.length +
    riskProjects.length +
    overloadedMembers.length;

  const agingData = [
    { group: "0–30 days", value: b?.receivablesAging.d0_30 ?? 0 },
    { group: "31–60 days", value: b?.receivablesAging.d31_60 ?? 0 },
    { group: "60+ days", value: b?.receivablesAging.d60p ?? 0 },
  ];
  const agingEmpty = agingData.every((d) => d.value === 0);

  const hasActivity = (activityQ.data?.rows.length ?? 0) > 0;

  // Team intelligence: join ASPRF scores with capacity signals (by member name).
  const capacityByName = new Map((tiQ.data ?? []).map((m) => [m.assignee, m]));
  const teamCards = (aspQ.data ?? []).slice(0, 8);

  const readyToBillSum = billingReady.reduce(
    (sum, ph) => sum + Math.round((ph.billingPct * ph.contractValuePaise) / 100),
    0,
  );

  return (
    <Grid fullWidth className="esti-dash">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <Column lg={16} md={8} sm={4}>
        <Stack orientation="horizontal" gap={5}>
          <ChartLine width={44} height={44} />
          <div>
            <h1>Office dashboard</h1>
            {user?.fullName && (
              <p>Welcome, Ar. {user.fullName.replace(/^Ar\.?\s+/i, "").split(" ")[0]}</p>
            )}
          </div>
        </Stack>
      </Column>

      {/* ═══ Zone 1: Global KPI Bar — six studio-wide signals ═════════════ */}
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Ready to bill"
          value={formatINRShort(fhQ.data?.readyToBillPaise ?? 0)}
          tagType="green"
          tagText={`${billingReady.length} phase${billingReady.length !== 1 ? "s" : ""}`}
          onClick={() => navigate("/invoices")}
          loading={fhQ.isLoading || acQ.isLoading}
        />
      </Column>
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Outstanding collections"
          value={formatINRShort(fhQ.data?.outstandingPaise ?? 0)}
          tagType="magenta"
          tagText="Unpaid invoices"
          onClick={() => navigate("/invoices")}
          loading={fhQ.isLoading}
        />
      </Column>
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Overdue 30d+"
          value={formatINRShort(fhQ.data?.overdue30dPaise ?? 0)}
          tagType="red"
          tagText={`${overdueInvoices.length} invoice${overdueInvoices.length !== 1 ? "s" : ""}`}
          onClick={() => navigate("/invoices")}
          loading={fhQ.isLoading || acQ.isLoading}
        />
      </Column>
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Active projects"
          value={s?.projects.byStatus.ACTIVE ?? 0}
          tagType="blue"
          tagText={`${riskProjects.length} at risk`}
          onClick={() => navigate("/projects")}
          loading={summaryLoading}
        />
      </Column>
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Team utilization"
          value={utilQ.data ? `${utilQ.data.utilizationPct}%` : "—"}
          tagType="teal"
          tagText={
            utilQ.data && utilQ.data.totalHours > 0
              ? `${utilQ.data.billableRatePct}% billable`
              : "No timesheets yet"
          }
          onClick={() => navigate("/tasks?tab=timesheets")}
          loading={utilQ.isLoading}
        />
      </Column>
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Revision risk"
          value={riQ.data?.revisionRiskBand ?? "—"}
          tagType={RISK_TAG[riQ.data?.revisionRiskBand ?? "LOW"]}
          tagText={`Health ${riQ.data?.healthScore ?? "—"}`}
          onClick={() => navigate("/projects")}
          loading={riQ.isLoading}
        />
      </Column>

      {/* ═══ Zone 2: Action Center — the brief's five urgent categories ════ */}
      <Column lg={16} md={8} sm={4}>
        <Tile>
          <Stack gap={6}>
            <Stack gap={3}>
              <Stack orientation="horizontal" gap={2}>
                <Tag type="gray" size="sm">Action Center</Tag>
                {!acQ.isLoading && !phQ.isLoading && !tiQ.isLoading && (
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
                {/* Overdue collections — money first */}
                <Column lg={6} md={4} sm={4}>
                  <Stack gap={4}>
                    <Stack orientation="horizontal" gap={3}>
                      <h4>Overdue collections</h4>
                      <Tag type="red" size="sm">{overdueInvoices.length}</Tag>
                    </Stack>
                    {overdueInvoices.length === 0 ? (
                      <p>No invoices overdue beyond 30 days.</p>
                    ) : (
                      <StructuredListWrapper isCondensed>
                        <StructuredListBody>
                          {overdueInvoices.slice(0, 6).map((inv) => (
                            <StructuredListRow key={inv.id}>
                              <StructuredListCell>
                                <Link to={`/projects/${inv.projectId}?tab=invoices`}>
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

                {/* Pending client approvals */}
                <Column lg={5} md={4} sm={4}>
                  <Stack gap={4}>
                    <Stack orientation="horizontal" gap={3}>
                      <h4>Approvals pending</h4>
                      <Tag type="magenta" size="sm">{pendingApprovals.length}</Tag>
                    </Stack>
                    {pendingApprovals.length === 0 ? (
                      <p>No items awaiting client response.</p>
                    ) : (
                      <StructuredListWrapper isCondensed>
                        <StructuredListBody>
                          {pendingApprovals.slice(0, 6).map((ap) => (
                            <StructuredListRow key={ap.id}>
                              <StructuredListCell>
                                <Link to={`/projects/${ap.projectId}?tab=approvals`}>
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

                {/* Ready to bill + risk + capacity — numeric trio */}
                <Column lg={5} md={8} sm={4}>
                  <Stack gap={6}>
                    <Stack gap={3}>
                      <h4>Ready to bill</h4>
                      <Stack orientation="horizontal" gap={4}>
                        <h2>{billingReady.length}</h2>
                        <div>
                          <p>Phases awaiting invoice</p>
                          <p>{formatINRShort(readyToBillSum)} estimated</p>
                        </div>
                      </Stack>
                      <Button kind="ghost" size="sm" onClick={() => navigate("/invoices")}>
                        Open invoices
                      </Button>
                    </Stack>

                    <Stack gap={3}>
                      <Stack orientation="horizontal" gap={3}>
                        <h4>High-risk projects</h4>
                        <Tag type={riskProjects.length > 0 ? "red" : "green"} size="sm">
                          {riskProjects.length}
                        </Tag>
                      </Stack>
                      {riskProjects.length === 0 ? (
                        <p>No projects at risk.</p>
                      ) : (
                        <Stack gap={2}>
                          {riskProjects.slice(0, 3).map((p) => (
                            <p key={p.id}>
                              <Link to={`/projects/${p.id}`}>{p.ref}</Link> — {p.title}
                            </p>
                          ))}
                        </Stack>
                      )}
                    </Stack>

                    <Stack gap={3}>
                      <Stack orientation="horizontal" gap={3}>
                        <h4>Capacity alerts</h4>
                        <Tag type={overloadedMembers.length > 0 ? "red" : "green"} size="sm">
                          {overloadedMembers.length}
                        </Tag>
                      </Stack>
                      {overloadedMembers.length === 0 ? (
                        <p>No overloaded team members.</p>
                      ) : (
                        <Stack gap={2}>
                          {overloadedMembers.slice(0, 3).map((m) => (
                            <Stack key={m.assignee} orientation="horizontal" gap={3}>
                              <Tag type="red" size="sm">{m.overdueCount} overdue</Tag>
                              <p>{m.assignee} · {m.totalOpen} open</p>
                            </Stack>
                          ))}
                        </Stack>
                      )}
                    </Stack>
                  </Stack>
                </Column>
              </Grid>
            )}
          </Stack>
        </Tile>
      </Column>

      {/* ═══ Zone 3: Financial Health ══════════════════════════════════════ */}
      {canFees && showFinancial && (
        <>
          <Column lg={16} md={8} sm={4}>
            <h4>Financial health</h4>
          </Column>
          <Column lg={6} md={8} sm={4}>
            <FinancialDonut
              data={fhQ.data}
              loading={fhQ.isLoading}
              onOpen={() => navigate("/invoices")}
            />
          </Column>
          <Column lg={6} md={8} sm={4}>
            <RevenuePipelineBar
              data={fhQ.data}
              loading={fhQ.isLoading}
              onOpen={() => navigate("/accounting/fees")}
            />
          </Column>
          <Column lg={4} md={8} sm={4}>
            {agingEmpty ? (
              <Tile className="esti-fill">
                <Stack gap={5}>
                  <TileHeader Pict={Banking} sub="Overdue breakdown" title="Receivables aging" />
                  <p>No outstanding receivables.</p>
                </Stack>
              </Tile>
            ) : (
              <ReceivablesAging
                data={agingData}
                loading={boardsLoading}
                error={boardsError}
                onOpen={() => navigate("/invoices")}
              />
            )}
          </Column>
        </>
      )}

      {/* ═══ Zone 4: Project Health — per-project cards ════════════════════ */}
      {showProject && (
        <>
          <Column lg={16} md={8} sm={4}>
            <h4>Project health</h4>
          </Column>

          <Column lg={10} md={8} sm={4}>
            <Tile className="esti-fill">
              <Stack gap={5}>
                <TileHeader
                  Pict={Building}
                  sub="Active projects"
                  title="Project health board"
                  statusTag={
                    phQ.data
                      ? {
                          text: `${riskProjects.length} at risk`,
                          type: riskProjects.length > 0 ? "red" : "green",
                        }
                      : undefined
                  }
                />
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
                        {phQ.data!.map((p) => (
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
                                {p.revisionsOpen > 0 && (
                                  <Tag type="purple" size="sm">{p.revisionsOpen} revisions</Tag>
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
                <Button kind="ghost" size="sm" onClick={() => navigate("/projects")}>
                  Open projects
                </Button>
              </Stack>
            </Tile>
          </Column>

          <Column lg={6} md={8} sm={4}>
            <PhaseDonut
              data={b?.byPhase ?? []}
              loading={boardsLoading}
              error={boardsError}
            />
          </Column>
        </>
      )}

      {/* ═══ Zone 5: Client Intelligence — decision behaviour table ════════ */}
      {((ciQ.data?.length ?? 0) > 0 || ciQ.isLoading) && (
        <>
          <Column lg={16} md={8} sm={4}>
            <h4>Client intelligence</h4>
          </Column>
          <Column lg={16} md={8} sm={4}>
            <Tile>
              <Stack gap={5}>
                <TileHeader
                  Pict={Analytics}
                  sub="Decision behaviour"
                  title="Client signals"
                />
                {ciQ.isLoading ? (
                  <InlineLoading description="Loading client data…" />
                ) : (
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
                        {ciQ.data!.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell>{c.activeProjects}</TableCell>
                            <TableCell>
                              {c.outstandingPaise > 0
                                ? formatINRShort(c.outstandingPaise)
                                : "—"}
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
                )}
                <Button kind="ghost" size="sm" onClick={() => navigate("/clients")}>
                  Open clients
                </Button>
              </Stack>
            </Tile>
          </Column>
        </>
      )}

      {/* ═══ Zone 6: Team Intelligence — capacity + ASPRF performance ══════ */}
      <Column lg={16} md={8} sm={4}>
        <h4>Team intelligence</h4>
      </Column>

      {teamCards.length > 0 ? (
        teamCards.map((m) => {
          const cap = capacityByName.get(m.memberName);
          const band = m.band as PerformanceBand | null;
          return (
            <Column key={m.teamMemberId} lg={4} md={4} sm={4}>
              <Tile className="esti-fill">
                <Stack gap={4}>
                  <Stack gap={1}>
                    <Tag type="gray" size="sm">{m.memberRole}</Tag>
                    <h3>{m.memberName}</h3>
                  </Stack>
                  <Stack orientation="horizontal" gap={4}>
                    <Stack gap={1}>
                      <p>Performance</p>
                      <h2>{m.score}</h2>
                    </Stack>
                    <Stack gap={2}>
                      {band ? (
                        <Tag type={PERFORMANCE_BAND_TAG[band]} size="sm">
                          {PERFORMANCE_BAND_LABEL[band]}
                        </Tag>
                      ) : (
                        <Tag type="gray" size="sm">Developing</Tag>
                      )}
                      {cap && (
                        <Tag type={CAPACITY_TAG[cap.capacity] ?? "gray"} size="sm">
                          {CAPACITY_LABEL[cap.capacity] ?? cap.capacity}
                        </Tag>
                      )}
                    </Stack>
                  </Stack>
                  <Stack orientation="horizontal" gap={5}>
                    <Stack gap={1}>
                      <p>Open</p>
                      <p><strong>{cap?.totalOpen ?? 0}</strong></p>
                    </Stack>
                    <Stack gap={1}>
                      <p>Overdue</p>
                      <p><strong>{cap?.overdueCount ?? m.overdueCount}</strong></p>
                    </Stack>
                    <Stack gap={1}>
                      <p>Points</p>
                      <p><strong>{m.totalPoints}</strong></p>
                    </Stack>
                  </Stack>
                </Stack>
              </Tile>
            </Column>
          );
        })
      ) : (
        <Column lg={8} md={8} sm={4}>
          <Tile className="esti-fill">
            <Stack gap={5}>
              <TileHeader Pict={TeamAlignment} sub="Team capacity" title="Team intelligence" />
              {aspQ.isLoading ? (
                <InlineLoading description="Loading team data…" />
              ) : (
                <p>No team members yet. Add members via the HR module.</p>
              )}
            </Stack>
          </Tile>
        </Column>
      )}

      {teamCards.length > 0 && (
        <Column lg={16} md={8} sm={4}>
          <Button kind="ghost" size="sm" onClick={() => navigate("/performance")}>
            Open performance
          </Button>
        </Column>
      )}

      {/* ═══ Zone 7: Revision & Technical Intelligence ═════════════════════ */}
      <Column lg={16} md={8} sm={4}>
        <h4>Revision &amp; technical intelligence</h4>
      </Column>

      <Column lg={8} md={8} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={5}>
            <TileHeader
              Pict={DataInsights}
              sub="Decision ledger"
              title="Revision intelligence"
              statusTag={
                riQ.data
                  ? {
                      text: `${riQ.data.revisionRiskBand} risk`,
                      type: RISK_TAG[riQ.data.revisionRiskBand],
                    }
                  : undefined
              }
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
                  <Tag type={RISK_TAG[riQ.data.revisionRiskBand]} size="sm">
                    {riQ.data.healthScore} / 100
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

      {/* ═══ Zone 8: Statutory filing + Activity Feed ══════════════════════ */}
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
                          type={ACTIVITY_DOMAIN_TAG[activityDomain(item.eventType)]}
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
