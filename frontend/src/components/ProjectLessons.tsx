import {
  Button,
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
import { Add } from "@carbon/icons-react";
import { LESSON_CATEGORY_LABEL, type LessonCategory } from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmModal } from "./ConfirmModal.js";
import { DataState } from "./DataState.js";
import { trpc } from "../lib/trpc.js";

export function ProjectLessons({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.lessons.listByProject.useQuery({ projectId });
  const inv = () => utils.lessons.listByProject.invalidate({ projectId });
  const create = trpc.lessons.create.useMutation({ onSuccess: inv });
  const update = trpc.lessons.update.useMutation({ onSuccess: inv });
  const publish = trpc.lessons.publish.useMutation({ onSuccess: inv });
  const remove = trpc.lessons.remove.useMutation({ onSuccess: inv });

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "OTHER" as LessonCategory,
    body: "",
    recommendations: "",
    tags: "",
  });

  const editing = (listQ.data ?? []).find((l) => l.id === editId);

  function resetForm() {
    setForm({ title: "", category: "OTHER", body: "", recommendations: "", tags: "" });
    setEditId(null);
    setOpen(false);
  }

  return (
    <div>
      <Stack orientation="horizontal" gap={3} style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <h3>Lessons learned</h3>
          <p style={{ margin: 0, opacity: 0.85 }}>
            Capture project-close insights; publish to the Knowledge Bank for reuse.
          </p>
        </div>
        <Button size="sm" renderIcon={Add} onClick={() => setOpen(true)}>New lesson</Button>
      </Stack>

      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={4}
        empty={{
          title: "No lessons yet",
          description: "Record what worked, what did not, and recommendations for future projects.",
        }}
      >
        <TableContainer>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Title</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.title}</TableCell>
                  <TableCell>
                    {LESSON_CATEGORY_LABEL[l.category as LessonCategory] ?? l.category}
                  </TableCell>
                  <TableCell>
                    <Tag type={l.status === "PUBLISHED" ? "green" : "gray"} size="sm">{l.status}</Tag>
                  </TableCell>
                  <TableCell>
                    <Stack orientation="horizontal" gap={2}>
                      {l.status === "DRAFT" && (
                        <>
                          <Button kind="ghost" size="sm" onClick={() => {
                            setEditId(l.id);
                            setForm({
                              title: l.title,
                              category: l.category as LessonCategory,
                              body: l.body,
                              recommendations: l.recommendations,
                              tags: l.tags ?? "",
                            });
                            setOpen(true);
                          }}>Edit</Button>
                          <Button kind="ghost" size="sm" disabled={publish.isPending} onClick={() => publish.mutate({ id: l.id })}>Publish</Button>
                          <Button kind="danger--ghost" size="sm" onClick={() => setConfirmId(l.id)}>Delete</Button>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <ConfirmModal
        open={!!confirmId}
        heading="Delete draft lesson?"
        body="This permanently removes the draft."
        confirmText="Delete"
        pending={remove.isPending}
        onConfirm={() => {
          if (confirmId) remove.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />

      <Modal
        open={open}
        modalHeading={editId ? "Edit lesson" : "New lesson"}
        primaryButtonText={create.isPending || update.isPending ? "Saving…" : editId ? "Save" : "Create draft"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.title || !form.body || create.isPending || update.isPending}
        size="lg"
        onRequestClose={resetForm}
        onRequestSubmit={() => {
          if (editId) {
            update.mutate({ id: editId, ...form, tags: form.tags || undefined }, { onSuccess: resetForm });
          } else {
            create.mutate({ projectId, ...form, tags: form.tags || undefined }, { onSuccess: resetForm });
          }
        }}
      >
        <Stack gap={4}>
          <TextInput id="ll-title" labelText="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Select id="ll-cat" labelText="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as LessonCategory }))}>
            {(Object.keys(LESSON_CATEGORY_LABEL) as LessonCategory[]).map((k) => (
              <SelectItem key={k} value={k} text={LESSON_CATEGORY_LABEL[k]} />
            ))}
          </Select>
          <TextArea id="ll-body" labelText="What happened / context" rows={5} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <TextArea id="ll-rec" labelText="Recommendations for future projects" rows={4} value={form.recommendations} onChange={(e) => setForm((f) => ({ ...f, recommendations: e.target.value }))} />
          <TextInput id="ll-tags" labelText="Tags (optional)" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
          {editing?.status === "PUBLISHED" && (
            <p>Published lessons are read-only in the register.</p>
          )}
        </Stack>
      </Modal>
    </div>
  );
}

/** Knowledge Bank — published lessons across projects. */
export function LessonsBank() {
  const listQ = trpc.lessons.listPublished.useQuery();

  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <h2>Lessons learned</h2>
        <p>
          Published recommendations from completed and active projects. Draft lessons are captured on each project&apos;s Lessons tab.
        </p>
      </Stack>
      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={4}
        empty={{
          title: "No published lessons",
          description: "Publish lessons from a project when closing or handing over.",
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Title</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>Recommendation</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data ?? []).map(({ lesson, projectRef, projectTitle }) => (
                <TableRow key={lesson.id}>
                  <TableCell>{lesson.title}</TableCell>
                  <TableCell>
                    <Link to={`/projects/${lesson.projectId}?tab=lessons`}>
                      {projectRef} · {projectTitle}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {LESSON_CATEGORY_LABEL[lesson.category as LessonCategory] ?? lesson.category}
                  </TableCell>
                  <TableCell>{lesson.recommendations || lesson.body.slice(0, 120)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
    </Stack>
  );
}
