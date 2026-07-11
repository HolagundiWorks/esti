import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useState } from "react";
import {
  DECISION_STATE_LABEL,
  DECISION_STATE_TAG,
  DECISION_TRANSITIONS,
  DecisionState,
  REVISION_CATEGORY_LABEL,
  REVISION_CATEGORY_TAG,
  RevisionCategory,
  REVISION_SOURCE_LABEL,
  REVISION_SOURCE_TAG,
  RevisionSource,
} from "@esti/contracts";
import { trpc } from "../lib/trpc.js";
import { AiDraftPanel } from "./AiStudio.js";
import { StatusDot, StatusTag } from "./StatusTag.js";

function nextActionHint(
  state: DecisionState,
  deadline: string | null | undefined,
  category: string | null | undefined,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = !!deadline && deadline < today;
  switch (state) {
    case "DRAFT":
      return "Submit for review when ready.";
    case "OPEN":
      return overdue
        ? "Cooling-off: deadline passed — lock or decide now."
        : "Decide internally or move to client review.";
    case "CLIENT_REVIEW":
      return overdue
        ? "Response overdue — follow up with client."
        : "Awaiting client response.";
    case "ACCEPTED":
      return category === "MAJOR" || category === "CRITICAL"
        ? "Major/critical — acknowledged. Lock to finalise."
        : "Lock to finalise.";
    case "REJECTED":
      return "Lock to finalise the rejection.";
    case "LOCKED":
      return "Owner override required to reopen.";
  }
}

function daysAgo(dateStr: string | Date): number {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function isCoolingOff(d: {
  state?: string | null;
  reviewDeadline?: string | null;
}): boolean {
  const state = (d.state ?? "OPEN") as DecisionState;
  const today = new Date().toISOString().slice(0, 10);
  return (
    (state === "OPEN" || state === "CLIENT_REVIEW") &&
    !!d.reviewDeadline &&
    d.reviewDeadline < today
  );
}

export function ProjectOverview({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const revisionsQ = trpc.drawings.recentRevisions.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const notesQ = trpc.criticalNotes.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const decisionsQ = trpc.decisions.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const activityQ = trpc.activity.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const [noteOpen, setNoteOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [transitionId, setTransitionId] = useState<string | null>(null);
  const [toState, setToState] = useState<DecisionState>("OPEN");
  const [ackChecked, setAckChecked] = useState(false);

  const [note, setNote] = useState({
    title: "",
    category: "Change control",
    priority: "MEDIUM",
    status: "OPEN",
    owner: "",
    dueDate: "",
    body: "",
  });
  const [decision, setDecision] = useState({
    title: "",
    rationale: "",
    state: "DRAFT" as DecisionState,
    revisionCategory: "" as RevisionCategory | "",
    revisionSource: "" as RevisionSource | "",
    programVersionId: "",
    impact: "LOW",
    ownerName: "",
    reviewDeadline: "",
    linkedObjectType: "",
    linkedObjectId: "",
  });

  const noteCreate = trpc.criticalNotes.create.useMutation({
    onSuccess: async () => {
      setNoteOpen(false);
      setNote({
        title: "",
        category: "Change control",
        priority: "MEDIUM",
        status: "OPEN",
        owner: "",
        dueDate: "",
        body: "",
      });
      await utils.criticalNotes.listByProject.invalidate({ projectId });
      await utils.activity.listByProject.invalidate({ projectId });
    },
  });
  const decisionCreate = trpc.decisions.create.useMutation({
    onSuccess: async () => {
      setDecisionOpen(false);
      setDecision({
        title: "",
        rationale: "",
        state: "DRAFT",
        revisionCategory: "",
        revisionSource: "",
        programVersionId: "",
        impact: "LOW",
        ownerName: "",
        reviewDeadline: "",
        linkedObjectType: "",
        linkedObjectId: "",
      });
      await utils.decisions.listByProject.invalidate({ projectId });
      await utils.activity.listByProject.invalidate({ projectId });
    },
  });
  const decisionTransition = trpc.decisions.transition.useMutation({
    onSuccess: async () => {
      setTransitionId(null);
      await utils.decisions.listByProject.invalidate({ projectId });
      await utils.activity.listByProject.invalidate({ projectId });
    },
  });
  // Frozen program versions a revision can be measured against (Project OS 31.2).
  const programVersionsQ = trpc.program.listVersions.useQuery({ projectId });
  const programVersions = programVersionsQ.data ?? [];
  const programVersionNo = new Map(programVersions.map((pv) => [pv.id, pv.version]));

  const revisions = revisionsQ.data ?? [];
  const notes = notesQ.data?.rows ?? [];
  const allDecisions = decisionsQ.data?.rows ?? [];
  const transitionDecision = allDecisions.find((d) => d.id === transitionId);
  const allowedNextStates = transitionDecision
    ? DECISION_TRANSITIONS[(transitionDecision.state ?? "OPEN") as DecisionState] ?? []
    : [];

  const revisionColumns: GridColDef[] = [
    { field: "title", headerName: "Drawing", flex: 2, minWidth: 160 },
    {
      field: "revNo",
      headerName: "Rev",
      width: 110,
      renderCell: (p) => (
        <StatusDot color="gray" label={`Rev ${p.row.revNo}`} />
      ),
    },
    {
      field: "createdAt",
      headerName: "Date",
      width: 130,
      renderCell: (p) =>
        new Date(p.row.createdAt as unknown as string).toLocaleDateString("en-IN"),
    },
    {
      field: "revisionNote",
      headerName: "Note",
      flex: 3,
      minWidth: 160,
      valueGetter: (v) => v ?? "—",
    },
  ];

  const noteColumns: GridColDef[] = [
    { field: "title", headerName: "Note", flex: 2, minWidth: 140 },
    { field: "category", headerName: "Category", flex: 1, minWidth: 110 },
    {
      field: "owner",
      headerName: "Owner",
      flex: 1,
      minWidth: 100,
      valueGetter: (v) => v ?? "—",
    },
    {
      field: "dueDate",
      headerName: "Due",
      flex: 1,
      minWidth: 100,
      valueGetter: (v) => v ?? "—",
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (p) => (
        <StatusDot
          color={
            p.row.status === "RESOLVED"
              ? "green"
              : p.row.status === "BLOCKED"
                ? "red"
                : "blue"
          }
          label={p.row.status}
        />
      ),
    },
  ];

  const decisionColumns: GridColDef[] = [
    {
      field: "title",
      headerName: "Decision",
      flex: 2,
      minWidth: 160,
      renderCell: (p) => (
        <Stack spacing={0.5} sx={{ py: 0.5, alignItems: "flex-start" }}>
          <span>{p.row.title}</span>
          {p.row.programVersionId && (
            <StatusDot
              color="cool-gray"
              label={`Program v${programVersionNo.get(p.row.programVersionId) ?? "?"}`}
            />
          )}
        </Stack>
      ),
    },
    {
      field: "state",
      headerName: "State",
      width: 150,
      renderCell: (p) => {
        const state = (p.row.state ?? "OPEN") as DecisionState;
        return (
          <Stack spacing={0.5} sx={{ py: 0.5, alignItems: "flex-start" }}>
            <StatusTag
              value={state}
              map={DECISION_STATE_TAG}
              label={DECISION_STATE_LABEL[state]}
            />
            {isCoolingOff(p.row) && (
              <StatusDot color="red" label="Cooling off" />
            )}
          </Stack>
        );
      },
    },
    {
      field: "revisionCategory",
      headerName: "Category",
      width: 120,
      renderCell: (p) => {
        const cat = p.row.revisionCategory as RevisionCategory | null;
        return cat ? (
          <StatusTag
            value={cat}
            map={REVISION_CATEGORY_TAG}
            label={REVISION_CATEGORY_LABEL[cat]}
          />
        ) : (
          "—"
        );
      },
    },
    {
      field: "revisionSource",
      headerName: "Source",
      width: 140,
      renderCell: (p) => {
        const src = p.row.revisionSource as RevisionSource | null;
        return src ? (
          <StatusTag
            value={src}
            map={REVISION_SOURCE_TAG}
            label={REVISION_SOURCE_LABEL[src]}
          />
        ) : (
          "—"
        );
      },
    },
    {
      field: "daysOpen",
      headerName: "Days open",
      width: 100,
      valueGetter: (_v, row) => daysAgo(row.createdAt as unknown as string),
      renderCell: (p) => `${p.value}d`,
    },
    {
      field: "nextAction",
      headerName: "Next action",
      flex: 2,
      minWidth: 180,
      sortable: false,
      renderCell: (p) => {
        const state = (p.row.state ?? "OPEN") as DecisionState;
        const cat = p.row.revisionCategory as RevisionCategory | null;
        return (
          <span className="esti-label">
            {nextActionHint(state, p.row.reviewDeadline, cat)}
          </span>
        );
      },
    },
    {
      field: "actions",
      headerName: "",
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (p) => {
        const state = (p.row.state ?? "OPEN") as DecisionState;
        const canTransition = (DECISION_TRANSITIONS[state] ?? []).length > 0;
        if (!canTransition) return null;
        return (
          <Button
            variant="text"
            color={isCoolingOff(p.row) ? "error" : "primary"}
            size="small"
            onClick={() => {
              setTransitionId(p.row.id);
              setAckChecked(false);
              setToState((DECISION_TRANSITIONS[state] ?? [])[0] ?? "OPEN");
            }}
          >
            Transition
          </Button>
        );
      },
    },
  ];

  const activityColumns: GridColDef[] = [
    {
      field: "createdAt",
      headerName: "When",
      flex: 1.2,
      minWidth: 160,
      renderCell: (p) =>
        new Date(p.row.createdAt as unknown as string).toLocaleString("en-IN"),
    },
    { field: "eventType", headerName: "What", flex: 1, minWidth: 130 },
    { field: "summary", headerName: "Summary", flex: 2, minWidth: 200 },
    {
      field: "actorName",
      headerName: "Actor",
      flex: 1,
      minWidth: 120,
      valueGetter: (v) => v ?? "System",
    },
  ];

  const transitionCat = transitionDecision?.revisionCategory as RevisionCategory | null;
  const isCriticalAccept =
    toState === "ACCEPTED" &&
    (transitionCat === "MAJOR" || transitionCat === "CRITICAL");
  const needsAck = isCriticalAccept && !ackChecked;

  return (
    <Stack spacing={3}>
      {revisions.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="h6" component="h3">
            Drawing revision feed
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All superseded drawing versions for this project
          </Typography>
          <DataGrid
            rows={revisions.slice(0, 10)}
            columns={revisionColumns}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </Stack>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" component="h3">
              Critical notes
            </Typography>
            <Button variant="contained" size="small" onClick={() => setNoteOpen(true)}>
              Add note
            </Button>
          </Box>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Categories, owners, due dates, and status
            </Typography>
            <DataGrid
              rows={notes.slice(0, 5)}
              columns={noteColumns}
              density="compact"
              disableRowSelectionOnClick
              hideFooter
              autoHeight
              localeText={{ noRowsLabel: "No critical notes yet." }}
            />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" component="h3">
              Decision ledger
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => setDecisionOpen(true)}
            >
              Add decision
            </Button>
          </Box>
          <Box sx={{ my: 1 }}>
            <AiDraftPanel projectId={projectId} defaultKind="CRIF_SUMMARY" compact />
          </Box>
          {allDecisions.length > 0 && (() => {
            const scopeChangeCount = allDecisions.filter(
              (d) => d.revisionSource === "SCOPE_CHANGE",
            ).length;
            const scopeDriftPct = Math.round(
              (scopeChangeCount / allDecisions.length) * 100,
            );
            return (
              <p className="esti-label">
                Scope drift: <strong>{scopeDriftPct}%</strong> of decisions are
                scope changes ({scopeChangeCount} of {allDecisions.length})
              </p>
            );
          })()}
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              CRIF state machine: rationale, category, owner, and transitions
            </Typography>
            <DataGrid
              rows={allDecisions.slice(0, 8)}
              columns={decisionColumns}
              density="compact"
              disableRowSelectionOnClick
              hideFooter
              autoHeight
              getRowHeight={() => "auto"}
              localeText={{ noRowsLabel: "No decisions recorded yet." }}
            />
          </Stack>
        </Grid>
      </Grid>

      <Stack spacing={1}>
        <Typography variant="h6" component="h3">
          Recent activity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Latest timeline entries for this project
        </Typography>
        <DataGrid
          rows={(activityQ.data ?? []).slice(0, 8)}
          columns={activityColumns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </Stack>

      {/* Add critical note dialog */}
      <Dialog
        aria-labelledby="project-overview-note-title"
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="project-overview-note-title">Add critical note</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cn-title"
              label="Title"
              value={note.title}
              onChange={(e) => setNote((f) => ({ ...f, title: e.target.value }))}
              fullWidth
            />
            <TextField
              id="cn-category"
              label="Category"
              value={note.category}
              onChange={(e) =>
                setNote((f) => ({ ...f, category: e.target.value }))
              }
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                id="cn-priority"
                select
                label="Priority"
                value={note.priority}
                onChange={(e) =>
                  setNote((f) => ({ ...f, priority: e.target.value }))
                }
                fullWidth
              >
                {["LOW", "MEDIUM", "HIGH"].map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                id="cn-status"
                select
                label="Status"
                value={note.status}
                onChange={(e) =>
                  setNote((f) => ({ ...f, status: e.target.value }))
                }
                fullWidth
              >
                {["OPEN", "BLOCKED", "RESOLVED"].map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              id="cn-owner"
              label="Owner (optional)"
              value={note.owner}
              onChange={(e) => setNote((f) => ({ ...f, owner: e.target.value }))}
              fullWidth
            />
            <TextField
              id="cn-due"
              label="Due date (optional)"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={note.dueDate}
              onChange={(e) =>
                setNote((f) => ({ ...f, dueDate: e.target.value }))
              }
              fullWidth
            />
            <TextField
              id="cn-body"
              label="Details (optional)"
              multiline
              rows={3}
              value={note.body}
              onChange={(e) => setNote((f) => ({ ...f, body: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setNoteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!note.title || noteCreate.isPending}
            onClick={() =>
              noteCreate.mutate({
                projectId,
                title: note.title,
                category: note.category,
                priority: note.priority as "LOW" | "MEDIUM" | "HIGH",
                status: note.status as "OPEN" | "BLOCKED" | "RESOLVED",
                visibility: "STAFF",
                owner: note.owner || undefined,
                dueDate: note.dueDate || null,
                body: note.body || undefined,
              })
            }
          >
            {noteCreate.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add decision dialog */}
      <Dialog
        aria-labelledby="project-overview-decision-title"
        open={decisionOpen}
        onClose={() => setDecisionOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle id="project-overview-decision-title">Add decision</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="dc-title"
              label="Decision title"
              value={decision.title}
              onChange={(e) =>
                setDecision((f) => ({ ...f, title: e.target.value }))
              }
              fullWidth
            />
            <TextField
              id="dc-rationale"
              label="Rationale"
              multiline
              rows={3}
              value={decision.rationale}
              onChange={(e) =>
                setDecision((f) => ({ ...f, rationale: e.target.value }))
              }
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                id="dc-state"
                select
                label="State"
                value={decision.state}
                onChange={(e) =>
                  setDecision((f) => ({
                    ...f,
                    state: e.target.value as DecisionState,
                  }))
                }
                fullWidth
              >
                {DecisionState.options.map((s) => (
                  <MenuItem key={s} value={s}>
                    {DECISION_STATE_LABEL[s]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                id="dc-category"
                select
                label="Revision category"
                value={decision.revisionCategory}
                onChange={(e) =>
                  setDecision((f) => ({
                    ...f,
                    revisionCategory: e.target.value as RevisionCategory | "",
                  }))
                }
                fullWidth
              >
                <MenuItem value="">None</MenuItem>
                {RevisionCategory.options.map((c) => (
                  <MenuItem key={c} value={c}>
                    {REVISION_CATEGORY_LABEL[c]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                id="dc-source"
                select
                label="Revision source"
                value={decision.revisionSource}
                onChange={(e) =>
                  setDecision((f) => ({
                    ...f,
                    revisionSource: e.target.value as RevisionSource | "",
                  }))
                }
                fullWidth
              >
                <MenuItem value="">None</MenuItem>
                {RevisionSource.options.map((s) => (
                  <MenuItem key={s} value={s}>
                    {REVISION_SOURCE_LABEL[s]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                id="dc-impact"
                select
                label="Impact"
                value={decision.impact}
                onChange={(e) =>
                  setDecision((f) => ({ ...f, impact: e.target.value }))
                }
                fullWidth
              >
                {["LOW", "MEDIUM", "HIGH"].map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            {programVersions.length > 0 && (
              <TextField
                id="dc-program-version"
                select
                label="Against program version"
                helperText="The frozen program this revision is measured against"
                value={decision.programVersionId}
                onChange={(e) =>
                  setDecision((f) => ({ ...f, programVersionId: e.target.value }))
                }
                fullWidth
              >
                <MenuItem value="">None</MenuItem>
                {programVersions.map((pv) => (
                  <MenuItem key={pv.id} value={pv.id}>
                    {`Program v${pv.version}`}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <Stack direction="row" spacing={2}>
              <TextField
                id="dc-owner"
                label="Owner (optional)"
                value={decision.ownerName}
                onChange={(e) =>
                  setDecision((f) => ({ ...f, ownerName: e.target.value }))
                }
                fullWidth
              />
              <TextField
                id="dc-deadline"
                label="Review deadline (optional)"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={decision.reviewDeadline}
                onChange={(e) =>
                  setDecision((f) => ({ ...f, reviewDeadline: e.target.value }))
                }
                fullWidth
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                id="dc-linktype"
                label="Linked object type (optional)"
                value={decision.linkedObjectType}
                onChange={(e) =>
                  setDecision((f) => ({
                    ...f,
                    linkedObjectType: e.target.value,
                  }))
                }
                fullWidth
              />
              <TextField
                id="dc-linkid"
                label="Linked object ID (optional)"
                value={decision.linkedObjectId}
                onChange={(e) =>
                  setDecision((f) => ({ ...f, linkedObjectId: e.target.value }))
                }
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setDecisionOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={
              !decision.title || !decision.rationale || decisionCreate.isPending
            }
            onClick={() =>
              decisionCreate.mutate({
                projectId,
                title: decision.title,
                rationale: decision.rationale,
                state: decision.state,
                revisionCategory: decision.revisionCategory || undefined,
                revisionSource: decision.revisionSource || undefined,
                programVersionId: decision.programVersionId || undefined,
                impact: decision.impact as "LOW" | "MEDIUM" | "HIGH",
                ownerName: decision.ownerName || undefined,
                reviewDeadline: decision.reviewDeadline || undefined,
                linkedObjectType: decision.linkedObjectType || undefined,
                linkedObjectId: decision.linkedObjectId || undefined,
              })
            }
          >
            {decisionCreate.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CRIF state transition dialog */}
      <Dialog
        aria-labelledby="project-overview-transition-title"
        open={!!transitionId}
        onClose={() => {
          setTransitionId(null);
          setAckChecked(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="project-overview-transition-title">{`Transition: ${transitionDecision?.title ?? ""}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <div className="esti-inline-with-tag">
              <span>Current state:</span>
              <StatusTag
                value={(transitionDecision?.state ?? "OPEN") as DecisionState}
                map={DECISION_STATE_TAG}
                label={
                  DECISION_STATE_LABEL[
                    (transitionDecision?.state ?? "OPEN") as DecisionState
                  ]
                }
              />
            </div>
            <TextField
              id="tr-tostate"
              select
              label="Move to"
              value={toState}
              onChange={(e) => {
                setToState(e.target.value as DecisionState);
                setAckChecked(false);
              }}
              fullWidth
            >
              {allowedNextStates.map((s) => (
                <MenuItem key={s} value={s}>
                  {DECISION_STATE_LABEL[s]}
                </MenuItem>
              ))}
            </TextField>
            {isCriticalAccept && (
              <>
                <Alert severity="warning">
                  <strong>Major/Critical revision</strong> — This decision is
                  categorised as {transitionCat}. Accepting it may affect the
                  project timeline, cost, or scope.
                </Alert>
                <FormControlLabel
                  control={
                    <Checkbox
                      id="tr-ack"
                      checked={ackChecked}
                      onChange={(e) => setAckChecked(e.target.checked)}
                    />
                  }
                  label="I acknowledge this major/critical design revision has been reviewed and accepted."
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="text"
            onClick={() => {
              setTransitionId(null);
              setAckChecked(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={decisionTransition.isPending || needsAck}
            onClick={() => {
              if (!transitionId) return;
              decisionTransition.mutate({ id: transitionId, toState });
            }}
          >
            {decisionTransition.isPending ? "Transitioning…" : "Confirm transition"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
