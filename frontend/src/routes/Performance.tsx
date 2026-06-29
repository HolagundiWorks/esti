import "@carbon/charts-react/styles.css";
import {
  Button,
  Column,
  Grid,
  Modal,
  NumberInput,
  Select,
  SelectItem,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TextArea,
  TextInput,
  Tile,
  Toggle,
} from "@carbon/react";
import { MeterChart } from "@carbon/charts-react";
import {
  Trophy,
  UserProfile,
  Analytics,
} from "@carbon/icons-react";
import {
  Analytics as AnalyticsPictogram,
} from "@carbon/pictograms-react";
import {
  PERFORMANCE_BAND_LABEL,
  PERFORMANCE_BAND_TAG,
  RECOGNITION_AWARD_LABEL,
  RECOGNITION_AWARD_TAG,
  REWARD_POINT_LABEL,
  REWARD_POINT_VALUES,
  type AspRfMemberScore,
  type PerformanceBand,
  type RecognitionAward,
  RewardPointCreate,
} from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { useAppTheme } from "../lib/theme-context.js";
import { trpc } from "../lib/trpc.js";

const KPI_METER_HEIGHT = "24px";

// ─── KPI meter inside a member tile ──────────────────────────────────────────

function KpiMeter({
  label,
  value,
  weight,
  chartTheme,
}: {
  label: string;
  value: number;
  weight: string;
  chartTheme: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <Stack gap={3}>
      <Stack orientation="horizontal" gap={3}>
        <span className="esti-grow">{label}</span>
        <span>{weight}</span>
        <span>{pct.toFixed(0)}</span>
      </Stack>
      <div className="esti-chart-sm">
        <MeterChart
          data={[{ group: label, value: pct }]}
          options={{
            data: { groupMapsTo: "group" },
            height: KPI_METER_HEIGHT,
            theme: chartTheme,
            toolbar: { enabled: false },
            legend: { enabled: false },
            meter: { peak: 100 },
            accessibility: { svgAriaLabel: `${label} ${pct} out of 100` },
          }}
        />
      </div>
    </Stack>
  );
}

// ─── Member score card ────────────────────────────────────────────────────────

function MemberScoreCard({
  member,
  onGrant,
  chartTheme,
}: {
  member: AspRfMemberScore;
  onGrant: (m: AspRfMemberScore) => void;
  chartTheme: string;
}) {
  const band = member.band as PerformanceBand | null;
  return (
    <Column sm={4} md={4} lg={8}>
      <Tile>
        <Stack gap={5}>
          <Stack orientation="horizontal" gap={4}>
            <Stack gap={3} className="esti-grow">
              <Tag type="gray" size="sm">{member.memberRole}</Tag>
              <h3>{member.memberName}</h3>
            </Stack>
            <Stack gap={2}>
              <h2>{member.score}</h2>
              {band ? (
                <Tag type={PERFORMANCE_BAND_TAG[band]} size="sm">
                  {PERFORMANCE_BAND_LABEL[band]}
                </Tag>
              ) : (
                <Tag type="gray" size="sm">Developing</Tag>
              )}
            </Stack>
          </Stack>

          <Stack gap={3}>
            <KpiMeter label="Reliability" value={member.kpi.reliability} weight="30%" chartTheme={chartTheme} />
            <KpiMeter label="Quality" value={member.kpi.quality} weight="25%" chartTheme={chartTheme} />
            <KpiMeter label="Client Impact" value={member.kpi.clientImpact} weight="15%" chartTheme={chartTheme} />
            <KpiMeter label="Collaboration" value={member.kpi.collaboration} weight="15%" chartTheme={chartTheme} />
            <KpiMeter label="Learning" value={member.kpi.learning} weight="10%" chartTheme={chartTheme} />
            {member.wellbeingOptIn && member.kpi.wellbeing !== null && (
              <KpiMeter
                label="Wellbeing"
                value={member.kpi.wellbeing}
                weight="5%"
                chartTheme={chartTheme}
              />
            )}
          </Stack>

          <Stack orientation="horizontal" gap={5}>
            <Stack gap={3}>
              <p>Tasks</p>
              <p><strong>{member.totalTasks}</strong></p>
            </Stack>
            <Stack gap={3}>
              <p>On time</p>
              <p><strong>{member.completedOnTime}</strong></p>
            </Stack>
            <Stack gap={3}>
              <p>Overdue</p>
              <div><strong>{member.overdueCount > 0 ? <Tag type="red" size="sm">{member.overdueCount}</Tag> : 0}</strong></div>
            </Stack>
            <Stack gap={3}>
              <p>Training</p>
              <p><strong>{member.trainingCount}</strong></p>
            </Stack>
            <Stack gap={3}>
              <p>Points</p>
              <p><strong>{member.totalPoints}</strong></p>
            </Stack>
          </Stack>

          <Button kind="ghost" size="sm" onClick={() => onGrant(member)}>
            Grant reward points
          </Button>
        </Stack>
      </Tile>
    </Column>
  );
}

// ─── Recognition awards reference ────────────────────────────────────────────

function RecognitionTab() {
  const awards: RecognitionAward[] = [
    "RELIABILITY_CHAMPION",
    "QUALITY_CHAMPION",
    "DRAWING_EXCELLENCE",
    "SITE_HERO",
    "DESIGN_EXCELLENCE",
    "MENTOR",
    "KNOWLEDGE_BUILDER",
  ];
  const events = Object.entries(REWARD_POINT_VALUES) as [string, number][];

  return (
    <Grid>
      <Column sm={4} md={8} lg={8}>
        <Tile>
          <Stack gap={5}>
            <Stack gap={2}>
              <Tag type="teal" size="sm">Awards</Tag>
              <h3>Recognition awards</h3>
              <p>Computed monthly from the performance score engine.</p>
            </Stack>
            <Stack gap={3}>
              {awards.map((a) => (
                <Stack key={a} orientation="horizontal" gap={3}>
                  <Tag type={RECOGNITION_AWARD_TAG[a]} size="sm">
                    {RECOGNITION_AWARD_LABEL[a]}
                  </Tag>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Tile>
      </Column>

      <Column sm={4} md={8} lg={8}>
        <Tile>
          <Stack gap={5}>
            <Stack gap={2}>
              <Tag type="blue" size="sm">Rewards</Tag>
              <h3>Reward point events</h3>
              <p>Base points awarded per qualifying event. Managers grant points from the Scores tab.</p>
            </Stack>
            <Stack gap={3}>
              {events.map(([type, pts]) => (
                <Stack key={type} orientation="horizontal" gap={3}>
                  <Tag type="gray" size="sm">{pts} pts</Tag>
                  <span className="esti-grow">{REWARD_POINT_LABEL[type] ?? type}</span>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Tile>
      </Column>
    </Grid>
  );
}

// ─── Performance page ─────────────────────────────────────────────────────────

export function Performance({ embedded = false }: { embedded?: boolean }) {
  const chartTheme = useAppTheme();
  const utils = trpc.useUtils();
  const scoresQ = trpc.aspRf.teamScores.useQuery();
  const myScoreQ = trpc.aspRf.myScore.useQuery();
  const scores = scoresQ.data ?? [];

  const setWellbeing = trpc.aspRf.setWellbeingOptIn.useMutation({
    onSuccess: () => {
      utils.aspRf.teamScores.invalidate();
      utils.aspRf.myScore.invalidate();
    },
  });

  // Reward grant modal
  const [grantTarget, setGrantTarget] = useState<AspRfMemberScore | null>(null);
  const [grantForm, setGrantForm] = useState({
    points: "10",
    reason: "",
    awardType: "",
  });
  const grant = trpc.rewards.grant.useMutation({
    onSuccess: () => {
      utils.aspRf.teamScores.invalidate();
      setGrantTarget(null);
      setGrantForm({ points: "10", reason: "", awardType: "" });
    },
  });

  const teamSize = scores.length;
  const avgScore =
    teamSize > 0
      ? Math.round(scores.reduce((s, m) => s + m.score, 0) / teamSize * 10) / 10
      : 0;
  const bandCounts = scores.reduce<Record<string, number>>((acc, m) => {
    const b = m.band ?? "DEVELOPING";
    acc[b] = (acc[b] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Stack gap={7}>
      {!embedded && (
        <PageHeader
          title="Performance"
          description="ASPRF — Architectural Staff Performance and Recognition Framework. Rolling 30-day scores from tasks and decisions."
        />
      )}

      {myScoreQ.data && (
        <Tile className="esti-form-panel">
          <Stack gap={4}>
            <h3>Wellbeing dimension (optional)</h3>
            <p>
              When enabled, your ASPRF score includes a wellbeing KPI based on
              overdue tasks and sustained heavy due-day load. Informational only
              — not used for discipline.
            </p>
            <Toggle
              id="wellbeing-opt-in"
              labelText="Include wellbeing in my ASPRF score"
              toggled={myScoreQ.data.wellbeingOptIn}
              disabled={setWellbeing.isPending}
              onToggle={(checked) => setWellbeing.mutate({ optIn: checked })}
            />
          </Stack>
        </Tile>
      )}

      {/* KPI summary */}
      <Grid narrow>
        <Column sm={4} md={2} lg={4}>
          <Tile>
            <Stack gap={2}>
              <Tag type="gray" size="sm">Team</Tag>
              <h2>{teamSize}</h2>
              <p>Active members</p>
            </Stack>
          </Tile>
        </Column>
        <Column sm={4} md={2} lg={4}>
          <Tile>
            <Stack gap={2}>
              <Tag type="blue" size="sm">Average score</Tag>
              <h2>{avgScore > 0 ? avgScore : "—"}</h2>
              <p>30-day rolling</p>
            </Stack>
          </Tile>
        </Column>
        <Column sm={4} md={2} lg={4}>
          <Tile>
            <Stack gap={2}>
              <Tag type="teal" size="sm">Platinum</Tag>
              <h2>{bandCounts["PLATINUM"] ?? 0}</h2>
              <p>Score ≥ 96</p>
            </Stack>
          </Tile>
        </Column>
        <Column sm={4} md={2} lg={4}>
          <Tile>
            <Stack gap={2}>
              <Tag type="warm-gray" size="sm">Gold</Tag>
              <h2>{bandCounts["GOLD"] ?? 0}</h2>
              <p>Score 91–95</p>
            </Stack>
          </Tile>
        </Column>
      </Grid>

      <Tabs>
        <TabList aria-label="Performance sections" contained>
          <Tab>Scores</Tab>
          <Tab>Recognition</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <DataState
              loading={scoresQ.isLoading}
              isEmpty={scores.length === 0}
              columnCount={2}
              empty={{
                title: "No team members yet",
                description: "Add team members via the HR module to track performance scores.",
              }}
            >
              <Grid>
                {scores.map((m) => (
                  <MemberScoreCard
                    key={m.teamMemberId}
                    member={m}
                    onGrant={setGrantTarget}
                    chartTheme={chartTheme}
                  />
                ))}
              </Grid>
            </DataState>
          </TabPanel>
          <TabPanel>
            <RecognitionTab />
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Grant modal */}
      <Modal
        open={!!grantTarget}
        modalHeading={`Grant reward points — ${grantTarget?.memberName ?? ""}`}
        primaryButtonText={grant.isPending ? "Saving…" : "Grant points"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!grantForm.reason || !grantForm.points || grant.isPending}
        onRequestClose={() => setGrantTarget(null)}
        onRequestSubmit={() => {
          if (!grantTarget) return;
          grant.mutate({
            teamMemberId: grantTarget.teamMemberId,
            points: parseInt(grantForm.points, 10),
            reason: grantForm.reason,
            awardType: grantForm.awardType || undefined,
          });
        }}
      >
        <Stack gap={5}>
          <Select
            id="gp-type"
            labelText="Award type (optional)"
            value={grantForm.awardType}
            onChange={(e) => setGrantForm((f) => ({ ...f, awardType: e.target.value }))}
          >
            <SelectItem value="" text="— custom —" />
            {Object.entries(REWARD_POINT_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k} text={`${v} (+${REWARD_POINT_VALUES[k] ?? "?"} pts)`} />
            ))}
          </Select>
          <TextInput
            id="gp-pts"
            labelText="Points"
            type="number"
            value={grantForm.points}
            onChange={(e) => setGrantForm((f) => ({ ...f, points: e.target.value }))}
          />
          <TextArea
            id="gp-reason"
            labelText="Reason"
            rows={3}
            value={grantForm.reason}
            onChange={(e) => setGrantForm((f) => ({ ...f, reason: e.target.value }))}
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
