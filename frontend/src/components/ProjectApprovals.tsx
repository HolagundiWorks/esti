import {
  Button,
  Modal,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from "@carbon/react";
import {
  APPROVAL_CHANNELS,
  APPROVAL_ENTITY_TYPES,
  type ApprovalChannelCode,
  type ApprovalEntityTypeCode,
  ApprovalStatus,
} from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<
  string,
  "gray" | "blue" | "green" | "magenta" | "red" | "cool-gray"
> = {
  DRAFT: "gray",
  SENT: "blue",
  APPROVED: "green",
  REVISIONS: "magenta",
  REJECTED: "red",
  SUPERSEDED: "cool-gray",
};

export function ProjectApprovals({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.approvals.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const invalidate = () =>
    utils.approvals.listByProject.invalidate({ projectId });
  const update = trpc.approvals.update.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [entityType, setEntityType] =
    useState<ApprovalEntityTypeCode>("DRAWING");
  const [title, setTitle] = useState("");
  const [recipient, setRecipient] = useState("");
  const [channel, setChannel] = useState<ApprovalChannelCode>("EMAIL");
  const [sentDate, setSentDate] = useState("");

  const create = trpc.approvals.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setTitle("");
      setRecipient("");
      setSentDate("");
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
        <h3>Approvals &amp; issues</h3>
        <Button size="sm" onClick={() => setOpen(true)}>
          Record issue
        </Button>
      </div>
      <TableContainer
        title="Issue / approval log"
        description="Sign-off tracking with revisions"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Item</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Recipient</TableHeader>
              <TableHeader>Channel</TableHeader>
              <TableHeader>Sent</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Set status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(listQ.data ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.title}</TableCell>
                <TableCell>
                  {APPROVAL_ENTITY_TYPES[
                    a.entityType as ApprovalEntityTypeCode
                  ] ?? a.entityType}
                </TableCell>
                <TableCell>{a.recipient ?? "—"}</TableCell>
                <TableCell>
                  {APPROVAL_CHANNELS[a.channel as ApprovalChannelCode] ??
                    a.channel}
                </TableCell>
                <TableCell>{a.sentDate ?? "—"}</TableCell>
                <TableCell>
                  <Tag type={STATUS_TAG[a.status] ?? "gray"}>{a.status}</Tag>
                </TableCell>
                <TableCell>
                  <Select
                    id={`ap-${a.id}`}
                    labelText="Update approval status"
                    hideLabel
                    size="sm"
                    value={a.status}
                    disabled={a.status === "SUPERSEDED"}
                    onChange={(e) => {
                      const status = e.target
                        .value as (typeof ApprovalStatus.options)[number];
                      const decided = [
                        "APPROVED",
                        "REJECTED",
                        "REVISIONS",
                      ].includes(status);
                      update.mutate({
                        id: a.id,
                        status,
                        ...(decided && !a.responseDate
                          ? {
                              responseDate: new Date()
                                .toISOString()
                                .slice(0, 10),
                            }
                          : {}),
                      });
                    }}
                  >
                    {ApprovalStatus.options.map((st) => (
                      <SelectItem key={st} value={st} text={st} />
                    ))}
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={open}
        modalHeading="Record an issue for sign-off"
        primaryButtonText={create.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!title || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            entityType,
            title,
            recipient: recipient || undefined,
            channel,
            sentDate: sentDate || null,
          })
        }
      >
        <Stack gap={5}>
          <Select
            id="ap-type"
            labelText="What was issued"
            value={entityType}
            onChange={(e) =>
              setEntityType(e.target.value as ApprovalEntityTypeCode)
            }
          >
            {(
              Object.keys(APPROVAL_ENTITY_TYPES) as ApprovalEntityTypeCode[]
            ).map((k) => (
              <SelectItem key={k} value={k} text={APPROVAL_ENTITY_TYPES[k]} />
            ))}
          </Select>
          <TextInput
            id="ap-title"
            labelText="Title / reference"
            placeholder="e.g. GF plan rev B"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextInput
            id="ap-recipient"
            labelText="Recipient (optional)"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <Select
            id="ap-channel"
            labelText="Channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as ApprovalChannelCode)}
          >
            {(Object.keys(APPROVAL_CHANNELS) as ApprovalChannelCode[]).map(
              (k) => (
                <SelectItem key={k} value={k} text={APPROVAL_CHANNELS[k]} />
              ),
            )}
          </Select>
          <TextInput
            id="ap-sent"
            labelText="Sent date (optional — leave blank to keep as draft)"
            type="date"
            value={sentDate}
            onChange={(e) => setSentDate(e.target.value)}
          />
        </Stack>
      </Modal>
    </>
  );
}
