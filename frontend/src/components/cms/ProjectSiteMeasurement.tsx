import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import Add from "@mui/icons-material/Add";
import Check from "@mui/icons-material/Check";
import DeleteOutline from "@mui/icons-material/DeleteOutlineOutlined";
import { can } from "@esti/contracts";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";
import { useAuth } from "../../lib/auth.js";

// Preserve exact Carbon tag colours by rendering an MUI Chip over the
// `--cds-tag-*` token vars (still defined by the Carbon token layer).
const tagSx = (color: string) => ({
  backgroundColor: `var(--cds-tag-background-${color}, var(--cds-layer-01))`,
  color: `var(--cds-tag-color-${color}, var(--cds-text-primary))`,
});

const shrink = { slotProps: { inputLabel: { shrink: true } } } as const;

export function ProjectSiteMeasurement({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ date: today, description: "", executedQty: 0, remarks: "" });

  const elementsQ = trpc.cms.elements.listByProject.useQuery({ projectId });
  const summaryQ = trpc.cms.measurements.summaryByProject.useQuery({ projectId });
  const recordsQ = trpc.cms.measurements.listByElement.useQuery(
    { elementId: selectedId! },
    { enabled: !!selectedId },
  );

  const invalidate = () => {
    void summaryQ.refetch();
    if (selectedId) utils.cms.measurements.listByElement.invalidate({ elementId: selectedId });
  };

  const createM = trpc.cms.measurements.create.useMutation({
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
      setForm({ date: today, description: "", executedQty: 0, remarks: "" });
    },
  });
  const verifyM = trpc.cms.measurements.verify.useMutation({ onSuccess: invalidate });
  const removeM = trpc.cms.measurements.remove.useMutation({ onSuccess: invalidate });

  const canApprove = !!(user && can(user.role, "cost:approve"));
  const elements = elementsQ.data?.elements ?? [];
  const summary = summaryQ.data ?? [];
  const selectedElement = elements.find((e) => e.id === selectedId);

  function getSummary(elementId: string) {
    return summary.find((s) => s.elementId === elementId);
  }

  const elementColumns: GridColDef[] = [
    { field: "code", headerName: "Code", flex: 0.6, minWidth: 90 },
    { field: "description", headerName: "Description", flex: 1.6, minWidth: 200 },
    {
      field: "unit",
      headerName: "Unit",
      flex: 0.5,
      minWidth: 80,
      valueGetter: (_v, row) => row.unit ?? "—",
    },
    {
      field: "quantity",
      headerName: "Estimated qty",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => p.row.quantity.toFixed(3),
    },
    {
      field: "verifiedQty",
      headerName: "Verified qty",
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      renderCell: (p) => (getSummary(p.row.id)?.cumulativeVerifiedQty ?? 0).toFixed(3),
    },
    {
      field: "progress",
      headerName: "Progress",
      flex: 0.9,
      minWidth: 120,
      sortable: false,
      renderCell: (p) => {
        const pct = getSummary(p.row.id)?.percentComplete ?? 0;
        return (
          <Box sx={{ width: 1, minWidth: 120, display: "flex", alignItems: "center", height: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Math.max(0, pct))}
              sx={{ width: 1 }}
            />
          </Box>
        );
      },
    },
  ];

  const recordColumns: GridColDef[] = [
    { field: "date", headerName: "Date", flex: 0.7, minWidth: 110 },
    {
      field: "description",
      headerName: "Description",
      flex: 1.4,
      minWidth: 180,
      valueGetter: (_v, row) => row.description ?? "—",
    },
    {
      field: "executedQty",
      headerName: "Executed qty",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => p.row.executedQty.toFixed(3),
    },
    {
      field: "remarks",
      headerName: "Remarks",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => row.remarks ?? "—",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.7,
      minWidth: 110,
      renderCell: (p) => (
        <Chip
          label={p.row.status}
          size="small"
          sx={tagSx(p.row.status === "VERIFIED" ? "green" : "cool-gray")}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 110,
      renderCell: (p) => {
        const rec = p.row;
        return (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", height: 1 }}>
            {rec.status === "DRAFT" && canApprove && (
              <IconButton
                size="small"
                aria-label="Verify measurement"
                onClick={() => verifyM.mutate({ id: rec.id })}
                disabled={verifyM.isPending}
              >
                <Check fontSize="small" />
              </IconButton>
            )}
            {rec.status === "DRAFT" && (
              <IconButton
                size="small"
                color="error"
                aria-label="Remove"
                onClick={() => removeM.mutate({ id: rec.id })}
                disabled={removeM.isPending}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            )}
          </Stack>
        );
      },
    },
  ];

  return (
    <Stack spacing={3}>
      <Typography variant="h6" component="h3">Site Measurement Book</Typography>
      <DataState
        loading={elementsQ.isLoading}
        isEmpty={!elementsQ.isLoading && (elementsQ.data?.elements.length ?? 0) === 0}
        empty={{ title: "No elements", description: "Add elements in the Estimate tab first." }}
        columnCount={6}
      >
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Elements — execution progress
          </Typography>
          <DataGrid
            rows={elements}
            columns={elementColumns}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
            onRowClick={(params) => setSelectedId(selectedId === params.id ? null : (params.id as string))}
            getRowClassName={(params) => (params.id === selectedId ? "esti-cms-row-selected" : "")}
            sx={{
              "& .MuiDataGrid-row": { cursor: "pointer" },
              "& .esti-cms-row-selected": { backgroundColor: "var(--cds-layer-selected)" },
            }}
          />
        </Stack>
      </DataState>

      {selectedElement && (
        <Stack spacing={2}>
          <div className="esti-row-between">
            <Typography variant="subtitle1" component="h4">
              {selectedElement.code}: {selectedElement.description}
            </Typography>
            <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setAddOpen(true)}>
              Add measurement
            </Button>
          </div>
          <DataState
            loading={recordsQ.isLoading}
            isEmpty={!recordsQ.isLoading && (recordsQ.data?.length ?? 0) === 0}
            empty={{ title: "No measurements", description: "Record the first site measurement for this element." }}
            columnCount={6}
          >
            <DataGrid
              rows={recordsQ.data ?? []}
              columns={recordColumns}
              density="compact"
              disableRowSelectionOnClick
              hideFooter
              autoHeight
            />
          </DataState>
        </Stack>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{`Add measurement — ${selectedElement?.code ?? ""}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="sm-date"
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              fullWidth
              {...shrink}
            />
            <TextField
              id="sm-desc"
              label="Description (optional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
            />
            <TextField
              id="sm-qty"
              label={`Executed quantity${selectedElement?.unit ? ` (${selectedElement.unit})` : ""}`}
              type="number"
              value={form.executedQty}
              onChange={(e) => setForm((f) => ({ ...f, executedQty: Number(e.target.value) }))}
              slotProps={{ htmlInput: { min: 0, step: 0.001 } }}
              fullWidth
            />
            <TextField
              id="sm-remarks"
              label="Remarks (optional)"
              value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={createM.isPending || form.executedQty <= 0 || !form.date}
            onClick={() => {
              if (!selectedId) return;
              createM.mutate({
                projectId,
                elementId: selectedId,
                date: form.date,
                description: form.description || undefined,
                executedQty: form.executedQty,
                remarks: form.remarks || undefined,
              });
            }}
          >
            {createM.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
