import {
  Button,
  InlineNotification,
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
  TextArea,
} from "@carbon/react";
import {
  PORTAL_SUBMISSION_KIND_LABEL,
  PORTAL_SUBMISSION_STATUS_LABEL,
  PORTAL_SUBMISSION_STATUS_TAG,
  REVISION_CATEGORY_LABEL,
  REVISION_CATEGORY_TAG,
  PortalSubmissionKind,
  PortalSubmissionStatus,
  type PortalSubmissionStatus as PortalSubmissionStatusT,
  type RevisionCategory as RevisionCategoryT,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { SubmissionThread } from "../components/SubmissionThread.js";
import { trpc } from "../lib/trpc.js";

const KIND_TAG: Record<string, "purple" | "blue" | "teal"> = {
  ACKNOWLEDGEMENT: "teal",
  CHANGE_REQUEST: "purple",
  FEEDBACK: "blue",
};

export function ClientRequests({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");

  const listQ = trpc.clientRequests.list.useQuery({
    status: status ? (status as PortalSubmissionStatusT) : undefined,
    kind: kind ? (kind as (typeof PortalSubmissionKind.options)[number]) : undefined,
  });
  const rows = listQ.data ?? [];

  const [triage, setTriage] = useState<
    { id: string; subject: string; status: PortalSubmissionStatusT; responseNote: string } | null
  >(null);
  const setStatusM = trpc.clientRequests.setStatus.useMutation({
    onSuccess: () => {
      utils.clientRequests.list.invalidate();
      utils.clientRequests.openCount.invalidate();
      setTriage(null);
    },
  });

  const [threadFor, setThreadFor] = useState<{ id: string; subject: string } | null>(null);
  const threadQ = trpc.clientRequests.thread.useQuery(
    { id: threadFor?.id ?? "" },
    { enabled: !!threadFor },
  );
  const reply = trpc.clientRequests.reply.useMutation({
    onSuccess: () => utils.clientRequests.thread.invalidate(),
  });

  return (
    <Stack gap={6}>
      {!embedded && (
        <PageHeader
          title="Client requests"
          description="Acknowledgements, change requests and feedback raised from the client portal."
        />
      )}

      <Stack orientation="horizontal" gap={5}>
        <Select id="cr-status" labelText="Status" hideLabel size="sm"
          value={status} onChange={(e) => setStatus(e.target.value)}>
          <SelectItem value="" text="All statuses" />
          {PortalSubmissionStatus.options.map((s) => (
            <SelectItem key={s} value={s} text={PORTAL_SUBMISSION_STATUS_LABEL[s]} />
          ))}
        </Select>
        <Select id="cr-kind" labelText="Kind" hideLabel size="sm"
          value={kind} onChange={(e) => setKind(e.target.value)}>
          <SelectItem value="" text="All kinds" />
          {PortalSubmissionKind.options.map((k) => (
            <SelectItem key={k} value={k} text={PORTAL_SUBMISSION_KIND_LABEL[k]} />
          ))}
        </Select>
      </Stack>

      {listQ.error && (
        <InlineNotification kind="error" title="Could not load client requests"
          subtitle={listQ.error.message} hideCloseButton lowContrast />
      )}

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={7}
        empty={{ title: "No client requests", description: "Items raised from the client portal appear here." }}
      >
        <TableContainer title="Submissions">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Type</TableHeader>
                <TableHeader>Revision</TableHeader>
                <TableHeader>Subject</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Client</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Tag type={KIND_TAG[r.kind] ?? "gray"} size="sm">
                      {PORTAL_SUBMISSION_KIND_LABEL[r.kind as keyof typeof PORTAL_SUBMISSION_KIND_LABEL] ?? r.kind}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    {r.revisionCategory ? (
                      <Tag type={REVISION_CATEGORY_TAG[r.revisionCategory as RevisionCategoryT] ?? "gray"} size="sm">
                        {REVISION_CATEGORY_LABEL[r.revisionCategory as RevisionCategoryT] ?? r.revisionCategory}
                      </Tag>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {r.subject}
                    {r.body && <div className="esti-label esti-label--secondary">{r.body}</div>}
                    {r.rating != null && <div className="esti-label esti-label--helper">Rating: {r.rating}/5</div>}
                  </TableCell>
                  <TableCell>
                    <Link to={`/projects/${r.projectId}`}>{r.projectRef}</Link>
                  </TableCell>
                  <TableCell>{r.clientName ?? r.submittedBy ?? "—"}</TableCell>
                  <TableCell>
                    <Tag type={PORTAL_SUBMISSION_STATUS_TAG[r.status as PortalSubmissionStatusT] ?? "blue"}>
                      {PORTAL_SUBMISSION_STATUS_LABEL[r.status as PortalSubmissionStatusT] ?? r.status}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    <Button kind="ghost" size="sm"
                      onClick={() => setTriage({
                        id: r.id, subject: r.subject,
                        status: r.status as PortalSubmissionStatusT,
                        responseNote: r.responseNote ?? "",
                      })}>
                      Triage
                    </Button>
                    <Button kind="ghost" size="sm" onClick={() => setThreadFor({ id: r.id, subject: r.subject })}>
                      Reply
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <Modal
        open={triage !== null}
        modalHeading={triage ? `Triage — ${triage.subject}` : "Triage"}
        primaryButtonText={setStatusM.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={setStatusM.isPending}
        onRequestClose={() => setTriage(null)}
        onRequestSubmit={() => triage && setStatusM.mutate({
          id: triage.id, status: triage.status,
          responseNote: triage.responseNote || undefined,
        })}
      >
        {triage && (
          <Stack gap={5}>
            <Select id="tr-status" labelText="Status" value={triage.status}
              onChange={(e) => setTriage({ ...triage, status: e.target.value as PortalSubmissionStatusT })}>
              {PortalSubmissionStatus.options.map((s) => (
                <SelectItem key={s} value={s} text={PORTAL_SUBMISSION_STATUS_LABEL[s]} />
              ))}
            </Select>
            <TextArea id="tr-note" labelText="Response to client (optional)" rows={3}
              value={triage.responseNote}
              onChange={(e) => setTriage({ ...triage, responseNote: e.target.value })} />
            {setStatusM.error && (
              <InlineNotification kind="error" title="Could not save"
                subtitle={setStatusM.error.message} hideCloseButton lowContrast />
            )}
          </Stack>
        )}
      </Modal>

      <Modal
        open={threadFor !== null}
        modalHeading={threadFor ? `Conversation — ${threadFor.subject}` : "Conversation"}
        primaryButtonText="Close" passiveModal
        onRequestClose={() => setThreadFor(null)}
      >
        {threadFor && (
          <SubmissionThread
            messages={threadQ.data ?? []}
            loading={threadQ.isLoading}
            pending={reply.isPending}
            onReply={(body) => reply.mutate({ id: threadFor.id, body })}
          />
        )}
      </Modal>
    </Stack>
  );
}
