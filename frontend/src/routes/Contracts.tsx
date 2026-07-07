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
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  CONTRACT_TYPE_LABEL,
  ContractStatus,
  ContractType,
  formatINR,
  type TagColor,
} from "@esti/contracts";
import { useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { DataState } from "../components/DataState.js";
import { RailLayout } from "../components/RailLayout.js";
import { StatusTag } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<string, TagColor> = {
  DRAFT: "gray",
  ACTIVE: "green",
  ON_HOLD: "blue",
  COMPLETED: "magenta",
  TERMINATED: "red",
};

export function Contracts() {
  const utils = trpc.useUtils();
  const listQ = trpc.contracts.list.useQuery();
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const inv = () => utils.contracts.list.invalidate();
  const updateStatus = trpc.contracts.updateStatus.useMutation({
    onSuccess: inv,
  });
  const remove = trpc.contracts.remove.useMutation({ onSuccess: inv });

  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    projectId: "",
    title: "",
    party: "",
    contractType: "CLIENT",
    value: "",
    startDate: "",
    endDate: "",
    notes: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((x) => ({ ...x, [k]: e.target.value }));
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const create = trpc.contracts.create.useMutation({
    onSuccess: () => {
      inv();
      setOpen(false);
      setF({
        projectId: "",
        title: "",
        party: "",
        contractType: "CLIENT",
        value: "",
        startDate: "",
        endDate: "",
        notes: "",
      });
    },
  });

  const rows = listQ.data ?? [];

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 1, minWidth: 110 },
    {
      field: "title",
      headerName: "Title / party",
      flex: 2,
      minWidth: 200,
      renderCell: (p) => (
        <Box>
          {p.row.title}
          <Box>{p.row.party}</Box>
        </Box>
      ),
    },
    {
      field: "contractType",
      headerName: "Type",
      flex: 1,
      minWidth: 120,
      valueGetter: (_v, row) =>
        CONTRACT_TYPE_LABEL[row.contractType as keyof typeof CONTRACT_TYPE_LABEL] ??
        row.contractType,
    },
    {
      field: "valuePaise",
      headerName: "Value",
      flex: 1,
      minWidth: 120,
      renderCell: (p) =>
        p.row.valuePaise ? formatINR(p.row.valuePaise, { paise: false }) : "—",
    },
    {
      field: "term",
      headerName: "Term",
      flex: 1.4,
      minWidth: 160,
      sortable: false,
      renderCell: (p) => `${p.row.startDate ?? "—"} → ${p.row.endDate ?? "—"}`,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1.6,
      minWidth: 220,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <TextField
            id={`c-st-${p.row.id}`}
            select
            size="small"
            value={p.row.status}
            onChange={(e) =>
              updateStatus.mutate({
                id: p.row.id,
                status: e.target.value as (typeof ContractStatus.options)[number],
              })
            }
            sx={{ minWidth: 120 }}
          >
            {ContractStatus.options.map((st) => (
              <MenuItem key={st} value={st}>{st}</MenuItem>
            ))}
          </TextField>
          <StatusTag value={p.row.status} map={STATUS_TAG} />
        </Stack>
      ),
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 100,
      renderCell: (p) => (
        <Button variant="text" color="error" size="small" onClick={() => setConfirmId(p.row.id)}>
          Delete
        </Button>
      ),
    },
  ];

  return (
    <>
      <RailLayout
        title="Contracts"
        description="Agreements with clients, consultants and vendors."
        actions={
          <Button variant="contained" fullWidth onClick={() => setOpen(true)}>
            New contract
          </Button>
        }
      >
        <DataState
          loading={listQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={6}
          empty={{
            title: "No contracts yet",
            description:
              "Register an agreement to track parties, value and term.",
            action: (
              <Button variant="contained" size="small" onClick={() => setOpen(true)}>
                New contract
              </Button>
            ),
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            density="compact"
            disableRowSelectionOnClick
            autoHeight
            rowHeight={64}
          />
        </DataState>
      </RailLayout>

      <ConfirmModal
        open={!!confirmId}
        heading="Delete contract?"
        body="This permanently removes the contract record."
        confirmText="Delete"
        pending={remove.isPending}
        onConfirm={() => {
          if (confirmId) remove.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New contract</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="ct-title"
              label="Title"
              value={f.title}
              onChange={set("title")}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                id="ct-party"
                label="Party"
                value={f.party}
                onChange={set("party")}
                sx={{ flex: 1 }}
              />
              <TextField
                id="ct-type"
                select
                label="Type"
                value={f.contractType}
                onChange={set("contractType")}
                sx={{ flex: 1 }}
              >
                {ContractType.options.map((t) => (
                  <MenuItem key={t} value={t}>{CONTRACT_TYPE_LABEL[t]}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                id="ct-val"
                label="Value (₹)"
                type="number"
                value={f.value}
                onChange={set("value")}
                sx={{ flex: 1 }}
              />
              <TextField
                id="ct-start"
                label="Start date"
                type="date"
                value={f.startDate}
                onChange={set("startDate")}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 1 }}
              />
              <TextField
                id="ct-end"
                label="End date"
                type="date"
                value={f.endDate}
                onChange={set("endDate")}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 1 }}
              />
            </Stack>
            <TextField
              id="ct-proj"
              select
              label="Related project (optional)"
              value={f.projectId}
              onChange={set("projectId")}
            >
              <MenuItem value="">— none —</MenuItem>
              {(projectsQ.data ?? []).map((p) => (
                <MenuItem key={p.id} value={p.id}>{`${p.ref} — ${p.title}`}</MenuItem>
              ))}
            </TextField>
            <TextField
              id="ct-notes"
              label="Notes (optional)"
              multiline
              rows={3}
              value={f.notes}
              onChange={set("notes")}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!f.title || !f.party || create.isPending}
            onClick={() =>
              create.mutate({
                projectId: f.projectId || undefined,
                title: f.title,
                party: f.party,
                contractType:
                  f.contractType as (typeof ContractType.options)[number],
                valuePaise: Math.round(Number(f.value || "0") * 100),
                startDate: f.startDate || undefined,
                endDate: f.endDate || undefined,
                notes: f.notes || undefined,
              })
            }
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
