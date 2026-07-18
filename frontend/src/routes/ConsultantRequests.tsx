import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
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
import { useScreenActions } from "@hcw/ui-kit";
import { Link } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusTag } from "../components/StatusTag.js";
import { SubmissionThread } from "../components/SubmissionThread.js";
import { trpc } from "../lib/trpc.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";

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
    meta: { errorTitle: "Couldn't update the request status" },
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
    meta: { errorTitle: "Couldn't send the reply" },
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
    meta: { errorTitle: "Couldn't assign the task" },
    onSuccess: () => {
      utils.consultantRequests.list.invalidate();
      utils.consultantRequests.openCount.invalidate();
      setAssignOpen(false);
      setAssign({ projectId: "", consultantId: "", subject: "", body: "" });
    },
  });

  const noEngagements = !!assign.projectId && (engagementsQ.data?.rows ?? []).length === 0;

  useScreenActions(
    [
      {
        id: "assign-task",
        zone: "center",
        tone: "primary",
        label: "Assign task",
        icon: <AddIcon />,
        onClick: () => setAssignOpen(true),
      },
    ],
    [],
  );

  const columns: GridColDef[] = [
    {
      field: "kind",
      headerName: "Type",
      flex: 1,
      minWidth: 130,
      renderCell: (p) => (
        <StatusTag
          value={p.row.kind as ConsultantSubmissionKindT}
          map={CONSULTANT_SUBMISSION_KIND_TAG}
          label={CONSULTANT_SUBMISSION_KIND_LABEL[p.row.kind as ConsultantSubmissionKindT] ?? p.row.kind}
        />
      ),
    },
    {
      field: "subject",
      headerName: "Subject",
      flex: 2,
      minWidth: 220,
      sortable: false,
      renderCell: (p) => (
        <Stack spacing={0.25} sx={{ py: 1 }}>
          <Typography variant="body2">{p.row.subject}</Typography>
          {p.row.body && (
            <Typography variant="caption" className="esti-label esti-label--secondary" color="text.secondary">
              {p.row.body}
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      field: "projectRef",
      headerName: "Project",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => <Link to={`/projects/${p.row.projectId}`}>{p.row.projectRef}</Link>,
    },
    {
      field: "consultant",
      headerName: "Consultant",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => row.consultantName ?? row.submittedBy ?? "—",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      minWidth: 130,
      renderCell: (p) => (
        <StatusTag
          value={p.row.status as SubmissionStatus}
          map={CONSULTANT_SUBMISSION_STATUS_TAG}
          label={CONSULTANT_SUBMISSION_STATUS_LABEL[p.row.status as SubmissionStatus] ?? p.row.status}
        />
      ),
    },
    {
      field: "action",
      headerName: "Action",
      sortable: false,
      filterable: false,
      minWidth: 170,
      flex: 1,
      renderCell: (p) => (
        <RowActionsMenu
          actions={[
            {
              label: "Triage",
              onClick: () =>
                setTriage({
                  id: p.row.id,
                  subject: p.row.subject,
                  status: p.row.status as SubmissionStatus,
                  responseNote: p.row.responseNote ?? "",
                }),
            },
            {
              label: "Reply",
              onClick: () => setThreadFor({ id: p.row.id, subject: p.row.subject }),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      {!embedded && (
        <PageHeader
          title="Consultant requests"
          description="Deliverables, RFIs and notes raised by engaged consultants — and tasks you assign to them."
        />
      )}

      <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          id="cnr-status"
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {ConsultantSubmissionStatus.options.map((s) => (
            <MenuItem key={s} value={s}>{CONSULTANT_SUBMISSION_STATUS_LABEL[s]}</MenuItem>
          ))}
        </TextField>
        <TextField
          id="cnr-kind"
          select
          size="small"
          label="Kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All kinds</MenuItem>
          {ConsultantSubmissionKind.options.map((k) => (
            <MenuItem key={k} value={k}>{CONSULTANT_SUBMISSION_KIND_LABEL[k]}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {listQ.error && (
        <Alert severity="error">
          Could not load consultant requests — {listQ.error.message}
        </Alert>
      )}

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={6}
        empty={{ title: "No consultant requests", description: `Items raised from the ${AORMS_PORTALS.consultant.alias.toLowerCase()} appear here.` }}
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

      <Dialog aria-labelledby="consultant-requests-triage-title" open={triage !== null} onClose={() => setTriage(null)} fullWidth maxWidth="sm">
        <DialogTitle id="consultant-requests-triage-title">{triage ? `Triage — ${triage.subject}` : "Triage"}</DialogTitle>
        <DialogContent>
          {triage && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                id="cnr-tr-status"
                select
                label="Status"
                value={triage.status}
                onChange={(e) => setTriage({ ...triage, status: e.target.value as SubmissionStatus })}
              >
                {ConsultantSubmissionStatus.options.map((s) => (
                  <MenuItem key={s} value={s}>{CONSULTANT_SUBMISSION_STATUS_LABEL[s]}</MenuItem>
                ))}
              </TextField>
              <TextField
                id="cnr-tr-note"
                label="Response to consultant (optional)"
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

      <Dialog aria-labelledby="consultant-requests-conversation-title" open={threadFor !== null} onClose={() => setThreadFor(null)} fullWidth maxWidth="sm">
        <DialogTitle id="consultant-requests-conversation-title">{threadFor ? `Conversation — ${threadFor.subject}` : "Conversation"}</DialogTitle>
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

      <Dialog aria-labelledby="consultant-requests-assign-title" open={assignOpen} onClose={() => setAssignOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle id="consultant-requests-assign-title">Assign a task to a consultant</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="as-proj"
              select
              label="Project"
              value={assign.projectId}
              onChange={(e) => setAssign((a) => ({ ...a, projectId: e.target.value, consultantId: "" }))}
            >
              <MenuItem value="">— select a project —</MenuItem>
              {(projectsQ.data ?? []).map((p) => (
                <MenuItem key={p.id} value={p.id}>{`${p.ref} ${p.title}`}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="as-cons"
              select
              label="Consultant"
              disabled={!assign.projectId || (engagementsQ.data?.rows ?? []).length === 0}
              helperText={noEngagements ? "No consultants engaged on this project" : undefined}
              value={assign.consultantId}
              onChange={(e) => setAssign((a) => ({ ...a, consultantId: e.target.value }))}
            >
              <MenuItem value="">— select a consultant —</MenuItem>
              {(engagementsQ.data?.rows ?? []).map((en) => (
                <MenuItem key={en.consultantId} value={en.consultantId}>
                  {en.consultantName ?? en.consultantId}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="as-subject"
              label="Task"
              value={assign.subject}
              onChange={(e) => setAssign((a) => ({ ...a, subject: e.target.value }))}
            />
            <TextField
              id="as-body"
              label="Details (optional)"
              multiline
              rows={3}
              value={assign.body}
              onChange={(e) => setAssign((a) => ({ ...a, body: e.target.value }))}
            />
            {assignM.error && (
              <Alert severity="error">Could not assign — {assignM.error.message}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!assign.projectId || !assign.consultantId || !assign.subject || assignM.isPending}
            onClick={() =>
              assignM.mutate({
                projectId: assign.projectId,
                consultantId: assign.consultantId,
                subject: assign.subject,
                body: assign.body || undefined,
              })
            }
          >
            {assignM.isPending ? "Assigning…" : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
