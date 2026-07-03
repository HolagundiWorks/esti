import {
  Button,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  Tag,
  Tile,
} from "@carbon/react";
import {
  STANDUP_RESPONSE_LABEL,
  STANDUP_SESSION_LABEL,
  type StandupResponseStatus,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../../lib/trpc.js";

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

  return (
    <Modal open={open} modalHeading={`Standup — ${projectLabel}`} passiveModal size="lg" onRequestClose={onClose}>
      <Stack gap={5}>
        <Stack orientation="horizontal" gap={3}>
          <Button size="sm" kind="primary" disabled={run.isPending} onClick={() => run.mutate({ projectId, sessionType: "AD_HOC" })}>
            {run.isPending ? "Running…" : "Run standup now"}
          </Button>
          {sessions.length > 0 && (
            <Select
              id="standup-session"
              labelText="Session"
              hideLabel
              size="sm"
              value={activeSessionId ?? ""}
              onChange={(e) => setSelectedSessionId(e.target.value)}
            >
              {sessions.map((s) => (
                <SelectItem
                  key={s.id}
                  value={s.id}
                  text={`${STANDUP_SESSION_LABEL[s.sessionType as keyof typeof STANDUP_SESSION_LABEL] ?? s.sessionType} — ${new Date(s.scheduledAt).toLocaleString()}`}
                />
              ))}
            </Select>
          )}
        </Stack>

        {run.isSuccess && run.data.questionCount === 0 && (
          <InlineNotification
            kind="success"
            lowContrast
            hideCloseButton
            title="Nothing to ask"
            subtitle="Every active task on this project has what it needs."
          />
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
            <Tile key={q.id}>
              <Stack gap={3}>
                <Stack gap={1}>
                  {q.questionText.split("\n").map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </Stack>
                <Tag type={answered ? "green" : "gray"} size="sm">
                  {STANDUP_RESPONSE_LABEL[q.responseStatus as keyof typeof STANDUP_RESPONSE_LABEL] ?? q.responseStatus}
                </Tag>
                {q.responseText && <p className="esti-label esti-label--secondary">{q.responseText}</p>}
                {!answered && (
                  <Stack orientation="horizontal" gap={3}>
                    <Select
                      id={`standup-ans-${q.id}`}
                      labelText="Response"
                      hideLabel
                      size="sm"
                      value={draft.status}
                      onChange={(e) => setDraft(q.id, { status: e.target.value })}
                    >
                      <SelectItem value="" text="— choose response —" />
                      {ANSWER_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} text={o.text} />
                      ))}
                    </Select>
                    <Button
                      size="sm"
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
            </Tile>
          );
        })}

        {activeSessionId && questions.length === 0 && !questionsQ.isLoading && (
          <p className="esti-label esti-label--secondary">No questions in this session.</p>
        )}
      </Stack>
    </Modal>
  );
}
