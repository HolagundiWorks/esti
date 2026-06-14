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
import { trpc } from "../lib/trpc.js";

type SubmissionStatus = keyof typeof CONSULTANT_SUBMISSION_STATUS_LABEL;

export function ConsultantRequests() {
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

  return (
    <Stack gap={6}>
      <Stack gap={3}>
        <h1>Consultant requests</h1>
        <p>Deliverables, RFIs and notes raised by engaged consultants on the collaborator portal.</p>
      </Stack>

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
    </Stack>
  );
}
