import {
  Box,
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
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import Add from "@mui/icons-material/Add";
import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc.js";
import { DataState } from "./DataState.js";
import { AiDraftPanel } from "./AiStudio.js";
import { StatusDot } from "./StatusTag.js";

const shrink = { slotProps: { inputLabel: { shrink: true } } } as const;

export function ProjectMom({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.moms.listByProject.useQuery({ projectId });
  const templatesQ = trpc.documents.listTemplates.useQuery({ kind: "MOM" });
  const inv = () => utils.moms.listByProject.invalidate({ projectId });
  const create = trpc.moms.create.useMutation({ onSuccess: inv });
  const issue = trpc.moms.issue.useMutation({ onSuccess: inv });
  const update = trpc.moms.update.useMutation({
    onSuccess: () => detailId && utils.moms.byId.invalidate({ id: detailId }),
  });
  const addAction = trpc.moms.addAction.useMutation({ onSuccess: () => utils.moms.byId.invalidate() });
  const convert = trpc.moms.convertActionToTask.useMutation({ onSuccess: inv });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", meetingDate: "", venue: "", attendees: "", minutes: "" });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [actionText, setActionText] = useState("");
  const [editMinutes, setEditMinutes] = useState("");

  const detailQ = trpc.moms.byId.useQuery({ id: detailId! }, { enabled: !!detailId });

  useEffect(() => {
    setEditMinutes("");
  }, [detailId]);

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.8, minWidth: 110 },
    { field: "title", headerName: "Title", flex: 1.5, minWidth: 160 },
    {
      field: "meetingDate",
      headerName: "Date",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => p.row.meetingDate ?? "—",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => (
        <StatusDot color={p.row.status === "ISSUED" ? "green" : "gray"} label={p.row.status} />
      ),
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      flex: 1,
      minWidth: 140,
      renderCell: (p) => (
        <>
          <Button variant="text" size="small" onClick={() => setDetailId(p.row.id)}>Open</Button>
          {p.row.status === "DRAFT" && (
            <Button variant="text" size="small" disabled={issue.isPending} onClick={() => issue.mutate({ id: p.row.id })}>Issue</Button>
          )}
        </>
      ),
    },
  ];

  return (
    <div>
      <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", mb: 1 }}>
        <Typography variant="h6" component="h3">Meeting minutes</Typography>
        <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>New MOM</Button>
      </Stack>
      <Box sx={{ mb: 2 }}>
        <AiDraftPanel projectId={projectId} defaultKind="MOM" compact />
      </Box>
      <DataState loading={listQ.isLoading} isEmpty={(listQ.data ?? []).length === 0} columnCount={4} empty={{ title: "No meeting minutes", description: "Record decisions and convert action items to tasks." }}>
        <DataGrid
          rows={listQ.data ?? []}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New meeting minutes</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              id="mom-tpl"
              select
              label="Start from template (optional)"
              value=""
              onChange={(e) => {
                const t = (templatesQ.data ?? []).find((x) => x.id === e.target.value);
                if (t) setForm((f) => ({ ...f, title: t.title, minutes: t.body }));
              }}
              fullWidth
            >
              <MenuItem value="">— blank MOM —</MenuItem>
              {(templatesQ.data ?? []).map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.title}</MenuItem>
              ))}
            </TextField>
            <TextField id="mom-title" label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} fullWidth />
            <TextField id="mom-date" label="Meeting date" type="date" value={form.meetingDate} onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))} fullWidth {...shrink} />
            <TextField id="mom-venue" label="Venue" value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} fullWidth />
            <TextField id="mom-att" label="Attendees" multiline minRows={4} value={form.attendees} onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))} fullWidth />
            <TextField id="mom-min" label="Minutes" multiline rows={6} value={form.minutes} onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.title || create.isPending}
            onClick={() => create.mutate({ projectId, ...form, meetingDate: form.meetingDate || undefined }, { onSuccess: () => setOpen(false) })}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!detailId} onClose={() => setDetailId(null)} fullWidth maxWidth="md">
        <DialogTitle>{detailQ.data?.title ?? "MOM"}</DialogTitle>
        <DialogContent>
          {detailQ.data && (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {detailQ.data.status === "DRAFT" ? (
                <>
                  <TextField
                    id="mom-edit-min"
                    label="Minutes"
                    multiline
                    rows={8}
                    value={editMinutes || detailQ.data.minutes}
                    onChange={(e) => setEditMinutes(e.target.value)}
                    fullWidth
                  />
                  <Box>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={update.isPending}
                      onClick={() => {
                        if (!detailId) return;
                        update.mutate({ id: detailId, minutes: editMinutes || detailQ.data!.minutes });
                      }}
                    >
                      Save minutes
                    </Button>
                  </Box>
                </>
              ) : (
                <p>{detailQ.data.minutes || "No minutes text yet."}</p>
              )}
              <Typography variant="subtitle1" component="h4">Action items</Typography>
              {(detailQ.data.actions ?? []).map((a) => (
                <Stack key={a.id} direction="row" spacing={1}>
                  <span className="esti-grow">{a.description}</span>
                  {!a.taskId && (
                    <Button variant="text" size="small" onClick={() => convert.mutate({ actionId: a.id })}>→ Task</Button>
                  )}
                </Stack>
              ))}
              {detailQ.data.status === "DRAFT" && (
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <TextField id="act-desc" placeholder="New action item" value={actionText}
                    slotProps={{ htmlInput: { "aria-label": "Action" } }}
                    onChange={(e) => setActionText(e.target.value)} fullWidth />
                  <Button size="small" variant="contained" disabled={!actionText || !detailId} onClick={() => {
                    if (detailId) addAction.mutate({ momId: detailId, description: actionText }, { onSuccess: () => setActionText("") });
                  }}>Add</Button>
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setDetailId(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
