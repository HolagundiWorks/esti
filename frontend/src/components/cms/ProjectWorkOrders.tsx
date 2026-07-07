import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import Add from "@mui/icons-material/Add";
import Check from "@mui/icons-material/Check";
import DeleteOutline from "@mui/icons-material/DeleteOutlineOutlined";
import { formatINR } from "@esti/contracts";
import { DataState } from "../DataState.js";
import { StatusDot } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

type WoItem = {
  id: string;
  description: string;
  unit: string;
  agreedRatePaise: number;
  sortOrder: number;
  createdAt: string;
  specificationId: string | null;
};

const STATUS_TAG: Record<string, "gray" | "blue" | "green"> = {
  DRAFT: "gray",
  ISSUED: "blue",
  CLOSED: "green",
};

const shrink = { slotProps: { inputLabel: { shrink: true } } } as const;

const EMPTY_WO = {
  contractorId: "",
  ref: "",
  date: new Date().toISOString().slice(0, 10),
  scope: "",
};

const EMPTY_ITEM = { description: "", unit: "m³", agreedRatePaise: 0 };

export function ProjectWorkOrders({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const [selectedWoId, setSelectedWoId] = useState<string | null>(null);
  const [addWoOpen, setAddWoOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [woForm, setWoForm] = useState(EMPTY_WO);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);

  const workOrdersQ = trpc.cms.workOrders.listByProject.useQuery({ projectId });
  const woDetailQ = trpc.cms.workOrders.byId.useQuery(
    { id: selectedWoId! },
    { enabled: !!selectedWoId },
  );

  const invalidateAll = () => {
    void workOrdersQ.refetch();
    if (selectedWoId) {
      void utils.cms.workOrders.byId.invalidate({ id: selectedWoId });
    }
  };

  const createWoM = trpc.cms.workOrders.create.useMutation({
    onSuccess: () => {
      invalidateAll();
      setAddWoOpen(false);
      setWoForm(EMPTY_WO);
    },
  });

  const issueM = trpc.cms.workOrders.issue.useMutation({ onSuccess: invalidateAll });
  const removeWoM = trpc.cms.workOrders.remove.useMutation({
    onSuccess: () => {
      setSelectedWoId(null);
      invalidateAll();
    },
  });

  const addItemM = trpc.cms.workOrders.addItem.useMutation({
    onSuccess: () => {
      void utils.cms.workOrders.byId.invalidate({ id: selectedWoId! });
      setAddItemOpen(false);
      setItemForm(EMPTY_ITEM);
    },
  });

  const removeItemM = trpc.cms.workOrders.removeItem.useMutation({
    onSuccess: () => void utils.cms.workOrders.byId.invalidate({ id: selectedWoId! }),
  });

  const workOrders = workOrdersQ.data ?? [];
  const selectedWo = woDetailQ.data;
  const items: WoItem[] = selectedWo?.items ?? [];
  const woEditable = selectedWo?.status === "DRAFT" || selectedWo?.status === "ISSUED";

  const woColumns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.8, minWidth: 120 },
    {
      field: "contractorName",
      headerName: "Contractor",
      flex: 1.2,
      minWidth: 160,
      valueGetter: (_v, row) => row.contractorName ?? "—",
    },
    { field: "date", headerName: "Date", flex: 0.8, minWidth: 110 },
    {
      field: "status",
      headerName: "Status",
      flex: 0.7,
      minWidth: 100,
      renderCell: (p) => (
        <StatusDot color={STATUS_TAG[p.row.status] ?? "gray"} label={p.row.status} />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 110,
      renderCell: (p) => {
        const wo = p.row;
        return (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", height: 1 }}>
            {wo.status === "DRAFT" && (
              <IconButton
                size="small"
                aria-label="Issue Work Order"
                onClick={(e) => {
                  e.stopPropagation();
                  issueM.mutate({ id: wo.id });
                }}
                disabled={issueM.isPending}
              >
                <Check fontSize="small" />
              </IconButton>
            )}
            {wo.status === "DRAFT" && (
              <IconButton
                size="small"
                color="error"
                aria-label="Remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeWoM.mutate({ id: wo.id });
                }}
                disabled={removeWoM.isPending}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            )}
          </Stack>
        );
      },
    },
  ];

  const itemColumns: GridColDef[] = [
    { field: "description", headerName: "Description", flex: 1.6, minWidth: 200 },
    { field: "unit", headerName: "Unit", flex: 0.5, minWidth: 80 },
    {
      field: "agreedRatePaise",
      headerName: "Agreed rate",
      flex: 0.8,
      minWidth: 130,
      renderCell: (p) => formatINR(p.row.agreedRatePaise),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 90,
      renderCell: (p) =>
        woEditable ? (
          <IconButton
            size="small"
            color="error"
            aria-label="Remove line item"
            onClick={() => removeItemM.mutate({ id: p.row.id })}
            disabled={removeItemM.isPending}
          >
            <DeleteOutline fontSize="small" />
          </IconButton>
        ) : null,
    },
  ];

  return (
    <Stack spacing={3}>
      <div className="esti-row-between">
        <Typography variant="h6" component="h3">Work Orders</Typography>
        <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setAddWoOpen(true)}>
          New Work Order
        </Button>
      </div>

      <DataState
        loading={workOrdersQ.isLoading}
        isEmpty={!workOrdersQ.isLoading && workOrders.length === 0}
        empty={{
          title: "No work orders",
          description: "Create a work order to record a contractor agreement and agreed rates.",
        }}
        columnCount={6}
      >
        <DataGrid
          rows={workOrders}
          columns={woColumns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
          onRowClick={(params) => setSelectedWoId(selectedWoId === params.id ? null : (params.id as string))}
          getRowClassName={(params) => (params.id === selectedWoId ? "esti-cms-row-selected" : "")}
          sx={{
            "& .MuiDataGrid-row": { cursor: "pointer" },
            "& .esti-cms-row-selected": { backgroundColor: "var(--cds-layer-selected)" },
          }}
        />
      </DataState>

      {selectedWo && (
        <Stack spacing={2}>
          <div className="esti-row-between">
            <Typography variant="subtitle1" component="h4">
              {selectedWo.ref} — Line Items
              {selectedWo.scope && (
                <Typography variant="body2" component="span" sx={{ display: "block" }}>
                  {selectedWo.scope}
                </Typography>
              )}
            </Typography>
            {woEditable && (
              <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setAddItemOpen(true)}>
                Add line item
              </Button>
            )}
          </div>

          <DataState
            loading={woDetailQ.isLoading}
            isEmpty={!woDetailQ.isLoading && items.length === 0}
            empty={{
              title: "No line items",
              description: "Add line items to define the scope and agreed rates for this work order.",
            }}
            columnCount={5}
          >
            <DataGrid
              rows={items}
              columns={itemColumns}
              density="compact"
              disableRowSelectionOnClick
              hideFooter
              autoHeight
            />
          </DataState>
        </Stack>
      )}

      {/* New Work Order Dialog */}
      <Dialog open={addWoOpen} onClose={() => setAddWoOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Work Order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <ContractorSelect
              value={woForm.contractorId}
              onChange={(id) => setWoForm((f) => ({ ...f, contractorId: id }))}
            />
            <TextField
              id="wo-ref"
              label="Work Order Ref"
              placeholder="WO-2026-001"
              value={woForm.ref}
              onChange={(e) => setWoForm((f) => ({ ...f, ref: e.target.value }))}
              fullWidth
            />
            <TextField
              id="wo-date"
              label="Date"
              type="date"
              value={woForm.date}
              onChange={(e) => setWoForm((f) => ({ ...f, date: e.target.value }))}
              fullWidth
              {...shrink}
            />
            <TextField
              id="wo-scope"
              label="Scope summary (optional)"
              value={woForm.scope}
              onChange={(e) => setWoForm((f) => ({ ...f, scope: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setAddWoOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              createWoM.isPending ||
              !woForm.contractorId ||
              !woForm.ref ||
              !woForm.date
            }
            onClick={() => {
              createWoM.mutate({
                projectId,
                contractorId: woForm.contractorId,
                ref: woForm.ref,
                date: woForm.date,
                scope: woForm.scope || undefined,
              });
            }}
          >
            {createWoM.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Line Item Dialog */}
      <Dialog open={addItemOpen} onClose={() => setAddItemOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Line Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="wi-desc"
              label="Description"
              placeholder="M30 Concrete (Foundation)"
              value={itemForm.description}
              onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
            />
            <TextField
              id="wi-unit"
              label="Unit"
              placeholder="m³"
              value={itemForm.unit}
              onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))}
              fullWidth
            />
            <TextField
              id="wi-rate"
              label="Agreed rate (₹)"
              type="number"
              helperText="Enter in rupees; stored as paise."
              value={itemForm.agreedRatePaise / 100}
              onChange={(e) =>
                setItemForm((f) => ({ ...f, agreedRatePaise: Math.round(Number(e.target.value) * 100) }))
              }
              slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setAddItemOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              addItemM.isPending ||
              !itemForm.description ||
              !itemForm.unit
            }
            onClick={() => {
              if (!selectedWoId) return;
              addItemM.mutate({
                workOrderId: selectedWoId,
                description: itemForm.description,
                unit: itemForm.unit,
                agreedRatePaise: itemForm.agreedRatePaise,
              });
            }}
          >
            {addItemM.isPending ? "Adding…" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function ContractorSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const contractorsQ = trpc.contractors.list.useQuery();
  const contractors = contractorsQ.data ?? [];
  return (
    <TextField
      id="wo-contractor"
      select
      label="Contractor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
    >
      <MenuItem value="">Select contractor…</MenuItem>
      {contractors.map((c) => (
        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
      ))}
    </TextField>
  );
}
