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
  TextInput,
} from "@carbon/react";
import {
  CONSULTANT_SUBMISSION_KIND_LABEL,
  CONSULTANT_SUBMISSION_KIND_TAG,
  CONSULTANT_SUBMISSION_STATUS_LABEL,
  CONSULTANT_SUBMISSION_STATUS_TAG,
  ConsultantSubmissionKind,
  ConsultantSubmissionStatus,
  type ConsultantSubmissionKind as ConsultantSubmissionKindT,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { SubmissionThread } from "../components/SubmissionThread.js";
import { trpc } from "../lib/trpc.js";

type SubmissionStatus = keyof typeof CONSULTANT_SUBMISSION_STATUS_LABEL;

export function ConsultantRequests({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");

  const listQ = trpc.consultantRequests.list.useQuery({
    status: status ? (status as SubmissionStatus) : undefined,
    kind: kind ? (kind as ConsultantSubmissionKindT) : undefined,
  });
  const rows = listQ.data ?? [];

  const [triage, setTriage] = useState<
    { id: string; subject: string; status: SubmissionStatus; responseNote: string } | null
  >(null);
  const setStatusM = trpc.consultantRequests.setStatus.useMutation({
    onSuccess: () => {
      utils.consultantRequests.list.invalidate();
      utils.consultantRequests.openCount.invalidate();
      setTriage(null);
    },
  });

  const [threadFor, setThreadFor] = useState<{ id: string; subject: string } | null>(null);
  const threadQ = trpc.consultantRequests.thread.useQuery(
    { id: threadFor?.id ?? "" },
    { enabled: !!threadFor },
  );
  const reply = trpc.consultantRequests.reply.useMutation({
    onSuccess: () => utils.consultantRequests.thread.invalidate(),
  });

  // ── assign a task to a consultant ──────────────────────────────────────────
  const [assignOpen, setAssignOpen] = useState(false);
  const [assign, setAssign] = useState({ projectId: "", consultantId: "", subject: "", body: "" });
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const engagementsQ = trpc.engagements.listByProject.useQuery(
    { projectId: assign.projectId },
    { enabled: !!assign.projectId },
  );
  const assignM = trpc.consultantRequests.assign.useMutation({
    onSuccess: () => {
      utils.consultantRequests.list.invalidate();
      utils.consultantRequests.openCount.invalidate();
      setAssignOpen(false);
      setAssign({ projectId: "", consultantId: "", subject: "", body: "" });
    },
  });

  return (
    <Stack gap={6}>
      {!embedded && (
        <PageHeader
          title="Consultant requests"
          description="Deliverables, RFIs and notes raised by engaged consultants — and tasks you assign to them."
          actions={<Button size="sm" onClick={() => setAssignOpen(true)}>Assign task</Button>}
        />
      )}

      <Stack orientation="horizontal" gap={5}>
        <Select id="cnr-status" labelText="Status" hideLabel size="sm"
          value={status} onChange={(e) => setStatus(e.target.value)}>
          <SelectItem value="" text="All statuses" />
          {ConsultantSubmissionStatus.options.map((s) => (
            <SelectItem key={s} value={s} text={CONSULTANT_SUBMISSION_STATUS_LABEL[s]} />
          ))}
        </Select>
        <Select id="cnr-kind" labelText="Kind" hideLabel size="sm"
          value={kind} onChange={(e) => setKind(e.target.value)}>
          <SelectItem value="" text="All kinds" />
          {ConsultantSubmissionKind.options.map((k) => (
            <SelectItem key={k} value={k} text={CONSULTANT_SUBMISSION_KIND_LABEL[k]} />
          ))}
        </Select>
        {embedded && (
          <Button size="sm" onClick={() => setAssignOpen(true)}>Assign task</Button>
        )}
      </Stack>

      {listQ.error && (
        <InlineNotification kind="error" title="Could not load consultant requests"
          subtitle={listQ.error.message} hideCloseButton lowContrast />
      )}

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={6}
        empty={{ title: "No consultant requests", description: "Items raised from the collaborator portal appear here." }}
      >
        <TableContainer title="Submissions">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Type</TableHeader>
                <TableHeader>Subject</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Consultant</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Tag type={CONSULTANT_SUBMISSION_KIND_TAG[r.kind as ConsultantSubmissionKindT] ?? "gray"} size="sm">
                      {CONSULTANT_SUBMISSION_KIND_LABEL[r.kind as ConsultantSubmissionKindT] ?? r.kind}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    {r.subject}
                    {r.body && <div className="esti-label esti-label--secondary">{r.body}</div>}
                  </TableCell>
                  <TableCell>
                    <Link to={`/projects/${r.projectId}`}>{r.projectRef}</Link>
                  </TableCell>
                  <TableCell>{r.consultantName ?? r.submittedBy ?? "—"}</TableCell>
                  <TableCell>
                    <Tag type={CONSULTANT_SUBMISSION_STATUS_TAG[r.status as SubmissionStatus] ?? "blue"}>
                      {CONSULTANT_SUBMISSION_STATUS_LABEL[r.status as SubmissionStatus] ?? r.status}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    <Button kind="ghost" size="sm"
                      onClick={() => setTriage({
                        id: r.id, subject: r.subject,
                        status: r.status as SubmissionStatus,
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
            <Select id="cnr-tr-status" labelText="Status" value={triage.status}
              onChange={(e) => setTriage({ ...triage, status: e.target.value as SubmissionStatus })}>
              {ConsultantSubmissionStatus.options.map((s) => (
                <SelectItem key={s} value={s} text={CONSULTANT_SUBMISSION_STATUS_LABEL[s]} />
              ))}
            </Select>
            <TextArea id="cnr-tr-note" labelText="Response to consultant (optional)" rows={3}
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

      <Modal
        open={assignOpen} modalHeading="Assign a task to a consultant"
        primaryButtonText={assignM.isPending ? "Assigning…" : "Assign"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!assign.projectId || !assign.consultantId || !assign.subject || assignM.isPending}
        onRequestClose={() => setAssignOpen(false)}
        onRequestSubmit={() => assignM.mutate({
          projectId: assign.projectId, consultantId: assign.consultantId,
          subject: assign.subject, body: assign.body || undefined,
        })}
      >
        <Stack gap={5}>
          <Select id="as-proj" labelText="Project" value={assign.projectId}
            onChange={(e) => setAssign((a) => ({ ...a, projectId: e.target.value, consultantId: "" }))}>
            <SelectItem value="" text="— select a project —" />
            {(projectsQ.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id} text={`${p.ref} ${p.title}`} />
            ))}
          </Select>
          <Select id="as-cons" labelText="Consultant"
            disabled={!assign.projectId || (engagementsQ.data ?? []).length === 0}
            helperText={assign.projectId && (engagementsQ.data ?? []).length === 0 ? "No consultants engaged on this project" : undefined}
            value={assign.consultantId}
            onChange={(e) => setAssign((a) => ({ ...a, consultantId: e.target.value }))}>
            <SelectItem value="" text="— select a consultant —" />
            {(engagementsQ.data ?? []).map((en) => (
              <SelectItem key={en.consultantId} value={en.consultantId} text={en.consultantName ?? en.consultantId} />
            ))}
          </Select>
          <TextInput id="as-subject" labelText="Task" value={assign.subject}
            onChange={(e) => setAssign((a) => ({ ...a, subject: e.target.value }))} />
          <TextArea id="as-body" labelText="Details (optional)" rows={3} value={assign.body}
            onChange={(e) => setAssign((a) => ({ ...a, body: e.target.value }))} />
          {assignM.error && (
            <InlineNotification kind="error" title="Could not assign"
              subtitle={assignM.error.message} hideCloseButton lowContrast />
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
