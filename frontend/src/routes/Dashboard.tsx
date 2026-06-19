import {
  ClickableTile,
  Column,
  Grid,
  InlineLoading,
  ProgressBar,
  Stack,
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
import { DashboardActionCenter } from "../components/dashboard/DashboardActionCenter.js";
import { DashboardFinancialSection } from "../components/dashboard/DashboardFinancialSection.js";
import {
  MyTasksTile,
  PendingLeavesTile,
} from "../components/dashboard/DashboardPersonalTiles.js";
import {
  CAPACITY_LABEL,
  CAPACITY_TAG,
  edge,
  formatEventType,
  HEALTH_LABEL,
  HEALTH_TAG,
  KpiChip,
  RISK_TAG,
  ZoneHead,
  ZoneTile,
  type CardHealth,
} from "../components/dashboard/dashboardUi.js";
import { QualityIntelligenceTiles } from "../components/QualityIntelligenceTiles.js";
import { useAuth } from "../lib/auth.js";
import { useAppTheme } from "../lib/theme-context.js";
import { trpc } from "../lib/trpc.js";

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const chartTheme = useAppTheme();

  const homeQ = trpc.dashboard.home.useQuery(undefined, { staleTime: 60_000 });
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const showFinancial =
    homeQ.data?.financialEnabled ?? settingsQ.data?.financialEnabled ?? true;
  const showProject =
    homeQ.data?.projectEnabled ?? settingsQ.data?.projectEnabled ?? true;

  const tiQ = trpc.dashboard.teamIntelligence.useQuery(undefined, { enabled: hrEnabled });
  const attQ = trpc.dashboard.attendanceToday.useQuery(undefined, { enabled: hrEnabled });
  const aspQ = trpc.aspRf.teamScores.useQuery(undefined, { enabled: hrEnabled });

  const home = homeQ.data;
  const s = home?.summary;
  const b = home?.boards;
  const ac = home?.actionCenter;
  const fh = home?.financialHealth;
  const ph = home?.projectHealth ?? [];
  const ci = home?.clientIntelligence ?? [];
  const ri = home?.revisionIntelligence ?? null;
  const tech = home?.technicalIntelligence ?? null;
  const activity = home?.activity;
  const homeLoading = homeQ.isLoading && !home;

  const canFees = can(user?.role, "fees:manage");

  // Action Center — five urgency categories (capacity alerts only when HR is on).
  const billingReady = ac?.billingReadyPhases ?? [];
  const overdueInvoices = ac?.overdueInvoices ?? [];
  const pendingApprovals = ac?.pendingApprovals ?? [];
  const openTenders = ac?.openTenders ?? [];
  const openConstruction = ac?.openConstruction ?? [];
  const riskProjects = ph.filter((p) => p.health === "RED");
  const overloadedMembers = hrEnabled
    ? (tiQ.data ?? []).filter((m) => m.capacity === "OVERLOADED")
    : [];
  const acTotal =
    billingReady.length +
    overdueInvoices.length +
    pendingApprovals.length +
    openTenders.length +
    openConstruction.length +
    riskProjects.length +
    overloadedMembers.length;

  const readyToBillSum = billingReady.reduce(
    (sum, ph) => sum + Math.round((ph.billingPct * ph.contractValuePaise) / 100),
    0,
  );

  // Financial charts.
  const revenueData = fh
    ? [
        { group: "Active pipeline", value: fh.activePipelinePaise },
        { group: "Proposal pipeline", value: fh.proposalPipelinePaise },
        { group: "Ready to bill", value: fh.readyToBillPaise },
        { group: "Outstanding", value: fh.outstandingPaise },
        { group: "Collected FY", value: fh.collectedFyPaise },
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

  const hasActivity = (activity?.rows.length ?? 0) > 0;
  const hasClients = ci.length > 0;

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
        <ZoneHead
          title="Office overview"
          sub={hrEnabled ? "Billing, delivery, and team at a glance." : "Billing and delivery at a glance."}
        />
      </Column>

      {/* KPI strip — four answers, one row ═════════════════════════ */}
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Ready to bill"
          value={formatINRShort(fh?.readyToBillPaise ?? 0)}
          health={billingReady.length > 0 ? "ok" : "neutral"}
          tagType={billingReady.length > 0 ? "green" : "gray"}
          tagText={`${billingReady.length} phase${billingReady.length !== 1 ? "s" : ""}`}
          onClick={() => navigate("/invoices")}
          loading={homeLoading}
        />
      </Column>
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Outstanding collections"
          value={formatINRShort(fh?.outstandingPaise ?? 0)}
          health={(fh?.overdue30dPaise ?? 0) > 0 ? "alert" : "neutral"}
          tagType={(fh?.overdue30dPaise ?? 0) > 0 ? "red" : "gray"}
          tagText={
            (fh?.overdue30dPaise ?? 0) > 0
              ? `${formatINRShort(fh.overdue30dPaise)} overdue 30d+`
              : "Nothing overdue"
          }
          onClick={() => navigate("/invoices")}
          loading={homeLoading}
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
          loading={homeLoading}
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
            loading={homeLoading}
          />
        )}
      </Column>

      {/* ═══ Personal · your workload ═════════════════════════════════════ */}
      <Column lg={16} md={8} sm={4}>
        <ZoneHead
          title="Personal"
          sub={hrEnabled ? "Tasks assigned to you and leave requests to approve." : "Tasks assigned to you."}
        />
      </Column>
      <Column lg={hrEnabled ? 8 : 16} md={hrEnabled ? 4 : 8} sm={4}><MyTasksTile /></Column>
      {hrEnabled && (
        <Column lg={8} md={4} sm={4}>
          <PendingLeavesTile canManage={can(user?.role, "hr:manage")} />
        </Column>
      )}

      <DashboardActionCenter
        navigate={navigate}
        homeLoading={homeLoading}
        hrEnabled={hrEnabled}
        showBillingAssistant={can(user?.role, "fees:manage")}
        acTotal={acTotal}
        teamLoading={tiQ.isLoading}
        billingReady={billingReady}
        overdueInvoices={overdueInvoices}
        pendingApprovals={pendingApprovals}
        openTenders={openTenders}
        openConstruction={openConstruction}
        riskProjects={riskProjects}
        overloadedMembers={overloadedMembers}
        readyToBillSum={readyToBillSum}
      />

      {/* ═══ Company · delivery & people ══════════════════════════════════ */}
      <Column lg={16} md={8} sm={4}>
        <ZoneHead
          title="Company"
          sub={
            hrEnabled
              ? "Projects, clients, team performance, and delivery quality."
              : "Projects, clients, and delivery quality."
          }
        />
      </Column>

      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Open tenders"
          value={b?.openTenders ?? 0}
          health={(b?.openTenders ?? 0) > 0 ? "watch" : "ok"}
          tagType={(b?.openTenders ?? 0) > 0 ? "blue" : "gray"}
          tagText={
            (b?.tenderDueSoon?.length ?? 0) > 0
              ? `${b!.tenderDueSoon!.length} due within 7 days`
              : "None closing soon"
          }
          onClick={() => navigate("/office/tenders")}
          loading={homeLoading}
        />
      </Column>
      <Column lg={4} md={4} sm={2}>
        <KpiChip
          label="Site coordination"
          value={b?.constructionOpen ?? 0}
          health={(b?.constructionOpen ?? 0) > 0 ? "watch" : "ok"}
          tagType={(b?.constructionOpen ?? 0) > 0 ? "magenta" : "gray"}
          tagText={
            (b?.constructionOpen ?? 0) > 0 ? "Awaiting firm response" : "Inbox clear"
          }
          onClick={() => navigate("/office/construction")}
          loading={homeLoading}
        />
      </Column>
      {(b?.tenderDueSoon?.length ?? 0) > 0 && (
        <Column lg={8} md={8} sm={4}>
          <Tile className="esti-fill" style={edge("watch")}>
            <Stack gap={3}>
              <h4>Tenders closing soon</h4>
              {b!.tenderDueSoon!.slice(0, 4).map((t) => (
                <p key={t.id}>
                  <Link to={`/office/tenders?tender=${t.id}`}>{t.title}</Link>
                  {" · "}
                  {t.projectRef} · due {t.dueDate}
                </p>
              ))}
            </Stack>
          </Tile>
        </Column>
      )}

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
                  : ph.some((p) => p.health === "YELLOW")
                    ? "watch"
                    : "ok",
              )}
            >
              <Stack gap={5}>
                {homeLoading ? (
                  <InlineLoading description="Loading projects…" />
                ) : (ph.length ?? 0) === 0 ? (
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
                        {ph.slice(0, 8).map((p) => (
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
                ci.some((c) => c.risk === "HIGH")
                  ? "alert"
                  : ci.some((c) => c.risk === "MEDIUM")
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
                      {ci.slice(0, 6).map((c) => (
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
          revision={ri}
          technical={tech}
          revisionLoading={homeLoading}
          technicalLoading={homeLoading}
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
                {activity!.rows.map((item) => (
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

      <DashboardFinancialSection
        navigate={navigate}
        chartTheme={chartTheme}
        homeLoading={homeLoading}
        canFees={canFees}
        showFinancial={showFinancial}
        revenueData={revenueData}
        agingData={agingData}
        agingEmpty={agingEmpty}
      />

    </Grid>
  );
}
