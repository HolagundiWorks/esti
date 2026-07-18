import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import {
  ESTIMATE_STATUS_LABEL,
  ESTIMATE_STATUS_TAG,
  ESTIMATE_TRANSITIONS,
  SHAPE_DIMS,
  formatINR,
  parseRupeeInput,
  type EstimateStatus,
  type EstimateTotals,
  type MeasureShape,
} from "@esti/contracts";
import { ConfirmModal } from "./ConfirmModal.js";
import { DataState } from "./DataState.js";
import { StatusDot } from "./StatusTag.js";
import { trpc } from "../lib/trpc.js";

interface EstimateMeasurementRow {
  id: string;
  description: string | null;
  nos: number;
  length: number;
  breadth: number;
  depth: number;
  quantity: number;
}

interface EstimateItemRow {
  id: string;
  estimateId: string;
  itemCode: string | null;
  description: string;
  unit: string;
  quantity: number;
  ratePaise: number;
  amountPaise: number;
  shape: MeasureShape;
  measurements: EstimateMeasurementRow[];
}

interface EstimateDetail {
  id: string;
  ref: string;
  rateBookId: string;
  title: string;
  status: string;
  contingencyPct: number;
  gstPct: number;
  notes: string | null;
  items: EstimateItemRow[];
  totals: EstimateTotals;
}

const blankItem = () => ({ itemCode: "", description: "", unit: "", quantity: "1", rate: "", rateBookItemId: "" });
const blankMeasurement = () => ({ description: "", nos: "1", length: "0", breadth: "0", depth: "0", directQuantity: "0" });

function MeasurementsDialog({
  item,
  onClose,
}: {
  item: EstimateItemRow | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState(blankMeasurement());
  const dims = item ? SHAPE_DIMS[item.shape as MeasureShape] : null;

  const invalidate = () => item && utils.estimates.byId.invalidate({ id: item.estimateId });
  const upsert = trpc.estimates.upsertMeasurement.useMutation({
    onSuccess: () => {
      invalidate();
      setForm(blankMeasurement());
    },
  });
  const remove = trpc.estimates.removeMeasurement.useMutation({ onSuccess: invalidate });

  if (!item || !dims) return null;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Measurement book — {item.description}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Unit "{item.unit}" — {dims.direct ? "quantity entered directly" : "nos × dimensions computes the quantity"}.
          </Typography>
          {(item.measurements ?? []).length > 0 && (
            <Stack spacing={0.5}>
              {item.measurements.map((m) => (
                <Stack
                  key={m.id}
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: "center", py: 0.5, borderBottom: 1, borderColor: "divider" }}
                >
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {m.description || "—"}
                    {!dims.direct &&
                      ` — ${m.nos} × ${m.length}${dims.breadth ? ` × ${m.breadth}` : ""}${dims.depth ? ` × ${m.depth}` : ""}`}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.quantity.toFixed(2)}</Typography>
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    onClick={() => remove.mutate({ id: m.id, estimateItemId: item.id })}
                  >
                    Remove
                  </Button>
                </Stack>
              ))}
            </Stack>
          )}
          <Divider />
          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
            <TextField
              id="ms-desc"
              label="Description (optional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              sx={{ flex: 1, minWidth: 160 }}
            />
            {dims.direct ? (
              <TextField
                id="ms-direct"
                label="Quantity"
                type="number"
                value={form.directQuantity}
                onChange={(e) => setForm((f) => ({ ...f, directQuantity: e.target.value }))}
                sx={{ width: 120 }}
              />
            ) : (
              <>
                {dims.nos && (
                  <TextField
                    id="ms-nos"
                    label="Nos"
                    type="number"
                    value={form.nos}
                    onChange={(e) => setForm((f) => ({ ...f, nos: e.target.value }))}
                    sx={{ width: 90 }}
                  />
                )}
                {dims.length && (
                  <TextField
                    id="ms-length"
                    label={dims.lengthLabel ?? "Length"}
                    type="number"
                    value={form.length}
                    onChange={(e) => setForm((f) => ({ ...f, length: e.target.value }))}
                    sx={{ width: 110 }}
                  />
                )}
                {dims.breadth && (
                  <TextField
                    id="ms-breadth"
                    label={dims.breadthLabel ?? "Breadth"}
                    type="number"
                    value={form.breadth}
                    onChange={(e) => setForm((f) => ({ ...f, breadth: e.target.value }))}
                    sx={{ width: 110 }}
                  />
                )}
                {dims.depth && (
                  <TextField
                    id="ms-depth"
                    label={dims.depthLabel ?? "Depth"}
                    type="number"
                    value={form.depth}
                    onChange={(e) => setForm((f) => ({ ...f, depth: e.target.value }))}
                    sx={{ width: 110 }}
                  />
                )}
              </>
            )}
            <Button
              variant="outlined"
              onClick={() =>
                upsert.mutate({
                  estimateItemId: item.id,
                  description: form.description || undefined,
                  nos: Number(form.nos || "0"),
                  length: Number(form.length || "0"),
                  breadth: Number(form.breadth || "0"),
                  depth: Number(form.depth || "0"),
                  directQuantity: Number(form.directQuantity || "0"),
                })
              }
              disabled={upsert.isPending}
            >
              Add line
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function EstimateEditor({ estimateId, onBack }: { estimateId: string; onBack: () => void }) {
  const utils = trpc.useUtils();
  const detailQ = trpc.estimates.byId.useQuery({ id: estimateId });
  const invalidate = () => utils.estimates.byId.invalidate({ id: estimateId });

  const [itemOpen, setItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState(blankItem());
  const [measureFor, setMeasureFor] = useState<EstimateItemRow | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const estimate = detailQ.data as EstimateDetail | null | undefined;
  const rateBookItemsQ = trpc.rateBooks.listItems.useQuery(
    { rateBookId: estimate?.rateBookId ?? "" },
    { enabled: !!estimate?.rateBookId },
  );

  const upsertItem = trpc.estimates.upsertItem.useMutation({
    onSuccess: () => {
      invalidate();
      setItemOpen(false);
      setItemForm(blankItem());
    },
  });
  const removeItem = trpc.estimates.removeItem.useMutation({ onSuccess: invalidate });
  const updateHeader = trpc.estimates.updateHeader.useMutation({ onSuccess: invalidate });
  const setStatus = trpc.estimates.setStatus.useMutation({ onSuccess: invalidate });

  if (detailQ.isLoading) return <Typography variant="body2">Loading…</Typography>;
  if (!estimate) return <Typography variant="body2">Estimate not found.</Typography>;

  const readOnly = estimate.status === "APPROVED" || estimate.status === "CANCELLED";

  const columns: GridColDef<EstimateItemRow>[] = [
    { field: "itemCode", headerName: "Code", flex: 0.6, minWidth: 80, valueGetter: (v: string | null) => v ?? "—" },
    { field: "description", headerName: "Description", flex: 2, minWidth: 220 },
    { field: "unit", headerName: "Unit", flex: 0.5, minWidth: 70 },
    {
      field: "quantity",
      headerName: "Qty",
      flex: 0.6,
      minWidth: 80,
      renderCell: (p) => p.row.quantity.toFixed(2),
    },
    {
      field: "ratePaise",
      headerName: "Rate",
      flex: 0.8,
      minWidth: 100,
      renderCell: (p) => formatINR(p.row.ratePaise, { paise: false }),
    },
    {
      field: "amountPaise",
      headerName: "Amount",
      flex: 0.9,
      minWidth: 120,
      renderCell: (p) => formatINR(p.row.amountPaise, { paise: false }),
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 180,
      renderCell: (p) =>
        readOnly ? null : (
          <Stack direction="row" spacing={0.5}>
            <Button variant="text" size="small" onClick={() => setMeasureFor(p.row)}>
              Measure
            </Button>
            <Button variant="text" color="error" size="small" onClick={() => setConfirmRemoveId(p.row.id)}>
              Remove
            </Button>
          </Stack>
        ),
    },
  ];

  const t = estimate.totals;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Button variant="text" onClick={onBack}>← All estimates</Button>
        <Typography variant="h6" component="h3" sx={{ flex: 1 }}>
          {estimate.ref} — {estimate.title}
        </Typography>
        <TextField
          id="est-status"
          select
          size="small"
          label="Status"
          value={estimate.status}
          onChange={(e) => setStatus.mutate({ id: estimate.id, status: e.target.value as EstimateStatus })}
          sx={{ minWidth: 160 }}
        >
          {[estimate.status as EstimateStatus, ...(ESTIMATE_TRANSITIONS[estimate.status as EstimateStatus] ?? [])].map(
            (s) => (
              <MenuItem key={s} value={s}>{ESTIMATE_STATUS_LABEL[s]}</MenuItem>
            ),
          )}
        </TextField>
        <StatusDot color={ESTIMATE_STATUS_TAG[estimate.status as EstimateStatus]} label={ESTIMATE_STATUS_LABEL[estimate.status as EstimateStatus]} />
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
        <TextField
          id="est-contingency"
          label="Contingency %"
          type="number"
          size="small"
          disabled={readOnly}
          defaultValue={estimate.contingencyPct}
          onBlur={(e) => updateHeader.mutate({ id: estimate.id, contingencyPct: Number(e.target.value || "0") })}
          sx={{ width: 140 }}
        />
        <TextField
          id="est-gst"
          label="GST %"
          type="number"
          size="small"
          disabled={readOnly}
          defaultValue={estimate.gstPct}
          onBlur={(e) => updateHeader.mutate({ id: estimate.id, gstPct: Number(e.target.value || "0") })}
          sx={{ width: 140 }}
        />
        <TextField
          id="est-notes"
          label="Notes"
          size="small"
          disabled={readOnly}
          defaultValue={estimate.notes ?? ""}
          onBlur={(e) => updateHeader.mutate({ id: estimate.id, notes: e.target.value || null })}
          sx={{ flex: 1, minWidth: 200 }}
        />
      </Stack>

      {!readOnly && (
        <Box>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setItemOpen(true)}>
            Add item
          </Button>
        </Box>
      )}

      <DataGrid
        rows={estimate.items}
        columns={columns}
        density="compact"
        disableRowSelectionOnClick
        hideFooter
        autoHeight
        getRowHeight={() => "auto"}
        localeText={{ noRowsLabel: "No items yet — add one from the rate book or ad hoc." }}
      />

      <Stack spacing={0.5} sx={{ maxWidth: 360, alignSelf: "flex-end" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="body2">Items subtotal</Typography>
          <Typography variant="body2">{formatINR(t.itemsSubtotalPaise, { paise: false })}</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="body2">Contingency ({estimate.contingencyPct}%)</Typography>
          <Typography variant="body2">{formatINR(t.contingencyPaise, { paise: false })}</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="body2">Taxable</Typography>
          <Typography variant="body2">{formatINR(t.taxablePaise, { paise: false })}</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="body2">GST ({estimate.gstPct}%)</Typography>
          <Typography variant="body2">{formatINR(t.gstPaise, { paise: false })}</Typography>
        </Stack>
        <Divider />
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Grand total</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {formatINR(t.grandTotalPaise, { paise: false })}
          </Typography>
        </Stack>
      </Stack>

      <ConfirmModal
        open={!!confirmRemoveId}
        heading="Remove item?"
        body="This also removes its measurement-book lines."
        confirmText="Remove"
        pending={removeItem.isPending}
        onConfirm={() => {
          if (confirmRemoveId) removeItem.mutate({ id: confirmRemoveId });
          setConfirmRemoveId(null);
        }}
        onClose={() => setConfirmRemoveId(null)}
      />

      <MeasurementsDialog item={measureFor} onClose={() => setMeasureFor(null)} />

      <Dialog open={itemOpen} onClose={() => setItemOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Add estimate item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {(rateBookItemsQ.data?.length ?? 0) > 0 && (
              <TextField
                id="ei-from-book"
                select
                label="Load from rate book (optional)"
                value={itemForm.rateBookItemId}
                onChange={(e) => {
                  const src = rateBookItemsQ.data?.find((x) => x.id === e.target.value);
                  setItemForm((f) => ({
                    ...f,
                    rateBookItemId: e.target.value,
                    itemCode: src?.itemCode ?? f.itemCode,
                    description: src?.description ?? f.description,
                    unit: src?.unit ?? f.unit,
                    rate: src ? String(src.ratePaise / 100) : f.rate,
                  }));
                }}
                fullWidth
              >
                <MenuItem value="">— Ad hoc —</MenuItem>
                {(rateBookItemsQ.data ?? []).map((it) => (
                  <MenuItem key={it.id} value={it.id}>
                    {[it.itemCode, it.description].filter(Boolean).join(" — ")}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <Stack direction="row" spacing={2}>
              <TextField
                id="ei-code"
                label="Code (optional)"
                value={itemForm.itemCode}
                onChange={(e) => setItemForm((f) => ({ ...f, itemCode: e.target.value }))}
                sx={{ maxWidth: 140 }}
              />
              <TextField
                id="ei-unit"
                label="Unit"
                value={itemForm.unit}
                onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))}
                sx={{ maxWidth: 140 }}
              />
              <TextField
                id="ei-qty"
                label="Quantity"
                type="number"
                value={itemForm.quantity}
                onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
                fullWidth
              />
              <TextField
                id="ei-rate"
                label="Rate (₹)"
                type="number"
                value={itemForm.rate}
                onChange={(e) => setItemForm((f) => ({ ...f, rate: e.target.value }))}
                fullWidth
              />
            </Stack>
            <TextField
              id="ei-desc"
              label="Description"
              value={itemForm.description}
              onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
            />
            <Typography variant="caption" color="text.secondary">
              Amount preview: {formatINR(Math.round(parseRupeeInput(itemForm.rate) * Number(itemForm.quantity || "0")), { paise: false })}.
              Add measurement-book lines afterwards to compute quantity from dimensions instead.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setItemOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!itemForm.description.trim() || !itemForm.unit.trim() || upsertItem.isPending}
            onClick={() =>
              upsertItem.mutate({
                estimateId: estimate.id,
                rateBookItemId: itemForm.rateBookItemId || undefined,
                itemCode: itemForm.itemCode || undefined,
                description: itemForm.description,
                unit: itemForm.unit,
                quantity: Number(itemForm.quantity || "0"),
                ratePaise: parseRupeeInput(itemForm.rate),
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

/** Project → Estimation — priced BOQ against a firm rate book (SOP-scoped: no contracts/running bills). */
export function ProjectEstimates({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.estimates.listByProject.useQuery({ projectId });
  const rateBooksQ = trpc.rateBooks.list.useQuery();
  const [selected, setSelected] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", rateBookId: "", date: "", contingencyPct: "0", gstPct: "0" });
  const create = trpc.estimates.create.useMutation({
    onSuccess: (row) => {
      utils.estimates.listByProject.invalidate({ projectId });
      setOpen(false);
      setForm({ title: "", rateBookId: "", date: "", contingencyPct: "0", gstPct: "0" });
      setSelected(row.id);
    },
  });

  if (selected) return <EstimateEditor estimateId={selected} onBack={() => setSelected(null)} />;

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.7, minWidth: 100 },
    { field: "title", headerName: "Title", flex: 1.5, minWidth: 200 },
    {
      field: "status",
      headerName: "Status",
      flex: 0.7,
      minWidth: 110,
      renderCell: (p) => (
        <StatusDot
          color={ESTIMATE_STATUS_TAG[p.row.status as EstimateStatus]}
          label={ESTIMATE_STATUS_LABEL[p.row.status as EstimateStatus]}
        />
      ),
    },
    {
      field: "grandTotalPaise",
      headerName: "Grand total",
      flex: 0.9,
      minWidth: 130,
      renderCell: (p) => formatINR(p.row.grandTotalPaise, { paise: false }),
    },
  ];

  return (
    <Stack spacing={2}>
      <Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          disabled={(rateBooksQ.data ?? []).length === 0}
          onClick={() => setOpen(true)}
        >
          New estimate
        </Button>
        {(rateBooksQ.data ?? []).length === 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            No rate books yet — create one under Library → Rate Books before starting an estimate.
          </Alert>
        )}
      </Box>

      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={4}
        empty={{ title: "No estimates yet", description: "Build a priced BOQ against a firm rate book." }}
      >
        <DataGrid
          rows={listQ.data ?? []}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
          onRowClick={(p) => setSelected(p.row.id)}
          sx={{ cursor: "pointer" }}
        />
      </DataState>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New estimate</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="new-est-title"
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              fullWidth
            />
            <TextField
              id="new-est-rb"
              select
              label="Rate book"
              value={form.rateBookId}
              onChange={(e) => setForm((f) => ({ ...f, rateBookId: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">Select…</MenuItem>
              {(rateBooksQ.data ?? []).map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                id="new-est-date"
                type="date"
                label="Date (optional)"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                id="new-est-contingency"
                label="Contingency %"
                type="number"
                value={form.contingencyPct}
                onChange={(e) => setForm((f) => ({ ...f, contingencyPct: e.target.value }))}
                fullWidth
              />
              <TextField
                id="new-est-gst"
                label="GST %"
                type="number"
                value={form.gstPct}
                onChange={(e) => setForm((f) => ({ ...f, gstPct: e.target.value }))}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.title.trim() || !form.rateBookId || create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                rateBookId: form.rateBookId,
                title: form.title,
                date: form.date || undefined,
                contingencyPct: Number(form.contingencyPct || "0"),
                gstPct: Number(form.gstPct || "0"),
              })
            }
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
