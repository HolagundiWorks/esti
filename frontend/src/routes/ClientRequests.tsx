import {
  Button,
  Checkbox,
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
  Tile,
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

  // Impact assessment state
  const [impact, setImpact] = useState<{
    id: string;
    subject: string;
    refDrawingRef: string | null | undefined;
    refDrawingTitle: string | null | undefined;
    attentionToName: string | null | undefined;
    body: string | null | undefined;
    affectsCosting: boolean;
    affectsTimeline: boolean;
    isBillable: boolean;
    architectComment: string;
  } | null>(null);
  const sendImpact = trpc.clientRequests.sendImpactAssessment.useMutation({
    onSuccess: () => {
      utils.clientRequests.list.invalidate();
      utils.clientRequests.openCount.invalidate();
      setImpact(null);
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
                <TableHeader>Actions</TableHeader>
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
                    {r.refDrawingRef && (
                      <div className="esti-label esti-label--helper">
                        Ref drawing: {r.refDrawingRef}{r.refDrawingTitle ? ` — ${r.refDrawingTitle}` : ""}
                      </div>
                    )}
                    {r.attentionToId && (
                      <div className="esti-label esti-label--helper">
                        Attn: {(r as { submittedBy?: string | null }).submittedBy ?? r.attentionToId}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link to={`/projects/${r.projectId}`}>{r.projectRef}</Link>
                  </TableCell>
                  <TableCell>{r.clientName ?? "—"}</TableCell>
                  <TableCell>
                    <Stack gap={1}>
                      <Tag type={PORTAL_SUBMISSION_STATUS_TAG[r.status as PortalSubmissionStatusT] ?? "blue"}>
                        {PORTAL_SUBMISSION_STATUS_LABEL[r.status as PortalSubmissionStatusT] ?? r.status}
                      </Tag>
                      {(r.affectsCosting || r.affectsTimeline || r.isBillable) && (
                        <Stack orientation="horizontal" gap={1}>
                          {r.affectsCosting && <Tag type="red" size="sm">Cost</Tag>}
                          {r.affectsTimeline && <Tag type="magenta" size="sm">Time</Tag>}
                          {r.isBillable && <Tag type="purple" size="sm">Billable</Tag>}
                        </Stack>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack gap={2}>
                      {r.kind === "CHANGE_REQUEST" && !["IMPACT_SENT", "CLIENT_APPROVED", "CLIENT_REJECTED", "RESOLVED", "DECLINED"].includes(r.status) && (
                        <Button kind="primary" size="sm"
                          onClick={() => setImpact({
                            id: r.id,
                            subject: r.subject,
                            refDrawingRef: r.refDrawingRef,
                            refDrawingTitle: r.refDrawingTitle,
                            attentionToName: r.attentionToId ? String(r.attentionToId) : null,
                            body: r.body,
                            affectsCosting: r.affectsCosting ?? false,
                            affectsTimeline: r.affectsTimeline ?? false,
                            isBillable: r.isBillable ?? false,
                            architectComment: r.architectComment ?? "",
                          })}>
                          Send impact
                        </Button>
                      )}
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
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      {/* ── Impact Assessment modal ──────────────────────────────────────── */}
      <Modal
        open={impact !== null}
        modalHeading={impact ? `Impact assessment — ${impact.subject}` : "Impact assessment"}
        primaryButtonText={sendImpact.isPending ? "Sending…" : "Send to client"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={sendImpact.isPending}
        onRequestClose={() => setImpact(null)}
        onRequestSubmit={() => impact && sendImpact.mutate({
          submissionId: impact.id,
          affectsCosting: impact.affectsCosting,
          affectsTimeline: impact.affectsTimeline,
          isBillable: impact.isBillable,
          architectComment: impact.architectComment || undefined,
        })}
      >
        {impact && (
          <Stack gap={5}>
            {impact.body && (
              <Tile>
                <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>Client's request</p>
                <p>{impact.body}</p>
                {impact.refDrawingRef && (
                  <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)", marginTop: "0.5rem" }}>
                    Reference drawing: {impact.refDrawingRef}{impact.refDrawingTitle ? ` — ${impact.refDrawingTitle}` : ""}
                  </p>
                )}
              </Tile>
            )}
            <p>Tick all that apply to this change:</p>
            <Stack gap={3}>
              <Checkbox
                id="ia-costing"
                labelText="Affects costing"
                helperText="This change will require a revised fee or additional costing."
                checked={impact.affectsCosting}
                onChange={(_e, { checked }) => setImpact({ ...impact, affectsCosting: checked })}
              />
              <Checkbox
                id="ia-timeline"
                labelText="Affects timeline / delivery schedule"
                helperText="This change will extend or shift the project delivery dates."
                checked={impact.affectsTimeline}
                onChange={(_e, { checked }) => setImpact({ ...impact, affectsTimeline: checked })}
              />
              <Checkbox
                id="ia-billable"
                labelText="Billable additional work"
                helperText="This change is outside the original scope and will be billed separately."
                checked={impact.isBillable}
                onChange={(_e, { checked }) => setImpact({ ...impact, isBillable: checked })}
              />
            </Stack>
            <TextArea
              id="ia-comment"
              labelText="Your comment to the client (optional)"
              helperText="Explain the impact in plain terms. The client will see this before approving."
              rows={4}
              value={impact.architectComment}
              onChange={(e) => setImpact({ ...impact, architectComment: e.target.value })}
            />
            {sendImpact.error && (
              <InlineNotification kind="error" title="Could not send"
                subtitle={sendImpact.error.message} hideCloseButton lowContrast />
            )}
          </Stack>
        )}
      </Modal>

      {/* ── Triage modal ─────────────────────────────────────────────────── */}
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

      {/* ── Thread modal ─────────────────────────────────────────────────── */}
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
