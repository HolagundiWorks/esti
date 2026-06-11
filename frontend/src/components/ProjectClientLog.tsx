import {
  Button,
  Modal,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextArea,
  TextInput,
} from "@carbon/react";
import { CLIENT_LOG_KINDS, type ClientLogKindCode } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

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
  const remove = trpc.clientLog.remove.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ClientLogKindCode>("MEETING");
  const [occurredAt, setOccurredAt] = useState(today());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [followUp, setFollowUp] = useState("");

  const create = trpc.clientLog.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setSubject("");
      setBody("");
      setFollowUp("");
    },
  });

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 32,
        }}
      >
        <h3>Client communication</h3>
        <Button size="sm" onClick={() => setOpen(true)}>
          Log interaction
        </Button>
      </div>

      <div style={{ marginTop: 8 }}>
        {(logQ.data ?? []).length === 0 && <p>No interactions logged yet.</p>}
        {(logQ.data ?? []).map((e) => (
          <div
            key={e.id}
            style={{
              padding: "8px 0 8px 16px",
              marginLeft: 8,
              position: "relative",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Tag type={KIND_TAG[e.kind as ClientLogKindCode] ?? "gray"}>
                {CLIENT_LOG_KINDS[e.kind as ClientLogKindCode] ?? e.kind}
              </Tag>
              <strong>{e.subject}</strong>
              <span>{e.occurredAt}</span>
              <Button
                kind="ghost"
                size="sm"
                style={{ marginLeft: "auto" }}
                onClick={() => remove.mutate({ id: e.id })}
              >
                Remove
              </Button>
            </div>
            {e.body && (
              <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>
                {e.body}
              </p>
            )}
            {e.followUpDate && <span>Follow-up: {e.followUpDate}</span>}
          </div>
        ))}
      </div>

      <Modal
        open={open}
        modalHeading="Log client interaction"
        primaryButtonText={create.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!subject || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            kind,
            occurredAt,
            subject,
            body: body || undefined,
            followUpDate: followUp || null,
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="cl-kind"
            labelText="Type"
            value={kind}
            onChange={(e) => setKind(e.target.value as ClientLogKindCode)}
          >
            {(Object.keys(CLIENT_LOG_KINDS) as ClientLogKindCode[]).map((k) => (
              <SelectItem key={k} value={k} text={CLIENT_LOG_KINDS[k]} />
            ))}
          </Select>
          <TextInput
            id="cl-date"
            labelText="Date"
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
          <TextInput
            id="cl-subject"
            labelText="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <TextArea
            id="cl-body"
            labelText="Notes (optional)"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <TextInput
            id="cl-followup"
            labelText="Follow-up date (optional)"
            type="date"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
          />
        </Stack>
      </Modal>
    </>
  );
}
