import {
  ClickableTile,
  Column,
  Grid,
  Button,
  ProgressBar,
  Stack,
  Tag,
  Tile,
  Toggle,
} from "@carbon/react";
import { PieChart, type PieChartOptions } from "@carbon/charts-react";
import {
  Banking,
  ChartLine,
  type Pictogram,
  Receipt,
} from "@carbon/pictograms-react";
import { can, formatINRShort } from "@esti/contracts";
import { useNavigate } from "react-router-dom";
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
          <h4>{title}</h4>
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

/** A distribution board: one labelled Carbon ProgressBar per row. */
function DistroBoard({
  title,
  rows,
  max,
  format,
  emptyText,
}: {
  title: string;
  rows: { label: string; value: number }[];
  max: number;
  format?: (n: number) => string;
  emptyText?: string;
}) {
  const fmt = format ?? ((n: number) => String(n));
  return (
    <Tile className="esti-fill">
      <Stack gap={5}>
        <h4>{title}</h4>
        {rows.length === 0 ? (
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
}: {
  rows: { status: string; count: number }[];
  total: number;
  onOpen: () => void;
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
            <h2>{total}</h2>
          </div>
          <Tag type="blue">all projects</Tag>
        </Stack>
        {rows.length === 0 ? (
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
  const activityQ = trpc.activity.listOffice.useQuery({
    limit: 5,
    visibility: "STAFF",
  });

  const s = summary.data;
  const b = boardsQ.data;
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

      <Column lg={16} md={8} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={4}>
            <Stack gap={2}>
              <p>Office pulse</p>
              <h3>Presentation summary</h3>
            </Stack>
            <Grid condensed>
              <Column lg={4} md={4} sm={4}>
                <ClickableTile
                  className="esti-fill"
                  onClick={() => navigate("/projects")}
                >
                  <Stack gap={2}>
                    <p>Active projects</p>
                    <h2>{activeProjects}</h2>
                    <Tag type="blue">live pipeline</Tag>
                  </Stack>
                </ClickableTile>
              </Column>
              <Column lg={4} md={4} sm={4}>
                <ClickableTile
                  className="esti-fill"
                  onClick={() => navigate("/tasks")}
                >
                  <Stack gap={2}>
                    <p>Tasks due today</p>
                    <h2>{b?.tasksDueToday ?? "…"}</h2>
                    <Tag type="gray">workload pressure</Tag>
                  </Stack>
                </ClickableTile>
              </Column>
              <Column lg={4} md={4} sm={4}>
                <ClickableTile
                  className="esti-fill"
                  onClick={() => navigate("/activity")}
                >
                  <Stack gap={2}>
                    <p>Recent activity</p>
                    <h2>{recentActivity.length}</h2>
                    <Tag type="purple">live timeline</Tag>
                  </Stack>
                </ClickableTile>
              </Column>
              <Column lg={4} md={4} sm={4}>
                <ClickableTile
                  className="esti-fill"
                  onClick={() => navigate("/invoices")}
                >
                  <Stack gap={2}>
                    <p>Outstanding fees</p>
                    <h2>
                      {s ? formatINRShort(s.invoices.outstandingPaise) : "…"}
                    </h2>
                    <Tag type="green">cashflow view</Tag>
                  </Stack>
                </ClickableTile>
              </Column>
            </Grid>
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
          />
        </Column>
      )}
      {showFinancial && (
        <Column lg={4} md={4} sm={4}>
          <ClickableTile
            className="esti-fill"
            onClick={() => navigate("/invoices")}
          >
            <Stack gap={3}>
              <p>Outstanding (net of TDS)</p>
              <h2>{s ? formatINRShort(s.invoices.outstandingPaise) : "…"}</h2>
              <Tag type="green">
                {s
                  ? `${formatINRShort(s.invoices.collectedPaise)} collected`
                  : "—"}
              </Tag>
            </Stack>
          </ClickableTile>
        </Column>
      )}
      {showProject && (
        <Column lg={4} md={4} sm={4}>
          <ClickableTile
            className="esti-fill"
            onClick={() => navigate("/tasks")}
          >
            <Stack gap={3}>
              <p>Tasks due today</p>
              <h2>{b?.tasksDueToday ?? "…"}</h2>
              <Tag type="gray">due today or overdue</Tag>
            </Stack>
          </ClickableTile>
        </Column>
      )}
      {showAdmin && (
        <Column lg={4} md={4} sm={4}>
          {canHr ? (
            <ClickableTile
              className="esti-fill"
              onClick={() => navigate("/hr")}
            >
              <Stack gap={3}>
                <p>On leave today</p>
                <h2>{b?.onLeaveToday ?? "…"}</h2>
                <Tag type="purple">{s?.hr?.headcount ?? 0} on the team</Tag>
              </Stack>
            </ClickableTile>
          ) : (
            <Tile className="esti-fill">
              <Stack gap={3}>
                <p>Permits open</p>
                <h2>{s?.permits.open ?? "…"}</h2>
                {s?.permits.overdue ? (
                  <Tag type="red">{s.permits.overdue} overdue</Tag>
                ) : (
                  <Tag type="gray">of {s?.permits.total ?? 0} total</Tag>
                )}
              </Stack>
            </Tile>
          )}
        </Column>
      )}

      <Column lg={8} md={4} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={5}>
            <Stack orientation="horizontal" gap={4}>
              <div className="esti-grow">
                <p>Recent activity</p>
                <h4>Latest project movement</h4>
              </div>
              <Tag type="blue">{recentActivity.length} items</Tag>
            </Stack>
            {activityQ.isLoading ? (
              <p>Loading recent activity…</p>
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
                <h2>{p.count}</h2>
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
                <h2>{t.count}</h2>
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
          />
        </Column>
      )}
    </Grid>
  );
}
