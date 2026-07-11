import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  styled,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import { useEffect, useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { useSignal } from "../lib/useSignal.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

const HiddenFileInput = styled("input")({ display: "none" });

const DISCIPLINES: { id: string; label: string }[] = [
  { id: "INTERIORS", label: "Interiors" },
  { id: "PLUMBING", label: "Plumbing" },
  { id: "ELECTRICAL", label: "Electrical" },
  { id: "LIGHTING", label: "Lighting" },
];

function DisciplinePanel({
  discipline,
  openSignal,
  onDialogOpenChange,
}: {
  discipline: string;
  openSignal?: number;
  onDialogOpenChange?: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const q = trpc.standards.listByDiscipline.useQuery({ discipline: discipline as never });
  const inv = () => utils.standards.listByDiscipline.invalidate({ discipline: discipline as never });
  const create = trpc.standards.create.useMutation({ meta: { errorTitle: "Couldn't create the standard" }, onSuccess: inv });
  const remove = trpc.standards.remove.useMutation({ meta: { errorTitle: "Couldn't delete the standard" }, onSuccess: inv });
  const removeFile = trpc.standards.removeFile.useMutation({ meta: { errorTitle: "Couldn't delete the file" }, onSuccess: inv });
  const { authorizedFetch } = useUploadAuth();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setDialogOpen = (next: boolean) => {
    setOpen(next);
    onDialogOpenChange?.(next);
  };

  useSignal(openSignal, () => { setTitle(""); setNotes(""); setDialogOpen(true); });

  useEffect(() => () => { onDialogOpenChange?.(false); }, [onDialogOpenChange]);

  async function attach(standardId: string, kind: string, file: File) {
    setBusyId(standardId);
    setError(null);
    try {
      const res = await authorizedFetch("/upload/standard-file", (fd) => {
        fd.append("standardId", standardId);
        fd.append("kind", kind);
        fd.append("file", file);
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      inv();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Stack spacing={2}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      )}
      <DataState
        loading={q.isLoading}
        isEmpty={(q.data ?? []).length === 0}
        columnCount={1}
        empty={{ title: "No standards", description: `Add a ${discipline.toLowerCase()} standard with notes and drawings.` }}
      >
        <Grid container spacing={1}>
          {(q.data ?? []).map((s) => (
            <Grid key={s.id} size={{ xs: 12, lg: 6 }}>
              <Box className="esti-fill" sx={{ p: 2, height: "100%", borderBottom: 1, borderColor: "divider" }}>
                <Stack spacing={1}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <h4 className="esti-grow">{s.title}</h4>
                    <RowActionsMenu
                      actions={[
                        {
                          label: "Delete",
                          danger: true,
                          disabled: remove.isPending,
                          onClick: () => remove.mutate({ id: s.id }),
                        },
                      ]}
                    />
                  </Box>
                  {s.notes && <p className="esti-label esti-label--secondary">{s.notes}</p>}
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                    {(s.files ?? []).map((f) => (
                      <Chip
                        key={f.id}
                        size="small"
                        onDelete={() => removeFile.mutate({ id: f.id })}
                        sx={{
                          backgroundColor: "var(--cds-tag-background-blue)",
                          color: "var(--cds-tag-color-blue)",
                        }}
                        label={
                          f.url
                            ? <a href={f.url} target="_blank" rel="noreferrer">{f.kind}: {f.fileName}</a>
                            : `${f.kind}: ${f.fileName}`
                        }
                      />
                    ))}
                  </Stack>
                  <Box>
                    <Button variant="outlined" size="small" component="label" disabled={busyId === s.id}>
                      {busyId === s.id ? "Uploading…" : "Attach file"}
                      <HiddenFileInput
                        type="file"
                        accept=".pdf,.dwg,.dxf,.png,.jpg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void attach(s.id, "PDF", file);
                        }}
                      />
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>
      </DataState>

      <Dialog aria-labelledby="standards-library-create-title" open={open} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle id="standards-library-create-title">New standard</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField id="std-title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextField
              id="std-notes"
              label="Technical notes"
              multiline
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!title.trim() || create.isPending}
            onClick={() => {
              create.mutate({ discipline: discipline as never, title: title.trim(), notes: notes.trim() || undefined });
              setDialogOpen(false);
            }}
          >
            {create.isPending ? "Saving…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

/** Flat list of all files attached to standards across all disciplines. No backend change. */
function DocumentsTab() {
  const q1 = trpc.standards.listByDiscipline.useQuery({ discipline: "INTERIORS" as never });
  const q2 = trpc.standards.listByDiscipline.useQuery({ discipline: "PLUMBING" as never });
  const q3 = trpc.standards.listByDiscipline.useQuery({ discipline: "ELECTRICAL" as never });
  const q4 = trpc.standards.listByDiscipline.useQuery({ discipline: "LIGHTING" as never });

  const isLoading = q1.isLoading || q2.isLoading || q3.isLoading || q4.isLoading;
  const allFiles = [q1, q2, q3, q4].flatMap((q) =>
    (q.data ?? []).flatMap((s) =>
      (s.files ?? []).map((f) => ({
        ...f,
        standardTitle: s.title,
        discipline: (s as { discipline: string }).discipline,
      })),
    ),
  );

  if (isLoading) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <CircularProgress size={16} />
        <Typography variant="body2">Loading documents…</Typography>
      </Stack>
    );
  }

  if (allFiles.length === 0) {
    return (
      <Alert severity="info">
        Attach files to standards in the Standards tab — they will appear here for quick reference.
      </Alert>
    );
  }

  const columns: GridColDef[] = [
    {
      field: "fileName",
      headerName: "File",
      flex: 1.5,
      minWidth: 180,
      renderCell: (p) =>
        p.row.url
          ? <a href={p.row.url} target="_blank" rel="noreferrer">{p.row.fileName}</a>
          : p.row.fileName,
    },
    { field: "standardTitle", headerName: "Standard", flex: 1.2, minWidth: 160 },
    { field: "discipline", headerName: "Discipline", flex: 1, minWidth: 120 },
    { field: "kind", headerName: "Kind", width: 120 },
  ];

  return (
    <DataGrid
      rows={allFiles}
      columns={columns}
      density="compact"
      disableRowSelectionOnClick
      hideFooter
      autoHeight
    />
  );
}

/** Studio › Libraries › Standards Library — Documents tab (all attached files) + Standards tab (by discipline). */
export function StandardsLibrary() {
  const [tab, setTab] = useState(0);
  const [discTab, setDiscTab] = useState(0);
  const [stdSignal, setStdSignal] = useState(0);
  const [stdDialogOpen, setStdDialogOpen] = useState(false);

  useScreenActions(
    tab === 1 && !stdDialogOpen
      ? [
          {
            id: "new-standard",
            zone: "center",
            tone: "primary",
            label: "New Standard",
            icon: <AddIcon />,
            onClick: () => setStdSignal((s) => s + 1),
          },
        ]
      : [],
    [tab, stdDialogOpen],
  );

  return (
    <RailLayout
      title="Standards Library"
      description="Office design standards by discipline — technical notes, drawings and standard details."
      tabs={
        <Tabs
          orientation="vertical"
          value={tab}
          onChange={(_e, v) => setTab(v)}
          aria-label="Standards library sections"
        >
          <Tab label="Documents" />
          <Tab label="Standards" />
        </Tabs>
      }
    >
      <PageBreadcrumb items={[{ label: "Library" }, { label: "Standards" }]} />
      {tab === 0 && <DocumentsTab />}
      {tab === 1 && (
        <Stack spacing={2}>
          <Tabs value={discTab} onChange={(_e, v) => setDiscTab(v)} aria-label="Disciplines">
            {DISCIPLINES.map((d) => <Tab key={d.id} label={d.label} />)}
          </Tabs>
          {DISCIPLINES.map((d, i) =>
            discTab === i ? (
              <DisciplinePanel
                key={d.id}
                discipline={d.id}
                openSignal={stdSignal}
                onDialogOpenChange={setStdDialogOpen}
              />
            ) : null,
          )}
        </Stack>
      )}
    </RailLayout>
  );
}
