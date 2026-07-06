import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { formatINR } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../../../lib/trpc.js";

function RateFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const create = trpc.kb.rateBook.create.useMutation({
    onSuccess: () => {
      void utils.kb.rateBook.list.invalidate();
      onClose();
    },
  });
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [rate, setRate] = useState("");

  const ratePaise = Math.round(parseFloat(rate || "0") * 100);
  const valid = code.trim() && description.trim() && unit.trim() && ratePaise >= 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New rate-book entry</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField id="rb-code" label="Code" value={code} onChange={(e) => setCode(e.target.value)} fullWidth />
          <TextField
            id="rb-desc"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
          />
          <TextField id="rb-unit" label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} fullWidth />
          <TextField
            id="rb-rate"
            label="Rate (₹)"
            type="number"
            slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            fullWidth
          />
          {create.error && (
            <Alert severity="error">{create.error.message}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={create.isPending || !valid}
          onClick={() =>
            create.mutate({ code: code.trim(), description: description.trim(), unit: unit.trim(), ratePaise })
          }
        >
          {create.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Rate Book — the office schedule of rates (code · description · unit · rate). */
export function RateBookLibrary() {
  const utils = trpc.useUtils();
  const listQ = trpc.kb.rateBook.list.useQuery();
  const remove = trpc.kb.rateBook.remove.useMutation({
    onSuccess: () => void utils.kb.rateBook.list.invalidate(),
  });
  const [open, setOpen] = useState(false);

  const columns: GridColDef[] = [
    { field: "code", headerName: "Code", width: 140 },
    { field: "description", headerName: "Description", flex: 2 },
    { field: "unit", headerName: "Unit", width: 110 },
    {
      field: "ratePaise",
      headerName: "Rate",
      width: 140,
      valueFormatter: (value: number) => formatINR(value),
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 70,
      renderCell: (params) => (
        <IconButton
          size="small"
          color="error"
          aria-label="Delete"
          title="Delete"
          disabled={remove.isPending}
          onClick={() => remove.mutate({ id: params.row.id })}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h6" component="h3">Rate Book</Typography>
        <Typography variant="body2">
          Your office schedule of rates — code, description, unit and rate.
        </Typography>
      </Stack>
      <DataGrid
        rows={listQ.data ?? []}
        columns={columns}
        density="compact"
        disableRowSelectionOnClick
        hideFooter
        autoHeight
        getRowHeight={() => "auto"}
      />
      <Stack direction="row">
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          New rate
        </Button>
      </Stack>
      {open && <RateFormModal open onClose={() => setOpen(false)} />}
    </Stack>
  );
}
