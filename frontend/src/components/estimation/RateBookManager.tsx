import {
  Button,
  Chip,
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
import AddIcon from "@mui/icons-material/Add";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useEffect, useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { formatINR, parseRupeeInput } from "@esti/contracts";
import { ConfirmModal } from "../ConfirmModal.js";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

const blankItemForm = () => ({
  itemCode: "",
  description: "",
  specification: "",
  unit: "",
  rate: "",
});

/** Library › Rate Books — firm rate sets that price project estimates (BOQ). */
export function RateBookManager() {
  const utils = trpc.useUtils();
  const booksQ = trpc.rateBooks.list.useQuery();
  const [rateBookId, setRateBookId] = useState("");
  useEffect(() => {
    if (!rateBookId && booksQ.data && booksQ.data.length > 0) {
      setRateBookId(booksQ.data[0]!.id);
    }
  }, [booksQ.data, rateBookId]);

  const itemsQ = trpc.rateBooks.listItems.useQuery({ rateBookId }, { enabled: !!rateBookId });
  const selectedBook = booksQ.data?.find((b) => b.id === rateBookId);

  const [bOpen, setBOpen] = useState(false);
  const [bForm, setBForm] = useState({ name: "", versionLabel: "", effectiveDate: "", description: "" });
  const createBook = trpc.rateBooks.create.useMutation({
    onSuccess: (row) => {
      utils.rateBooks.list.invalidate();
      setRateBookId(row.id);
      setBOpen(false);
      setBForm({ name: "", versionLabel: "", effectiveDate: "", description: "" });
    },
  });
  const setLocked = trpc.rateBooks.setLocked.useMutation({
    onSuccess: () => utils.rateBooks.list.invalidate(),
  });

  const [iOpen, setIOpen] = useState(false);
  const [iForm, setIForm] = useState(blankItemForm());
  const upsertItem = trpc.rateBooks.upsertItem.useMutation({
    onSuccess: () => {
      utils.rateBooks.listItems.invalidate({ rateBookId });
      setIOpen(false);
      setIForm(blankItemForm());
    },
  });
  const removeItem = trpc.rateBooks.removeItem.useMutation({
    onSuccess: () => utils.rateBooks.listItems.invalidate({ rateBookId }),
  });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useScreenActions(
    [
      {
        id: "rb-new-book",
        zone: "center",
        tone: "primary",
        label: "New rate book",
        icon: <AddIcon />,
        onClick: () => setBOpen(true),
      },
      {
        id: "rb-add-item",
        zone: "center",
        tone: "primary",
        label: "Add item",
        icon: <AddIcon />,
        disabled: !rateBookId || !!selectedBook?.locked,
        onClick: () => setIOpen(true),
      },
      ...(selectedBook
        ? [
            {
              id: "rb-toggle-lock",
              zone: "right" as const,
              label: selectedBook.locked ? "Unlock" : "Lock",
              icon: selectedBook.locked ? <LockOpenIcon /> : <LockIcon />,
              onClick: () => setLocked.mutate({ id: rateBookId, locked: !selectedBook.locked }),
            },
          ]
        : []),
    ],
    [rateBookId, selectedBook?.locked],
  );

  const columns: GridColDef[] = [
    { field: "itemCode", headerName: "Code", flex: 0.7, minWidth: 90, valueGetter: (v: string | null) => v ?? "—" },
    { field: "description", headerName: "Description", flex: 2, minWidth: 220 },
    {
      field: "specification",
      headerName: "Specification",
      flex: 2,
      minWidth: 220,
      valueGetter: (v: string | null) => v ?? "—",
    },
    { field: "unit", headerName: "Unit", flex: 0.6, minWidth: 80 },
    {
      field: "ratePaise",
      headerName: "Rate",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => formatINR(p.row.ratePaise, { paise: false }),
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 100,
      renderCell: (p) =>
        selectedBook?.locked ? null : (
          <Button variant="text" color="error" size="small" onClick={() => setConfirmId(p.row.id)}>
            Remove
          </Button>
        ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <TextField
          id="rb-select"
          select
          label="Rate book"
          value={rateBookId}
          onChange={(e) => setRateBookId(e.target.value)}
          sx={{ minWidth: 280 }}
        >
          <MenuItem value="">Select…</MenuItem>
          {(booksQ.data ?? []).map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.name}
              {b.versionLabel ? ` — ${b.versionLabel}` : ""}
            </MenuItem>
          ))}
        </TextField>
        {selectedBook?.locked && <Chip size="small" label="Locked" color="warning" variant="outlined" />}
      </Stack>

      <DataState
        loading={!!rateBookId && itemsQ.isLoading}
        isEmpty={!rateBookId || (itemsQ.data ?? []).length === 0}
        columnCount={5}
        empty={{
          title: rateBookId ? "No items in this rate book" : "Select or create a rate book",
          description: rateBookId ? "Add item code, description, unit and rate." : undefined,
          action:
            rateBookId && !selectedBook?.locked ? (
              <Button size="small" variant="contained" onClick={() => setIOpen(true)}>
                Add item
              </Button>
            ) : undefined,
        }}
      >
        <Stack spacing={1}>
          {selectedBook?.description && <Typography variant="body2">{selectedBook.description}</Typography>}
          <DataGrid
            rows={itemsQ.data ?? []}
            columns={columns}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
            getRowHeight={() => "auto"}
          />
        </Stack>
      </DataState>

      <ConfirmModal
        open={!!confirmId}
        heading="Remove rate book item?"
        body="Estimates that already used this item keep their own copy."
        confirmText="Remove"
        pending={removeItem.isPending}
        onConfirm={() => {
          if (confirmId) removeItem.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />

      <Dialog open={bOpen} onClose={() => setBOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New rate book</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="rb-name"
              label="Name"
              placeholder="e.g. Office standard rates"
              value={bForm.name}
              onChange={(e) => setBForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                id="rb-version"
                label="Version label (optional)"
                placeholder="e.g. 2026-Q3"
                value={bForm.versionLabel}
                onChange={(e) => setBForm((f) => ({ ...f, versionLabel: e.target.value }))}
                fullWidth
              />
              <TextField
                id="rb-effective"
                type="date"
                label="Effective date (optional)"
                value={bForm.effectiveDate}
                onChange={(e) => setBForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
            <TextField
              id="rb-desc"
              label="Description (optional)"
              value={bForm.description}
              onChange={(e) => setBForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setBOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!bForm.name.trim() || createBook.isPending}
            onClick={() =>
              createBook.mutate({
                name: bForm.name,
                versionLabel: bForm.versionLabel || undefined,
                effectiveDate: bForm.effectiveDate || undefined,
                description: bForm.description || undefined,
              })
            }
          >
            {createBook.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={iOpen} onClose={() => setIOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Add rate book item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                id="rbi-code"
                label="Item code (optional)"
                value={iForm.itemCode}
                onChange={(e) => setIForm((f) => ({ ...f, itemCode: e.target.value }))}
                sx={{ maxWidth: 160 }}
              />
              <TextField
                id="rbi-unit"
                label="Unit"
                placeholder="cum, sqm, kg, nos…"
                value={iForm.unit}
                onChange={(e) => setIForm((f) => ({ ...f, unit: e.target.value }))}
                sx={{ maxWidth: 160 }}
              />
              <TextField
                id="rbi-rate"
                label="Rate (₹)"
                type="number"
                value={iForm.rate}
                onChange={(e) => setIForm((f) => ({ ...f, rate: e.target.value }))}
                fullWidth
              />
            </Stack>
            <TextField
              id="rbi-desc"
              label="Description"
              value={iForm.description}
              onChange={(e) => setIForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
            />
            <TextField
              id="rbi-spec"
              label="Specification (optional)"
              multiline
              minRows={2}
              value={iForm.specification}
              onChange={(e) => setIForm((f) => ({ ...f, specification: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setIOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!iForm.description.trim() || !iForm.unit.trim() || upsertItem.isPending}
            onClick={() =>
              upsertItem.mutate({
                rateBookId,
                itemCode: iForm.itemCode || undefined,
                description: iForm.description,
                specification: iForm.specification || undefined,
                unit: iForm.unit,
                ratePaise: parseRupeeInput(iForm.rate),
              })
            }
          >
            {upsertItem.isPending ? "Adding…" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
