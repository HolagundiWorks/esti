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
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { useAppTheme } from "../lib/theme-context.js";
import { trpc } from "../lib/trpc.js";

// ─── constants ────────────────────────────────────────────────────────────────

const CHART_HEIGHT = "240px";

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

// ─── Section header — one consistent zone divider ────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <Stack gap={2}>
      <h3>{title}</h3>
      {sub && <p>{sub}</p>}
    </Stack>
  );
}

// ─── KpiChip — label / value / context tag ───────────────────────────────────

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

// ─── Dashboard ───────────────────────────────────────────────────────────────

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
  const tiQ = trpc.dashboard.teamIntelligence.useQuery();
  const riQ = trpc.dashboard.revisionIntelligence.useQuery();
  const techIQ = trpc.dashboard.technicalIntelligence.useQuery();
  const utilQ = trpc.dashboard.utilization.useQuery();
  const aspQ = trpc.aspRf.teamScores.useQuery();
  const activityQ = trpc.activity.listOffice.useQuery({ limit: 4, visibility: "STAFF" });

  const s = summary.data;
  const b = boardsQ.data;
  const summaryLoading = summary.isLoading && !s;
  const boardsLoading = boardsQ.isLoading && !b;

  const canFees = can(user?.role, "fees:manage");
  const isAdmin = can(user?.role, "firm:admin");

  const utils = trpc.useUtils();
  const settingsQ = trpc.settings.get.useQuery();
  const showFinancial = settingsQ.data?.financialEnabled ?? true;
  const showProject = settingsQ.data?.projectEnabled ?? true;
  const setModule = trpc.settings.setModuleEnabled.useMutation({
    onSuccess: () => utils.settings.get.invalidate(),
  });

  // Action Center — five urgency categories.
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

  // Team — top four ASPRF cards only; the full board lives at /performance.
  const capacityByName = new Map((tiQ.data ?? []).map((m) => [m.assignee, m]));
  const teamCards = (aspQ.data ?? []).slice(0, 4);

  const hasActivity = (activityQ.data?.rows.length ?? 0) > 0;
  const hasClients = (ciQ.data?.length ?? 0) > 0;

  return (
    <Grid fullWidth className="esti-dash">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <Column lg={16} md={8} sm={4}>
        <Stack gap={2}>
          <h1>Office dashboard</h1>
          {user?.fullName && (
            <p>Welcome, Ar. {user.fullName.replace(/^Ar\.?\s+/i, "").split(" ")[0]}</p>
          )}
        </Stack>
      </Column>

      {/* ═══ 1 · KPI strip — four answers, one row ═════════════════════════ */}
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

      {/* ═══ 2 · Action Center — what needs attention now ══════════════════ */}
      <Column lg={16} md={8} sm={4}>
        <Tile>
          <Stack gap={6}>
            <Stack orientation="horizontal" gap={3}>
              <div className="esti-grow">
                <SectionHeader
                  title="Action Center"
                  sub="Billing, approvals, and risk items that need a decision today."
                />
              </div>
              {!acQ.isLoading && !phQ.isLoading && !tiQ.isLoading && (
                <div>
                  <Tag type={acTotal > 0 ? "red" : "green"} size="sm">
                    {acTotal > 0 ? `${acTotal} open` : "All clear"}
                  </Tag>
                </div>
              )}
            </Stack>

            {acQ.isLoading ? (
              <InlineLoading description="Loading action items…" />
            ) : acTotal === 0 ? (
              <p>All clear — no outstanding items.</p>
            ) : (
              <Grid narrow>
                <Column lg={6} md={4} sm={4}>
                  <Stack gap={4}>
                    <h4>Overdue collections</h4>
                    {overdueInvoices.length === 0 ? (
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
                                <Tag type="red" size="sm">{inv.daysOverdue}d</Tag>
                              </StructuredListCell>
                            </StructuredListRow>
                          ))}
                        </StructuredListBody>
                      </StructuredListWrapper>
                    )}
                  </Stack>
                </Column>

                <Column lg={5} md={4} sm={4}>
                  <Stack gap={4}>
                    <h4>Approvals pending</h4>
                    {pendingApprovals.length === 0 ? (
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
                                <Tag type="magenta" size="sm">{ap.daysWaiting}d</Tag>
                              </StructuredListCell>
                            </StructuredListRow>
                          ))}
                        </StructuredListBody>
                      </StructuredListWrapper>
                    )}
                  </Stack>
                </Column>

                <Column lg={5} md={8} sm={4}>
                  <Stack gap={5}>
                    <Stack gap={2}>
                      <h4>Ready to bill</h4>
                      <p>
                        <strong>{billingReady.length}</strong> phase{billingReady.length !== 1 ? "s" : ""} ·{" "}
                        {formatINRShort(readyToBillSum)} estimated
                      </p>
                    </Stack>
                    <Stack gap={2}>
                      <h4>High-risk projects</h4>
                      {riskProjects.length === 0 ? (
                        <p>None at risk.</p>
                      ) : (
                        riskProjects.slice(0, 3).map((p) => (
                          <p key={p.id}>
                            <Link to={`/projects/${p.id}`}>{p.ref}</Link> {p.title}
                          </p>
                        ))
                      )}
                    </Stack>
                    <Stack gap={2}>
                      <h4>Capacity alerts</h4>
                      {overloadedMembers.length === 0 ? (
                        <p>No one overloaded.</p>
                      ) : (
                        overloadedMembers.slice(0, 3).map((m) => (
                          <p key={m.assignee}>
                            {m.assignee} — {m.totalOpen} open, {m.overdueCount} overdue
                          </p>
                        ))
                      )}
                    </Stack>
                  </Stack>
                </Column>
              </Grid>
            )}
          </Stack>
        </Tile>
      </Column>

      {/* ═══ 3 · Financial health ══════════════════════════════════════════ */}
      {canFees && showFinancial && (
        <>
          <Column lg={16} md={8} sm={4}>
            <SectionHeader title="Financial health" />
          </Column>
          <Column lg={8} md={8} sm={4}>
            <Tile className="esti-fill">
              <Stack gap={5}>
                <h4>Revenue breakdown</h4>
                {fhQ.isLoading ? (
                  <InlineLoading description="Loading…" />
                ) : revenueData.length === 0 ? (
                  <p>No financial data yet.</p>
                ) : (
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
                )}
                <Button kind="ghost" size="sm" onClick={() => navigate("/invoices")}>
                  Open invoices
                </Button>
              </Stack>
            </Tile>
          </Column>
          <Column lg={8} md={8} sm={4}>
            <Tile className="esti-fill">
              <Stack gap={5}>
                <h4>Receivables aging</h4>
                {boardsLoading ? (
                  <InlineLoading description="Loading…" />
                ) : agingEmpty ? (
                  <p>No outstanding receivables.</p>
                ) : (
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
                )}
                <Button kind="ghost" size="sm" onClick={() => navigate("/filing")}>
                  Open filing
                </Button>
              </Stack>
            </Tile>
          </Column>
        </>
      )}

      {/* ═══ 4 · Project health ════════════════════════════════════════════ */}
      {showProject && (
        <>
          <Column lg={16} md={8} sm={4}>
            <SectionHeader title="Project health" />
          </Column>
          <Column lg={16} md={8} sm={4}>
            <Tile>
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
                <Button kind="ghost" size="sm" onClick={() => navigate("/projects")}>
                  Open projects
                </Button>
              </Stack>
            </Tile>
          </Column>
        </>
      )}

      {/* ═══ 5 · Clients ═══════════════════════════════════════════════════ */}
      {hasClients && (
        <>
          <Column lg={16} md={8} sm={4}>
            <SectionHeader title="Client signals" />
          </Column>
          <Column lg={16} md={8} sm={4}>
            <Tile>
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
                <Button kind="ghost" size="sm" onClick={() => navigate("/clients")}>
                  Open clients
                </Button>
              </Stack>
            </Tile>
          </Column>
        </>
      )}

      {/* ═══ 6 · Team ══════════════════════════════════════════════════════ */}
      {teamCards.length > 0 && (
        <>
          <Column lg={16} md={8} sm={4}>
            <SectionHeader title="Team performance" sub="Rolling 30-day ASPRF scores." />
          </Column>
          {teamCards.map((m) => {
            const cap = capacityByName.get(m.memberName);
            const band = m.band as PerformanceBand | null;
            return (
              <Column key={m.teamMemberId} lg={4} md={4} sm={4}>
                <ClickableTile className="esti-fill" onClick={() => navigate("/performance")}>
                  <Stack gap={4}>
                    <Stack gap={1}>
                      <p>{m.memberRole}</p>
                      <h4>{m.memberName}</h4>
                    </Stack>
                    <h2>{m.score}</h2>
                    <Stack orientation="horizontal" gap={2}>
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
        <SectionHeader title="Quality intelligence" />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <Tile className="esti-fill">
          <Stack gap={5}>
            <Stack orientation="horizontal" gap={3}>
              <div className="esti-grow">
                <h4>Revisions</h4>
              </div>
              {riQ.data && (
                <Tag type={RISK_TAG[riQ.data.revisionRiskBand]} size="sm">
                  {riQ.data.revisionRiskBand} risk · {riQ.data.healthScore}
                </Tag>
              )}
            </Stack>
            {riQ.isLoading ? (
              <InlineLoading description="Loading…" />
            ) : !riQ.data || riQ.data.totalDecisions === 0 ? (
              <p>No decisions recorded yet.</p>
            ) : (
              <Stack gap={3}>
                <Stack orientation="horizontal" gap={3}>
                  <span className="esti-grow">Client driven</span>
                  <strong>{riQ.data.clientDriven}</strong>
                </Stack>
                <Stack orientation="horizontal" gap={3}>
                  <span className="esti-grow">Internal error</span>
                  <strong>{riQ.data.internalError}</strong>
                </Stack>
                <Stack orientation="horizontal" gap={3}>
                  <span className="esti-grow">Technical query</span>
                  <strong>{riQ.data.technicalQuery}</strong>
                </Stack>
                <Stack orientation="horizontal" gap={3}>
                  <span className="esti-grow">Scope change</span>
                  <strong>{riQ.data.scopeChange}</strong>
                </Stack>
                <Stack orientation="horizontal" gap={3}>
                  <span className="esti-grow">Scope drift</span>
                  <Tag
                    type={riQ.data.scopeDriftPct > 20 ? "red" : riQ.data.scopeDriftPct > 10 ? "magenta" : "green"}
                    size="sm"
                  >
                    {riQ.data.scopeDriftPct}%
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
            <h4>Technical quality</h4>
            {techIQ.isLoading ? (
              <InlineLoading description="Loading…" />
            ) : !techIQ.data ? (
              <p>No data.</p>
            ) : (
              <Stack gap={3}>
                <Stack orientation="horizontal" gap={3}>
                  <span className="esti-grow">Drawing accuracy</span>
                  <Tag
                    type={techIQ.data.drawingAccuracyPct >= 90 ? "green" : techIQ.data.drawingAccuracyPct >= 75 ? "magenta" : "red"}
                    size="sm"
                  >
                    {techIQ.data.drawingAccuracyPct}%
                  </Tag>
                </Stack>
                <Stack orientation="horizontal" gap={3}>
                  <span className="esti-grow">Site query rate</span>
                  <Tag
                    type={techIQ.data.siteQueryRate <= 10 ? "green" : techIQ.data.siteQueryRate <= 25 ? "magenta" : "red"}
                    size="sm"
                  >
                    {techIQ.data.siteQueryRate}%
                  </Tag>
                </Stack>
                <Stack orientation="horizontal" gap={3}>
                  <span className="esti-grow">Internal errors</span>
                  <strong>{techIQ.data.internalErrors}</strong>
                </Stack>
                <Stack orientation="horizontal" gap={3}>
                  <span className="esti-grow">Technical queries</span>
                  <strong>{techIQ.data.techQueries}</strong>
                </Stack>
                <Stack orientation="horizontal" gap={3}>
                  <span className="esti-grow">Drawings issued</span>
                  <strong>{techIQ.data.totalDrawings}</strong>
                </Stack>
              </Stack>
            )}
          </Stack>
        </Tile>
      </Column>

      {/* ═══ 8 · Statutory & activity ══════════════════════════════════════ */}
      <Column lg={16} md={8} sm={4}>
        <SectionHeader title="Statutory & activity" />
      </Column>

      {showFinancial && (
        <Column lg={4} md={4} sm={4}>
          <Tile className="esti-fill">
            <Stack gap={5}>
              <h4>GST filing</h4>
              <Stack gap={4}>
                {[
                  { label: "GSTR-1 (outward)", iso: nextMonthlyDue(11) },
                  { label: "GSTR-3B (summary)", iso: nextMonthlyDue(20) },
                ].map((r) => {
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
              <Button kind="ghost" size="sm" onClick={() => navigate("/filing")}>
                Open filing
              </Button>
            </Stack>
          </Tile>
        </Column>
      )}
      {showFinancial && (
        <Column lg={4} md={4} sm={4}>
          <Tile className="esti-fill">
            <Stack gap={5}>
              <h4>TDS filing</h4>
              <Stack gap={4}>
                {[
                  { label: "TDS payment (challan)", iso: nextMonthlyDue(7) },
                  { label: "TDS return (quarterly)", iso: nextTdsReturnDue() },
                ].map((r) => {
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
              <Button kind="ghost" size="sm" onClick={() => navigate("/filing")}>
                Open filing
              </Button>
            </Stack>
          </Tile>
        </Column>
      )}

      {hasActivity && (
        <Column lg={showFinancial ? 8 : 16} md={8} sm={4}>
          <Tile className="esti-fill">
            <Stack gap={5}>
              <h4>Recent activity</h4>
              <Stack gap={4}>
                {activityQ.data!.rows.map((item) => (
                  <Stack key={item.id} gap={1}>
                    <Stack orientation="horizontal" gap={3}>
                      <Tag
                        size="sm"
                        type={ACTIVITY_DOMAIN_TAG[activityDomain(item.eventType)]}
                      >
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
              <h4>Dashboard sections</h4>
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
