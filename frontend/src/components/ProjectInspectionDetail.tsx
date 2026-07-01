import {
  Button,
  FileUploaderButton,
  InlineNotification,
  Modal,
  Stack,
  Tag,
  TextArea,
  TextInput,
} from "@carbon/react";
import { can } from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

export function ProjectInspectionDetail({
  inspectionId,
  open,
  onClose,
}: {
  inspectionId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const { authorizedFetch } = useUploadAuth();
  const q = trpc.inspections.byId.useQuery({ id: inspectionId! }, { enabled: !!inspectionId && open });
  const addAction = trpc.inspections.addAction.useMutation({
    onSuccess: () => inspectionId && utils.inspections.byId.invalidate({ id: inspectionId }),
  });
  const convert = trpc.inspections.convertActionToTask.useMutation({
    onSuccess: () => inspectionId && utils.inspections.byId.invalidate({ id: inspectionId }),
  });
  const revise = trpc.documents.revise.useMutation({
    onSuccess: () => {
      onClose();
      void utils.inspections.listByProject.invalidate();
    },
  });

  const { user } = useAuth();
  const approve = trpc.inspections.approve.useMutation({
    onSuccess: () => inspectionId && utils.inspections.byId.invalidate({ id: inspectionId }),
  });
  const reject = trpc.inspections.reject.useMutation({
    onSuccess: () => { inspectionId && utils.inspections.byId.invalidate({ id: inspectionId }); setRejectOpen(false); setRejectNote(""); },
  });

  const [actionText, setActionText] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [revOpen, setRevOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [impactNote, setImpactNote] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const row = q.data;
  const canApprove = can(user?.role, "write");

  async function uploadPhoto(file: File) {
    if (!inspectionId) return;
    setUploadBusy(true);
    try {
      const res = await authorizedFetch("/upload/inspection-photo", (fd) => {
        fd.append("inspectionId", inspectionId);
        fd.append("file", file);
      });
      if (res.ok) await utils.inspections.byId.invalidate({ id: inspectionId });
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        modalHeading={row ? `${row.ref} · Site report` : "Site report"}
        primaryButtonText="Close"
        onRequestClose={onClose}
        onRequestSubmit={onClose}
        size="lg"
      >
        {!row ? (
          <p>Loading…</p>
        ) : (
          <Stack gap={5}>
            <Stack orientation="horizontal" gap={3}>
              <Tag
                type={
                  row.status === "ISSUED" || row.status === "APPROVED" ? "green"
                  : row.status === "SUBMITTED" ? "blue"
                  : row.status === "REJECTED" ? "red"
                  : "gray"
                }
                size="sm"
              >
                {row.status ?? "DRAFT"}
              </Tag>
              <span className="esti-label esti-label--helper">Version {row.versionNo ?? 1}</span>
              {row.status === "ISSUED" && (
                <Button kind="ghost" size="sm" onClick={() => setRevOpen(true)}>Revise</Button>
              )}
              {row.status === "SUBMITTED" && canApprove && (
                <>
                  <Button
                    kind="primary" size="sm"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate({ id: row.id })}
                  >
                    {approve.isPending ? "Approving…" : "Approve"}
                  </Button>
                  <Button kind="danger--ghost" size="sm" onClick={() => setRejectOpen(true)}>
                    Reject
                  </Button>
                </>
              )}
            </Stack>
            {row.status === "REJECTED" && row.rejectionNote && (
              <InlineNotification
                kind="error"
                title="Rejected"
                subtitle={row.rejectionNote}
                hideCloseButton
              />
            )}

            <Stack gap={3}>
              <h4>Photos</h4>
              <FileUploaderButton
                labelText={uploadBusy ? "Uploading…" : "Add photo"}
                accept={[".png", ".jpg", ".jpeg", ".webp"]}
                disableLabelChanges
                buttonKind="tertiary"
                disabled={uploadBusy || row.pdfStatus === "READY"}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadPhoto(f);
                }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--cds-spacing-04)" }}>
                {(row.photos ?? []).length === 0 && <span>No photos yet.</span>}
                {(row.photos ?? []).map((p) => (
                  <div key={p.id} style={{ width: 140 }}>
                    {p.url && (
                      <img src={p.url} alt={p.caption ?? ""} style={{ width: "100%", height: 100, objectFit: "cover" }} />
                    )}
                    {p.caption && <p className="esti-label esti-label--helper">{p.caption}</p>}
                  </div>
                ))}
              </div>
            </Stack>

            <Stack gap={3}>
              <h4>Follow-up actions</h4>
              {(row.actions ?? []).map((a) => (
                <Stack key={a.id} orientation="horizontal" gap={3}>
                  <div className="esti-grow">
                    <p>{a.description}</p>
                    <span className="esti-label esti-label--helper">
                      {a.assigneeName ?? "Unassigned"} · {a.status}
                      {a.dueDate ? ` · due ${a.dueDate}` : ""}
                    </span>
                  </div>
                  {!a.taskId && (
                    <Button kind="ghost" size="sm" disabled={convert.isPending} onClick={() => convert.mutate({ actionId: a.id })}>
                      → Task
                    </Button>
                  )}
                </Stack>
              ))}
              {row.pdfStatus !== "READY" && (
                <Stack orientation="horizontal" gap={3}>
                  <TextInput id="insp-act" labelText="Action" hideLabel placeholder="Follow-up item" value={actionText} onChange={(e) => setActionText(e.target.value)} />
                  <TextInput id="insp-asg" labelText="Assignee" hideLabel placeholder="Name" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
                  <TextInput id="insp-due" labelText="Due" hideLabel type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  <Button
                    size="sm"
                    disabled={!actionText || !inspectionId}
                    onClick={() => {
                      if (!inspectionId) return;
                      addAction.mutate(
                        {
                          inspectionId,
                          description: actionText,
                          assigneeName: assignee || undefined,
                          dueDate: dueDate || undefined,
                        },
                        { onSuccess: () => { setActionText(""); setAssignee(""); setDueDate(""); } },
                      );
                    }}
                  >
                    Add
                  </Button>
                </Stack>
              )}
            </Stack>
          </Stack>
        )}
      </Modal>

      <Modal
        open={revOpen}
        modalHeading="Revise site report"
        primaryButtonText={revise.isPending ? "Saving…" : "Revise"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!revisionNote || revise.isPending || !inspectionId}
        onRequestClose={() => setRevOpen(false)}
        onRequestSubmit={() => {
          if (!inspectionId) return;
          revise.mutate({
            entityType: "INSPECTION",
            entityId: inspectionId,
            revisionNote,
            impactNote: impactNote || undefined,
          });
        }}
      >
        <Stack gap={4}>
          <TextArea id="rev-note" labelText="Revision note" value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} />
          <TextArea id="imp-note" labelText="Impact note (optional)" value={impactNote} onChange={(e) => setImpactNote(e.target.value)} />
        </Stack>
      </Modal>

      <Modal
        open={rejectOpen}
        modalHeading="Reject inspection"
        primaryButtonText={reject.isPending ? "Rejecting…" : "Reject"}
        secondaryButtonText="Cancel"
        danger
        primaryButtonDisabled={!rejectNote.trim() || reject.isPending}
        onRequestClose={() => { setRejectOpen(false); setRejectNote(""); }}
        onRequestSubmit={() => {
          if (!inspectionId) return;
          reject.mutate({ id: inspectionId, note: rejectNote });
        }}
      >
        <TextArea
          id="rej-note"
          labelText="Rejection reason"
          helperText="The site supervisor will see this note."
          rows={3}
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
        />
      </Modal>
    </>
  );
}
