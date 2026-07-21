import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TAG,
  PROJECT_TRANSITIONS,
  type ProjectStatus,
} from "@esti/contracts";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import { useScreenActions } from "@hcw/ui-kit";
import { useCapabilities } from "../lib/capabilities.js";
import { derivePhaseStageStatus, PHASE_STAGE_TAG } from "../lib/currentPhase.js";
import { pushToast } from "../lib/toast.js";
import { trpc } from "../lib/trpc.js";
import { CurrentPhaseSelect } from "./CurrentPhaseSelect.js";
import { ProjectEngagements } from "./ProjectEngagements.js";
import { ProjectFloorsPanel } from "./ProjectFloorsPanel.js";
import { ProjectStructuralDefaultsPanel } from "./ProjectStructuralDefaultsPanel.js";
import { StatusDot, StatusTag } from "./StatusTag.js";

const ACTIVITY_TAG: Record<
  string,
  "gray" | "blue" | "purple" | "teal" | "green"
> = {
  "project.created": "green",
  "note.created": "blue",
};

export function ProjectSettings({ projectId }: { projectId: string }) {
  const { canProjectDelete } = useCapabilities();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const projectQ = trpc.projectOffice.byId.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  );
  const logsQ = trpc.projectOffice.logs.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const activityQ = trpc.activity.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const phasesQ = trpc.phases.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const setRevisionBudget = trpc.phases.setRevisionBudget.useMutation({
    meta: { errorTitle: "Couldn't save the revision budget" },
    onSuccess: () => utils.phases.listByProject.invalidate({ projectId }),
  });
  const [revBudgetDraft, setRevBudgetDraft] = useState<Record<string, string>>({});

  const [msg, setMsg] = useState<string | null>(null);

  const [statusDraft, setStatusDraft] = useState<ProjectStatus | "">("");
  const updateStatus = trpc.projectOffice.updateStatus.useMutation({
    meta: { errorTitle: "Couldn't update the project status" },
    onSuccess: () => {
      utils.projectOffice.byId.invalidate({ id: projectId });
      utils.projectOffice.list.invalidate();
      utils.projectOffice.activationStatus.invalidate({ id: projectId });
      setStatusDraft("");
      setMsg("Project status updated");
      pushToast({ kind: "success", title: "Status updated" });
    },
  });

  const [note, setNote] = useState("");
  const addLog = trpc.projectOffice.addLog.useMutation({
    meta: { errorTitle: "Couldn't add the log entry" },
    onSuccess: () => {
      utils.projectOffice.logs.invalidate({ projectId });
      setNote("");
    },
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const remove = trpc.projectOffice.remove.useMutation({
    meta: { errorTitle: "Couldn't archive the project" },
    onSuccess: () => {
      utils.projectOffice.list.invalidate();
      pushToast({ kind: "success", title: "Project archived" });
      navigate("/projects");
    },
  });
  function closeDelete() {
    setConfirmDelete(false);
    setAdminPwd("");
    remove.reset();
  }

  const p = projectQ.data;

  useScreenActions(
    [
      ...(canProjectDelete
        ? [
            {
              id: "archive-project",
              zone: "left" as const,
              tone: "danger" as const,
              label: "Archive",
              icon: <DeleteOutlined />,
              onClick: () => setConfirmDelete(true),
            },
          ]
        : []),
      ...(statusDraft
        ? [
            {
              id: "update-status",
              zone: "right" as const,
              tone: "primary" as const,
              label: updateStatus.isPending ? "Updating…" : "Update status",
              icon: <SaveOutlined />,
              disabled: updateStatus.isPending,
              onClick: () => {
                if (statusDraft) updateStatus.mutate({ id: projectId, status: statusDraft });
              },
            },
          ]
        : []),
    ],
    [
      canProjectDelete,
      statusDraft,
      updateStatus.isPending,
      p,
      projectId,
    ],
  );

  return (
    <Box sx={{ mt: 2 }}>
      {msg && (
        <Alert severity="success" onClose={() => setMsg(null)} sx={{ mb: 2 }}>
          <AlertTitle>Saved</AlertTitle>
          {msg}
        </Alert>
      )}

      {p && (
        <Box sx={{ maxWidth: 640, p: 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle1" component="h4" className="esti-grow">
                Project status
              </Typography>
              <StatusTag
                value={p.status as ProjectStatus}
                map={PROJECT_STATUS_TAG}
                label={PROJECT_STATUS_LABEL[p.status as ProjectStatus]}
                size="md"
              />
            </Box>
            {(() => {
              const targets = PROJECT_TRANSITIONS[p.status as ProjectStatus] ?? [];
              if (targets.length === 0)
                return (
                  <Typography variant="body2">
                    This project is in a terminal stage — its status can no longer change.
                  </Typography>
                );
              return (
                <>
                  <Typography variant="body2">
                    Move this project to its next stage. Initial activation runs through the
                    activation gate under “Pipeline”, not here.
                  </Typography>
                  <TextField
                    id="ps-status"
                    select
                    label="Change status to"
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value as ProjectStatus | "")}
                    fullWidth
                  >
                    <MenuItem value="">— select —</MenuItem>
                    {targets.map((s) => (
                      <MenuItem key={s} value={s}>
                        {PROJECT_STATUS_LABEL[s]}
                      </MenuItem>
                    ))}
                  </TextField>
                  {updateStatus.error && (
                    <Alert severity="error" onClose={() => updateStatus.reset()}>
                      <AlertTitle>Status change failed</AlertTitle>
                      {updateStatus.error.message}
                    </Alert>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Use the Action Dock (bottom) to commit the status change.
                  </Typography>
                </>
              );
            })()}
          </Stack>
        </Box>
      )}

      <ProjectFloorsPanel projectId={projectId} />
      <ProjectStructuralDefaultsPanel projectId={projectId} />

      <Box sx={{ maxWidth: 760, p: 2, mt: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" component="h4">
            Project stages
          </Typography>
          <Typography variant="body2">
            Pick the stage currently in progress. Earlier stages are complete; later stages are
            pending.
          </Typography>
          <CurrentPhaseSelect
            id="ps-current-stage"
            projectId={projectId}
            phases={phasesQ.data ?? []}
            currentPhaseId={projectQ.data?.currentPhaseId}
          />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Stage</TableCell>
                  <TableCell>Fee allocation %</TableCell>
                  <TableCell>Rev. budget</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(phasesQ.data ?? []).map((ph, idx) => {
                  const currentId = projectQ.data?.currentPhaseId;
                  const currentIdx = (phasesQ.data ?? []).findIndex((p) => p.id === currentId);
                  const stageStatus = derivePhaseStageStatus(idx, currentIdx);
                  return (
                    <TableRow key={ph.id}>
                      <TableCell>{ph.label}</TableCell>
                      <TableCell>{ph.billingPct}%</TableCell>
                      <TableCell>
                        <TextField
                          id={`rev-budget-${ph.id}`}
                          hiddenLabel
                          type="number"
                          size="small"
                          placeholder="—"
                          slotProps={{
                            htmlInput: { "aria-label": "Revision budget" },
                          }}
                          value={revBudgetDraft[ph.id] ?? (ph.revisionBudget != null ? String(ph.revisionBudget) : "")}
                          onChange={(e) =>
                            setRevBudgetDraft((prev) => ({ ...prev, [ph.id]: e.target.value }))
                          }
                          onBlur={() => {
                            const raw = revBudgetDraft[ph.id];
                            if (raw === undefined) return;
                            const val = raw.trim() === "" ? null : parseInt(raw, 10);
                            if (val !== null && (isNaN(val) || val < 0 || val > 99)) return;
                            setRevisionBudget.mutate({ phaseId: ph.id, projectId, revisionBudget: val });
                          }}
                          sx={{ width: 72 }}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusDot
                          color={PHASE_STAGE_TAG[stageStatus]}
                          label={stageStatus}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Box>

      <Box sx={{ maxWidth: 760, mt: 2 }}>
        <ProjectEngagements projectId={projectId} />
      </Box>

      <Box sx={{ maxWidth: 640, p: 2, mt: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" component="h4">
            Internal log (audit)
          </Typography>
          <Typography variant="body2">
            Office-internal notes for audit — not visible to clients.
          </Typography>
          <TextField
            id="ps-note"
            label="Add a note"
            multiline
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
          />
          <div>
            <Button
              variant="outlined"
              disabled={!note || addLog.isPending}
              onClick={() => addLog.mutate({ projectId, note })}
            >
              Add note
            </Button>
          </div>
          <div>
            {(logsQ.data ?? []).map((l) => (
              <Box key={l.id} sx={{ py: 0.5, pl: 1.5, mt: 1 }}>
                <Box sx={{ whiteSpace: "pre-wrap" }}>{l.note}</Box>
                <Typography variant="body2" color="text.secondary">
                  {l.authorName ?? "—"} ·{" "}
                  {new Date(l.createdAt as unknown as string).toLocaleString()}
                </Typography>
              </Box>
            ))}
          </div>
        </Stack>
      </Box>

      <Box sx={{ maxWidth: 640, p: 2, mt: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" component="h4">
            Activity feed
          </Typography>
          <Typography variant="body2">
            Project timeline entries for change control, internal notes, and
            future revision intelligence.
          </Typography>
          <div>
            {(activityQ.data ?? []).map((item) => (
              <Box key={item.id} sx={{ py: 0.5, pl: 1.5, mt: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <StatusDot
                    color={ACTIVITY_TAG[item.eventType] ?? "gray"}
                    label={item.eventType}
                  />
                  <span>{item.summary}</span>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {item.actorName ?? "—"} ·{" "}
                  {new Date(
                    item.createdAt as unknown as string,
                  ).toLocaleString()}
                </Typography>
              </Box>
            ))}
          </div>
        </Stack>
      </Box>

      {canProjectDelete && (
        <Box sx={{ maxWidth: 640, p: 2, mt: 2 }}>
          <Typography variant="subtitle1" component="h4">
            Danger zone
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, mb: 1.5 }}>
            Archive this project from active work while retaining its phases,
            fees, invoices, drawings, estimates, and audit history. Authorized
            managers can restore it later. Use the Action Dock (left) to start
            archive.
          </Typography>
        </Box>
      )}

      <Dialog aria-labelledby="project-settings-archive-title" open={confirmDelete} onClose={closeDelete} fullWidth maxWidth="sm">
        <DialogTitle id="project-settings-archive-title">Archive project?</DialogTitle>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!remove.isPending && adminPwd.length > 0) {
                remove.mutate({ id: projectId, password: adminPwd });
              }
            }}
          >
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2">
                This removes <strong>{p?.title}</strong> from active project lists
                while retaining every related record for audit and later
                restoration.
              </Typography>
              <TextField
                id="ps-admin-pwd"
                label="Enter your admin password to confirm"
                type="password"
                autoComplete="new-password"
                value={adminPwd}
                onChange={(e) => setAdminPwd(e.target.value)}
                fullWidth
              />
              {remove.error && (
                <Alert severity="error">
                  <AlertTitle>Archive failed</AlertTitle>
                  {remove.error.message}
                </Alert>
              )}
            </Stack>
          </form>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={closeDelete}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={remove.isPending || adminPwd.length === 0}
            onClick={() => remove.mutate({ id: projectId, password: adminPwd })}
          >
            {remove.isPending ? "Archiving…" : "Archive project"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
