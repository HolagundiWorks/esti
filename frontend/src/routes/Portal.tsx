import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardActionArea,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  formatINR,
  PORTAL_SUBMISSION_KIND_LABEL,
  PORTAL_SUBMISSION_STATUS_LABEL,
  PORTAL_SUBMISSION_STATUS_TAG,
  REVISION_CATEGORY_LABEL,
  REVISION_CATEGORY_TAG,
  RevisionCategory,
  type PortalApprovalDecision,
  type PortalSubmissionKind,
  type PortalSubmissionStatus,
  type RevisionCategory as RevisionCategoryT,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { ExternalPortalShell } from "../components/portal/ExternalPortalShell.js";
import { PortalMinutes } from "../components/PortalMinutes.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusDot, StatusTag } from "../components/StatusTag.js";
import { SubmissionThread } from "../components/SubmissionThread.js";
import { trpc } from "../lib/trpc.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";

const INV_TAG: Record<string, "blue" | "green"> = {
  ISSUED: "blue",
  PAID: "green",
};
const AP_TAG: Record<
  string,
  "blue" | "green" | "magenta" | "red" | "cool-gray"
> = {
  SENT: "blue",
  APPROVED: "green",
  REVISIONS: "magenta",
  REJECTED: "red",
  SUPERSEDED: "cool-gray",
};
// Approvals the client can still respond to.
const RESPONDABLE = ["SENT", "REVISIONS"];

export function Portal() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId?: string }>();
  const openId = projectId ?? null;
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const brandingQ = trpc.portal.branding.useQuery();
  const projectsQ = trpc.portal.myProjects.useQuery();
  const detailQ = trpc.portal.projectDetail.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const submissionsQ = trpc.portal.mySubmissions.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const activityQ = trpc.portal.activityFeed.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const teamQ = trpc.portal.projectTeam.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const revisionStatsQ = trpc.portal.revisionStats.useQuery(
    { projectId: openId ?? "" },
    { enabled: !!openId },
  );
  const d = detailQ.data;
  const teamMembers = teamQ.data ?? [];
  const drawings = d?.drawings ?? [];

  useEffect(() => {
    if (openId && detailQ.isError) {
      navigate("/", { replace: true });
    }
  }, [openId, detailQ.isError, navigate]);

  // ── write state ──────────────────────────────────────────────────────────
  const [decision, setDecision] = useState<
    {
      approvalId: string;
      title: string;
      decision: PortalApprovalDecision;
      remarks: string;
      revisionCategory: RevisionCategoryT | "";
    } | null
  >(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [request, setRequest] = useState({
    subject: "",
    body: "",
    revisionCategory: "MINOR" as RevisionCategoryT,
    attentionToId: "",
    refDrawingId: "",
  });
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState({ subject: "", body: "", rating: "" });

  // Impact assessment response
  const [impactResponse, setImpactResponse] = useState<{
    submissionId: string;
    subject: string;
    affectsCosting: boolean;
    affectsTimeline: boolean;
    isBillable: boolean;
    architectComment: string | null | undefined;
    remarks: string;
  } | null>(null);

  const refresh = () => {
    utils.portal.projectDetail.invalidate();
    utils.portal.mySubmissions.invalidate();
    utils.portal.activityFeed.invalidate();
    utils.portal.revisionStats.invalidate();
  };
  const respond = trpc.portal.respondApproval.useMutation({
    onSuccess: () => { refresh(); setDecision(null); },
  });
  const acknowledge = trpc.portal.acknowledge.useMutation({ onSuccess: refresh });
  const changeRequest = trpc.portal.submitChangeRequest.useMutation({
    onSuccess: () => {
      refresh();
      setRequestOpen(false);
      setRequest({ subject: "", body: "", revisionCategory: "MINOR", attentionToId: "", refDrawingId: "" });
    },
  });
  const submitFeedback = trpc.portal.submitFeedback.useMutation({
    onSuccess: () => { refresh(); setFeedbackOpen(false); setFeedback({ subject: "", body: "", rating: "" }); },
  });
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meeting, setMeeting] = useState({ preferredDate: "", mode: "IN_PERSON" as "IN_PERSON" | "VIDEO_CALL" | "PHONE", agenda: "" });
  const requestMeeting = trpc.portal.requestMeeting.useMutation({
    onSuccess: () => { refresh(); setMeetingOpen(false); setMeeting({ preferredDate: "", mode: "IN_PERSON", agenda: "" }); },
  });
  const respondImpact = trpc.portal.respondToImpact.useMutation({
    onSuccess: () => { refresh(); setImpactResponse(null); },
  });

  // ── conversation thread ────────────────────────────────────────────────────
  const [threadFor, setThreadFor] = useState<{ id: string; subject: string } | null>(null);
  const threadQ = trpc.portal.submissionThread.useQuery(
    { submissionId: threadFor?.id ?? "" },
    { enabled: !!threadFor },
  );
  const reply = trpc.portal.replySubmission.useMutation({
    onSuccess: () => utils.portal.submissionThread.invalidate(),
  });

  // ── revision stats pie data ───────────────────────────────────────────────
  const revStats = revisionStatsQ.data;
  const changesByCat = (revStats?.submissions ?? []).map((s) => ({
    label: s.category === "MINOR" ? "Minor" : s.category === "MAJOR" ? "Major" : s.category === "CRITICAL" ? "Critical" : s.category ?? "Unclassified",
    value: s.count,
  }));
  const drawingsByRev = (revStats?.drawings ?? []).map((s) => ({
    label: s.revisionNote ?? "Original",
    value: s.count,
  }));

  // ── grid column definitions ───────────────────────────────────────────────
  const invoiceCols: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 1, minWidth: 120 },
    { field: "documentKind", headerName: "Document", flex: 1, minWidth: 120 },
    { field: "dateInvoice", headerName: "Date", flex: 1, minWidth: 110, valueGetter: (v) => v ?? "—" },
    {
      field: "grandTotalPaise",
      headerName: "Amount",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => formatINR(p.row.grandTotalPaise, { paise: false }),
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (p) => (
        <StatusDot color={INV_TAG[p.row.status] ?? "blue"} label={p.row.status} />
      ),
    },
    {
      field: "pdfUrl",
      headerName: "Invoice",
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (p) =>
        p.row.pdfUrl ? (
          <RowActionsMenu
            actions={[
              {
                label: "Download",
                onClick: () =>
                  window.open(p.row.pdfUrl!, "_blank", "noopener,noreferrer"),
              },
            ]}
          />
        ) : p.row.pdfStatus === "PENDING" || p.row.pdfStatus === "PROCESSING" ? (
          "Preparing…"
        ) : (
          "—"
        ),
    },
  ];

  const approvalCols: GridColDef[] = [
    { field: "title", headerName: "Item", flex: 2, minWidth: 180 },
    { field: "sentDate", headerName: "Sent", flex: 1, minWidth: 110, valueGetter: (v) => v ?? "—" },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (p) => (
        <StatusDot color={AP_TAG[p.row.status] ?? "blue"} label={p.row.status} />
      ),
    },
    {
      field: "respond",
      headerName: "Respond",
      flex: 2,
      minWidth: 340,
      sortable: false,
      filterable: false,
      renderCell: (p) =>
        RESPONDABLE.includes(p.row.status) ? (
          <RowActionsMenu
            actions={[
              {
                label: "Approve",
                onClick: () => setDecision({
                  approvalId: p.row.id,
                  title: p.row.title,
                  decision: "APPROVED",
                  remarks: "",
                  revisionCategory: "",
                }),
              },
              {
                label: "Request revisions",
                onClick: () => setDecision({
                  approvalId: p.row.id,
                  title: p.row.title,
                  decision: "REVISIONS",
                  remarks: "",
                  revisionCategory: "MINOR",
                }),
              },
              {
                label: "Reject",
                danger: true,
                onClick: () => setDecision({
                  approvalId: p.row.id,
                  title: p.row.title,
                  decision: "REJECTED",
                  remarks: "",
                  revisionCategory: "",
                }),
              },
            ]}
          />
        ) : "—",
    },
  ];

  const drawingCols: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 1, minWidth: 120 },
    { field: "title", headerName: "Title", flex: 2, minWidth: 180 },
    {
      field: "acknowledge",
      headerName: "Acknowledge",
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <RowActionsMenu
          actions={[
            {
              label: "Acknowledge receipt",
              disabled: acknowledge.isPending,
              onClick: () => acknowledge.mutate({
                projectId: openId!, objectType: "drawing", objectId: p.row.id,
                subject: `Drawing ${p.row.ref} — ${p.row.title}`,
              }),
            },
          ]}
        />
      ),
    },
  ];

  const transmittalCols: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 1, minWidth: 120 },
    { field: "purpose", headerName: "Purpose", flex: 2, minWidth: 160 },
    { field: "channel", headerName: "Channel", flex: 1, minWidth: 110 },
    { field: "dateIssued", headerName: "Issued", flex: 1, minWidth: 110, valueGetter: (v) => v ?? "—" },
  ];

  const submissionCols: GridColDef[] = [
    {
      field: "kind",
      headerName: "Type",
      flex: 1,
      minWidth: 130,
      renderCell: (p) => PORTAL_SUBMISSION_KIND_LABEL[p.row.kind as PortalSubmissionKind] ?? p.row.kind,
    },
    {
      field: "revisionCategory",
      headerName: "Revision",
      width: 120,
      renderCell: (p) =>
        p.row.revisionCategory ? (
          <StatusTag
            value={p.row.revisionCategory as RevisionCategoryT}
            map={REVISION_CATEGORY_TAG}
            label={REVISION_CATEGORY_LABEL[p.row.revisionCategory as RevisionCategoryT] ?? p.row.revisionCategory}
          />
        ) : "—",
    },
    { field: "subject", headerName: "Subject", flex: 2, minWidth: 160 },
    {
      field: "status",
      headerName: "Status",
      width: 160,
      renderCell: (p) => (
        <StatusTag
          value={p.row.status as PortalSubmissionStatus}
          map={PORTAL_SUBMISSION_STATUS_TAG}
          label={PORTAL_SUBMISSION_STATUS_LABEL[p.row.status as PortalSubmissionStatus] ?? p.row.status}
        />
      ),
    },
    {
      field: "responseNote",
      headerName: "Architect response",
      flex: 2,
      minWidth: 220,
      sortable: false,
      renderCell: (p) =>
        p.row.status === "IMPACT_SENT" ? (
          <Stack spacing={0.5} sx={{ py: 1, alignItems: "flex-start" }}>
            {p.row.affectsCosting && <StatusDot color="red" label="Affects costing" />}
            {p.row.affectsTimeline && <StatusDot color="magenta" label="Affects timeline" />}
            {p.row.isBillable && <StatusDot color="purple" label="Billable" />}
            {p.row.architectComment && (
              <span className="esti-label esti-label--helper">{p.row.architectComment}</span>
            )}
          </Stack>
        ) : (p.row.responseNote ?? "—"),
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 280,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <RowActionsMenu
          actions={[
            p.row.status === "IMPACT_SENT" && {
              label: "Review & respond",
              onClick: () => setImpactResponse({
                submissionId: p.row.id,
                subject: p.row.subject,
                affectsCosting: p.row.affectsCosting ?? false,
                affectsTimeline: p.row.affectsTimeline ?? false,
                isBillable: p.row.isBillable ?? false,
                architectComment: p.row.architectComment,
                remarks: "",
              }),
            },
            {
              label: "Conversation",
              onClick: () => setThreadFor({ id: p.row.id, subject: p.row.subject }),
            },
          ]}
        />
      ),
    },
  ];

  const activityCols: GridColDef[] = [
    {
      field: "createdAt",
      headerName: "When",
      flex: 1,
      minWidth: 170,
      renderCell: (p) =>
        new Date(p.row.createdAt as unknown as string).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    },
    {
      field: "summary",
      headerName: "Update",
      flex: 3,
      minWidth: 240,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ py: 1 }}>
          {p.row.summary}
          {p.row.actorName && <div className="esti-label esti-label--secondary">{p.row.actorName}</div>}
        </Box>
      ),
    },
  ];

  return (
    <ExternalPortalShell
      companyName={brandingQ.data?.companyName}
      portalLabel={AORMS_PORTALS.client.label}
      onSignOut={() => logout.mutate()}
      signingOut={logout.isPending}
    >
        {!openId && (
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="h4" component="h1">Your projects</Typography>
              <Typography variant="body1">
                Track status, invoices, approvals and issued drawings — and
                respond to approvals, raise change requests or leave feedback.
              </Typography>
            </Stack>
            {(projectsQ.data ?? []).length === 0 && (
              <Typography variant="body1">No projects yet.</Typography>
            )}
            <Grid container spacing={2}>
              {(projectsQ.data ?? []).map((p) => (
                <Grid key={p.id} size={{ xs: 12, md: 6, lg: 3 }}>
                  <Card className="esti-fill">
                    <CardActionArea onClick={() => navigate(`/projects/${p.id}`)} sx={{ p: 2, height: 1 }}>
                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">{p.ref}</Typography>
                        <Typography variant="h6" component="h3">{p.title}</Typography>
                        <Box>
                          <StatusDot color="cool-gray" label={p.status} />
                        </Box>
                      </Stack>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Stack>
        )}

        {openId && d && (
          <Stack spacing={4}>
            <Stack spacing={1.5}>
              <Box>
                <Button variant="text" size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate("/")}>
                  All projects
                </Button>
              </Box>
              <Typography variant="h4" component="h2">{d.project.title}</Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                <span className="esti-label">
                  {d.project.ref} · {d.project.projectType} · {d.project.jurisdiction}
                </span>
                <StatusDot color="cool-gray" label={d.project.status} />
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
                <Button size="small" variant="contained" onClick={() => setRequestOpen(true)}>Raise change request</Button>
                <Button size="small" variant="outlined" onClick={() => setFeedbackOpen(true)}>Leave feedback</Button>
                <Button size="small" variant="outlined" onClick={() => setMeetingOpen(true)}>Schedule a meeting</Button>
              </Stack>
              <Alert severity="info">
                <AlertTitle>Revision categories</AlertTitle>
                Classify every change request and revision response as Minor (small tweak), Major (scope or fee impact), or Critical (stop-work / safety). Your architect uses the same categories in the CRIF decision ledger.
              </Alert>
            </Stack>

            <Section title="Stages">
              <Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Stage</TableCell>
                      <TableCell>Billing %</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {d.phases.map((ph) => (
                      <TableRow key={ph.code}>
                        <TableCell>{ph.label}</TableCell>
                        <TableCell>{ph.billingPct}%</TableCell>
                        <TableCell>{ph.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Section>

            <Section title="Invoices">
              <DataGrid
                rows={d.invoices}
                getRowId={(r) => r.ref}
                columns={invoiceCols}
                disableRowSelectionOnClick
                autoHeight
              />
            </Section>

            <Section title="Approvals">
              <DataGrid
                rows={d.approvals}
                columns={approvalCols}
                disableRowSelectionOnClick
                autoHeight
              />
            </Section>

            <Section title="Issued drawings">
              <DataGrid
                rows={d.drawings}
                columns={drawingCols}
                disableRowSelectionOnClick
                autoHeight
              />
            </Section>

            {d.transmittals.length > 0 && (
              <Section title="Transmittals">
                <DataGrid
                  rows={d.transmittals}
                  getRowId={(r) => r.ref}
                  columns={transmittalCols}
                  disableRowSelectionOnClick
                  autoHeight
                />
              </Section>
            )}

            <Section title="My requests & feedback">
              <DataState
                loading={submissionsQ.isLoading}
                isEmpty={(submissionsQ.data ?? []).length === 0}
                columnCount={6}
                empty={{ title: "Nothing submitted yet", description: "Your acknowledgements, change requests and feedback appear here." }}
              >
                <DataGrid
                  rows={submissionsQ.data ?? []}
                  columns={submissionCols}
                  getRowHeight={() => "auto"}
                  disableRowSelectionOnClick
                  autoHeight
                  sx={{ "& .MuiDataGrid-cell": { py: 1 } }}
                />
              </DataState>
            </Section>

            {/* ── Meeting minutes + ESTI-drafted revision requests ─────────── */}
            <PortalMinutes projectId={openId} onSubmitted={refresh} />

            {/* ── Revision dashboard ───────────────────────────────────────── */}
            <Stack spacing={1.5}>
              <Typography variant="h6" component="h4">Revision dashboard</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, lg: 6 }}>
                  <Box className="esti-fill" sx={{ p: 2 }}>
                    <Stack spacing={1.5}>
                      <span className="esti-label">Change requests by category</span>
                      {revisionStatsQ.isLoading ? (
                        <span className="esti-label esti-label--secondary">Loading…</span>
                      ) : changesByCat.length === 0 ? (
                        <span className="esti-label esti-label--secondary">No change requests yet.</span>
                      ) : (
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Category</TableCell>
                              <TableCell>Count</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {changesByCat.map((c) => (
                              <TableRow key={c.label}>
                                <TableCell>{c.label}</TableCell>
                                <TableCell>{c.value}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </Stack>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, lg: 6 }}>
                  <Box className="esti-fill" sx={{ p: 2 }}>
                    <Stack spacing={1.5}>
                      <span className="esti-label">Drawing revisions by type</span>
                      {revisionStatsQ.isLoading ? (
                        <span className="esti-label esti-label--secondary">Loading…</span>
                      ) : drawingsByRev.length === 0 ? (
                        <span className="esti-label esti-label--secondary">No drawing revisions yet.</span>
                      ) : (
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Revision</TableCell>
                              <TableCell>Count</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {drawingsByRev.map((r) => (
                              <TableRow key={r.label}>
                                <TableCell>{r.label}</TableCell>
                                <TableCell>{r.value}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
            </Stack>

            <Section title="Activity">
              <DataState
                loading={activityQ.isLoading}
                isEmpty={(activityQ.data ?? []).length === 0}
                columnCount={2}
                empty={{ title: "No shared activity yet", description: "Updates the firm shares with you appear here." }}
              >
                <DataGrid
                  rows={activityQ.data ?? []}
                  columns={activityCols}
                  getRowHeight={() => "auto"}
                  disableRowSelectionOnClick
                  autoHeight
                  sx={{ "& .MuiDataGrid-cell": { py: 1 } }}
                />
              </DataState>
            </Section>
          </Stack>
        )}

        {/* ── approval decision dialog ──────────────────────────────────── */}
        <Dialog
          open={decision !== null}
          onClose={() => setDecision(null)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>{decision ? `Respond — ${decision.title}` : "Respond"}</DialogTitle>
          {decision && (
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField id="dec-kind" select label="Decision" value={decision.decision}
                  fullWidth
                  onChange={(e) => setDecision({
                    ...decision,
                    decision: e.target.value as PortalApprovalDecision,
                    revisionCategory: e.target.value === "REVISIONS" ? "MINOR" : "",
                  })}>
                  <MenuItem value="APPROVED">Approve</MenuItem>
                  <MenuItem value="REVISIONS">Request revisions</MenuItem>
                  <MenuItem value="REJECTED">Reject</MenuItem>
                </TextField>
                {decision.decision === "REVISIONS" && (
                  <TextField
                    id="dec-rev-cat"
                    select
                    label="Revision category"
                    helperText="Major and Critical revisions may affect scope, fees and schedule."
                    value={decision.revisionCategory}
                    fullWidth
                    onChange={(e) => setDecision({
                      ...decision,
                      revisionCategory: e.target.value as RevisionCategoryT,
                    })}
                  >
                    {RevisionCategory.options.map((c) => (
                      <MenuItem key={c} value={c}>{REVISION_CATEGORY_LABEL[c]}</MenuItem>
                    ))}
                  </TextField>
                )}
                <TextField id="dec-remarks" label="Remarks (optional)" multiline rows={3}
                  fullWidth
                  value={decision.remarks}
                  onChange={(e) => setDecision({ ...decision, remarks: e.target.value })} />
                {respond.error && (
                  <Alert severity="error">
                    <AlertTitle>Could not submit</AlertTitle>
                    {respond.error.message}
                  </Alert>
                )}
              </Stack>
            </DialogContent>
          )}
          <DialogActions>
            <Button variant="text" onClick={() => setDecision(null)}>Cancel</Button>
            <Button
              variant="contained"
              disabled={
                respond.isPending ||
                (decision?.decision === "REVISIONS" && !decision.revisionCategory)
              }
              onClick={() => decision && respond.mutate({
                approvalId: decision.approvalId,
                decision: decision.decision,
                remarks: decision.remarks || undefined,
                revisionCategory:
                  decision.decision === "REVISIONS"
                    ? (decision.revisionCategory as RevisionCategoryT)
                    : undefined,
              })}
            >
              {respond.isPending ? "Submitting…" : "Submit response"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── change request dialog ─────────────────────────────────────── */}
        <Dialog
          open={requestOpen}
          onClose={() => setRequestOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Raise a change request</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                id="cr-cat"
                select
                label="Revision category"
                helperText="How significant is this change for scope, fees or schedule?"
                value={request.revisionCategory}
                fullWidth
                onChange={(e) => setRequest((r) => ({
                  ...r,
                  revisionCategory: e.target.value as RevisionCategoryT,
                }))}
              >
                {RevisionCategory.options.map((c) => (
                  <MenuItem key={c} value={c}>{REVISION_CATEGORY_LABEL[c]}</MenuItem>
                ))}
              </TextField>
              {teamMembers.length > 0 && (
                <TextField
                  id="cr-attn"
                  select
                  label="Attention to (optional)"
                  helperText="Which team member should handle this?"
                  value={request.attentionToId}
                  fullWidth
                  onChange={(e) => setRequest((r) => ({ ...r, attentionToId: e.target.value }))}
                >
                  <MenuItem value="">— any team member —</MenuItem>
                  {teamMembers.map((m) => (
                    <MenuItem key={m.id} value={m.id}>{`${m.fullName} (${m.role})`}</MenuItem>
                  ))}
                </TextField>
              )}
              {drawings.length > 0 && (
                <TextField
                  id="cr-drawing"
                  select
                  label="Reference drawing (optional)"
                  helperText="Which drawing does this change relate to?"
                  value={request.refDrawingId}
                  fullWidth
                  onChange={(e) => setRequest((r) => ({ ...r, refDrawingId: e.target.value }))}
                >
                  <MenuItem value="">— no specific drawing —</MenuItem>
                  {drawings.map((dr) => (
                    <MenuItem key={dr.id} value={dr.id}>{`${dr.ref} — ${dr.title}`}</MenuItem>
                  ))}
                </TextField>
              )}
              <TextField id="cr-subject" label="Subject" value={request.subject}
                fullWidth
                onChange={(e) => setRequest((r) => ({ ...r, subject: e.target.value }))} />
              <TextField id="cr-body" label="What would you like changed?" multiline rows={4}
                fullWidth
                value={request.body}
                onChange={(e) => setRequest((r) => ({ ...r, body: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="text" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!request.subject || !request.body || changeRequest.isPending}
              onClick={() => openId && changeRequest.mutate({
                projectId: openId,
                subject: request.subject,
                body: request.body,
                revisionCategory: request.revisionCategory,
                attentionToId: request.attentionToId || undefined,
                refDrawingId: request.refDrawingId || undefined,
              })}
            >
              {changeRequest.isPending ? "Submitting…" : "Submit"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── feedback dialog ───────────────────────────────────────────── */}
        <Dialog
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Leave feedback</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField id="fb-subject" label="Subject" value={feedback.subject}
                fullWidth
                onChange={(e) => setFeedback((f) => ({ ...f, subject: e.target.value }))} />
              <TextField id="fb-rating" select label="Rating (optional)" value={feedback.rating}
                fullWidth
                onChange={(e) => setFeedback((f) => ({ ...f, rating: e.target.value }))}>
                <MenuItem value="">— no rating —</MenuItem>
                {[5, 4, 3, 2, 1].map((n) => (
                  <MenuItem key={n} value={String(n)}>{`${n} / 5`}</MenuItem>
                ))}
              </TextField>
              <TextField id="fb-body" label="Comments (optional)" multiline rows={4}
                fullWidth
                value={feedback.body}
                onChange={(e) => setFeedback((f) => ({ ...f, body: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="text" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!feedback.subject || submitFeedback.isPending}
              onClick={() => openId && submitFeedback.mutate({
                projectId: openId, subject: feedback.subject,
                body: feedback.body || undefined,
                rating: feedback.rating ? Number(feedback.rating) : undefined,
              })}
            >
              {submitFeedback.isPending ? "Submitting…" : "Submit"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── schedule a meeting dialog ─────────────────────────────────── */}
        <Dialog
          open={meetingOpen}
          onClose={() => setMeetingOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Schedule a meeting</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField id="mtg-mode" select label="Mode" value={meeting.mode}
                fullWidth
                onChange={(e) => setMeeting((m) => ({ ...m, mode: e.target.value as "IN_PERSON" | "VIDEO_CALL" | "PHONE" }))}>
                <MenuItem value="IN_PERSON">In person</MenuItem>
                <MenuItem value="VIDEO_CALL">Video call</MenuItem>
                <MenuItem value="PHONE">Phone call</MenuItem>
              </TextField>
              <TextField id="mtg-date" label="Preferred date (optional)" type="date"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={meeting.preferredDate}
                onChange={(e) => setMeeting((m) => ({ ...m, preferredDate: e.target.value }))} />
              <TextField id="mtg-agenda" label="Agenda / notes (optional)" multiline rows={3}
                fullWidth
                value={meeting.agenda}
                onChange={(e) => setMeeting((m) => ({ ...m, agenda: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="text" onClick={() => setMeetingOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              disabled={requestMeeting.isPending}
              onClick={() => openId && requestMeeting.mutate({
                projectId: openId,
                preferredDate: meeting.preferredDate || undefined,
                mode: meeting.mode,
                agenda: meeting.agenda || undefined,
              })}
            >
              {requestMeeting.isPending ? "Submitting…" : "Request meeting"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── impact assessment response dialog ─────────────────────────── */}
        <Dialog
          open={impactResponse !== null}
          onClose={() => setImpactResponse(null)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {impactResponse ? `Impact assessment — ${impactResponse.subject}` : "Impact assessment"}
          </DialogTitle>
          {impactResponse && (
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Typography variant="body1">
                  Your architect has assessed the impact of this change request:
                </Typography>
                <Stack spacing={0.5}>
                  <FormControlLabel
                    control={<Checkbox id="ia-costing" checked={impactResponse.affectsCosting} disabled />}
                    label="Affects costing"
                  />
                  <FormControlLabel
                    control={<Checkbox id="ia-timeline" checked={impactResponse.affectsTimeline} disabled />}
                    label="Affects timeline"
                  />
                  <FormControlLabel
                    control={<Checkbox id="ia-billable" checked={impactResponse.isBillable} disabled />}
                    label="Additional billable work"
                  />
                </Stack>
                {impactResponse.architectComment && (
                  <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                    <Stack spacing={1}>
                      <Typography variant="body2" color="text.secondary">
                        Architect's note
                      </Typography>
                      <Typography variant="body1">{impactResponse.architectComment}</Typography>
                    </Stack>
                  </Box>
                )}
                <TextField
                  id="ia-remarks"
                  label="Your remarks (optional)"
                  helperText="Your response will be shared with the architect."
                  multiline
                  rows={3}
                  fullWidth
                  value={impactResponse.remarks}
                  onChange={(e) => setImpactResponse({ ...impactResponse, remarks: e.target.value })}
                />
                {respondImpact.error && (
                  <Alert severity="error">
                    <AlertTitle>Could not submit</AlertTitle>
                    {respondImpact.error.message}
                  </Alert>
                )}
              </Stack>
            </DialogContent>
          )}
          <DialogActions>
            <Button
              variant="outlined"
              disabled={respondImpact.isPending}
              onClick={() => impactResponse && respondImpact.mutate({
                submissionId: impactResponse.submissionId,
                approved: false,
                remarks: impactResponse.remarks || undefined,
              })}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              disabled={respondImpact.isPending}
              onClick={() => impactResponse && respondImpact.mutate({
                submissionId: impactResponse.submissionId,
                approved: true,
                remarks: impactResponse.remarks || undefined,
              })}
            >
              {respondImpact.isPending ? "Submitting…" : "Approve"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── conversation thread dialog ────────────────────────────────── */}
        <Dialog
          open={threadFor !== null}
          onClose={() => setThreadFor(null)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>{threadFor ? `Conversation — ${threadFor.subject}` : "Conversation"}</DialogTitle>
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
            <Button variant="contained" onClick={() => setThreadFor(null)}>Close</Button>
          </DialogActions>
        </Dialog>
    </ExternalPortalShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="h6" component="h3">{title}</Typography>
      {children}
    </Stack>
  );
}
