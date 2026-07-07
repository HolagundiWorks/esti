import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import {
  PULSE_ACTION_LABEL,
  STANDUP_RESPONSE_LABEL,
  STANDUP_SESSION_LABEL,
  type PulseActionType,
  type StandupResponseStatus,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../../lib/trpc.js";
import { StatusDot } from "../StatusTag.js";

const ANSWER_OPTIONS: { value: Exclude<StandupResponseStatus, "PENDING">; text: string }[] = [
  { value: "CONFIRMED", text: "Confirmed" },
  { value: "BLOCKED", text: "Blocked" },
  { value: "NOT_REQUIRED", text: "Not required" },
  { value: "NEEDS_REVIEW", text: "Needs review" },
  { value: "ATTACHED_DOCUMENT", text: "Document attached" },
  { value: "COMMENT_ONLY", text: "Comment only" },
];

/** ESTI Pulse — Project Standup Engine (Module 3/4). See docs/esti/ESTI-PULSE.md. */
export function PulseStandupModal({
  open,
  onClose,
  projectId,
  projectLabel,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectLabel: string;
}) {
  const utils = trpc.useUtils();
  const sessionsQ = trpc.pulse.standup.list.useQuery({ projectId }, { enabled: open && !!projectId });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const sessions = sessionsQ.data ?? [];
  const activeSessionId = selectedSessionId ?? sessions[sessions.length - 1]?.id ?? null;
  const questionsQ = trpc.pulse.standup.questions.useQuery(
    { standupSessionId: activeSessionId ?? "" },
    { enabled: !!activeSessionId },
  );

  const run = trpc.pulse.standup.run.useMutation({
    onSuccess: (r) => {
      setSelectedSessionId(r.session.id);
      void utils.pulse.standup.list.invalidate({ projectId });
      void utils.tasks.list.invalidate();
    },
  });
  const answer = trpc.pulse.standup.answer.useMutation({
    onSuccess: () => {
      if (activeSessionId) void utils.pulse.standup.questions.invalidate({ standupSessionId: activeSessionId });
      void utils.tasks.list.invalidate();
    },
  });

  const [drafts, setDrafts] = useState<Record<string, { status: string; text: string }>>({});
  const setDraft = (id: string, patch: Partial<{ status: string; text: string }>) =>
    setDrafts((d) => ({ ...d, [id]: { status: d[id]?.status ?? "", text: d[id]?.text ?? "", ...patch } }));

  const questions = questionsQ.data ?? [];
  const pendingCount = questions.filter((q) => q.responseStatus === "PENDING").length;

  const actionsQ = trpc.pulse.actions.list.useQuery({ projectId, status: "PROPOSED" }, { enabled: open && !!projectId });
  const proposeActions = trpc.pulse.actions.propose.useMutation({
    onSuccess: () => void utils.pulse.actions.list.invalidate({ projectId, status: "PROPOSED" }),
  });
  const decideAction = trpc.pulse.actions.decide.useMutation({
    onSuccess: () => {
      void utils.pulse.actions.list.invalidate({ projectId, status: "PROPOSED" });
      void utils.tasks.list.invalidate();
      if (activeSessionId) void utils.pulse.standup.questions.invalidate({ standupSessionId: activeSessionId });
    },
  });
  const proposedActions = actionsQ.data ?? [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{`Standup — ${projectLabel}`}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Button size="small" variant="contained" disabled={run.isPending} onClick={() => run.mutate({ projectId, sessionType: "AD_HOC" })}>
              {run.isPending ? "Running…" : "Run standup now"}
            </Button>
            {sessions.length > 0 && (
              <TextField
                id="standup-session"
                select
                size="small"
                sx={{ minWidth: 260 }}
                value={activeSessionId ?? ""}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                slotProps={{ htmlInput: { "aria-label": "Session" } }}
              >
                {sessions.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {`${STANDUP_SESSION_LABEL[s.sessionType as keyof typeof STANDUP_SESSION_LABEL] ?? s.sessionType} — ${new Date(s.scheduledAt).toLocaleString()}`}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>

          {run.isSuccess && run.data.questionCount === 0 && (
            <Alert severity="success">
              <AlertTitle>Nothing to ask</AlertTitle>
              Every active task on this project has what it needs.
            </Alert>
          )}

          {activeSessionId && questions.length > 0 && (
            <p className="esti-label esti-label--secondary">
              {pendingCount} of {questions.length} question{questions.length === 1 ? "" : "s"} pending
            </p>
          )}

          {questions.map((q) => {
            const draft = drafts[q.id] ?? { status: "", text: "" };
            const answered = q.responseStatus !== "PENDING";
            return (
              <Box key={q.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack spacing={1}>
                  <Stack spacing={0.5}>
                    {q.questionText.split("\n").map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </Stack>
                  <StatusDot
                    color={answered ? "green" : "gray"}
                    label={STANDUP_RESPONSE_LABEL[q.responseStatus as keyof typeof STANDUP_RESPONSE_LABEL] ?? q.responseStatus}
                  />
                  {q.responseText && <p className="esti-label esti-label--secondary">{q.responseText}</p>}
                  {!answered && (
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <TextField
                        id={`standup-ans-${q.id}`}
                        select
                        size="small"
                        sx={{ minWidth: 200 }}
                        value={draft.status}
                        onChange={(e) => setDraft(q.id, { status: e.target.value })}
                        slotProps={{ htmlInput: { "aria-label": "Response" } }}
                      >
                        <MenuItem value="">— choose response —</MenuItem>
                        {ANSWER_OPTIONS.map((o) => (
                          <MenuItem key={o.value} value={o.value}>{o.text}</MenuItem>
                        ))}
                      </TextField>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={!draft.status || answer.isPending}
                        onClick={() =>
                          answer.mutate({
                            questionId: q.id,
                            responseStatus: draft.status as Exclude<StandupResponseStatus, "PENDING">,
                            responseText: draft.text || undefined,
                          })
                        }
                      >
                        Answer
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </Box>
            );
          })}

          {activeSessionId && questions.length === 0 && !questionsQ.isLoading && (
            <p className="esti-label esti-label--secondary">No questions in this session.</p>
          )}

          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <span className="esti-label esti-label--secondary esti-grow">PENDING ACTIONS</span>
              <Button
                variant="text"
                size="small"
                disabled={proposeActions.isPending}
                onClick={() => proposeActions.mutate({})}
              >
                {proposeActions.isPending ? "Checking…" : "Check for actions"}
              </Button>
            </Stack>

            {proposedActions.length === 0 ? (
              <p className="esti-label esti-label--secondary">No pending actions.</p>
            ) : (
              proposedActions.map((a) => (
                <Box key={a.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                  <Stack spacing={1}>
                    <StatusDot
                      color="purple"
                      label={PULSE_ACTION_LABEL[a.actionType as PulseActionType] ?? a.actionType}
                    />
                    <p>{a.description}</p>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={decideAction.isPending}
                        onClick={() => decideAction.mutate({ id: a.id, decision: "APPROVED" })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        disabled={decideAction.isPending}
                        onClick={() => decideAction.mutate({ id: a.id, decision: "REJECTED" })}
                      >
                        Reject
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
