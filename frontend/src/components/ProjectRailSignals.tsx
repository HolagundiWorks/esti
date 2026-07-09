import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc.js";
import { OfficeHealthGlyph } from "./shell/OfficeHealthGlyph.js";
import type { ZoneState } from "./dashboard/zoneState.js";

function projectHealthState(
  signalCount: number,
  overdueTasks: number,
): ZoneState {
  if (signalCount === 0) return "stable";
  if (overdueTasks > 0 || signalCount >= 3) return "critical";
  if (signalCount >= 2) return "friction";
  return "watch";
}

function SignalRow({
  label,
  value,
  href,
  detail,
}: {
  label: string;
  value: string | number;
  href?: string;
  detail?: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.25,
        py: 0.75,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        {href ? (
          <Typography
            component={Link}
            to={href}
            variant="caption"
            sx={{ fontWeight: 700, textAlign: "right", textDecoration: "none", color: "primary.main" }}
          >
            {value}
          </Typography>
        ) : (
          <Typography variant="caption" sx={{ fontWeight: 700, textAlign: "right" }}>
            {value}
          </Typography>
        )}
      </Box>
      {detail && (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
          {detail}
        </Typography>
      )}
    </Box>
  );
}

/** Project telemetry — open tasks, approvals, drawings and health in the rail. */
export function ProjectRailSignals({ projectId }: { projectId: string }) {
  const enabled = !!projectId;
  const tasksQ = trpc.tasks.listByProject.useQuery({ projectId }, { enabled });
  const approvalsQ = trpc.approvals.listByProject.useQuery({ projectId }, { enabled });
  const drawingsQ = trpc.drawings.listByProject.useQuery(
    { projectId, currentOnly: true },
    { enabled },
  );
  const notesQ = trpc.criticalNotes.listByProject.useQuery({ projectId }, { enabled });
  const decisionsQ = trpc.decisions.listByProject.useQuery({ projectId }, { enabled });

  const loading =
    tasksQ.isLoading ||
    approvalsQ.isLoading ||
    drawingsQ.isLoading ||
    notesQ.isLoading ||
    decisionsQ.isLoading;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
        <CircularProgress size={18} aria-label="Loading project signals" />
      </Box>
    );
  }

  const tasks = tasksQ.data ?? [];
  const approvals = approvalsQ.data?.rows ?? [];
  const drawings = drawingsQ.data ?? [];
  const notes = notesQ.data?.rows ?? [];
  const decisions = decisionsQ.data?.rows ?? [];

  const openTasks = tasks.filter((t) => t.status !== "DONE");
  const overdueTasks = tasks.filter(
    (t) =>
      t.dueDate &&
      t.dueDate < new Date().toISOString().slice(0, 10) &&
      t.status !== "DONE",
  );
  const pendingApprovals = approvals.filter(
    (a) => a.status === "DRAFT" || a.status === "SENT" || a.status === "REVISIONS",
  );
  const health = [
    openTasks.length > 0 ? "Tasks open" : null,
    overdueTasks.length > 0 ? "Tasks overdue" : null,
    pendingApprovals.length > 0 ? "Approvals pending" : null,
    notes.filter((n) => n.status !== "RESOLVED").length > 0 ? "Critical notes open" : null,
    decisions.filter((d) => d.state !== "LOCKED" && d.state !== "ACCEPTED").length > 0
      ? "Decisions in progress"
      : null,
  ].filter(Boolean) as string[];

  const healthState = projectHealthState(health.length, overdueTasks.length);
  const healthDetail =
    health.length > 0 ? health.join(" · ") : "No obvious blockers right now.";

  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Signals
      </Typography>
      <Stack spacing={0} sx={{ mt: 0.5 }}>
        <SignalRow
          label="Open tasks"
          value={openTasks.length}
          href="/tasks"
          detail="Work items still in motion."
        />
        <SignalRow
          label="Pending approvals"
          value={pendingApprovals.length}
          href="/tasks?tab=activity"
          detail="Awaiting client or internal sign-off."
        />
        <SignalRow
          label="Current drawings"
          value={drawings.length}
          href={`/projects/${projectId}?tab=drawings`}
          detail="Latest revisions in active use."
        />
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            py: 0.75,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              Health signal
            </Typography>
            <Typography variant="caption" sx={{ lineHeight: 1.35, mt: 0.25, display: "block" }}>
              {healthDetail}
            </Typography>
          </Box>
          <OfficeHealthGlyph state={healthState} variant="glass" title={healthDetail} />
        </Box>
      </Stack>
    </Box>
  );
}
