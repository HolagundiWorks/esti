import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
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
} from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { StatusDot } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

// ─── KPI meter inside a member tile ──────────────────────────────────────────

function KpiMeter({
  label,
  value,
  weight,
}: {
  label: string;
  value: number;
  weight: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <Stack spacing={1}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="body2" sx={{ flexGrow: 1 }}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">{weight}</Typography>
        <Typography variant="body2">{pct.toFixed(0)}</Typography>
      </Box>
      <LinearProgress variant="determinate" value={pct} />
    </Stack>
  );
}

// ─── Member score card ────────────────────────────────────────────────────────

function MemberScoreCard({
  member,
  onGrant,
}: {
  member: AspRfMemberScore;
  onGrant: (m: AspRfMemberScore) => void;
}) {
  const band = member.band as PerformanceBand | null;
  return (
    <Grid size={{ xs: 12, md: 6 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack spacing={2}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <Stack spacing={1} sx={{ flexGrow: 1 }}>
              <Box><StatusDot color="gray" label={member.memberRole} /></Box>
              <Typography variant="h6" component="h3">{member.memberName}</Typography>
            </Stack>
            <Stack spacing={0.5} sx={{ alignItems: "flex-end" }}>
              <Typography variant="h5" component="p">{member.score}</Typography>
              {band ? (
                <StatusDot color={PERFORMANCE_BAND_TAG[band]} label={PERFORMANCE_BAND_LABEL[band]} />
              ) : (
                <StatusDot color="gray" label="Developing" />
              )}
            </Stack>
          </Box>

          <Stack spacing={1}>
            <KpiMeter label="Reliability" value={member.kpi.reliability} weight="30%" />
            <KpiMeter label="Quality" value={member.kpi.quality} weight="25%" />
            <KpiMeter label="Client Impact" value={member.kpi.clientImpact} weight="15%" />
            <KpiMeter label="Collaboration" value={member.kpi.collaboration} weight="15%" />
            <KpiMeter label="Learning" value={member.kpi.learning} weight="10%" />
            {member.wellbeingOptIn && member.kpi.wellbeing !== null && (
              <KpiMeter label="Wellbeing" value={member.kpi.wellbeing} weight="5%" />
            )}
          </Stack>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">Tasks</Typography>
              <Typography variant="body2"><strong>{member.totalTasks}</strong></Typography>
            </Stack>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">On time</Typography>
              <Typography variant="body2"><strong>{member.completedOnTime}</strong></Typography>
            </Stack>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">Overdue</Typography>
              <Box>
                {member.overdueCount > 0 ? (
                  <StatusDot color="red" label={String(member.overdueCount)} />
                ) : (
                  <Typography variant="body2" component="span"><strong>0</strong></Typography>
                )}
              </Box>
            </Stack>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">Training</Typography>
              <Typography variant="body2"><strong>{member.trainingCount}</strong></Typography>
            </Stack>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">Points</Typography>
              <Typography variant="body2"><strong>{member.totalPoints}</strong></Typography>
            </Stack>
          </Box>

          <Box>
            <Button variant="text" size="small" onClick={() => onGrant(member)}>
              Grant reward points
            </Button>
          </Box>
        </Stack>
      </Box>
    </Grid>
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
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 6 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Box><StatusDot color="teal" label="Awards" /></Box>
              <Typography variant="h6" component="h3">Recognition awards</Typography>
              <Typography variant="body2">Computed monthly from the performance score engine.</Typography>
            </Stack>
            <Stack spacing={1}>
              {awards.map((a) => (
                <Box key={a}>
                  <StatusDot color={RECOGNITION_AWARD_TAG[a]} label={RECOGNITION_AWARD_LABEL[a]} />
                </Box>
              ))}
            </Stack>
          </Stack>
        </Box>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Box><StatusDot color="blue" label="Rewards" /></Box>
              <Typography variant="h6" component="h3">Reward point events</Typography>
              <Typography variant="body2">Base points awarded per qualifying event. Managers grant points from the Scores tab.</Typography>
            </Stack>
            <Stack spacing={1}>
              {events.map(([type, pts]) => (
                <Box key={type} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <StatusDot color="gray" label={`${pts} pts`} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>{REWARD_POINT_LABEL[type] ?? type}</Typography>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Box>
      </Grid>
    </Grid>
  );
}

// ─── Performance page ─────────────────────────────────────────────────────────

export function Performance() {
  const utils = trpc.useUtils();
  const scoresQ = trpc.aspRf.teamScores.useQuery();
  const myScoreQ = trpc.aspRf.myScore.useQuery();
  const scores = scoresQ.data ?? [];

  const [tab, setTab] = useState(0);

  const setWellbeing = trpc.aspRf.setWellbeingOptIn.useMutation({
    meta: { errorTitle: "Couldn't update the wellbeing opt-in" },
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
    meta: { errorTitle: "Couldn't grant the reward" },
    onSuccess: () => {
      utils.aspRf.teamScores.invalidate();
      setGrantTarget(null);
      setGrantForm({ points: "10", reason: "", awardType: "" });
    },
  });

  const grantBlockedReason =
    !grantForm.reason.trim()
      ? "Enter a reason for the reward."
      : !grantForm.points || Number.parseInt(grantForm.points, 10) <= 0
        ? "Enter a positive point value."
        : null;

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

  const kpiAside = (
    <Stack spacing={1.5} sx={{ width: 1 }}>
      <Box sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Stack spacing={0.5}>
          <Box><StatusDot color="gray" label="Team" /></Box>
          <Typography variant="h5" component="p" sx={{ lineHeight: 1.1 }}>{teamSize}</Typography>
          <Typography variant="caption" color="text.secondary">Active members</Typography>
        </Stack>
      </Box>
      <Box sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Stack spacing={0.5}>
          <Box><StatusDot color="blue" label="Average score" /></Box>
          <Typography variant="h5" component="p" sx={{ lineHeight: 1.1 }}>
            {avgScore > 0 ? avgScore : "—"}
          </Typography>
          <Typography variant="caption" color="text.secondary">30-day rolling</Typography>
        </Stack>
      </Box>
      <Box sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Stack spacing={0.5}>
          <Box><StatusDot color="teal" label="Platinum" /></Box>
          <Typography variant="h5" component="p" sx={{ lineHeight: 1.1 }}>
            {bandCounts["PLATINUM"] ?? 0}
          </Typography>
          <Typography variant="caption" color="text.secondary">Score ≥ 96</Typography>
        </Stack>
      </Box>
      <Box sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Stack spacing={0.5}>
          <Box><StatusDot color="warm-gray" label="Gold" /></Box>
          <Typography variant="h5" component="p" sx={{ lineHeight: 1.1 }}>
            {bandCounts["GOLD"] ?? 0}
          </Typography>
          <Typography variant="caption" color="text.secondary">Score 91–95</Typography>
        </Stack>
      </Box>
    </Stack>
  );

  return (
    <>
      <RailLayout
        title="Performance"
        description="ASPRF — Architectural Staff Performance and Recognition Framework. Rolling 30-day scores from tasks and decisions."
        aside={kpiAside}
        tabs={
          <Tabs
            orientation="vertical"
            value={tab}
            onChange={(_e, v) => setTab(v)}
            aria-label="Performance sections"
          >
            <Tab label="Scores" />
            <Tab label="Recognition" />
          </Tabs>
        }
      >
      <PageBreadcrumb items={[{ label: "Teams" }, { label: "Performance" }]} />
      {myScoreQ.data && (
        <Box className="esti-form-panel" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6" component="h3">Wellbeing dimension (optional)</Typography>
            <Typography variant="body2">
              When enabled, your ASPRF score includes a wellbeing KPI based on
              overdue tasks and sustained heavy due-day load. Informational only
              — not used for discipline.
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  id="wellbeing-opt-in"
                  checked={myScoreQ.data.wellbeingOptIn}
                  disabled={setWellbeing.isPending}
                  onChange={(_e, checked) => setWellbeing.mutate({ optIn: checked })}
                />
              }
              label="Include wellbeing in my ASPRF score"
            />
          </Stack>
        </Box>
      )}

      {tab === 0 && (
        <DataState
          loading={scoresQ.isLoading}
          isEmpty={scores.length === 0}
          columnCount={2}
          empty={{
            title: "No team members yet",
            description: "Add team members via the HR module to track performance scores.",
          }}
        >
          <Grid container spacing={2}>
            {scores.map((m) => (
              <MemberScoreCard key={m.teamMemberId} member={m} onGrant={setGrantTarget} />
            ))}
          </Grid>
        </DataState>
      )}

      {tab === 1 && <RecognitionTab />}
      </RailLayout>

      {/* Grant modal */}
      <Dialog aria-labelledby="performance-grant-title" open={!!grantTarget} onClose={() => setGrantTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle id="performance-grant-title">Grant reward points — {grantTarget?.memberName ?? ""}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="gp-type"
              select
              label="Award type (optional)"
              value={grantForm.awardType}
              onChange={(e) => setGrantForm((f) => ({ ...f, awardType: e.target.value }))}
            >
              <MenuItem value="">— custom —</MenuItem>
              {Object.entries(REWARD_POINT_LABEL).map(([k, v]) => (
                <MenuItem key={k} value={k}>{`${v} (+${REWARD_POINT_VALUES[k] ?? "?"} pts)`}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="gp-pts"
              label="Points"
              type="number"
              value={grantForm.points}
              onChange={(e) => setGrantForm((f) => ({ ...f, points: e.target.value }))}
            />
            <TextField
              id="gp-reason"
              label="Reason"
              multiline
              rows={3}
              value={grantForm.reason}
              onChange={(e) => setGrantForm((f) => ({ ...f, reason: e.target.value }))}
              helperText={!grantForm.reason.trim() ? "Required — visible in the reward audit log." : undefined}
            />
            {grantBlockedReason && !grant.isPending && (
              <Typography variant="caption" color="text.secondary">
                {grantBlockedReason}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setGrantTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={Boolean(grantBlockedReason) || grant.isPending}
            onClick={() => {
              if (!grantTarget) return;
              grant.mutate({
                teamMemberId: grantTarget.teamMemberId,
                points: parseInt(grantForm.points, 10),
                reason: grantForm.reason,
                awardType: grantForm.awardType || undefined,
              });
            }}
          >
            {grant.isPending ? "Saving…" : "Grant points"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
