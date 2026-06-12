import {
  Button,
  Checkbox,
  Modal,
  Select,
  SelectItem,
  Stack,
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
} from "@carbon/react";
import {
  TASK_CLASSIFICATION_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TaskClassification,
  TaskPriority,
  TaskStatus,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { DataState } from "../components/DataState.js";
import { ContextualComments } from "../components/ContextualComments.js";
import { trpc } from "../lib/trpc.js";

const PRIORITY_TAG: Record<string, "red" | "magenta" | "blue" | "gray"> = {
  CRITICAL: "red",
  HIGH: "magenta",
  MEDIUM: "blue",
  LOW: "gray",
};

export function Tasks() {
  const utils = trpc.useUtils();
  const [openOnly, setOpenOnly] = useState(false);
  const [myTasks, setMyTasks] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const listQ = trpc.tasks.list.useQuery({
    openOnly,
    myTasks,
    status: filterStatus ? (filterStatus as (typeof TaskStatus.options)[number]) : undefined,
    priority: filterPriority ? (filterPriority as (typeof TaskPriority.options)[number]) : undefined,
  });
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const invalidate = () => utils.tasks.list.invalidate();
  const update = trpc.tasks.update.useMutation({ onSuccess: invalidate });
  const remove = trpc.tasks.remove.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [commentsTask, setCommentsTask] = useState<{
    id: string;
    projectId: string;
    title: string;
  } | null>(null);
  const [form, setForm] = useState({
    title: "",
    projectId: "",
    assigneeId: "",
    reviewerId: "",
    classification: "",
    priority: "MEDIUM",
    dueDate: "",
    description: "",
  });
  const teamQ = trpc.assignments.listByProject.useQuery(
    { projectId: form.projectId },
    { enabled: !!form.projectId },
  );
  const team = teamQ.data ?? [];
  const create = trpc.tasks.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm({
        title: "",
        projectId: "",
        assigneeId: "",
        reviewerId: "",
        classification: "",
        priority: "MEDIUM",
        dueDate: "",
        description: "",
      });
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Stack gap={6}>
      <Stack orientation="horizontal" gap={5}>
        <Stack gap={3} className="esti-grow">
          <h1>Tasks</h1>
          <p>Project tasks across the office, assigned to team members.</p>
        </Stack>
        <Button onClick={() => setOpen(true)}>New task</Button>
      </Stack>

      <Stack orientation="horizontal" gap={5}>
        <Checkbox
          id="t-open"
          labelText="Open tasks only"
          checked={openOnly}
          onChange={(_e, { checked }) => setOpenOnly(checked)}
        />
        <Checkbox
          id="t-mine"
          labelText="My tasks"
          checked={myTasks}
          onChange={(_e, { checked }) => setMyTasks(checked)}
        />
        <Select
          id="t-status"
          labelText="Status"
          hideLabel
          size="sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <SelectItem value="" text="All statuses" />
          {TaskStatus.options.map((s) => (
            <SelectItem key={s} value={s} text={TASK_STATUS_LABEL[s] ?? s} />
          ))}
        </Select>
        <Select
          id="t-prio"
          labelText="Priority"
          hideLabel
          size="sm"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
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
          description:
            "Create a task to track work across the office and projects.",
          action: (
            <Button size="sm" onClick={() => setOpen(true)}>
              New task
            </Button>
          ),
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
                const overdue =
                  t.dueDate && t.dueDate < today && t.status !== "DONE";
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      {t.title}
                      {t.description && <div>{t.description}</div>}
                      {t.classification && (
                        <Tag type="cool-gray" size="sm">
                          {TASK_CLASSIFICATION_LABEL[t.classification] ?? t.classification}
                        </Tag>
                      )}
                    </TableCell>
                    <TableCell>
                      {t.projectId ? (
                        <Link to={`/projects/${t.projectId}`}>
                          {t.projectRef}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{t.assignee ?? "—"}</TableCell>
                    <TableCell>{"—"}</TableCell>
                    <TableCell>
                      <Tag type={PRIORITY_TAG[t.priority] ?? "gray"}>
                        {TASK_PRIORITY_LABEL[t.priority] ?? t.priority}
                      </Tag>
                    </TableCell>
                    <TableCell>
                      {overdue ? (
                        <Tag type="red">Overdue · {t.dueDate}</Tag>
                      ) : (
                        t.dueDate ?? "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        id={`ts-${t.id}`}
                        labelText="Task status"
                        hideLabel
                        size="sm"
                        value={t.status}
                        onChange={(e) =>
                          update.mutate({
                            id: t.id,
                            status: e.target
                              .value as (typeof TaskStatus.options)[number],
                          })
                        }
                      >
                        {TaskStatus.options.map((s) => (
                          <SelectItem
                            key={s}
                            value={s}
                            text={TASK_STATUS_LABEL[s] ?? s}
                          />
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      {t.projectId ? (
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() =>
                            setCommentsTask({
                              id: t.id,
                              projectId: t.projectId ?? "",
                              title: t.title,
                            })
                          }
                        >
                          Comments
                        </Button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        kind="danger--ghost"
                        size="sm"
                        onClick={() => setConfirmId(t.id)}
                      >
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

      <ConfirmModal
        open={!!confirmId}
        heading="Remove task?"
        body="This permanently removes the task."
        confirmText="Remove"
        pending={remove.isPending}
        onConfirm={() => {
          if (confirmId) remove.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />

      <Modal
        open={open}
        modalHeading="New task"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !form.title || !form.projectId || create.isPending
        }
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            title: form.title,
            projectId: form.projectId,
            assigneeId: form.assigneeId || null,
            reviewerId: form.reviewerId || null,
            classification: form.classification
              ? (form.classification as (typeof TaskClassification.options)[number])
              : undefined,
            priority: form.priority as (typeof TaskPriority.options)[number],
            dueDate: form.dueDate || null,
            description: form.description || undefined,
          })
        }
      >
        <Stack gap={5}>
          <TextInput
            id="nt-title"
            labelText="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Select
            id="nt-proj"
            labelText="Project"
            value={form.projectId}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                projectId: e.target.value,
                assigneeId: "",
                reviewerId: "",
              }))
            }
          >
            <SelectItem value="" text="— select a project —" />
            {(projectsQ.data ?? []).map((p) => (
              <SelectItem
                key={p.id}
                value={p.id}
                text={`${p.ref} ${p.title}`}
              />
            ))}
          </Select>
          <Stack orientation="horizontal" gap={5}>
            <Select
              id="nt-assignee"
              labelText="Assignee"
              disabled={!form.projectId || team.length === 0}
              helperText={
                !form.projectId
                  ? "Select a project first"
                  : team.length === 0
                    ? "No team members assigned yet"
                    : undefined
              }
              value={form.assigneeId}
              onChange={(e) =>
                setForm((f) => ({ ...f, assigneeId: e.target.value }))
              }
            >
              <SelectItem value="" text="— unassigned —" />
              {team.map((m) => (
                <SelectItem
                  key={m.teamMemberId}
                  value={m.teamMemberId}
                  text={`${m.name} (${m.role})`}
                />
              ))}
            </Select>
            <Select
              id="nt-reviewer"
              labelText="Reviewer"
              disabled={!form.projectId || team.length === 0}
              value={form.reviewerId}
              onChange={(e) =>
                setForm((f) => ({ ...f, reviewerId: e.target.value }))
              }
            >
              <SelectItem value="" text="— none —" />
              {team.map((m) => (
                <SelectItem
                  key={m.teamMemberId}
                  value={m.teamMemberId}
                  text={`${m.name} (${m.role})`}
                />
              ))}
            </Select>
          </Stack>
          <Stack orientation="horizontal" gap={5}>
            <Select
              id="nt-prio"
              labelText="Priority"
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: e.target.value }))
              }
            >
              {TaskPriority.options.map((p) => (
                <SelectItem key={p} value={p} text={TASK_PRIORITY_LABEL[p] ?? p} />
              ))}
            </Select>
            <Select
              id="nt-class"
              labelText="Classification"
              value={form.classification}
              onChange={(e) =>
                setForm((f) => ({ ...f, classification: e.target.value }))
              }
            >
              <SelectItem value="" text="— none —" />
              {TaskClassification.options.map((c) => (
                <SelectItem
                  key={c}
                  value={c}
                  text={TASK_CLASSIFICATION_LABEL[c] ?? c}
                />
              ))}
            </Select>
            <TextInput
              id="nt-due"
              labelText="Due date"
              type="date"
              value={form.dueDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, dueDate: e.target.value }))
              }
            />
          </Stack>
          <TextArea
            id="nt-desc"
            labelText="Description (optional)"
            rows={2}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </Stack>
      </Modal>

      <Modal
        open={commentsTask !== null}
        modalHeading={
          commentsTask
            ? `Task comments — ${commentsTask.title}`
            : "Task comments"
        }
        primaryButtonText="Close"
        secondaryButtonText=""
        passiveModal
        onRequestClose={() => setCommentsTask(null)}
      >
        {commentsTask && (
          <ContextualComments
            projectId={commentsTask.projectId}
            objectType="task"
            objectId={commentsTask.id}
            heading="Task comments"
            description="Contextual discussion linked directly to this task."
          />
        )}
      </Modal>
    </Stack>
  );
}
