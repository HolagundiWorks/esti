import {
  ClickableTile,
  Column,
  Grid,
  Button,
  InlineLoading,
  ProgressBar,
  Stack,
  Tag,
  Tile,
  Toggle,
} from "@carbon/react";
import {
  Building,
  Document,
  Money,
  TaskComplete,
  UserMultiple,
  type CarbonIconType,
} from "@carbon/icons-react";
import { PieChart, type PieChartOptions } from "@carbon/charts-react";
import {
  Banking,
  ChartLine,
  type Pictogram,
  Receipt,
} from "@carbon/pictograms-react";
import { can, formatINRShort } from "@esti/contracts";
import { Link, useNavigate } from "react-router-dom";
import { ClockLeavesWidget } from "../components/ClockLeavesWidget.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

/** Friendlier labels for the raw project-type enum values. */
const TYPE_LABEL: Record<string, string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  INSTITUTIONAL: "Institutional",
  INDUSTRIAL: "Industrial",
  HOSPITALITY: "Hospitality",
  HEALTHCARE: "Healthcare",
  RETAIL: "Retail",
  MIXED_USE: "Mixed use",
  URBAN_DESIGN: "Urban design",
  INTERIOR: "Interior",
  LANDSCAPE: "Landscape",
  OTHER: "Other",
};

const STATUS_LABEL: Record<string, string> = {
  ENQUIRY: "Enquiry",
  PROPOSAL: "Proposal",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_TAG: Record<
  string,
  "blue" | "gray" | "magenta" | "green" | "red" | "teal"
> = {
  ENQUIRY: "gray",
  PROPOSAL: "teal",
  ACTIVE: "blue",
  ON_HOLD: "magenta",
  COMPLETED: "green",
  CANCELLED: "red",
};

/** Days from today (local) until an ISO yyyy-mm-dd date. */
function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Next occurrence of a fixed day-of-month at/after today (rolls to next month). */
function nextMonthlyDue(day: number): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let y = now.getFullYear();
  let m = now.getMonth();
  if (now.getDate() > day) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return isoDate(y, m, day);
}

/** Next quarterly TDS-return due date (31 Jul / 31 Oct / 31 Jan / 31 May). */
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
  for (const off of [0, 1]) {
    for (const dl of deadlines) cands.push(new Date(y + off, dl.m, dl.d));
  }
  cands.sort((a, b) => a.getTime() - b.getTime());
  const next = cands.find((c) => c.getTime() >= now.getTime()) ?? cands[0]!;
  return isoDate(next.getFullYear(), next.getMonth(), next.getDate());
}

function dueTagType(days: number): "red" | "magenta" | "blue" {
  return days <= 3 ? "red" : days <= 7 ? "magenta" : "blue";
}

function dueLabel(days: number): string {
  return days === 0
    ? "Due today"
    : days < 0
      ? `${-days}d overdue`
      : `${days}d left`;
}

/** A board listing statutory filing deadlines with a days-remaining countdown. */
function FilingDueBoard({
  title,
  Pictogram,
  rows,
}: {
  title: string;
  Pictogram: Pictogram;
  rows: { label: string; iso: string }[];
}) {
  const fmtDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
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
                <div className="esti-grow">
                  <p>{r.label}</p>
                  <p>{fmtDate(r.iso)}</p>
                </div>
                <Tag type={dueTagType(days)}>{dueLabel(days)}</Tag>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Tile>
  );
}

function DashboardMetricTile({
  title,
  value,
  tag,
  detail,
  Icon,
  onClick,
  loading,
  error,
  kind = "blue",
}: {
  title: string;
  value: string | number | undefined;
  tag: string;
  detail?: string;
  Icon: CarbonIconType;
  onClick?: () => void;
  loading?: boolean;
  error?: boolean;
  kind?: "blue" | "gray" | "green" | "magenta" | "purple" | "teal";
}) {
  const body = (
    <Stack gap={3}>
      <Stack orientation="horizontal" gap={4}>
        <Icon size={20} />
        <div className="esti-grow">
          <p>{title}</p>
          <h3>{error ? "—" : loading ? "…" : value ?? 0}</h3>
        </div>
      </Stack>
      <Tag type={error ? "red" : kind}>{error ? "Data unavailable" : tag}</Tag>
      {detail && <p>{detail}</p>}
      {loading && <InlineLoading description="Loading dashboard data…" />}
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

/** Compact KPI chip — label above a large value with an optional Tag. */
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
    <Stack gap={2}>
      <p>{label}</p>
      <h3>{loading ? "…" : value}</h3>
      {tagType && tagText && <Tag type={tagType} size="sm">{tagText}</Tag>}
    </Stack>
  );
  return onClick ? (
    <ClickableTile className="esti-fill" onClick={onClick}>{body}</ClickableTile>
  ) : (
    <Tile className="esti-fill">{body}</Tile>
  );
}

/** A distribution board: one labelled Carbon ProgressBar per row. */
function DistroBoard({
  title,
  rows,
  max,
  format,
  emptyText,
  loading,
  error,
}: {
  title: string;
  rows: { label: string; value: number }[];
  max: number;
  format?: (n: number) => string;
  emptyText?: string;
  loading?: boolean;
  error?: boolean;
}) {
  const fmt = format ?? ((n: number) => String(n));
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <h3>{title}</h3>
        {loading ? (
          <InlineLoading description="Loading dashboard data…" />
        ) : error ? (
          <Tag type="red">Data unavailable</Tag>
        ) : rows.length === 0 ? (
          <p>{emptyText ?? "No data"}</p>
        ) : (
          <Stack gap={5}>
            {rows.map((r) => (
              <ProgressBar
                key={r.label}
                label={r.label}
                helperText={fmt(r.value)}
                value={r.value}
                max={Math.max(1, max)}
                size="small"
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Tile>
  );
}

function ProjectStatusBoard({
  rows,
  total,
  onOpen,
  loading,
  error,
}: {
  rows: { status: string; count: number }[];
  total: number;
  onOpen: () => void;
  loading?: boolean;
  error?: boolean;
}) {
  const chartData = rows.map((r) => ({
    group: STATUS_LABEL[r.status] ?? r.status,
    value: r.count,
  }));
  const options: PieChartOptions = {
    data: { groupMapsTo: "group" },
    height: "18rem",
    legend: { enabled: true, position: "right", clickable: false },
    pie: {
      valueMapsTo: "value",
      labels: {
        enabled: true,
        formatter: (datum: { value?: number }) => String(datum.value ?? 0),
      },
    },
    toolbar: { enabled: false },
    tooltip: { valueFormatter: (value: number) => `${value} projects` },
    accessibility: { svgAriaLabel: "Project status distribution" },
  };

  return (
    <ClickableTile className="esti-fill" onClick={onOpen}>
      <Stack gap={5}>
      <Stack orientation="horizontal" gap={4}>
          <div className="esti-grow">
            <p>Project status</p>
            <h3>{error ? "—" : loading ? "…" : total}</h3>
          </div>
          <Tag type={error ? "red" : "blue"}>
            {error ? "data unavailable" : "all projects"}
          </Tag>
        </Stack>
        {loading ? (
          <InlineLoading description="Loading project summary…" />
        ) : error ? (
          <Tag type="red">Project summary unavailable</Tag>
        ) : rows.length === 0 ? (
          <p>No projects yet</p>
        ) : (
          <>
            <div className="esti-chart-medium">
              <PieChart data={chartData} options={options} />
            </div>
            <Stack orientation="horizontal" gap={3}>
              {rows.map((r) => (
                <Tag key={r.status} type={STATUS_TAG[r.status] ?? "gray"}>
                  {STATUS_LABEL[r.status] ?? r.status}: {r.count}
                </Tag>
              ))}
            </Stack>
          </>
        )}
      </Stack>
    </ClickableTile>
  );
}

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
  const activityQ = trpc.activity.listOffice.useQuery({
    limit: 5,
    visibility: "STAFF",
  });

  const s = summary.data;
  const b = boardsQ.data;
  const summaryLoading = summary.isLoading && !s;
  const boardsLoading = boardsQ.isLoading && !b;
  const summaryError = summary.isError && !s;
  const boardsError = boardsQ.isError && !b;
  const totalProjects = s?.projects.total ?? 0;
  const projectStatusRows = Object.entries(s?.projects.byStatus ?? {})
    .map(([status, count]) => ({ status, count }))
    .filter((r) => r.count > 0);
  const byPhase = b?.byPhase ?? [];
  const byType = b?.byType ?? [];
  const recentActivity = activityQ.data?.rows ?? [];

  const canFees = can(user?.role, "fees:manage");
  const canHr = can(user?.role, "hr:manage");

  // Board-group switches (Financial / Project / Admin) — owner-controlled.
  const utils = trpc.useUtils();
  const settingsQ = trpc.settings.get.useQuery();
  const isAdmin = can(user?.role, "firm:admin");
  const showFinancial = settingsQ.data?.financialEnabled ?? true;
  const showProject = settingsQ.data?.projectEnabled ?? true;
  const showAdmin = settingsQ.data?.adminEnabled ?? true;
  const setModule = trpc.settings.setModuleEnabled.useMutation({
    onSuccess: () => utils.settings.get.invalidate(),
  });

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const agingMax =
    (b?.receivablesAging.d0_30 ?? 0) +
    (b?.receivablesAging.d31_60 ?? 0) +
    (b?.receivablesAging.d60p ?? 0);
  const workloadMax = Math.max(1, ...(b?.workload ?? []).map((w) => w.count));
  const activeProjects = s?.projects.byStatus.ACTIVE ?? 0;
  const outstandingPaise = s?.invoices.outstandingPaise ?? 0;
  const permitOpen = s?.permits.open ?? 0;
  const permitTotal = s?.permits.total ?? 0;
  const permitOverdue = s?.permits.overdue ?? 0;

  return (
    <Grid fullWidth className="esti-dash">
      {/* Header — title at left, clock/leave widget pinned top-right */}
      <Column lg={12} md={6} sm={4}>
        <Stack orientation="horizontal" gap={5}>
          <ChartLine width={44} height={44} />
          <div>
            <h1>Office dashboard</h1>
            <p>
              {user?.fullName
                ? `Welcome, ${user.fullName.split(" ")[0]} · `
                : ""}
              {today}
            </p>
          </div>
        </Stack>
      </Column>
      <Column lg={4} md={2} sm={4}>
        <ClockLeavesWidget />
      </Column>

      {/* Global KPI Bar */}
      <Column lg={16} md={8} sm={4}>
        <Grid condensed>
          <Column lg={3} md={4} sm={4}>
            <KpiChip
              label="Revenue due"
              value={formatINRShort(fhQ.data?.outstandingPaise ?? 0)}
              tagType="red"
              tagText="Outstanding"
              onClick={() => navigate("/invoices")}
              loading={fhQ.isLoading}
            />
          </Column>
          <Column lg={3} md={4} sm={4}>
            <KpiChip
              label="Ready to bill"
              value={formatINRShort(fhQ.data?.readyToBillPaise ?? 0)}
              tagType="green"
              tagText={`${acQ.data?.billingReadyPhases.length ?? 0} phases`}
              onClick={() => navigate("/invoices")}
              loading={fhQ.isLoading || acQ.isLoading}
            />
          </Column>
          <Column lg={2} md={4} sm={4}>
            <KpiChip
              label="Overdue >30d"
              value={formatINRShort(fhQ.data?.overdue30dPaise ?? 0)}
              tagType={(fhQ.data?.overdue30dPaise ?? 0) > 0 ? "red" : "gray"}
              tagText={(fhQ.data?.overdue30dPaise ?? 0) > 0 ? "Past due" : "Clear"}
              onClick={() => navigate("/invoices")}
              loading={fhQ.isLoading}
            />
          </Column>
          <Column lg={3} md={4} sm={4}>
            <KpiChip
              label="Active projects"
              value={s?.projects.byStatus.ACTIVE ?? 0}
              tagType="blue"
              tagText="Live pipeline"
              onClick={() => navigate("/projects")}
              loading={summaryLoading}
            />
          </Column>
          <Column lg={2} md={4} sm={4}>
            <KpiChip
              label="Pending approvals"
              value={acQ.data?.pendingApprovals.length ?? 0}
              tagType={(acQ.data?.pendingApprovals.length ?? 0) > 0 ? "magenta" : "gray"}
              tagText="Awaiting response"
              onClick={() => navigate("/projects")}
              loading={acQ.isLoading}
            />
          </Column>
          <Column lg={3} md={4} sm={4}>
            <KpiChip
              label="Revision risk"
              value={acQ.data?.revisionRiskCount ?? 0}
              tagType={(acQ.data?.revisionRiskCount ?? 0) > 0 ? "magenta" : "gray"}
              tagText="Items needing rework"
              onClick={() => navigate("/projects")}
              loading={acQ.isLoading}
            />
          </Column>
        </Grid>
      </Column>

      <Column lg={16} md={8} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={4}>
            <Stack gap={3}>
              <p>Office pulse</p>
              <h2>Office summary</h2>
            </Stack>
            <Grid condensed>
              <Column lg={4} md={4} sm={4}>
                <DashboardMetricTile
                  title="Active projects"
                  value={activeProjects}
                  tag="Live pipeline"
                  Icon={Building}
                  onClick={() => navigate("/projects")}
                  loading={summaryLoading}
                  error={summaryError}
                />
              </Column>
              <Column lg={4} md={4} sm={4}>
                <DashboardMetricTile
                  title="Outstanding fees"
                  value={formatINRShort(outstandingPaise)}
                  tag="Cashflow view"
                  Icon={Money}
                  onClick={() => navigate("/invoices")}
                  loading={summaryLoading}
                  error={summaryError}
                  kind="green"
                />
              </Column>
              <Column lg={4} md={4} sm={4}>
                <DashboardMetricTile
                  title="Tasks due today"
                  value={b?.tasksDueToday}
                  tag="Workload pressure"
                  Icon={TaskComplete}
                  onClick={() => navigate("/tasks")}
                  loading={boardsLoading}
                  error={boardsError}
                  kind="gray"
                />
              </Column>
              <Column lg={4} md={4} sm={4}>
                <DashboardMetricTile
                  title={canHr ? "On leave today" : "Permits open"}
                  value={canHr ? b?.onLeaveToday : permitOpen}
                  tag={
                    canHr
                      ? `${s?.hr?.headcount ?? 0} on the team`
                      : permitOverdue
                        ? `${permitOverdue} overdue`
                        : `of ${permitTotal} total`
                  }
                  Icon={canHr ? UserMultiple : Document}
                  onClick={canHr ? () => navigate("/hr") : () => navigate("/compliance")}
                  loading={boardsLoading}
                  error={boardsError}
                  kind={canHr ? "purple" : "teal"}
                />
              </Column>
            </Grid>
          </Stack>
        </Tile>
      </Column>

      {/* Financial Health module */}
      {canFees && (
        <Column lg={16} md={8} sm={4}>
          <Tile className="esti-fill">
            <Stack gap={5}>
              <Stack gap={3}>
                <p>Firm financials</p>
                <h2>Financial health</h2>
              </Stack>
              {fhQ.isLoading ? (
                <InlineLoading description="Loading financial data…" />
              ) : (
                <Grid condensed>
                  <Column lg={3} md={4} sm={4}>
                    <Stack gap={2}>
                      <p>Revenue pipeline</p>
                      <h3>{formatINRShort(fhQ.data?.activePipelinePaise ?? 0)}</h3>
                      <Tag type="blue" size="sm">Active projects</Tag>
                    </Stack>
                  </Column>
                  <Column lg={3} md={4} sm={4}>
                    <Stack gap={2}>
                      <p>Proposal pipeline</p>
                      <h3>{formatINRShort(fhQ.data?.proposalPipelinePaise ?? 0)}</h3>
                      <Tag type="teal" size="sm">Proposals</Tag>
                    </Stack>
                  </Column>
                  <Column lg={3} md={4} sm={4}>
                    <Stack gap={2}>
                      <p>Ready to bill</p>
                      <h3>{formatINRShort(fhQ.data?.readyToBillPaise ?? 0)}</h3>
                      <Tag type="green" size="sm">Unbilled approved phases</Tag>
                    </Stack>
                  </Column>
                  <Column lg={3} md={4} sm={4}>
                    <Stack gap={2}>
                      <p>Outstanding</p>
                      <h3>{formatINRShort(fhQ.data?.outstandingPaise ?? 0)}</h3>
                      <Tag type={(fhQ.data?.outstandingPaise ?? 0) > 0 ? "red" : "gray"} size="sm">Issued &amp; unpaid</Tag>
                    </Stack>
                  </Column>
                  <Column lg={2} md={4} sm={4}>
                    <Stack gap={2}>
                      <p>Overdue &gt;30d</p>
                      <h3>{formatINRShort(fhQ.data?.overdue30dPaise ?? 0)}</h3>
                      <Tag type={(fhQ.data?.overdue30dPaise ?? 0) > 0 ? "red" : "gray"} size="sm">
                        {(fhQ.data?.overdue30dPaise ?? 0) > 0 ? "At risk" : "Clear"}
                      </Tag>
                    </Stack>
                  </Column>
                  <Column lg={2} md={4} sm={4}>
                    <Stack gap={2}>
                      <p>Collected this FY</p>
                      <h3>{formatINRShort(fhQ.data?.collectedFyPaise ?? 0)}</h3>
                      <Tag type="green" size="sm">FY {fhQ.data?.fyStart?.slice(0, 4)}-{String(Number(fhQ.data?.fyStart?.slice(0, 4) ?? 0) + 1).slice(-2)}</Tag>
                    </Stack>
                  </Column>
                </Grid>
              )}
            </Stack>
          </Tile>
        </Column>
      )}

      {/* Action Center — billing-ready phases, overdue collections, pending approvals */}
      <Column lg={16} md={8} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={5}>
            <Stack orientation="horizontal" gap={4}>
              <div className="esti-grow">
                <p>What needs attention now</p>
                <h2>Action Center</h2>
              </div>
              {acQ.data && (
                <Tag type={
                  acQ.data.billingReadyPhases.length + acQ.data.overdueInvoices.length + acQ.data.pendingApprovals.length > 0
                    ? "red" : "green"
                }>
                  {acQ.data.billingReadyPhases.length + acQ.data.overdueInvoices.length + acQ.data.pendingApprovals.length} items
                </Tag>
              )}
            </Stack>
            {acQ.isLoading ? (
              <InlineLoading description="Loading action items…" />
            ) : (
              <Grid condensed>
                {/* Billing-ready phases */}
                <Column lg={6} md={4} sm={4}>
                  <Stack gap={4}>
                    <Stack orientation="horizontal" gap={3}>
                      <h3>Ready to bill</h3>
                      <Tag type="green" size="sm">{acQ.data?.billingReadyPhases.length ?? 0}</Tag>
                    </Stack>
                    {(acQ.data?.billingReadyPhases.length ?? 0) === 0 ? (
                      <p>No phases awaiting invoice.</p>
                    ) : (
                      <Stack gap={3}>
                        {acQ.data!.billingReadyPhases.map((ph) => (
                          <Stack key={ph.id} orientation="horizontal" gap={3}>
                            <div className="esti-grow">
                              <Link to={`/projects/${ph.projectId}?tab=phases`}>
                                {ph.projectRef}
                              </Link>
                              <p>{ph.label} · {ph.billingPct}%</p>
                            </div>
                            <Tag type="green" size="sm">{ph.status}</Tag>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Column>

                {/* Overdue invoices */}
                <Column lg={5} md={4} sm={4}>
                  <Stack gap={4}>
                    <Stack orientation="horizontal" gap={3}>
                      <h3>Overdue collections</h3>
                      <Tag type="red" size="sm">{acQ.data?.overdueInvoices.length ?? 0}</Tag>
                    </Stack>
                    {(acQ.data?.overdueInvoices.length ?? 0) === 0 ? (
                      <p>No invoices overdue beyond 30 days.</p>
                    ) : (
                      <Stack gap={3}>
                        {acQ.data!.overdueInvoices.map((inv) => (
                          <Stack key={inv.id} orientation="horizontal" gap={3}>
                            <div className="esti-grow">
                              <Link to={`/projects/${inv.projectId}?tab=invoices`}>
                                {inv.ref}
                              </Link>
                              <p>{inv.projectRef} · {formatINRShort(inv.netReceivablePaise)}</p>
                            </div>
                            <Tag type="red" size="sm">{inv.daysOverdue}d overdue</Tag>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Column>

                {/* Pending approvals */}
                <Column lg={5} md={4} sm={4}>
                  <Stack gap={4}>
                    <Stack orientation="horizontal" gap={3}>
                      <h3>Pending approvals</h3>
                      <Tag type="magenta" size="sm">{acQ.data?.pendingApprovals.length ?? 0}</Tag>
                    </Stack>
                    {(acQ.data?.pendingApprovals.length ?? 0) === 0 ? (
                      <p>No items sent and awaiting response.</p>
                    ) : (
                      <Stack gap={3}>
                        {acQ.data!.pendingApprovals.map((ap) => (
                          <Stack key={ap.id} orientation="horizontal" gap={3}>
                            <div className="esti-grow">
                              <Link to={`/projects/${ap.projectId}?tab=approvals`}>
                                {ap.projectRef}
                              </Link>
                              <p>{ap.title}</p>
                            </div>
                            <Tag type="magenta" size="sm">{ap.daysWaiting}d waiting</Tag>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Column>
              </Grid>
            )}
          </Stack>
        </Tile>
      </Column>

      {/* Project Health scoring */}
      {showProject && (
        <Column lg={16} md={8} sm={4}>
          <Tile className="esti-fill">
            <Stack gap={5}>
              <Stack gap={3}>
                <p>Project intelligence</p>
                <h2>Project health</h2>
              </Stack>
              {phQ.isLoading ? (
                <InlineLoading description="Loading project health…" />
              ) : (phQ.data?.length ?? 0) === 0 ? (
                <p>No active projects.</p>
              ) : (
                <Stack gap={3}>
                  {phQ.data!.map((ph) => (
                    <Stack key={ph.id} orientation="horizontal" gap={4}>
                      <Tag
                        type={ph.health === "RED" ? "red" : ph.health === "YELLOW" ? "magenta" : "green"}
                        size="sm"
                      >
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
                  ))}
                </Stack>
              )}
            </Stack>
          </Tile>
        </Column>
      )}

      {/* Client Intelligence signals */}
      <Column lg={8} md={8} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={5}>
            <Stack gap={3}>
              <p>Client signals</p>
              <h2>Client intelligence</h2>
            </Stack>
            {ciQ.isLoading ? (
              <InlineLoading description="Loading client intelligence…" />
            ) : (ciQ.data?.length ?? 0) === 0 ? (
              <p>No clients with active projects.</p>
            ) : (
              <Stack gap={3}>
                {ciQ.data!.map((c) => (
                  <Stack key={c.id} orientation="horizontal" gap={4}>
                    <Tag
                      type={c.risk === "HIGH" ? "red" : c.risk === "MEDIUM" ? "magenta" : "green"}
                      size="sm"
                    >
                      {c.risk}
                    </Tag>
                    <div className="esti-grow">
                      <p>{c.name}</p>
                      <p>{c.activeProjects} project{c.activeProjects !== 1 ? "s" : ""}</p>
                    </div>
                    {c.outstandingPaise > 0 && (
                      <Tag type={c.oldestInvoiceDays > 30 ? "red" : "gray"} size="sm">
                        {formatINRShort(c.outstandingPaise)} due · {c.oldestInvoiceDays}d
                      </Tag>
                    )}
                    {c.revisionRequests > 0 && (
                      <Tag type="magenta" size="sm">{c.revisionRequests} revisions</Tag>
                    )}
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        </Tile>
      </Column>

      {/* Team Intelligence signals */}
      <Column lg={8} md={8} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={5}>
            <Stack gap={3}>
              <p>Team capacity</p>
              <h2>Team intelligence</h2>
            </Stack>
            {tiQ.isLoading ? (
              <InlineLoading description="Loading team data…" />
            ) : (tiQ.data?.length ?? 0) === 0 ? (
              <p>No open tasks assigned.</p>
            ) : (
              <Stack gap={3}>
                {tiQ.data!.map((m) => (
                  <Stack key={m.assignee} orientation="horizontal" gap={4}>
                    <Tag
                      type={m.capacity === "OVERLOADED" ? "red" : m.capacity === "BUSY" ? "magenta" : "green"}
                      size="sm"
                    >
                      {m.capacity}
                    </Tag>
                    <div className="esti-grow">
                      <p>{m.assignee}</p>
                      <p>{m.totalOpen} open · {m.highPriorityCount} high priority</p>
                    </div>
                    {m.overdueCount > 0 && (
                      <Tag type="red" size="sm">{m.overdueCount} overdue</Tag>
                    )}
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        </Tile>
      </Column>

      {/* Board-group switches — owner shows/hides boards by module group */}
      {isAdmin && (
        <Column lg={16} md={8} sm={4}>
          <Tile className="esti-fill">
            <Stack gap={4}>
              <p>Show board groups</p>
              <Stack orientation="horizontal" gap={6}>
                <Toggle
                  id="db-financial"
                  size="sm"
                  labelText="Financial"
                  labelA="Off"
                  labelB="On"
                  toggled={showFinancial}
                  disabled={setModule.isPending || settingsQ.isLoading}
                  onToggle={(checked) =>
                    setModule.mutate({ module: "financial", enabled: checked })
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
                  onToggle={(checked) =>
                    setModule.mutate({ module: "project", enabled: checked })
                  }
                />
                <Toggle
                  id="db-admin"
                  size="sm"
                  labelText="Admin"
                  labelA="Off"
                  labelB="On"
                  toggled={showAdmin}
                  disabled={setModule.isPending || settingsQ.isLoading}
                  onToggle={(checked) =>
                    setModule.mutate({ module: "admin", enabled: checked })
                  }
                />
              </Stack>
            </Stack>
          </Tile>
        </Column>
      )}

      {/* KPI tiles */}
      {showProject && (
        <Column lg={8} md={4} sm={4}>
          <ProjectStatusBoard
            rows={projectStatusRows}
            total={totalProjects || (s ? 0 : 0)}
            onOpen={() => navigate("/projects")}
            loading={summaryLoading}
            error={summaryError}
          />
        </Column>
      )}
      <Column lg={8} md={4} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={5}>
            <Stack orientation="horizontal" gap={4}>
              <div className="esti-grow">
                <p>Recent activity</p>
                <h3>Latest activity</h3>
              </div>
              <Tag type="blue">{recentActivity.length} items</Tag>
            </Stack>
            {activityQ.isLoading ? (
              <InlineLoading description="Loading recent activity…" />
            ) : recentActivity.length === 0 ? (
              <p>No activity yet.</p>
            ) : (
              <Stack gap={3}>
                {recentActivity.map((item) => (
                  <Stack key={item.id} gap={2}>
                    <Stack orientation="horizontal" gap={3}>
                      <Tag
                        size="sm"
                        type={item.visibility === "ALL" ? "purple" : "blue"}
                      >
                        {item.eventType}
                      </Tag>
                      <span>
                        {new Date(
                          item.createdAt as unknown as string,
                        ).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
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
              onClick={() => navigate("/activity")}
            >
              Open Activity Center
            </Button>
          </Stack>
        </Tile>
      </Column>

      {/* One board per phase */}
      {showProject &&
        byPhase.map((p) => (
          <Column key={p.code} lg={4} md={4} sm={4}>
            <ClickableTile
              className="esti-fill"
              onClick={() => navigate("/projects")}
            >
              <Stack gap={3}>
                <p>{p.label}</p>
                <h3>{p.count}</h3>
                <ProgressBar
                  label={p.label}
                  hideLabel
                  helperText={`${totalProjects > 0 ? Math.round((p.count / totalProjects) * 100) : 0}% of projects`}
                  value={p.count}
                  max={Math.max(1, totalProjects)}
                  size="small"
                />
              </Stack>
            </ClickableTile>
          </Column>
        ))}

      {/* One board per project type */}
      {showProject &&
        byType.map((t) => (
          <Column key={t.type} lg={4} md={4} sm={4}>
            <ClickableTile
              className="esti-fill"
              onClick={() => navigate("/projects")}
            >
              <Stack gap={3}>
                <p>{TYPE_LABEL[t.type] ?? t.type}</p>
                <h3>{t.count}</h3>
                <ProgressBar
                  label={TYPE_LABEL[t.type] ?? t.type}
                  hideLabel
                  helperText={`${totalProjects > 0 ? Math.round((t.count / totalProjects) * 100) : 0}% of projects`}
                  value={t.count}
                  max={Math.max(1, totalProjects)}
                  size="small"
                />
              </Stack>
            </ClickableTile>
          </Column>
        ))}

      {/* Statutory filing deadlines */}
      {showFinancial && (
        <Column lg={4} md={4} sm={4}>
          <FilingDueBoard
            title="GST filing due"
            Pictogram={Receipt}
            rows={[
              { label: "GSTR-1 (outward)", iso: nextMonthlyDue(11) },
              { label: "GSTR-3B (summary)", iso: nextMonthlyDue(20) },
            ]}
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
          />
        </Column>
      )}

      {/* Workload */}
      {showProject && (
        <Column lg={4} md={4} sm={4}>
          <DistroBoard
            title="Workload — open tasks"
            rows={(b?.workload ?? []).map((r) => ({
              label: r.assignee,
              value: r.count,
            }))}
            max={workloadMax}
            emptyText="No assigned open tasks"
            loading={boardsLoading}
            error={boardsError}
          />
        </Column>
      )}

      {/* Receivables — fees managers only */}
      {showFinancial && canFees && (
        <Column lg={4} md={4} sm={4}>
          <DistroBoard
            title="Receivables aging"
            rows={[
              { label: "0–30 days", value: b?.receivablesAging.d0_30 ?? 0 },
              { label: "31–60 days", value: b?.receivablesAging.d31_60 ?? 0 },
              { label: "60+ days", value: b?.receivablesAging.d60p ?? 0 },
            ]}
            max={agingMax}
            format={(n) => formatINRShort(n)}
            loading={boardsLoading}
            error={boardsError}
          />
        </Column>
      )}
    </Grid>
  );
}
