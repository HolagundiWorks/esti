import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Add from "@mui/icons-material/Add";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { LESSON_CATEGORY_LABEL, type LessonCategory, type TagColor } from "@esti/contracts";
import { useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { Link } from "react-router-dom";
import { ConfirmModal } from "./ConfirmModal.js";
import { DataState } from "./DataState.js";
import { StatusTag } from "./StatusTag.js";
import { trpc } from "../lib/trpc.js";

const LESSON_STATUS_TAG: Record<string, TagColor> = {
  DRAFT: "gray",
  PUBLISHED: "green",
};

export function ProjectLessons({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.lessons.listByProject.useQuery({ projectId });
  const inv = () => utils.lessons.listByProject.invalidate({ projectId });
  const create = trpc.lessons.create.useMutation({ meta: { errorTitle: "Couldn't create the lesson" }, onSuccess: inv });
  const update = trpc.lessons.update.useMutation({ meta: { errorTitle: "Couldn't update the lesson" }, onSuccess: inv });
  const publish = trpc.lessons.publish.useMutation({ meta: { errorTitle: "Couldn't publish the lesson" }, onSuccess: inv });
  const remove = trpc.lessons.remove.useMutation({ meta: { errorTitle: "Couldn't delete the lesson" }, onSuccess: inv });

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

  useScreenActions(
    [
      {
        id: "new-lesson",
        zone: "center",
        tone: "primary",
        label: "New lesson",
        icon: <Add />,
        onClick: () => setOpen(true),
      },
    ],
    [],
  );

  const rows = listQ.data ?? [];

  const columns: GridColDef[] = [
    { field: "title", headerName: "Title", flex: 2, minWidth: 180 },
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      minWidth: 140,
      valueGetter: (v) => LESSON_CATEGORY_LABEL[v as LessonCategory] ?? v,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => <StatusTag value={p.row.status} map={LESSON_STATUS_TAG} />,
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 230,
      renderCell: (p) =>
        p.row.status === "DRAFT" ? (
          <Stack direction="row" spacing={1}>
            <Button
              variant="text"
              size="small"
              onClick={() => {
                setEditId(p.row.id);
                setForm({
                  title: p.row.title,
                  category: p.row.category as LessonCategory,
                  body: p.row.body,
                  recommendations: p.row.recommendations,
                  tags: p.row.tags ?? "",
                });
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              variant="text"
              size="small"
              disabled={publish.isPending}
              onClick={() => publish.mutate({ id: p.row.id })}
            >
              Publish
            </Button>
            <Button variant="text" color="error" size="small" onClick={() => setConfirmId(p.row.id)}>
              Delete
            </Button>
          </Stack>
        ) : null,
    },
  ];

  return (
    <div>
      <Stack spacing={0.5} sx={{ mb: 1 }}>
        <Typography variant="h6">Lessons learned</Typography>
        <Typography variant="body2" sx={{ m: 0, opacity: 0.85 }}>
          Capture project-close insights; publish to the Knowledge Bank for reuse.
        </Typography>
      </Stack>

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={4}
        empty={{
          title: "No lessons yet",
          description: "Record what worked, what did not, and recommendations for future projects.",
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
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

      <Dialog aria-labelledby="project-lessons-form-title" open={open} onClose={resetForm} fullWidth maxWidth="md">
        <DialogTitle id="project-lessons-form-title">{editId ? "Edit lesson" : "New lesson"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="ll-title"
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <TextField
              id="ll-cat"
              select
              label="Category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as LessonCategory }))}
            >
              {(Object.keys(LESSON_CATEGORY_LABEL) as LessonCategory[]).map((k) => (
                <MenuItem key={k} value={k}>{LESSON_CATEGORY_LABEL[k]}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="ll-body"
              label="What happened / context"
              multiline
              rows={5}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
            <TextField
              id="ll-rec"
              label="Recommendations for future projects"
              multiline
              rows={4}
              value={form.recommendations}
              onChange={(e) => setForm((f) => ({ ...f, recommendations: e.target.value }))}
            />
            <TextField
              id="ll-tags"
              label="Tags (optional)"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
            {editing?.status === "PUBLISHED" && (
              <Typography variant="body2">Published lessons are read-only in the register.</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={resetForm}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.title || !form.body || create.isPending || update.isPending}
            onClick={() => {
              if (editId) {
                update.mutate({ id: editId, ...form, tags: form.tags || undefined }, { onSuccess: resetForm });
              } else {
                create.mutate({ projectId, ...form, tags: form.tags || undefined }, { onSuccess: resetForm });
              }
            }}
          >
            {create.isPending || update.isPending ? "Saving…" : editId ? "Save" : "Create draft"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

/** Knowledge Bank — published lessons across projects. */
export function LessonsBank() {
  const listQ = trpc.lessons.listPublished.useQuery();

  const rows = (listQ.data ?? []).map((r) => ({ id: r.lesson.id, ...r }));

  const columns: GridColDef<(typeof rows)[number]>[] = [
    {
      field: "title",
      headerName: "Title",
      flex: 1.5,
      minWidth: 180,
      valueGetter: (_v, row) => row.lesson.title,
    },
    {
      field: "project",
      headerName: "Project",
      flex: 1.5,
      minWidth: 200,
      renderCell: (p) => (
        <Link to={`/projects/${p.row.lesson.projectId}?tab=lessons`}>
          {p.row.projectRef} · {p.row.projectTitle}
        </Link>
      ),
    },
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) =>
        LESSON_CATEGORY_LABEL[row.lesson.category as LessonCategory] ?? row.lesson.category,
    },
    {
      field: "recommendation",
      headerName: "Recommendation",
      flex: 2.5,
      minWidth: 260,
      valueGetter: (_v, row) => row.lesson.recommendations || row.lesson.body.slice(0, 120),
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <Typography variant="h5">Lessons learned</Typography>
        <Typography variant="body1">
          Published recommendations from completed and active projects. Draft lessons are captured on each project&apos;s Lessons tab.
        </Typography>
      </Stack>
      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={4}
        empty={{
          title: "No published lessons",
          description: "Publish lessons from a project when closing or handing over.",
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          density="compact"
          getRowHeight={() => "auto"}
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>
    </Stack>
  );
}
