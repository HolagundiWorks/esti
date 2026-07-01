import {
  Button,
  ContentSwitcher,
  Modal,
  Select,
  SelectItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
  TextInput,
  Checkbox,
} from "@carbon/react";
import {
  TASK_CLASSIFICATION_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_WORK_TYPE_LABEL,
  TaskClassification,
  TaskPriority,
  TaskStatus,
  TaskWorkType,
} from "@esti/contracts";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ConfirmModal } from "../ConfirmModal.js";
import { ContextualComments } from "../ContextualComments.js";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";
import {
  PRIORITY_TAG,
  WORK_CATEGORY_FILTER,
  WORK_CATEGORY_LABELS,
  WORK_CATEGORY_SLUGS,
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
      <Stack gap={5}>
        <ContentSwitcher
          selectedIndex={WORK_CATEGORY_SLUGS.indexOf(filterCategory)}
          onChange={({ name }) => setFilterCategory((name as WorkCategorySlug) ?? "all")}
          size="sm"
        >
          {WORK_CATEGORY_SLUGS.map((slug) => (
            <Switch key={slug} name={slug} text={WORK_CATEGORY_LABELS[slug]} />
          ))}
        </ContentSwitcher>
        <Stack orientation="horizontal" gap={5}>
          <Checkbox id="t-open" labelText="Open only" checked={openOnly}
            onChange={(_e, { checked }) => setOpenOnly(checked)} />
          <Checkbox id="t-mine" labelText="My tasks" checked={myTasks}
            onChange={(_e, { checked }) => setMyTasks(checked)} />
          <Select id="t-status" labelText="Status" hideLabel size="sm"
            disabled={!!catFilter.status}
            value={catFilter.status ? catFilter.status : filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}>
            <SelectItem value="" text="All statuses" />
            {TaskStatus.options.map((s) => (
              <SelectItem key={s} value={s} text={TASK_STATUS_LABEL[s] ?? s} />
            ))}
          </Select>
          <Select id="t-prio" labelText="Priority" hideLabel size="sm"
            value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <SelectItem value="" text="All priorities" />
            {TaskPriority.options.map((p) => (
              <SelectItem key={p} value={p} text={TASK_PRIORITY_LABEL[p] ?? p} />
            ))}
          </Select>
        </Stack>

        <DataState
          loading={listQ.isLoading}
          isEmpty={(listQ.data ?? []).length === 0}
          columnCount={8}
          empty={{
            title: openOnly || myTasks ? "No matching tasks" : "No tasks yet",
            description: "Create a task to track work across the office and projects.",
            action: <Button size="sm" onClick={() => setOpen(true)}>New task</Button>,
          }}
        >
          <TableContainer title="Task list">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Task</TableHeader>
                  <TableHeader>Project</TableHeader>
                  <TableHeader>Assignee</TableHeader>
                  <TableHeader>Reviewer</TableHeader>
                  <TableHeader>Priority</TableHeader>
                  <TableHeader>Due</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Comments</TableHeader>
                  <TableHeader></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(listQ.data ?? []).map((t) => {
                  const overdue = t.dueDate && t.dueDate < today && t.status !== "DONE";
                  return (
                    <TableRow
                      key={t.id}
                      id={`task-row-${t.id}`}
                      className={targetTaskId === t.id ? "esti-task-row--target" : undefined}
                    >
                      <TableCell>
                        {t.title}
                        {t.interventionRequired && (
                          <Tag type="red" size="sm">Intervention required</Tag>
                        )}
                        {t.description && <div>{t.description}</div>}
                        {t.classification && (
                          <Tag type="cool-gray" size="sm">
                            {TASK_CLASSIFICATION_LABEL[t.classification] ?? t.classification}
                          </Tag>
                        )}
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
                              kind="ghost"
                              size="sm"
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
                        <Tag type={PRIORITY_TAG[t.priority] ?? "gray"}>
                          {TASK_PRIORITY_LABEL[t.priority] ?? t.priority}
                        </Tag>
                      </TableCell>
                      <TableCell>
                        {overdue
                          ? <Tag type="red">Overdue · {t.dueDate}</Tag>
                          : (t.dueDate ?? "—")}
                      </TableCell>
                      <TableCell>
                        <Select id={`ts-${t.id}`} labelText="Status" hideLabel size="sm"
                          value={t.status}
                          onChange={(e) => update.mutate({ id: t.id, status: e.target.value as (typeof TaskStatus.options)[number] })}>
                          {TaskStatus.options.map((s) => (
                            <SelectItem key={s} value={s} text={TASK_STATUS_LABEL[s] ?? s} />
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        {t.projectId ? (
                          <Button kind="ghost" size="sm"
                            onClick={() => setCommentsTask({ id: t.id, projectId: t.projectId ?? "", title: t.title })}>
                            Comments
                          </Button>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button kind="danger--ghost" size="sm" onClick={() => setConfirmId(t.id)}>
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

      <Modal
        open={open} modalHeading="New task"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.title || !form.projectId || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => create.mutate({
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
        <Stack gap={5}>
          <TextInput id="nt-title" labelText="Title" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Select id="nt-proj" labelText="Project" value={form.projectId}
            onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, assigneeId: "", reviewerId: "" }))}>
            <SelectItem value="" text="— select a project —" />
            {(projectsQ.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id} text={`${p.ref} ${p.title}`} />
            ))}
          </Select>
          {hrEnabled ? (
            <Stack orientation="horizontal" gap={5}>
              <Select id="nt-assignee" labelText="Assignee"
                disabled={!form.projectId || team.length === 0}
                helperText={!form.projectId ? "Select a project first" : team.length === 0 ? "No team members yet" : undefined}
                value={form.assigneeId}
                onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}>
                <SelectItem value="" text="— unassigned —" />
                {team.map((m) => <SelectItem key={m.teamMemberId} value={m.teamMemberId} text={`${m.name} (${m.role})`} />)}
              </Select>
              <Select id="nt-reviewer" labelText="Reviewer"
                disabled={!form.projectId || team.length === 0}
                value={form.reviewerId}
                onChange={(e) => setForm((f) => ({ ...f, reviewerId: e.target.value }))}>
                <SelectItem value="" text="— none —" />
                {team.map((m) => <SelectItem key={m.teamMemberId} value={m.teamMemberId} text={`${m.name} (${m.role})`} />)}
              </Select>
            </Stack>
          ) : (
            <p>Solo mode — new tasks assign to the principal architect automatically.</p>
          )}
          <Stack orientation="horizontal" gap={5}>
            <Select id="nt-prio" labelText="Priority" value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              {TaskPriority.options.map((p) => (
                <SelectItem key={p} value={p} text={TASK_PRIORITY_LABEL[p] ?? p} />
              ))}
            </Select>
            <Select id="nt-class" labelText="Classification" value={form.classification}
              onChange={(e) => setForm((f) => ({ ...f, classification: e.target.value }))}>
              <SelectItem value="" text="— none —" />
              {TaskClassification.options.map((c) => (
                <SelectItem key={c} value={c} text={TASK_CLASSIFICATION_LABEL[c] ?? c} />
              ))}
            </Select>
            <TextInput id="nt-due" labelText="Due date" type="date" value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </Stack>
          <Stack orientation="horizontal" gap={5}>
            <Select id="nt-wtype" labelText="Work type" value={form.workType}
              onChange={(e) => setForm((f) => ({ ...f, workType: e.target.value }))}>
              <SelectItem value="" text="— none —" />
              {TaskWorkType.options.map((w) => (
                <SelectItem key={w} value={w} text={TASK_WORK_TYPE_LABEL[w] ?? w} />
              ))}
            </Select>
            <Select id="nt-diff" labelText="Difficulty (1–5)" value={form.difficultyCoefficient}
              onChange={(e) => setForm((f) => ({ ...f, difficultyCoefficient: e.target.value }))}>
              {[1,2,3,4,5].map((d) => (
                <SelectItem key={d} value={String(d)} text={String(d)} />
              ))}
            </Select>
            <TextInput id="nt-hrs" labelText="Est. hours" type="number" value={form.estimatedHours}
              onChange={(e) => setForm((f) => ({ ...f, estimatedHours: e.target.value }))} />
          </Stack>
          <TextArea id="nt-desc" labelText="Description (optional)" rows={2} value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </Stack>
      </Modal>

      <Modal
        open={commentsTask !== null}
        modalHeading={commentsTask ? `Task comments — ${commentsTask.title}` : "Task comments"}
        primaryButtonText="Close" secondaryButtonText="" passiveModal
        onRequestClose={() => setCommentsTask(null)}
      >
        {commentsTask && (
          <ContextualComments projectId={commentsTask.projectId} objectType="task"
            objectId={commentsTask.id} heading="Task comments"
            description="Contextual discussion linked directly to this task." />
        )}
      </Modal>

      <Modal
        open={reassign !== null}
        modalHeading={reassign ? `Reassign — ${reassign.title}` : "Reassign task"}
        primaryButtonText={update.isPending ? "Saving…" : "Reassign"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={update.isPending}
        onRequestClose={() => setReassign(null)}
        onRequestSubmit={() => {
          if (!reassign) return;
          update.mutate(
            { id: reassign.id, assigneeId: reassignTo || null },
            { onSuccess: () => setReassign(null) },
          );
        }}
      >
        <Select
          id="reassign-to"
          labelText="Assign to"
          helperText={reassignMembers.length === 0 ? "No members are staffed on this project yet" : "Only members staffed on this project can be assigned"}
          value={reassignTo}
          onChange={(e) => setReassignTo(e.target.value)}
        >
          <SelectItem value="" text="— unassigned —" />
          {reassignMembers.map((m) => (
            <SelectItem key={m.teamMemberId} value={m.teamMemberId} text={`${m.name} (${m.role})`} />
          ))}
        </Select>
      </Modal>
    </>
  );
});
