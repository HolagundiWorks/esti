import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  CONSULTANT_SUBMISSION_KIND_LABEL,
  CONSULTANT_SUBMISSION_STATUS_LABEL,
  CONSULTANT_SUBMISSION_STATUS_TAG,
  ConsultantOriginKind,
  formatINR,
  type ConsultantOriginKind as ConsultantOriginKindT,
  type ConsultantSubmissionKind as ConsultantSubmissionKindT,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { ExternalPortalShell } from "../components/portal/ExternalPortalShell.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusDot } from "../components/StatusTag.js";
import { SubmissionThread } from "../components/SubmissionThread.js";
import { trpc } from "../lib/trpc.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";

type SubmissionStatus = keyof typeof CONSULTANT_SUBMISSION_STATUS_LABEL;

export function CollaboratorPortal() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId?: string }>();
  const openId = projectId ?? null;
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    meta: { errorTitle: "Couldn't sign out" },
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const brandingQ = trpc.collab.branding.useQuery();
  const projectsQ = trpc.collab.myProjects.useQuery();
  const detailQ = trpc.collab.projectDetail.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const submissionsQ = trpc.collab.mySubmissions.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const activityQ = trpc.collab.activityFeed.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const assignedQ = trpc.collab.assignedTasks.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const completeTask = trpc.collab.completeTask.useMutation({
    meta: { errorTitle: "Couldn't complete the task" },
    onSuccess: () => {
      utils.collab.assignedTasks.invalidate();
      utils.collab.activityFeed.invalidate();
    },
  });
  const d = detailQ.data;

  useEffect(() => {
    if (openId && detailQ.isError) {
      navigate("/", { replace: true });
    }
  }, [openId, detailQ.isError, navigate]);

  // ── write state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState<{ kind: ConsultantOriginKindT; subject: string; body: string } | null>(null);
  const submit = trpc.collab.submit.useMutation({
    meta: { errorTitle: "Couldn't send the submission" },
    onSuccess: () => {
      utils.collab.mySubmissions.invalidate();
      utils.collab.activityFeed.invalidate();
      setForm(null);
    },
  });

  // ── conversation thread ────────────────────────────────────────────────────
  const [threadFor, setThreadFor] = useState<{ id: string; subject: string } | null>(null);
  const threadQ = trpc.collab.submissionThread.useQuery(
    { submissionId: threadFor?.id ?? "" },
    { enabled: !!threadFor },
  );
  const reply = trpc.collab.replySubmission.useMutation({
    meta: { errorTitle: "Couldn't send the reply" },
    onSuccess: () => utils.collab.submissionThread.invalidate(),
  });

  const stageColumns: GridColDef[] = [
    { field: "label", headerName: "Stage", flex: 1 },
    { field: "billingPct", headerName: "Billing %", width: 120, valueGetter: (_v, row) => `${row.billingPct}%` },
    { field: "status", headerName: "Status", width: 160 },
  ];

  const drawingColumns: GridColDef[] = [
    { field: "ref", headerName: "Ref", width: 160 },
    { field: "title", headerName: "Title", flex: 1 },
  ];

  const taskColumns: GridColDef[] = [
    {
      field: "subject",
      headerName: "Task",
      flex: 1,
      renderCell: ({ row }) => (
        <div>
          {row.subject}
          {row.body && <div className="esti-label esti-label--secondary">{row.body}</div>}
        </div>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: ({ row }) => (
        <StatusDot
          color={row.status === "RESOLVED" ? "green" : "blue"}
          label={row.status === "RESOLVED" ? "Done" : "Open"}
        />
      ),
    },
    {
      field: "action",
      headerName: "Action",
      width: 140,
      sortable: false,
      renderCell: ({ row }) =>
        row.status !== "RESOLVED" ? (
          <RowActionsMenu
            actions={[
              {
                label: "Mark done",
                disabled: completeTask.isPending,
                onClick: () => completeTask.mutate({ submissionId: row.id }),
              },
            ]}
          />
        ) : null,
    },
  ];

  const submissionColumns: GridColDef[] = [
    {
      field: "kind",
      headerName: "Type",
      width: 130,
      valueGetter: (_v, row) =>
        CONSULTANT_SUBMISSION_KIND_LABEL[row.kind as ConsultantSubmissionKindT] ?? row.kind,
    },
    {
      field: "subject",
      headerName: "Subject",
      flex: 1,
      renderCell: ({ row }) => (
        <div>
          {row.subject}
          {row.body && <div className="esti-label esti-label--secondary">{row.body}</div>}
        </div>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 170,
      renderCell: ({ row }) => (
        <StatusDot
          color={CONSULTANT_SUBMISSION_STATUS_TAG[row.status as SubmissionStatus] ?? "blue"}
          label={CONSULTANT_SUBMISSION_STATUS_LABEL[row.status as SubmissionStatus] ?? row.status}
        />
      ),
    },
    {
      field: "responseNote",
      headerName: "Firm response",
      flex: 1,
      valueGetter: (_v, row) => row.responseNote ?? "—",
    },
    {
      field: "conversation",
      headerName: "Conversation",
      width: 130,
      sortable: false,
      renderCell: ({ row }) => (
        <RowActionsMenu
          actions={[
            {
              label: "Open",
              onClick: () => setThreadFor({ id: row.id, subject: row.subject }),
            },
          ]}
        />
      ),
    },
  ];

  const activityColumns: GridColDef[] = [
    {
      field: "createdAt",
      headerName: "When",
      width: 200,
      valueGetter: (_v, row) =>
        new Date(row.createdAt as unknown as string).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
    },
    {
      field: "summary",
      headerName: "Update",
      flex: 1,
      renderCell: ({ row }) => (
        <div>
          {row.summary}
          {row.actorName && <div className="esti-label esti-label--secondary">{row.actorName}</div>}
        </div>
      ),
    },
  ];

  return (
    <ExternalPortalShell
      companyName={brandingQ.data?.companyName}
      portalLabel={AORMS_PORTALS.consultant.label}
      onSignOut={() => logout.mutate()}
      signingOut={logout.isPending}
    >
        {!openId && (
          <Stack spacing={2}>
            <Stack spacing={1}>
              <Typography variant="h4" component="h1">Your engagements</Typography>
              <Typography variant="body1">
                Projects you are engaged on — status, stages, issued drawings,
                your fee balance, and your deliverables, RFIs and notes.
              </Typography>
            </Stack>
            <Grid container spacing={2}>
              {(projectsQ.data ?? []).length === 0 && (
                <Grid size={12}>
                  <Typography variant="body1">No engagements yet.</Typography>
                </Grid>
              )}
              {(projectsQ.data ?? []).map((p) => {
                const balance = p.agreedFeePaise - p.paidPaise;
                return (
                  <Grid key={p.id} size={{ xs: 12, md: 6, lg: 3 }}>
                    <Card className="esti-fill">
                      <CardActionArea onClick={() => navigate(`/projects/${p.id}`)} sx={{ p: 2, height: 1 }}>
                        <Stack spacing={1}>
                          <Typography variant="body2">{p.ref}</Typography>
                          <Typography variant="h6" component="h3">{p.title}</Typography>
                          <Box>
                            <StatusDot color="cool-gray" label={p.status} />
                          </Box>
                          <Typography variant="body2">
                            Balance {formatINR(balance, { paise: false })}
                          </Typography>
                        </Stack>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Stack>
        )}

        {openId && d && (
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Box>
                <Button variant="text" size="small" onClick={() => navigate("/")}>
                  ← All engagements
                </Button>
              </Box>
              <Typography variant="h5" component="h2">{d.project.title}</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="body2" color="text.secondary">
                  {d.project.ref} · {d.project.projectType} · {d.project.jurisdiction} ·
                </Typography>
                <StatusDot color="cool-gray" label={d.project.status} />
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setForm({ kind: "DELIVERABLE", subject: "", body: "" })}
                >
                  Submit deliverable
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setForm({ kind: "RFI", subject: "", body: "" })}
                >
                  Raise RFI
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setForm({ kind: "NOTE", subject: "", body: "" })}
                >
                  Add note
                </Button>
              </Stack>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="h6" component="h3">Your engagement</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Scope</TableCell>
                      <TableCell>Agreed</TableCell>
                      <TableCell>Paid</TableCell>
                      <TableCell>Balance</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>{d.engagement.scope ?? "—"}</TableCell>
                      <TableCell>
                        {formatINR(d.engagement.agreedFeePaise, { paise: false })}
                      </TableCell>
                      <TableCell>
                        {formatINR(d.engagement.paidPaise, { paise: false })}
                      </TableCell>
                      <TableCell>
                        {formatINR(
                          d.engagement.agreedFeePaise - d.engagement.paidPaise,
                          { paise: false },
                        )}
                      </TableCell>
                      <TableCell>{d.engagement.status}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="h6" component="h3">Stages</Typography>
              <DataGrid
                rows={d.phases}
                columns={stageColumns}
                getRowId={(row) => row.code}
                density="compact"
                disableRowSelectionOnClick
                hideFooter
                autoHeight
              />
            </Stack>

            <Stack spacing={1}>
              <Typography variant="h6" component="h3">Issued drawings</Typography>
              <DataGrid
                rows={d.drawings}
                columns={drawingColumns}
                getRowId={(row) => row.ref}
                density="compact"
                disableRowSelectionOnClick
                hideFooter
                autoHeight
              />
            </Stack>

            <Stack spacing={1}>
              <Typography variant="h6" component="h3">Tasks assigned to me</Typography>
              <DataState
                loading={assignedQ.isLoading}
                isEmpty={(assignedQ.data ?? []).length === 0}
                columnCount={3}
                empty={{ title: "No assigned tasks", description: "Tasks the firm assigns to you appear here." }}
              >
                <DataGrid
                  rows={assignedQ.data ?? []}
                  columns={taskColumns}
                  getRowHeight={() => "auto"}
                  density="compact"
                  disableRowSelectionOnClick
                  hideFooter
                  autoHeight
                />
              </DataState>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="h6" component="h3">My deliverables, RFIs &amp; notes</Typography>
              <DataState
                loading={submissionsQ.isLoading}
                isEmpty={(submissionsQ.data ?? []).length === 0}
                columnCount={4}
                empty={{ title: "Nothing submitted yet", description: "Your deliverables, RFIs and notes appear here." }}
              >
                <DataGrid
                  rows={submissionsQ.data ?? []}
                  columns={submissionColumns}
                  getRowHeight={() => "auto"}
                  density="compact"
                  disableRowSelectionOnClick
                  hideFooter
                  autoHeight
                />
              </DataState>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="h6" component="h3">Activity</Typography>
              <DataState
                loading={activityQ.isLoading}
                isEmpty={(activityQ.data ?? []).length === 0}
                columnCount={2}
                empty={{ title: "No shared activity yet", description: "Updates the firm shares with you appear here." }}
              >
                <DataGrid
                  rows={activityQ.data ?? []}
                  columns={activityColumns}
                  getRowHeight={() => "auto"}
                  density="compact"
                  disableRowSelectionOnClick
                  hideFooter
                  autoHeight
                />
              </DataState>
            </Stack>
          </Stack>
        )}

        {/* ── submission dialog ─────────────────────────────────────────── */}
        <Dialog aria-labelledby="collaborator-portal-submission-title" open={form !== null} onClose={() => setForm(null)} fullWidth maxWidth="sm">
          <DialogTitle id="collaborator-portal-submission-title">
            {form ? `${CONSULTANT_SUBMISSION_KIND_LABEL[form.kind]} — ${d?.project.ref ?? ""}` : "Submit"}
          </DialogTitle>
          <DialogContent>
            {form && (
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  id="cs-kind"
                  label="Type"
                  select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value as ConsultantOriginKindT })}
                  fullWidth
                >
                  {ConsultantOriginKind.options.map((k) => (
                    <MenuItem key={k} value={k}>
                      {CONSULTANT_SUBMISSION_KIND_LABEL[k]}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  id="cs-subject"
                  label="Subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  fullWidth
                />
                <TextField
                  id="cs-body"
                  label="Details (optional)"
                  multiline
                  rows={4}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  fullWidth
                />
                {submit.error && (
                  <Alert severity="error">
                    <strong>Could not submit</strong> — {submit.error.message}
                  </Alert>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button variant="text" onClick={() => setForm(null)}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!form?.subject || submit.isPending}
              onClick={() =>
                form && openId && submit.mutate({
                  projectId: openId,
                  kind: form.kind,
                  subject: form.subject,
                  body: form.body || undefined,
                })
              }
            >
              {submit.isPending ? "Submitting…" : "Submit"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── conversation thread dialog ────────────────────────────────── */}
        <Dialog aria-labelledby="collaborator-portal-conversation-title" open={threadFor !== null} onClose={() => setThreadFor(null)} fullWidth maxWidth="sm">
          <DialogTitle id="collaborator-portal-conversation-title">
            {threadFor ? `Conversation — ${threadFor.subject}` : "Conversation"}
          </DialogTitle>
          <DialogContent>
            {threadFor && (
              <SubmissionThread
                messages={threadQ.data ?? []}
                loading={threadQ.isLoading}
                pending={reply.isPending}
                onReply={(body) => reply.mutate({ submissionId: threadFor.id, body })}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button variant="text" onClick={() => setThreadFor(null)}>Close</Button>
          </DialogActions>
        </Dialog>
    </ExternalPortalShell>
  );
}
