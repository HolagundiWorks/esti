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
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
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
  Jurisdiction,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TAG,
  PROJECT_TRANSITIONS,
  ProjectType,
  type ProjectStatus,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCapabilities } from "../lib/capabilities.js";
import { derivePhaseStageStatus, PHASE_STAGE_TAG } from "../lib/currentPhase.js";
import { trpc } from "../lib/trpc.js";
import { CurrentPhaseSelect } from "./CurrentPhaseSelect.js";
import { ProjectEngagements } from "./ProjectEngagements.js";
import { StatusTag } from "./StatusTag.js";

const ACTIVITY_TAG: Record<
  string,
  "gray" | "blue" | "purple" | "teal" | "green"
> = {
  "project.created": "green",
  "note.created": "blue",
};

const tagSx = (c: string) => ({
  backgroundColor: `var(--cds-tag-background-${c})`,
  color: `var(--cds-tag-color-${c})`,
});

export function ProjectSettings({ projectId }: { projectId: string }) {
  const { canProjectDelete } = useCapabilities();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const projectQ = trpc.projectOffice.byId.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  );
  const settingsQ = trpc.settings.get.useQuery();
  const firmPmcEnabled = settingsQ.data?.pmcEnabled ?? false;
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
    onSuccess: () => utils.phases.listByProject.invalidate({ projectId }),
  });
  const [revBudgetDraft, setRevBudgetDraft] = useState<Record<string, string>>({});

  const [pmcEnabled, setPmcEnabled] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const p = projectQ.data;
    if (p) setPmcEnabled((p as { pmcEnabled?: boolean }).pmcEnabled ?? false);
  }, [projectQ.data]);

  const update = trpc.projectOffice.update.useMutation({
    onSuccess: () => {
      utils.projectOffice.byId.invalidate({ id: projectId });
      utils.projectOffice.list.invalidate();
      setMsg("Project updated");
    },
  });

  const [statusDraft, setStatusDraft] = useState<ProjectStatus | "">("");
  const updateStatus = trpc.projectOffice.updateStatus.useMutation({
    onSuccess: () => {
      utils.projectOffice.byId.invalidate({ id: projectId });
      utils.projectOffice.list.invalidate();
      utils.projectOffice.activationStatus.invalidate({ id: projectId });
      setStatusDraft("");
      setMsg("Project status updated");
    },
  });

  const [note, setNote] = useState("");
  const addLog = trpc.projectOffice.addLog.useMutation({
    onSuccess: () => {
      utils.projectOffice.logs.invalidate({ projectId });
      setNote("");
    },
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const remove = trpc.projectOffice.remove.useMutation({
    onSuccess: () => {
      utils.projectOffice.list.invalidate();
      navigate("/projects");
    },
  });
  function closeDelete() {
    setConfirmDelete(false);
    setAdminPwd("");
    remove.reset();
  }

  const p = projectQ.data;

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
                  <div>
                    <Button
                      variant="contained"
                      disabled={!statusDraft || updateStatus.isPending}
                      onClick={() => {
                        if (statusDraft) updateStatus.mutate({ id: projectId, status: statusDraft });
                      }}
                    >
                      Update status
                    </Button>
                  </div>
                </>
              );
            })()}
          </Stack>
        </Box>
      )}

      {firmPmcEnabled && (
      <Box sx={{ maxWidth: 640, p: 2, mt: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" component="h4">
            PMC
          </Typography>
          <FormControlLabel
            control={
              <Switch
                id="ps-pmc"
                checked={pmcEnabled}
                onChange={(e) => setPmcEnabled(e.target.checked)}
              />
            }
            label="PMC on this project"
          />
          <div>
            <Button
              variant="contained"
              disabled={update.isPending || !projectQ.data}
              onClick={() => {
                const p = projectQ.data;
                if (!p) return;
                update.mutate({
                  id: projectId,
                  title: p.title,
                  status: p.status as ProjectStatus,
                  projectType: p.projectType as (typeof ProjectType.options)[number],
                  workType: ((p as { workType?: string }).workType ?? "ARCHITECTURE") as "ARCHITECTURE" | "INTERIOR" | "LANDSCAPE" | "MISC",
                  jurisdiction: p.jurisdiction as (typeof Jurisdiction.options)[number],
                  dateStart: p.dateStart ?? null,
                  pmcEnabled,
                });
              }}
            >
              Save PMC setting
            </Button>
          </div>
        </Stack>
      </Box>
      )}

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
                        <Chip
                          size="small"
                          label={stageStatus}
                          sx={tagSx(PHASE_STAGE_TAG[stageStatus])}
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
                  <Chip
                    size="small"
                    label={item.eventType}
                    sx={tagSx(ACTIVITY_TAG[item.eventType] ?? "gray")}
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
            managers can restore it later.
          </Typography>
          <Button variant="contained" color="error" onClick={() => setConfirmDelete(true)}>
            Archive project
          </Button>
        </Box>
      )}

      <Dialog open={confirmDelete} onClose={closeDelete} fullWidth maxWidth="sm">
        <DialogTitle>Archive project?</DialogTitle>
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
