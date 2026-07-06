import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  styled,
} from "@mui/material";
import { can } from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

const HiddenFileInput = styled("input")({ display: "none" });

const chipSx = (c: string) => ({
  backgroundColor: `var(--cds-tag-background-${c})`,
  color: `var(--cds-tag-color-${c})`,
});

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
    onSuccess: () => { if (inspectionId) utils.inspections.byId.invalidate({ id: inspectionId }); setRejectOpen(false); setRejectNote(""); },
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
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>{row ? `${row.ref} · Site report` : "Site report"}</DialogTitle>
        <DialogContent>
          {!row ? (
            <p>Loading…</p>
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Chip
                  size="small"
                  label={row.status ?? "DRAFT"}
                  sx={chipSx(
                    row.status === "ISSUED" || row.status === "APPROVED" ? "green"
                    : row.status === "SUBMITTED" ? "blue"
                    : row.status === "REJECTED" ? "red"
                    : "gray",
                  )}
                />
                <span className="esti-label esti-label--helper">Version {row.versionNo ?? 1}</span>
                {row.status === "ISSUED" && (
                  <Button variant="text" size="small" onClick={() => setRevOpen(true)}>Revise</Button>
                )}
                {row.status === "SUBMITTED" && canApprove && (
                  <>
                    <Button
                      variant="contained" size="small"
                      disabled={approve.isPending}
                      onClick={() => approve.mutate({ id: row.id })}
                    >
                      {approve.isPending ? "Approving…" : "Approve"}
                    </Button>
                    <Button variant="text" color="error" size="small" onClick={() => setRejectOpen(true)}>
                      Reject
                    </Button>
                  </>
                )}
              </Stack>
              {row.status === "REJECTED" && row.rejectionNote && (
                <Alert severity="error">
                  <AlertTitle>Rejected</AlertTitle>
                  {row.rejectionNote}
                </Alert>
              )}

              <Stack spacing={1}>
                <Typography variant="subtitle1" component="h4">Photos</Typography>
                <Box>
                  <Button
                    variant="outlined"
                    component="label"
                    disabled={uploadBusy || row.pdfStatus === "READY"}
                  >
                    {uploadBusy ? "Uploading…" : "Add photo"}
                    <HiddenFileInput
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadPhoto(f);
                      }}
                    />
                  </Button>
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                  {(row.photos ?? []).length === 0 && <span>No photos yet.</span>}
                  {(row.photos ?? []).map((p) => (
                    <Box key={p.id} sx={{ width: 140 }}>
                      {p.url && (
                        <img src={p.url} alt={p.caption ?? ""} style={{ width: "100%", height: 100, objectFit: "cover" }} />
                      )}
                      {p.caption && <p className="esti-label esti-label--helper">{p.caption}</p>}
                    </Box>
                  ))}
                </Box>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle1" component="h4">Follow-up actions</Typography>
                {(row.actions ?? []).map((a) => (
                  <Stack key={a.id} direction="row" spacing={1}>
                    <div className="esti-grow">
                      <p>{a.description}</p>
                      <span className="esti-label esti-label--helper">
                        {a.assigneeName ?? "Unassigned"} · {a.status}
                        {a.dueDate ? ` · due ${a.dueDate}` : ""}
                      </span>
                    </div>
                    {!a.taskId && (
                      <Button variant="text" size="small" disabled={convert.isPending} onClick={() => convert.mutate({ actionId: a.id })}>
                        → Task
                      </Button>
                    )}
                  </Stack>
                ))}
                {row.pdfStatus !== "READY" && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <TextField id="insp-act" placeholder="Follow-up item" value={actionText}
                      slotProps={{ htmlInput: { "aria-label": "Action" } }}
                      onChange={(e) => setActionText(e.target.value)} />
                    <TextField id="insp-asg" placeholder="Name" value={assignee}
                      slotProps={{ htmlInput: { "aria-label": "Assignee" } }}
                      onChange={(e) => setAssignee(e.target.value)} />
                    <TextField id="insp-due" type="date" value={dueDate}
                      slotProps={{ htmlInput: { "aria-label": "Due" } }}
                      onChange={(e) => setDueDate(e.target.value)} />
                    <Button
                      variant="contained"
                      size="small"
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
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={revOpen} onClose={() => setRevOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Revise site report</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField id="rev-note" label="Revision note" multiline minRows={4} value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)} fullWidth />
            <TextField id="imp-note" label="Impact note (optional)" multiline minRows={4} value={impactNote}
              onChange={(e) => setImpactNote(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setRevOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!revisionNote || revise.isPending || !inspectionId}
            onClick={() => {
              if (!inspectionId) return;
              revise.mutate({
                entityType: "INSPECTION",
                entityId: inspectionId,
                revisionNote,
                impactNote: impactNote || undefined,
              });
            }}
          >
            {revise.isPending ? "Saving…" : "Revise"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={rejectOpen}
        onClose={() => { setRejectOpen(false); setRejectNote(""); }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Reject inspection</DialogTitle>
        <DialogContent>
          <TextField
            id="rej-note"
            label="Rejection reason"
            helperText="The site supervisor will see this note."
            multiline
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => { setRejectOpen(false); setRejectNote(""); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!rejectNote.trim() || reject.isPending}
            onClick={() => {
              if (!inspectionId) return;
              reject.mutate({ id: inspectionId, note: rejectNote });
            }}
          >
            {reject.isPending ? "Rejecting…" : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
