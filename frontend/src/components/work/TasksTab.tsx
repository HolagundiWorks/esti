import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  PRIORITY_BAND_LABEL,
  TASK_CLASSIFICATION_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_WORK_TYPE_LABEL,
  TaskClassification,
  TaskPriority,
  TaskStatus,
  TaskWorkType,
  bandForScore,
} from "@esti/contracts";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ConfirmModal } from "../ConfirmModal.js";
import { ContextualComments } from "../ContextualComments.js";
import { DataState } from "../DataState.js";
import { StatusDot } from "../StatusTag.js";
import { PulseStandupModal } from "./PulseStandupModal.js";
import { trpc } from "../../lib/trpc.js";
import {
  PRIORITY_BAND_TAG,
  PRIORITY_TAG,
  WORK_CATEGORY_FILTER,
  WORK_CATEGORY_LABELS,
  WORK_CATEGORY_SLUGS,
  confidenceTag,
  type WorkCategorySlug,
} from "./workHelpers.js";

export type TasksTabHandle = { openCreate: () => void };

export const TasksTab = forwardRef<TasksTabHandle>(function TasksTab(_props, ref) {
  const [searchParams] = useSearchParams();
  const utils = trpc.useUtils();
  const [openOnly,        setOpenOnly]        = useState(false);
  const [myTasks,         setMyTasks]         = useState(false);
  const [filterStatus,    setFilterStatus]    = useState("");
  const [filterPriority,  setFilterPriority]  = useState("");
  const [filterCategory,  setFilterCategory]  = useState<WorkCategorySlug>("all");
  const targetTaskId = searchParams.get("taskId");
  const targetProjectId = searchParams.get("projectId") || undefined;
  const urlOpenOnly = searchParams.get("openOnly") === "1";

  const catFilter = WORK_CATEGORY_FILTER[filterCategory];

  const listQ     = trpc.tasks.list.useQuery({
    openOnly: (openOnly || urlOpenOnly) && !catFilter.status,
    myTasks,
    projectId: targetProjectId,
    status:   (catFilter.status as (typeof TaskStatus.options)[number] | undefined)
              ?? (filterStatus ? (filterStatus as (typeof TaskStatus.options)[number]) : undefined),
    priority: filterPriority ? (filterPriority as (typeof TaskPriority.options)[number]) : undefined,
    workType: catFilter.workType as (typeof TaskWorkType.options)[number] | undefined,
    classification: catFilter.classification as (typeof TaskClassification.options)[number] | undefined,
  });
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const invalidate = () => utils.tasks.list.invalidate();
  const update = trpc.tasks.update.useMutation({ onSuccess: invalidate });
  const remove = trpc.tasks.remove.useMutation({ onSuccess: invalidate });

  const [open,         setOpen]         = useState(false);
  const [confirmId,    setConfirmId]    = useState<string | null>(null);
  const [standupProjectId, setStandupProjectId] = useState(targetProjectId ?? "");
  const [standupOpen,      setStandupOpen]      = useState(false);
  const [commentsTask, setCommentsTask] = useState<{ id: string; projectId: string; title: string } | null>(null);
  const [reassign,     setReassign]     = useState<{ id: string; projectId: string; title: string } | null>(null);
  const [reassignTo,   setReassignTo]   = useState("");
  const reassignMembersQ = trpc.assignments.listByProject.useQuery(
    { projectId: reassign?.projectId ?? "" },
    { enabled: hrEnabled && !!reassign?.projectId },
  );
  const reassignMembers = reassignMembersQ.data ?? [];
  const [form, setForm] = useState({
    title: "", projectId: "", assigneeId: "", reviewerId: "",
    classification: "", workType: "", priority: "MEDIUM",
    dueDate: "", description: "", difficultyCoefficient: "3", estimatedHours: "",
  });
  const teamQ = trpc.assignments.listByProject.useQuery(
    { projectId: form.projectId },
    { enabled: hrEnabled && !!form.projectId },
  );
  const team = teamQ.data ?? [];
  const create = trpc.tasks.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm({ title: "", projectId: "", assigneeId: "", reviewerId: "", classification: "", workType: "", priority: "MEDIUM", dueDate: "", description: "", difficultyCoefficient: "3", estimatedHours: "" });
    },
  });
  const today = new Date().toISOString().slice(0, 10);
  const standupProject = projectsQ.data?.find((p) => p.id === standupProjectId);

  useEffect(() => {
    if (!targetTaskId || listQ.isLoading) return;
    window.requestAnimationFrame(() => {
      document
        .getElementById(`task-row-${targetTaskId}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [targetTaskId, listQ.isLoading, listQ.data]);

  useImperativeHandle(ref, () => ({
    openCreate: () => setOpen(true),
  }));

  return (
    <>
      <Stack spacing={2}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filterCategory}
          onChange={(_e, value) => setFilterCategory((value as WorkCategorySlug) ?? "all")}
          sx={{ alignSelf: "flex-start", flexWrap: "wrap" }}
        >
          {WORK_CATEGORY_SLUGS.map((slug) => (
            <ToggleButton key={slug} value={slug}>{WORK_CATEGORY_LABELS[slug]}</ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <FormControlLabel
            control={
              <Checkbox id="t-open" checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)} />
            }
            label="Open only"
          />
          <FormControlLabel
            control={
              <Checkbox id="t-mine" checked={myTasks}
                onChange={(e) => setMyTasks(e.target.checked)} />
            }
            label="My tasks"
          />
          <TextField id="t-status" select size="small" sx={{ minWidth: 160 }}
            disabled={!!catFilter.status}
            value={catFilter.status ? catFilter.status : filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            slotProps={{ htmlInput: { "aria-label": "Status" } }}>
            <MenuItem value="">All statuses</MenuItem>
            {TaskStatus.options.map((s) => (
              <MenuItem key={s} value={s}>{TASK_STATUS_LABEL[s] ?? s}</MenuItem>
            ))}
          </TextField>
          <TextField id="t-prio" select size="small" sx={{ minWidth: 160 }}
            value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
            slotProps={{ htmlInput: { "aria-label": "Priority" } }}>
            <MenuItem value="">All priorities</MenuItem>
            {TaskPriority.options.map((p) => (
              <MenuItem key={p} value={p}>{TASK_PRIORITY_LABEL[p] ?? p}</MenuItem>
            ))}
          </TextField>
          <TextField id="t-standup-proj" select size="small" sx={{ minWidth: 220 }}
            value={standupProjectId} onChange={(e) => setStandupProjectId(e.target.value)}
            slotProps={{ htmlInput: { "aria-label": "Standup project" } }}>
            <MenuItem value="">— pick a project for standup —</MenuItem>
            {(projectsQ.data ?? []).map((p) => (
              <MenuItem key={p.id} value={p.id}>{`${p.ref} ${p.title}`}</MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" size="small" disabled={!standupProjectId} onClick={() => setStandupOpen(true)}>
            Standup
          </Button>
        </Stack>

        <DataState
          loading={listQ.isLoading}
          isEmpty={(listQ.data ?? []).length === 0}
          columnCount={9}
          empty={{
            title: openOnly || myTasks ? "No matching tasks" : "No tasks yet",
            description: "Create a task to track work across the office and projects.",
          }}
        >
          <TableContainer>
            <Typography variant="h6" sx={{ p: 2, pb: 1 }}>Task list</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell>Assignee</TableCell>
                  <TableCell>Reviewer</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Due</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Comments</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(listQ.data ?? []).map((t) => {
                  const overdue = t.dueDate && t.dueDate < today && t.status !== "DONE";
                  const band = bandForScore(t.priorityScore);
                  return (
                    <TableRow
                      key={t.id}
                      id={`task-row-${t.id}`}
                      className={targetTaskId === t.id ? "esti-task-row--target" : undefined}
                    >
                      <TableCell>
                        <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
                          <span>{t.title}</span>
                          {t.interventionRequired && (
                            <StatusDot color="red" label="Intervention required" />
                          )}
                          {t.description && <div>{t.description}</div>}
                          {t.classification && (
                            <StatusDot
                              color="cool-gray"
                              label={TASK_CLASSIFICATION_LABEL[t.classification] ?? t.classification}
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {t.projectId
                          ? <Link to={`/projects/${t.projectId}`}>{t.projectRef}</Link>
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span className="esti-row" style={{ gap: "var(--cds-spacing-03)", alignItems: "center" }}>
                          {t.assignee ?? "—"}
                          {hrEnabled && t.projectId && (
                            <Button
                              variant="text"
                              size="small"
                              onClick={() => {
                                setReassign({ id: t.id, projectId: t.projectId ?? "", title: t.title });
                                setReassignTo(t.assigneeId ?? "");
                              }}
                            >
                              Reassign
                            </Button>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>{"—"}</TableCell>
                      <TableCell>
                        <span className="esti-row" style={{ gap: "var(--cds-spacing-02)", flexWrap: "wrap" }}>
                          <StatusDot
                            color={PRIORITY_TAG[t.priority] ?? "gray"}
                            label={TASK_PRIORITY_LABEL[t.priority] ?? t.priority}
                          />
                          <StatusDot
                            color={PRIORITY_BAND_TAG[band] ?? "gray"}
                            label={PRIORITY_BAND_LABEL[band] ?? band}
                          />
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusDot color={confidenceTag(t.confidenceScore)} label={`${t.confidenceScore}%`} />
                      </TableCell>
                      <TableCell>
                        {overdue
                          ? <StatusDot color="red" label={`Overdue · ${t.dueDate}`} />
                          : (t.dueDate ?? "—")}
                      </TableCell>
                      <TableCell>
                        <TextField id={`ts-${t.id}`} select size="small" sx={{ minWidth: 140 }}
                          value={t.status}
                          onChange={(e) => update.mutate({ id: t.id, status: e.target.value as (typeof TaskStatus.options)[number] })}
                          slotProps={{ htmlInput: { "aria-label": "Status" } }}>
                          {TaskStatus.options.map((s) => (
                            <MenuItem key={s} value={s}>{TASK_STATUS_LABEL[s] ?? s}</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        {t.projectId ? (
                          <Button variant="text" size="small"
                            onClick={() => setCommentsTask({ id: t.id, projectId: t.projectId ?? "", title: t.title })}>
                            Comments
                          </Button>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="text" color="error" size="small" onClick={() => setConfirmId(t.id)}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DataState>
      </Stack>

      <ConfirmModal
        open={!!confirmId} heading="Remove task?" body="This permanently removes the task."
        confirmText="Remove" pending={remove.isPending}
        onConfirm={() => { if (confirmId) remove.mutate({ id: confirmId }); setConfirmId(null); }}
        onClose={() => setConfirmId(null)}
      />

      <Dialog aria-labelledby="tasks-tab-create-title" open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle id="tasks-tab-create-title">New task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField id="nt-title" label="Title" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <TextField id="nt-proj" select label="Project" value={form.projectId}
              onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, assigneeId: "", reviewerId: "" }))}>
              <MenuItem value="">— select a project —</MenuItem>
              {(projectsQ.data ?? []).map((p) => (
                <MenuItem key={p.id} value={p.id}>{`${p.ref} ${p.title}`}</MenuItem>
              ))}
            </TextField>
            {hrEnabled ? (
              <Stack direction="row" spacing={2}>
                <TextField id="nt-assignee" select label="Assignee" fullWidth
                  disabled={!form.projectId || team.length === 0}
                  helperText={!form.projectId ? "Select a project first" : team.length === 0 ? "No team members yet" : undefined}
                  value={form.assigneeId}
                  onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}>
                  <MenuItem value="">— unassigned —</MenuItem>
                  {team.map((m) => <MenuItem key={m.teamMemberId} value={m.teamMemberId}>{`${m.name} (${m.role})`}</MenuItem>)}
                </TextField>
                <TextField id="nt-reviewer" select label="Reviewer" fullWidth
                  disabled={!form.projectId || team.length === 0}
                  value={form.reviewerId}
                  onChange={(e) => setForm((f) => ({ ...f, reviewerId: e.target.value }))}>
                  <MenuItem value="">— none —</MenuItem>
                  {team.map((m) => <MenuItem key={m.teamMemberId} value={m.teamMemberId}>{`${m.name} (${m.role})`}</MenuItem>)}
                </TextField>
              </Stack>
            ) : (
              <Typography variant="body2">Solo mode — new tasks assign to the principal architect automatically.</Typography>
            )}
            <Stack direction="row" spacing={2}>
              <TextField id="nt-prio" select label="Priority" fullWidth value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                {TaskPriority.options.map((p) => (
                  <MenuItem key={p} value={p}>{TASK_PRIORITY_LABEL[p] ?? p}</MenuItem>
                ))}
              </TextField>
              <TextField id="nt-class" select label="Classification" fullWidth value={form.classification}
                onChange={(e) => setForm((f) => ({ ...f, classification: e.target.value }))}>
                <MenuItem value="">— none —</MenuItem>
                {TaskClassification.options.map((c) => (
                  <MenuItem key={c} value={c}>{TASK_CLASSIFICATION_LABEL[c] ?? c}</MenuItem>
                ))}
              </TextField>
              <TextField id="nt-due" label="Due date" type="date" fullWidth value={form.dueDate}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField id="nt-wtype" select label="Work type" fullWidth value={form.workType}
                onChange={(e) => setForm((f) => ({ ...f, workType: e.target.value }))}>
                <MenuItem value="">— none —</MenuItem>
                {TaskWorkType.options.map((w) => (
                  <MenuItem key={w} value={w}>{TASK_WORK_TYPE_LABEL[w] ?? w}</MenuItem>
                ))}
              </TextField>
              <TextField id="nt-diff" select label="Difficulty (1–5)" fullWidth value={form.difficultyCoefficient}
                onChange={(e) => setForm((f) => ({ ...f, difficultyCoefficient: e.target.value }))}>
                {[1,2,3,4,5].map((d) => (
                  <MenuItem key={d} value={String(d)}>{String(d)}</MenuItem>
                ))}
              </TextField>
              <TextField id="nt-hrs" label="Est. hours" type="number" fullWidth value={form.estimatedHours}
                onChange={(e) => setForm((f) => ({ ...f, estimatedHours: e.target.value }))} />
            </Stack>
            <TextField id="nt-desc" label="Description (optional)" multiline rows={2} value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.title || !form.projectId || create.isPending}
            onClick={() => create.mutate({
              title: form.title, projectId: form.projectId,
              assigneeId: form.assigneeId || null,
              reviewerId: form.reviewerId || null,
              classification: form.classification ? (form.classification as (typeof TaskClassification.options)[number]) : undefined,
              workType: form.workType ? (form.workType as (typeof TaskWorkType.options)[number]) : undefined,
              difficultyCoefficient: parseInt(form.difficultyCoefficient, 10) || 3,
              estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
              priority: form.priority as (typeof TaskPriority.options)[number],
              dueDate: form.dueDate || null,
              description: form.description || undefined,
            })}
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog aria-labelledby="tasks-tab-comments-title" open={commentsTask !== null} onClose={() => setCommentsTask(null)} fullWidth maxWidth="sm">
        <DialogTitle id="tasks-tab-comments-title">{commentsTask ? `Task comments — ${commentsTask.title}` : "Task comments"}</DialogTitle>
        <DialogContent>
          {commentsTask && (
            <ContextualComments projectId={commentsTask.projectId} objectType="task"
              objectId={commentsTask.id} heading="Task comments"
              description="Contextual discussion linked directly to this task." />
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setCommentsTask(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog aria-labelledby="tasks-tab-reassign-title" open={reassign !== null} onClose={() => setReassign(null)} fullWidth maxWidth="xs">
        <DialogTitle id="tasks-tab-reassign-title">{reassign ? `Reassign — ${reassign.title}` : "Reassign task"}</DialogTitle>
        <DialogContent>
          <TextField
            id="reassign-to"
            select
            label="Assign to"
            fullWidth
            sx={{ mt: 1 }}
            helperText={reassignMembers.length === 0 ? "No members are staffed on this project yet" : "Only members staffed on this project can be assigned"}
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
          >
            <MenuItem value="">— unassigned —</MenuItem>
            {reassignMembers.map((m) => (
              <MenuItem key={m.teamMemberId} value={m.teamMemberId}>{`${m.name} (${m.role})`}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setReassign(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={update.isPending}
            onClick={() => {
              if (!reassign) return;
              update.mutate(
                { id: reassign.id, assigneeId: reassignTo || null },
                { onSuccess: () => setReassign(null) },
              );
            }}
          >
            {update.isPending ? "Saving…" : "Reassign"}
          </Button>
        </DialogActions>
      </Dialog>

      {standupProjectId && (
        <PulseStandupModal
          open={standupOpen}
          onClose={() => setStandupOpen(false)}
          projectId={standupProjectId}
          projectLabel={
            standupProject ? `${standupProject.ref} ${standupProject.title}` : "Project"
          }
        />
      )}
    </>
  );
});
