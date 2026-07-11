import {
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
  CLIENT_DISCUSSION_OUTCOME_LABEL,
  CLIENT_DISCUSSION_OUTCOME_TAG,
  CLIENT_LOG_KINDS,
  ClientDiscussionOutcome,
  type ClientDiscussionOutcome as ClientDiscussionOutcomeT,
  type ClientLogKindCode,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { StatusDot } from "./StatusTag.js";

const KIND_TAG: Partial<
  Record<ClientLogKindCode, "blue" | "green" | "purple" | "teal" | "gray">
> = {
  DECISION: "purple",
  APPROVAL: "green",
  MEETING: "blue",
  SITE_VISIT: "teal",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ProjectClientLog({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const logQ = trpc.clientLog.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const invalidate = () =>
    utils.clientLog.listByProject.invalidate({ projectId });
  const remove = trpc.clientLog.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the log entry" },
    onSuccess: invalidate,
  });

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ClientLogKindCode>("MEETING");
  const [occurredAt, setOccurredAt] = useState(today());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [outcome, setOutcome] = useState("");
  const [budgetObjections, setBudgetObjections] = useState("");

  const create = trpc.clientLog.create.useMutation({
    meta: { errorTitle: "Couldn't create the log entry" },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setSubject("");
      setBody("");
      setFollowUp("");
      setOutcome("");
      setBudgetObjections("");
    },
  });

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 4,
        }}
      >
        <h3>Client communication</h3>
        <Button variant="contained" size="small" onClick={() => setOpen(true)}>
          Log interaction
        </Button>
      </Box>

      <Box sx={{ mt: 1 }}>
        {(logQ.data ?? []).length === 0 && <p>No interactions logged yet.</p>}
        {(logQ.data ?? []).map((e) => (
          <Box
            key={e.id}
            sx={{ py: 1, pl: 2, ml: 1, position: "relative" }}
          >
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <StatusDot
                color={KIND_TAG[e.kind as ClientLogKindCode] ?? "gray"}
                label={CLIENT_LOG_KINDS[e.kind as ClientLogKindCode] ?? e.kind}
              />
              {e.outcome && (
                <StatusDot
                  color={CLIENT_DISCUSSION_OUTCOME_TAG[e.outcome as ClientDiscussionOutcomeT] ?? "gray"}
                  label={CLIENT_DISCUSSION_OUTCOME_LABEL[e.outcome as ClientDiscussionOutcomeT] ?? e.outcome}
                />
              )}
              <strong>{e.subject}</strong>
              <span>{e.occurredAt}</span>
              <Button
                variant="text"
                size="small"
                sx={{ ml: "auto" }}
                onClick={() => remove.mutate({ id: e.id })}
              >
                Remove
              </Button>
            </Box>
            {e.body && (
              <Box component="p" sx={{ my: 0.5, whiteSpace: "pre-wrap" }}>
                {e.body}
              </Box>
            )}
            {e.followUpDate && <span>Follow-up: {e.followUpDate}</span>}
          </Box>
        ))}
      </Box>

      <Dialog aria-labelledby="project-client-log-interaction-title" open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle id="project-client-log-interaction-title">Log client interaction</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cl-kind"
              select
              label="Type"
              value={kind}
              onChange={(e) => setKind(e.target.value as ClientLogKindCode)}
            >
              {(Object.keys(CLIENT_LOG_KINDS) as ClientLogKindCode[]).map((k) => (
                <MenuItem key={k} value={k}>{CLIENT_LOG_KINDS[k]}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="cl-date"
              label="Date"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
            <TextField
              id="cl-subject"
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <TextField
              id="cl-body"
              label="Notes (optional)"
              multiline
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <TextField
              id="cl-followup"
              label="Follow-up date (optional)"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />
            <TextField
              id="cl-outcome"
              select
              label="Discussion outcome (optional)"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <MenuItem value="">— None —</MenuItem>
              {ClientDiscussionOutcome.options.map((o) => (
                <MenuItem key={o} value={o}>{CLIENT_DISCUSSION_OUTCOME_LABEL[o]}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="cl-budget"
              label="Budget objections (optional)"
              multiline
              rows={2}
              value={budgetObjections}
              onChange={(e) => setBudgetObjections(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!subject || create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                kind,
                occurredAt,
                subject,
                body: body || undefined,
                followUpDate: followUp || null,
                outcome: (outcome || undefined) as ClientDiscussionOutcomeT | undefined,
                budgetObjections: budgetObjections || undefined,
              })
            }
          >
            {create.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
