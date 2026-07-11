import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
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
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusDot, StatusTag } from "../components/StatusTag.js";
import { SubmissionThread } from "../components/SubmissionThread.js";
import { trpc } from "../lib/trpc.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";

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

  const columns: GridColDef[] = [
    {
      field: "kind",
      headerName: "Type",
      flex: 1,
      minWidth: 130,
      renderCell: (p) => (
        <StatusTag
          value={p.row.kind as string}
          map={KIND_TAG}
          label={PORTAL_SUBMISSION_KIND_LABEL[p.row.kind as keyof typeof PORTAL_SUBMISSION_KIND_LABEL] ?? p.row.kind}
        />
      ),
    },
    {
      field: "revisionCategory",
      headerName: "Revision",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) =>
        p.row.revisionCategory ? (
          <StatusTag
            value={p.row.revisionCategory as RevisionCategoryT}
            map={REVISION_CATEGORY_TAG}
            label={REVISION_CATEGORY_LABEL[p.row.revisionCategory as RevisionCategoryT] ?? p.row.revisionCategory}
          />
        ) : (
          <span>—</span>
        ),
    },
    {
      field: "subject",
      headerName: "Subject",
      flex: 2,
      minWidth: 240,
      sortable: false,
      renderCell: (p) => {
        const r = p.row;
        return (
          <Stack spacing={0.25} sx={{ py: 1 }}>
            <Typography variant="body2">{r.subject}</Typography>
            {r.body && (
              <Typography variant="caption" className="esti-label esti-label--secondary" color="text.secondary">
                {r.body}
              </Typography>
            )}
            {r.rating != null && (
              <Typography variant="caption" className="esti-label esti-label--helper" color="text.secondary">
                Rating: {r.rating}/5
              </Typography>
            )}
            {r.refDrawingRef && (
              <Typography variant="caption" className="esti-label esti-label--helper" color="text.secondary">
                Ref drawing: {r.refDrawingRef}{r.refDrawingTitle ? ` — ${r.refDrawingTitle}` : ""}
              </Typography>
            )}
            {r.attentionToId && (
              <Typography variant="caption" className="esti-label esti-label--helper" color="text.secondary">
                Attn: {(r as { submittedBy?: string | null }).submittedBy ?? r.attentionToId}
              </Typography>
            )}
          </Stack>
        );
      },
    },
    {
      field: "projectRef",
      headerName: "Project",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => <Link to={`/projects/${p.row.projectId}`}>{p.row.projectRef}</Link>,
    },
    {
      field: "clientName",
      headerName: "Client",
      flex: 1,
      minWidth: 130,
      valueGetter: (v) => v ?? "—",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1.2,
      minWidth: 150,
      renderCell: (p) => {
        const r = p.row;
        return (
          <Stack spacing={0.5} sx={{ py: 1 }}>
            <StatusTag
              value={r.status as PortalSubmissionStatusT}
              map={PORTAL_SUBMISSION_STATUS_TAG}
              label={PORTAL_SUBMISSION_STATUS_LABEL[r.status as PortalSubmissionStatusT] ?? r.status}
            />
            {(r.affectsCosting || r.affectsTimeline || r.isBillable) && (
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
                {r.affectsCosting && <StatusDot color="red" label="Cost" />}
                {r.affectsTimeline && <StatusDot color="magenta" label="Time" />}
                {r.isBillable && <StatusDot color="purple" label="Billable" />}
              </Stack>
            )}
          </Stack>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      minWidth: 150,
      flex: 1,
      renderCell: (p) => {
        const r = p.row;
        return (
          <RowActionsMenu
            actions={[
              r.kind === "CHANGE_REQUEST" &&
                !["IMPACT_SENT", "CLIENT_APPROVED", "CLIENT_REJECTED", "RESOLVED", "DECLINED"].includes(r.status) && {
                  label: "Send impact",
                  onClick: () =>
                    setImpact({
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
                    }),
                },
              {
                label: "Triage",
                onClick: () =>
                  setTriage({
                    id: r.id,
                    subject: r.subject,
                    status: r.status as PortalSubmissionStatusT,
                    responseNote: r.responseNote ?? "",
                  }),
              },
              {
                label: "Reply",
                onClick: () => setThreadFor({ id: r.id, subject: r.subject }),
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <Stack spacing={3}>
      {!embedded && (
        <PageHeader
          title="Client requests"
          description={`Acknowledgements, change requests and feedback raised from the ${AORMS_PORTALS.client.label.toLowerCase()}.`}
        />
      )}

      <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          id="cr-status"
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {PortalSubmissionStatus.options.map((s) => (
            <MenuItem key={s} value={s}>{PORTAL_SUBMISSION_STATUS_LABEL[s]}</MenuItem>
          ))}
        </TextField>
        <TextField
          id="cr-kind"
          select
          size="small"
          label="Kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All kinds</MenuItem>
          {PortalSubmissionKind.options.map((k) => (
            <MenuItem key={k} value={k}>{PORTAL_SUBMISSION_KIND_LABEL[k]}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {listQ.error && (
        <Alert severity="error">Could not load client requests — {listQ.error.message}</Alert>
      )}

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={7}
        empty={{ title: "No client requests", description: `Items raised from the ${AORMS_PORTALS.client.label.toLowerCase()} appear here.` }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          getRowHeight={() => "auto"}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>

      {/* ── Impact Assessment dialog ─────────────────────────────────────── */}
      <Dialog open={impact !== null} onClose={() => setImpact(null)} fullWidth maxWidth="sm">
        <DialogTitle>{impact ? `Impact assessment — ${impact.subject}` : "Impact assessment"}</DialogTitle>
        <DialogContent>
          {impact && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {impact.body && (
                <Paper className="esti-neu-inset" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Client's request</Typography>
                  <Typography variant="body2">{impact.body}</Typography>
                  {impact.refDrawingRef && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                      Reference drawing: {impact.refDrawingRef}{impact.refDrawingTitle ? ` — ${impact.refDrawingTitle}` : ""}
                    </Typography>
                  )}
                </Paper>
              )}
              <Typography variant="body2">Tick all that apply to this change:</Typography>
              <Stack spacing={1.5}>
                <Stack spacing={0}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        id="ia-costing"
                        checked={impact.affectsCosting}
                        onChange={(e) => setImpact({ ...impact, affectsCosting: e.target.checked })}
                      />
                    }
                    label="Affects costing"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
                    This change will require a revised fee or additional costing.
                  </Typography>
                </Stack>
                <Stack spacing={0}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        id="ia-timeline"
                        checked={impact.affectsTimeline}
                        onChange={(e) => setImpact({ ...impact, affectsTimeline: e.target.checked })}
                      />
                    }
                    label="Affects timeline / delivery schedule"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
                    This change will extend or shift the project delivery dates.
                  </Typography>
                </Stack>
                <Stack spacing={0}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        id="ia-billable"
                        checked={impact.isBillable}
                        onChange={(e) => setImpact({ ...impact, isBillable: e.target.checked })}
                      />
                    }
                    label="Billable additional work"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
                    This change is outside the original scope and will be billed separately.
                  </Typography>
                </Stack>
              </Stack>
              <TextField
                id="ia-comment"
                label="Your comment to the client (optional)"
                helperText="Explain the impact in plain terms. The client will see this before approving."
                multiline
                rows={4}
                value={impact.architectComment}
                onChange={(e) => setImpact({ ...impact, architectComment: e.target.value })}
              />
              {sendImpact.error && (
                <Alert severity="error">Could not send — {sendImpact.error.message}</Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setImpact(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={sendImpact.isPending}
            onClick={() =>
              impact &&
              sendImpact.mutate({
                submissionId: impact.id,
                affectsCosting: impact.affectsCosting,
                affectsTimeline: impact.affectsTimeline,
                isBillable: impact.isBillable,
                architectComment: impact.architectComment || undefined,
              })
            }
          >
            {sendImpact.isPending ? "Sending…" : "Send to client"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Triage dialog ────────────────────────────────────────────────── */}
      <Dialog open={triage !== null} onClose={() => setTriage(null)} fullWidth maxWidth="sm">
        <DialogTitle>{triage ? `Triage — ${triage.subject}` : "Triage"}</DialogTitle>
        <DialogContent>
          {triage && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                id="tr-status"
                select
                label="Status"
                value={triage.status}
                onChange={(e) => setTriage({ ...triage, status: e.target.value as PortalSubmissionStatusT })}
              >
                {PortalSubmissionStatus.options.map((s) => (
                  <MenuItem key={s} value={s}>{PORTAL_SUBMISSION_STATUS_LABEL[s]}</MenuItem>
                ))}
              </TextField>
              <TextField
                id="tr-note"
                label="Response to client (optional)"
                multiline
                rows={3}
                value={triage.responseNote}
                onChange={(e) => setTriage({ ...triage, responseNote: e.target.value })}
              />
              {setStatusM.error && (
                <Alert severity="error">Could not save — {setStatusM.error.message}</Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setTriage(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={setStatusM.isPending}
            onClick={() =>
              triage &&
              setStatusM.mutate({
                id: triage.id,
                status: triage.status,
                responseNote: triage.responseNote || undefined,
              })
            }
          >
            {setStatusM.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Thread dialog ────────────────────────────────────────────────── */}
      <Dialog open={threadFor !== null} onClose={() => setThreadFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>{threadFor ? `Conversation — ${threadFor.subject}` : "Conversation"}</DialogTitle>
        <DialogContent>
          {threadFor && (
            <SubmissionThread
              messages={threadQ.data ?? []}
              loading={threadQ.isLoading}
              pending={reply.isPending}
              onReply={(body) => reply.mutate({ id: threadFor.id, body })}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setThreadFor(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
