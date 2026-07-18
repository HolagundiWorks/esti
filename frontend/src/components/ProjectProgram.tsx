import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import Add from "@mui/icons-material/Add";
import Delete from "@mui/icons-material/Delete";
import {
  PROGRAM_SPACE_CATEGORY_LABEL,
  PROGRAM_STATUS_LABEL,
  PROGRAM_STATUS_TAG,
  ProgramSpaceCategory,
  can,
  type ProgramStatus,
} from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { StatusDot, StatusTag } from "./StatusTag.js";

function area(n: number): string {
  return (Number.isInteger(n) ? n : Number(n.toFixed(2))).toLocaleString("en-IN");
}
function floorLabel(level: number): string {
  if (level === 0) return "Ground";
  if (level < 0) return `Basement ${Math.abs(level)}`;
  return `Floor ${level}`;
}

export function ProjectProgram({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canWrite = can(user?.role, "write");
  const utils = trpc.useUtils();

  const q = trpc.program.summary.useQuery({ projectId });
  const data = q.data;

  const inv = () => utils.program.summary.invalidate({ projectId });
  const getOrCreate = trpc.program.getOrCreate.useMutation({ meta: { errorTitle: "Couldn't create the program" }, onSuccess: inv });
  const freeze = trpc.program.freeze.useMutation({ meta: { errorTitle: "Couldn't freeze the program" }, onSuccess: inv });
  const newVersion = trpc.program.newVersion.useMutation({ meta: { errorTitle: "Couldn't create the program version" }, onSuccess: inv });
  const removeSpace = trpc.program.removeSpace.useMutation({ meta: { errorTitle: "Couldn't remove the space" }, onSuccess: inv });

  const [open, setOpen] = useState(false);
  const blank = { name: "", category: "BEDROOM", floorLevel: "0", unitAreaSqm: "", count: "1", notes: "" };
  const [form, setForm] = useState(blank);
  const addSpace = trpc.program.addSpace.useMutation({
    meta: { errorTitle: "Couldn't add the space" },
    onSuccess: () => { inv(); setOpen(false); setForm(blank); },
  });

  if (q.isLoading) return <p className="esti-label--secondary">Loading program…</p>;

  // No program yet — offer to start one.
  if (!data) {
    return (
      <Stack spacing={2}>
        <Typography variant="h6" component="h4">Program formulation</Typography>
        <p className="esti-label--secondary">
          The program is the space schedule formulated within the feasibility envelope.
          Record the pre-project assessment in the Pipeline tab to set the maximum built
          extent, then start the program here.
        </p>
        {canWrite && (
          <div>
            <Button variant="contained" onClick={() => getOrCreate.mutate({ projectId })} disabled={getOrCreate.isPending}>
              {getOrCreate.isPending ? "Starting…" : "Start program"}
            </Button>
          </div>
        )}
      </Stack>
    );
  }

  const { program, spaces, totalProgrammedAreaSqm, maxBuiltAreaSqm, utilizationPct, remainingAreaSqm, overEnvelope, floorsUsed, byFloor, byCategory } = data;
  const status = program.status as ProgramStatus;
  const frozen = status === "FROZEN";
  const editable = canWrite && !frozen;

  const spaceColumns: GridColDef[] = [
    { field: "name", headerName: "Space", flex: 1.2, minWidth: 140 },
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      minWidth: 130,
      renderCell: (p) =>
        PROGRAM_SPACE_CATEGORY_LABEL[p.row.category as keyof typeof PROGRAM_SPACE_CATEGORY_LABEL] ?? p.row.category,
    },
    { field: "floorLevel", headerName: "Floor", flex: 0.7, minWidth: 100, renderCell: (p) => floorLabel(p.row.floorLevel) },
    { field: "unitAreaSqm", headerName: "Unit area", flex: 0.8, minWidth: 110, renderCell: (p) => `${area(p.row.unitAreaSqm)} sqm` },
    { field: "count", headerName: "Count", flex: 0.5, minWidth: 80 },
    { field: "areaSqm", headerName: "Area", flex: 0.8, minWidth: 110, renderCell: (p) => `${area(p.row.areaSqm)} sqm` },
    ...(editable
      ? [
          {
            field: "actions",
            headerName: "",
            sortable: false,
            filterable: false,
            width: 60,
            renderCell: (p) => (
              <IconButton
                size="small"
                aria-label="Remove"
                disabled={removeSpace.isPending}
                onClick={() => removeSpace.mutate({ id: p.row.id, programId: program.id })}
              >
                <Delete sx={{ fontSize: 16 }} />
              </IconButton>
            ),
          } satisfies GridColDef,
        ]
      : []),
  ];

  const byFloorColumns: GridColDef[] = [
    { field: "floorLevel", headerName: "Floor", flex: 1, minWidth: 110, renderCell: (p) => floorLabel(p.row.floorLevel) },
    { field: "spaceCount", headerName: "Spaces", flex: 0.7, minWidth: 90 },
    { field: "areaSqm", headerName: "Area", flex: 1, minWidth: 110, renderCell: (p) => `${area(p.row.areaSqm)} sqm` },
  ];
  const byCategoryColumns: GridColDef[] = [
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      minWidth: 110,
      renderCell: (p) =>
        PROGRAM_SPACE_CATEGORY_LABEL[p.row.category as keyof typeof PROGRAM_SPACE_CATEGORY_LABEL] ?? p.row.category,
    },
    { field: "spaceCount", headerName: "Spaces", flex: 0.7, minWidth: 90 },
    { field: "areaSqm", headerName: "Area", flex: 1, minWidth: 110, renderCell: (p) => `${area(p.row.areaSqm)} sqm` },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="h6" component="h4">Program formulation</Typography>
        <StatusDot color="gray" label={`v${program.version}`} />
        <StatusTag value={status} map={PROGRAM_STATUS_TAG} label={PROGRAM_STATUS_LABEL[status] ?? status} />
        {overEnvelope && <StatusDot color="red" label="Over feasibility envelope" />}
      </Stack>

      {/* KPI strip — feasibility envelope is the source of truth */}
      <Grid container spacing={1}>
        {[
          { label: "Max built extent (feasibility)", value: maxBuiltAreaSqm > 0 ? `${area(maxBuiltAreaSqm)} sqm` : "—" },
          { label: "Programmed area", value: `${area(totalProgrammedAreaSqm)} sqm` },
          { label: "Remaining", value: remainingAreaSqm == null ? "—" : `${area(remainingAreaSqm)} sqm` },
          { label: "Floors used", value: String(floorsUsed) },
        ].map((k) => (
          <Grid key={k.label} size={{ xs: 6, md: 3 }}>
            <Box className="esti-fill" sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
              <p className="esti-label--secondary">{k.label}</p>
              <Typography variant="h6" sx={{ mt: 0.5 }}>{k.value}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {utilizationPct != null && (
        <Box>
          <Typography variant="body2">Envelope utilization</Typography>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, utilizationPct)}
            color={overEnvelope ? "error" : "primary"}
            sx={{ my: 0.5 }}
          />
          <p className="esti-label--helper">{`${utilizationPct.toFixed(1)}% of the feasibility max built extent`}</p>
        </Box>
      )}
      {maxBuiltAreaSqm <= 0 && (
        <Alert severity="info">
          <AlertTitle>No feasibility envelope</AlertTitle>
          Record a pre-project assessment (Pipeline tab) so the program can be checked against the max built extent.
        </Alert>
      )}
      {overEnvelope && (
        <Alert severity="warning">
          <AlertTitle>Program exceeds the feasibility envelope</AlertTitle>
          The programmed area is larger than the feasible max built extent. Reduce the program or revisit the assessment — this is advisory, not blocking.
        </Alert>
      )}

      {/* Spaces */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="subtitle1" component="h5">Spaces</Typography>
        {editable && <Button variant="text" size="small" startIcon={<Add />} onClick={() => setOpen(true)}>Add space</Button>}
      </Stack>
      {spaces.length === 0 ? (
        <p className="esti-label--secondary">No spaces yet. Add rooms/spaces from the client requirements.</p>
      ) : (
        <DataGrid
          rows={spaces}
          columns={spaceColumns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      )}

      {/* Rollups */}
      {spaces.length > 0 && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={0.5}>
              <Typography variant="subtitle1">By floor</Typography>
              <DataGrid
                rows={byFloor}
                columns={byFloorColumns}
                getRowId={(r) => r.floorLevel}
                density="compact"
                disableRowSelectionOnClick
                hideFooter
                autoHeight
              />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={0.5}>
              <Typography variant="subtitle1">By category</Typography>
              <DataGrid
                rows={byCategory}
                columns={byCategoryColumns}
                getRowId={(r) => r.category}
                density="compact"
                disableRowSelectionOnClick
                hideFooter
                autoHeight
              />
            </Stack>
          </Grid>
        </Grid>
      )}

      {/* Version controls */}
      {canWrite && (
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          {!frozen ? (
            <Button variant="contained" size="small" disabled={freeze.isPending} onClick={() => freeze.mutate({ programId: program.id })}>
              {freeze.isPending ? "Freezing…" : "Freeze program (set revision baseline)"}
            </Button>
          ) : (
            <Button variant="outlined" size="small" disabled={newVersion.isPending} onClick={() => newVersion.mutate({ projectId })}>
              {newVersion.isPending ? "Creating…" : "Start new version"}
            </Button>
          )}
        </Box>
      )}
      {frozen && (
        <p className="esti-label--secondary">
          Frozen on {program.frozenAt ? new Date(program.frozenAt).toLocaleDateString("en-IN") : "—"} — this version is the baseline that design revisions are measured against.
        </p>
      )}

      {/* Add space dialog */}
      <Dialog aria-labelledby="project-program-space-title" open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle id="project-program-space-title">Add program space</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField id="ps-name" label="Space name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
            <TextField id="ps-cat" select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} fullWidth>
              {ProgramSpaceCategory.options.map((c) => <MenuItem key={c} value={c}>{PROGRAM_SPACE_CATEGORY_LABEL[c]}</MenuItem>)}
            </TextField>
            <TextField id="ps-floor" type="number" label="Floor level (0 = ground, -1 = basement)" value={form.floorLevel} onChange={(e) => setForm({ ...form, floorLevel: e.target.value })} fullWidth />
            <TextField id="ps-area" type="number" label="Unit area (sqm)" value={form.unitAreaSqm} onChange={(e) => setForm({ ...form, unitAreaSqm: e.target.value })} fullWidth />
            <TextField id="ps-count" type="number" label="Count" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} fullWidth />
            <TextField id="ps-notes" label="Notes (optional)" multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} fullWidth />
            {addSpace.error && (
              <Alert severity="error">
                <AlertTitle>Error</AlertTitle>
                {addSpace.error.message}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.name || !form.unitAreaSqm || addSpace.isPending}
            onClick={() =>
              addSpace.mutate({
                programId: program.id,
                name: form.name,
                category: form.category as (typeof ProgramSpaceCategory.options)[number],
                floorLevel: Number(form.floorLevel || 0),
                unitAreaSqm: Number(form.unitAreaSqm || 0),
                count: Number(form.count || 1),
                notes: form.notes || undefined,
              })
            }
          >
            {addSpace.isPending ? "Adding…" : "Add space"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
