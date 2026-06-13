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
  can,
  formatINRShort,
  PERFORMANCE_BAND_LABEL,
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
function dueLabel(days: number) {
  return days === 0 ? "Due today" : days < 0 ? `${-days}d overdue` : `${days}d left`;
}

// ─── Health edge — the card's single colour signal ───────────────────────────
// A 3px left border (Carbon notification anatomy) marks whether a card needs
// attention. Tags inside cards stay monochrome (outline) — the edge carries
// the urgency, the text carries the meaning. Carbon support tokens only.

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

// ─── FilingTile — statutory due dates; edge = worst urgency ──────────────────

function FilingTile({
  title,
  rows,
  onOpen,
}: {
  title: string;
  rows: { label: string; iso: string }[];
  onOpen: () => void;
}) {
  const worst = Math.min(...rows.map((r) => daysUntil(r.iso)));
  const health: CardHealth = worst <= 3 ? "alert" : worst <= 7 ? "watch" : "neutral";
  return (
    <Column lg={4} md={4} sm={4}>
      <Tile className="esti-fill" style={edge(health)}>
        <Stack gap={5}>
          <h4>{title}</h4>
          <Stack gap={4}>
            {rows.map((r) => (
              <Stack key={r.label} orientation="horizontal" gap={3}>
                <div className="esti-grow">
                  <p>{r.label}</p>
                </div>
                <Tag type="outline" size="sm">{dueLabel(daysUntil(r.iso))}</Tag>
              </Stack>
            ))}
          </Stack>
          <Button kind="ghost" size="sm" onClick={onOpen}>
            Open filing
          </Button>
        </Stack>
      </Tile>
    </Column>
  );
}

// ─── Section header — one consistent zone divider ────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="esti-zone-head">
      <Stack gap={2}>
        <h3>{title}</h3>
        {sub && <p>{sub}</p>}
      </Stack>
    </div>
  );
}

// ─── KpiChip — label / value / context tag ───────────────────────────────────

function KpiChip({
  label,
  value,
  health,
  tagText,
  onClick,
  loading,
}: {
  label: string;
  value: string | number;
  health: CardHealth;
  tagText?: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  const body = (
    <Stack gap={3}>
      <p>{label}</p>
      <h2>{loading ? "…" : value}</h2>
      {tagText && (
        <Tag type="outline" size="sm">
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
    <Grid fullWidth condensed className="esti-dash">

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
          health={billingReady.length > 0 ? "ok" : "neutral"}
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
          health="neutral"
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
        <div className="esti-zone-head">
          <Stack orientation="horizontal" gap={3}>
            <div className="esti-grow">
              <Stack gap={2}>
                <h3>Action Center</h3>
                <p>Billing, approvals, and risk items that need a decision today.</p>
              </Stack>
            </div>
            {!acQ.isLoading && !phQ.isLoading && !tiQ.isLoading && (
              <div>
                <Tag type="outline" size="sm">
                  {acTotal > 0 ? `${acTotal} open` : "All clear"}
                </Tag>
              </div>
            )}
          </Stack>
        </div>
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
                        <Tag type="outline" size="sm">{inv.daysOverdue}d overdue</Tag>
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
                        <Tag type="outline" size="sm">{ap.daysWaiting}d waiting</Tag>
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
        <Tile className="esti-fill" style={edge(billingReady.length > 0 ? "ok" : "neutral")}>
          <Stack gap={4}>
            <h4>Ready to bill</h4>
            {acQ.isLoading ? (
              <InlineLoading description="Loading…" />
            ) : (
              <Stack gap={3}>
                <h2>{billingReady.length}</h2>
                <p>
                  Phase{billingReady.length !== 1 ? "s" : ""} awaiting invoice ·{" "}
                  {formatINRShort(readyToBillSum)} estimated
                </p>
                <Button kind="ghost" size="sm" onClick={() => navigate("/invoices")}>
                  Open invoices
                </Button>
              </Stack>
            )}
          </Stack>
        </Tile>
      </Column>

      <Column lg={4} md={4} sm={4}>
        <Tile
          className="esti-fill"
          style={edge(
            riskProjects.length > 0 || overloadedMembers.length > 0 ? "alert" : "ok",
          )}
        >
          <Stack gap={4}>
            <h4>Risk &amp; capacity</h4>
            <Stack gap={2}>
              <p><strong>High-risk projects</strong></p>
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
            <Stack gap={2}>
              <p><strong>Capacity alerts</strong></p>
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
            <Tile className="esti-fill" style={edge("neutral")}>
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
            <Tile className="esti-fill" style={edge(agingEmpty ? "neutral" : "watch")}>
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
            <Tile
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
                                  <Tag type="outline" size="sm">{p.unbilledPhases} billable</Tag>
                                )}
                                {p.overdueInvoices > 0 && (
                                  <Tag type="outline" size="sm">{p.overdueInvoices} overdue inv</Tag>
                                )}
                                {p.overdueTasks > 0 && (
                                  <Tag type="outline" size="sm">{p.overdueTasks} late tasks</Tag>
                                )}
                                {p.staleApprovals > 0 && (
                                  <Tag type="outline" size="sm">{p.staleApprovals} stale appr</Tag>
                                )}
                                {p.criticalNotesOpen > 0 && (
                                  <Tag type="outline" size="sm">{p.criticalNotesOpen} critical</Tag>
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
            <Tile
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
                    <Stack gap={1}>
                      <p>{m.memberRole}</p>
                      <h4>{m.memberName}</h4>
                    </Stack>
                    <h2>{m.score}</h2>
                    <Stack orientation="horizontal" gap={2}>
                      <Tag type="outline" size="sm">
                        {band ? PERFORMANCE_BAND_LABEL[band] : "Developing"}
                      </Tag>
                      {cap && (
                        <Tag type="outline" size="sm">
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
        <Tile
          className="esti-fill"
          style={edge(
            riQ.data?.revisionRiskBand === "HIGH"
              ? "alert"
              : riQ.data?.revisionRiskBand === "MEDIUM"
                ? "watch"
                : "ok",
          )}
        >
          <Stack gap={5}>
            <Stack orientation="horizontal" gap={3}>
              <div className="esti-grow">
                <h4>Revisions</h4>
              </div>
              {riQ.data && (
                <Tag type="outline" size="sm">
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
                  <strong>{riQ.data.scopeDriftPct}%</strong>
                </Stack>
              </Stack>
            )}
          </Stack>
        </Tile>
      </Column>

      <Column lg={8} md={8} sm={4}>
        <Tile
          className="esti-fill"
          style={edge(
            !techIQ.data
              ? "neutral"
              : techIQ.data.drawingAccuracyPct < 75 || techIQ.data.siteQueryRate > 25
                ? "alert"
                : techIQ.data.drawingAccuracyPct < 90 || techIQ.data.siteQueryRate > 10
                  ? "watch"
                  : "ok",
          )}
        >
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
                  <strong>{techIQ.data.drawingAccuracyPct}%</strong>
                </Stack>
                <Stack orientation="horizontal" gap={3}>
                  <span className="esti-grow">Site query rate</span>
                  <strong>{techIQ.data.siteQueryRate}%</strong>
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
        <FilingTile
          title="GST filing"
          rows={[
            { label: "GSTR-1 (outward)", iso: nextMonthlyDue(11) },
            { label: "GSTR-3B (summary)", iso: nextMonthlyDue(20) },
          ]}
          onOpen={() => navigate("/filing")}
        />
      )}
      {showFinancial && (
        <FilingTile
          title="TDS filing"
          rows={[
            { label: "TDS payment (challan)", iso: nextMonthlyDue(7) },
            { label: "TDS return (quarterly)", iso: nextTdsReturnDue() },
          ]}
          onOpen={() => navigate("/filing")}
        />
      )}

      {hasActivity && (
        <Column lg={showFinancial ? 8 : 16} md={8} sm={4}>
          <Tile className="esti-fill" style={edge("neutral")}>
            <Stack gap={5}>
              <h4>Recent activity</h4>
              <Stack gap={4}>
                {activityQ.data!.rows.map((item) => (
                  <Stack key={item.id} gap={1}>
                    <Stack orientation="horizontal" gap={3}>
                      <Tag size="sm" type="outline">
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
