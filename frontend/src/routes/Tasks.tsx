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
import { TASK_STATUS_LABEL, TaskPriority, TaskStatus } from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

const PRIORITY_TAG: Record<string, "red" | "blue" | "gray"> = { HIGH: "red", MEDIUM: "blue", LOW: "gray" };

export function Tasks() {
  const utils = trpc.useUtils();
  const [openOnly, setOpenOnly] = useState(false);
  const listQ = trpc.tasks.list.useQuery({ openOnly });
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const invalidate = () => utils.tasks.list.invalidate();
  const update = trpc.tasks.update.useMutation({ onSuccess: invalidate });
  const remove = trpc.tasks.remove.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", projectId: "", assignee: "", priority: "MEDIUM", dueDate: "", description: "" });
  const create = trpc.tasks.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm({ title: "", projectId: "", assignee: "", priority: "MEDIUM", dueDate: "", description: "" });
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Tasks</h1>
        <Button onClick={() => setOpen(true)}>New task</Button>
      </div>
      <div style={{ margin: "12px 0" }}>
        <Checkbox id="t-open" labelText="Open tasks only (To do)" checked={openOnly} onChange={(_e, { checked }) => setOpenOnly(checked)} />
      </div>

      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={7}
        empty={{
          title: openOnly ? "No open tasks" : "No tasks yet",
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
              <TableHeader>Priority</TableHeader>
              <TableHeader>Due</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(listQ.data ?? []).map((t) => {
              const overdue = t.dueDate && t.dueDate < today && t.status !== "DONE";
              return (
                <TableRow key={t.id}>
                  <TableCell>
                    {t.title}
                    {t.description && <div style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{t.description}</div>}
                  </TableCell>
                  <TableCell>
                    {t.projectId ? <Link to={`/projects/${t.projectId}`}>{t.projectRef}</Link> : "—"}
                  </TableCell>
                  <TableCell>{t.assignee ?? "—"}</TableCell>
                  <TableCell>
                    <Tag type={PRIORITY_TAG[t.priority] ?? "gray"}>{t.priority}</Tag>
                  </TableCell>
                  <TableCell style={{ color: overdue ? "var(--cds-text-error)" : undefined }}>{t.dueDate ?? "—"}</TableCell>
                  <TableCell>
                    <Select
                      id={`ts-${t.id}`}
                      labelText="Task status"
                      hideLabel
                      size="sm"
                      value={t.status}
                      onChange={(e) => update.mutate({ id: t.id, status: e.target.value as (typeof TaskStatus.options)[number] })}
                    >
                      {TaskStatus.options.map((s) => (
                        <SelectItem key={s} value={s} text={TASK_STATUS_LABEL[s] ?? s} />
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button kind="danger--ghost" size="sm" onClick={() => setConfirmId(t.id)}>Remove</Button>
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
        primaryButtonDisabled={!form.title || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            title: form.title,
            projectId: form.projectId || null,
            assignee: form.assignee || undefined,
            priority: form.priority as (typeof TaskPriority.options)[number],
            dueDate: form.dueDate || null,
            description: form.description || undefined,
          })
        }
      >
        <Stack gap={5}>
          <TextInput id="nt-title" labelText="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Select id="nt-proj" labelText="Project (optional)" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}>
            <SelectItem value="" text="— office task —" />
            {(projectsQ.data ?? []).map((p) => <SelectItem key={p.id} value={p.id} text={`${p.ref} ${p.title}`} />)}
          </Select>
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput id="nt-assignee" labelText="Assignee" value={form.assignee} onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))} />
            <Select id="nt-prio" labelText="Priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              {TaskPriority.options.map((p) => <SelectItem key={p} value={p} text={p} />)}
            </Select>
            <TextInput id="nt-due" labelText="Due date" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <TextArea id="nt-desc" labelText="Description (optional)" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </Stack>
      </Modal>
    </div>
  );
}
