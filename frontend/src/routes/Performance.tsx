import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
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
import { PageHeader } from "../components/PageHeader.js";
import { trpc } from "../lib/trpc.js";

// ─── Shared tag chip (exact Carbon tag colours over --cds tokens) ─────────────

function TagChip({ color, label }: { color: string; label: string }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor: `var(--cds-tag-background-${color})`,
        color: `var(--cds-tag-color-${color})`,
      }}
    />
  );
}

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
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <Stack spacing={1} sx={{ flexGrow: 1 }}>
              <Box><TagChip color="gray" label={member.memberRole} /></Box>
              <Typography variant="h6" component="h3">{member.memberName}</Typography>
            </Stack>
            <Stack spacing={0.5} sx={{ alignItems: "flex-end" }}>
              <Typography variant="h5" component="p">{member.score}</Typography>
              {band ? (
                <TagChip color={PERFORMANCE_BAND_TAG[band]} label={PERFORMANCE_BAND_LABEL[band]} />
              ) : (
                <TagChip color="gray" label="Developing" />
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
                  <TagChip color="red" label={String(member.overdueCount)} />
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
      </Paper>
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
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Box><TagChip color="teal" label="Awards" /></Box>
              <Typography variant="h6" component="h3">Recognition awards</Typography>
              <Typography variant="body2">Computed monthly from the performance score engine.</Typography>
            </Stack>
            <Stack spacing={1}>
              {awards.map((a) => (
                <Box key={a}>
                  <TagChip color={RECOGNITION_AWARD_TAG[a]} label={RECOGNITION_AWARD_LABEL[a]} />
                </Box>
              ))}
            </Stack>
          </Stack>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Box><TagChip color="blue" label="Rewards" /></Box>
              <Typography variant="h6" component="h3">Reward point events</Typography>
              <Typography variant="body2">Base points awarded per qualifying event. Managers grant points from the Scores tab.</Typography>
            </Stack>
            <Stack spacing={1}>
              {events.map(([type, pts]) => (
                <Box key={type} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TagChip color="gray" label={`${pts} pts`} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>{REWARD_POINT_LABEL[type] ?? type}</Typography>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}

// ─── Performance page ─────────────────────────────────────────────────────────

export function Performance({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const scoresQ = trpc.aspRf.teamScores.useQuery();
  const myScoreQ = trpc.aspRf.myScore.useQuery();
  const scores = scoresQ.data ?? [];

  const [tab, setTab] = useState(0);

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
    <Stack spacing={4}>
      {!embedded && (
        <PageHeader
          title="Performance"
          description="ASPRF — Architectural Staff Performance and Recognition Framework. Rolling 30-day scores from tasks and decisions."
        />
      )}

      {myScoreQ.data && (
        <Paper className="esti-form-panel" sx={{ p: 2 }}>
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
        </Paper>
      )}

      {/* KPI summary */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Stack spacing={0.5}>
              <Box><TagChip color="gray" label="Team" /></Box>
              <Typography variant="h5" component="p">{teamSize}</Typography>
              <Typography variant="body2" color="text.secondary">Active members</Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Stack spacing={0.5}>
              <Box><TagChip color="blue" label="Average score" /></Box>
              <Typography variant="h5" component="p">{avgScore > 0 ? avgScore : "—"}</Typography>
              <Typography variant="body2" color="text.secondary">30-day rolling</Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Stack spacing={0.5}>
              <Box><TagChip color="teal" label="Platinum" /></Box>
              <Typography variant="h5" component="p">{bandCounts["PLATINUM"] ?? 0}</Typography>
              <Typography variant="body2" color="text.secondary">Score ≥ 96</Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Stack spacing={0.5}>
              <Box><TagChip color="warm-gray" label="Gold" /></Box>
              <Typography variant="h5" component="p">{bandCounts["GOLD"] ?? 0}</Typography>
              <Typography variant="body2" color="text.secondary">Score 91–95</Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Box>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} aria-label="Performance sections">
          <Tab label="Scores" />
          <Tab label="Recognition" />
        </Tabs>
      </Box>

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

      {/* Grant modal */}
      <Dialog open={!!grantTarget} onClose={() => setGrantTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Grant reward points — {grantTarget?.memberName ?? ""}</DialogTitle>
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
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setGrantTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!grantForm.reason || !grantForm.points || grant.isPending}
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
    </Stack>
  );
}
