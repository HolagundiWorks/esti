import {
  Alert,
  Box,
  Button,
  Chip,
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
import DeleteOutline from "@mui/icons-material/DeleteOutlineOutlined";
import {
  VENDOR_CATEGORIES,
  VendorCategory,
  formatINR,
  vendorScore,
  type VendorCategoryCode,
} from "@esti/contracts";
import type { ReactNode } from "react";
import { useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { DataState } from "../components/DataState.js";
import { RailLayout } from "../components/RailLayout.js";
import { VendorQuotes } from "../components/vendor/VendorQuotes.js";
import { VendorRateCompare } from "../components/vendor/VendorRateCompare.js";
import { trpc } from "../lib/trpc.js";

type FormState = {
  id?: string;
  name: string; category: VendorCategoryCode;
  companyName: string; contactPerson: string;
  gstin: string; pan: string; email: string; phone: string; city: string; state: string;
};

const EMPTY: FormState = {
  name: "", category: "CEMENT", companyName: "", contactPerson: "",
  gstin: "", pan: "", email: "", phone: "", city: "", state: "",
};

const EMPTY_PRICE = {
  materialName: "", unit: "", rateRupees: 0,
  effectiveDate: new Date().toISOString().slice(0, 10),
  source: "MANUAL" as "QUOTE" | "INVOICE" | "MANUAL",
  notes: "",
};

function scoreTag(score: number): "green" | "teal" | "blue" | "gray" {
  if (score >= 4.5) return "green";
  if (score >= 3.5) return "teal";
  if (score > 0) return "blue";
  return "gray";
}

/** Status badge rendered over the Carbon `--cds-tag-*` token vars (exact colours). */
function TagChip({ color, label }: { color: string; label: ReactNode }) {
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        backgroundColor: `var(--cds-tag-background-${color})`,
        color: `var(--cds-tag-color-${color})`,
      }}
    />
  );
}

export function Vendors() {
  const utils = trpc.useUtils();
  const [category, setCategory] = useState("");
  const listQ = trpc.vendors.list.useQuery({
    category: category ? (category as VendorCategoryCode) : undefined,
  });
  const rows = listQ.data ?? [];

  const invalidate = () => utils.vendors.list.invalidate();
  const [form, setForm] = useState<FormState | null>(null);
  const [rating, setRating] = useState<{ id: string; name: string; quality: string; reliability: string; pricing: string; notes: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [priceForm, setPriceForm] = useState<typeof EMPTY_PRICE | null>(null);
  const [confirmPriceId, setConfirmPriceId] = useState<string | null>(null);

  const create = trpc.vendors.create.useMutation({ onSuccess: () => { invalidate(); setForm(null); } });
  const update = trpc.vendors.update.useMutation({ onSuccess: () => { invalidate(); setForm(null); } });
  const setRatingM = trpc.vendors.setRating.useMutation({ onSuccess: () => { invalidate(); setRating(null); } });
  const remove = trpc.vendors.remove.useMutation({ onSuccess: () => { invalidate(); setSelectedId(null); } });

  const pricesQ = trpc.vendors.pricesByVendor.useQuery(
    { vendorId: selectedId! },
    { enabled: !!selectedId },
  );
  const addPrice = trpc.vendors.addPrice.useMutation({
    onSuccess: () => { void pricesQ.refetch(); setPriceForm(null); },
  });
  const removePrice = trpc.vendors.removePrice.useMutation({ onSuccess: () => void pricesQ.refetch() });

  const saving = create.isPending || update.isPending;
  const err = create.error || update.error;
  const selected = rows.find((v) => v.id === selectedId);

  const submit = () => {
    if (!form) return;
    const payload = {
      name: form.name, category: form.category,
      companyName: form.companyName || undefined, contactPerson: form.contactPerson || undefined,
      gstin: form.gstin || undefined, pan: form.pan || undefined,
      email: form.email || undefined, phone: form.phone || undefined,
      city: form.city || undefined, state: form.state || undefined,
    };
    if (form.id) update.mutate({ id: form.id, ...payload });
    else create.mutate(payload);
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1.3,
      minWidth: 180,
      renderCell: (p) => {
        const v = p.row;
        return (
          <Stack spacing={0.25} sx={{ justifyContent: "center", height: 1, py: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span>{v.name}</span>
              {!v.active && <TagChip color="gray" label="Inactive" />}
            </Box>
            {v.companyName && <Typography variant="caption" color="text.secondary">{v.companyName}</Typography>}
            {(v.city || v.state) && (
              <Typography variant="caption" color="text.secondary">
                {[v.city, v.state].filter(Boolean).join(", ")}
              </Typography>
            )}
          </Stack>
        );
      },
    },
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => VENDOR_CATEGORIES[row.category as VendorCategoryCode] ?? row.category,
    },
    {
      field: "contact",
      headerName: "Contact",
      flex: 1.2,
      minWidth: 170,
      sortable: false,
      renderCell: (p) => {
        const v = p.row;
        return (
          <Stack spacing={0.25} sx={{ justifyContent: "center", height: 1, py: 0.5 }}>
            <span>{v.contactPerson ?? "—"}</span>
            {v.phone && <Typography variant="caption" color="text.secondary">{v.phone}</Typography>}
            {v.email && <Typography variant="caption" color="text.secondary">{v.email}</Typography>}
          </Stack>
        );
      },
    },
    {
      field: "gstinPan",
      headerName: "GSTIN / PAN",
      flex: 1.1,
      minWidth: 160,
      sortable: false,
      renderCell: (p) => {
        const v = p.row;
        return (
          <Stack spacing={0.25} sx={{ justifyContent: "center", height: 1, py: 0.5 }}>
            <span>{v.gstin ?? "—"}</span>
            {v.pan && <Typography variant="caption" color="text.secondary">{v.pan}</Typography>}
          </Stack>
        );
      },
    },
    {
      field: "rating",
      headerName: "Rating",
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      renderCell: (p) => {
        const score = vendorScore(p.row);
        return score > 0 ? (
          <TagChip color={scoreTag(score)} label={`${score.toFixed(1)} / 5`} />
        ) : (
          <TagChip color="gray" label="Unrated" />
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1.2,
      minWidth: 220,
      sortable: false,
      filterable: false,
      renderCell: (p) => {
        const v = p.row;
        return (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", height: 1 }}>
            <Button
              variant="text"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setForm({
                  id: v.id, name: v.name, category: v.category as VendorCategoryCode,
                  companyName: v.companyName ?? "", contactPerson: v.contactPerson ?? "",
                  gstin: v.gstin ?? "", pan: v.pan ?? "", email: v.email ?? "", phone: v.phone ?? "",
                  city: v.city ?? "", state: v.state ?? "",
                });
              }}
            >
              Edit
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setRating({
                  id: v.id, name: v.name,
                  quality: v.qualityRating ? String(v.qualityRating) : "",
                  reliability: v.reliabilityRating ? String(v.reliabilityRating) : "",
                  pricing: v.pricingRating ? String(v.pricingRating) : "",
                  notes: v.notes ?? "",
                });
              }}
            >
              Rate
            </Button>
            <Button
              variant="text"
              size="small"
              color="error"
              onClick={(e) => { e.stopPropagation(); setConfirmId(v.id); }}
            >
              Remove
            </Button>
          </Stack>
        );
      },
    },
  ];

  const priceColumns: GridColDef[] = [
    { field: "materialName", headerName: "Material", flex: 1.3, minWidth: 180 },
    { field: "unit", headerName: "Unit", flex: 0.6, minWidth: 90 },
    {
      field: "ratePaise",
      headerName: "Rate",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => formatINR(p.row.ratePaise),
    },
    { field: "effectiveDate", headerName: "Effective", flex: 0.8, minWidth: 120 },
    {
      field: "source",
      headerName: "Source",
      flex: 0.7,
      minWidth: 110,
      sortable: false,
      renderCell: (p) => <TagChip color="cool-gray" label={p.row.source} />,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.5,
      minWidth: 90,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <IconButton
          size="small"
          color="error"
          aria-label="Remove price"
          onClick={() => setConfirmPriceId(p.row.id)}
        >
          <DeleteOutline fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <RailLayout
        title="Vendors"
        description="Material supplier directory — categories, statutory ids, ratings and pricing history."
        aside={
          <Stack spacing={1.5}>
            <TextField
              id="vn-cat"
              select
              size="small"
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              fullWidth
            >
              <MenuItem value="">All categories</MenuItem>
              {VendorCategory.options.map((c) => (
                <MenuItem key={c} value={c}>{VENDOR_CATEGORIES[c]}</MenuItem>
              ))}
            </TextField>
            <Button variant="contained" fullWidth onClick={() => setForm({ ...EMPTY })}>New vendor</Button>
          </Stack>
        }
      >
      {listQ.error && (
        <Alert severity="error">
          <strong>Could not load vendors</strong> — {listQ.error.message}
        </Alert>
      )}

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={6}
        empty={{ title: "No vendors yet", description: "Add a material supplier to track contacts, ratings and pricing.", action: <Button variant="contained" size="small" onClick={() => setForm({ ...EMPTY })}>New vendor</Button> }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          density="compact"
          getRowHeight={() => "auto"}
          disableRowSelectionOnClick
          hideFooter
          autoHeight
          onRowClick={(params) => setSelectedId(selectedId === params.id ? null : (params.id as string))}
          getRowClassName={(params) => (params.id === selectedId ? "esti-vendor-selected" : "")}
          sx={{
            "& .MuiDataGrid-row": { cursor: "pointer" },
            "& .esti-vendor-selected": { backgroundColor: "var(--cds-layer-selected)" },
          }}
        />
      </DataState>

      {/* Pricing history for the selected vendor */}
      {selected && (
        <Stack spacing={2}>
          <Box className="esti-row-between">
            <Typography variant="h6" component="h4">{selected.name} — Pricing history</Typography>
            <Button size="small" startIcon={<Add />} onClick={() => setPriceForm({ ...EMPTY_PRICE })}>
              Add price
            </Button>
          </Box>
          <DataState
            loading={pricesQ.isLoading}
            isEmpty={!pricesQ.isLoading && (pricesQ.data?.length ?? 0) === 0}
            empty={{ title: "No price records", description: "Record a quoted or invoiced rate for a material from this vendor." }}
            columnCount={6}
          >
            <DataGrid
              rows={pricesQ.data ?? []}
              columns={priceColumns}
              density="compact"
              disableRowSelectionOnClick
              hideFooter
              autoHeight
            />
          </DataState>

          <VendorQuotes vendorId={selected.id} />
        </Stack>
      )}

      <VendorRateCompare />
      </RailLayout>

      {/* create / edit vendor */}
      <Dialog open={form !== null} onClose={() => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{form?.id ? "Edit vendor" : "New vendor"}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField id="vn-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField id="vn-fcat" select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as VendorCategoryCode })}>
                {VendorCategory.options.map((c) => <MenuItem key={c} value={c}>{VENDOR_CATEGORIES[c]}</MenuItem>)}
              </TextField>
              <TextField id="vn-company" label="Company (optional)" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              <Stack direction="row" spacing={2}>
                <TextField id="vn-contact" label="Contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} sx={{ flex: 1 }} />
                <TextField id="vn-phone" label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} sx={{ flex: 1 }} />
              </Stack>
              <TextField id="vn-email" label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Stack direction="row" spacing={2}>
                <TextField id="vn-gstin" label="GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} sx={{ flex: 1 }} />
                <TextField id="vn-pan" label="PAN" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} sx={{ flex: 1 }} />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField id="vn-city" label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} sx={{ flex: 1 }} />
                <TextField id="vn-state" label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} sx={{ flex: 1 }} />
              </Stack>
              {err && (
                <Alert severity="error">
                  <strong>Could not save</strong> — {err.message}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setForm(null)}>Cancel</Button>
          <Button variant="contained" disabled={!form?.name || saving} onClick={submit}>
            {saving ? "Saving…" : form?.id ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* rating */}
      <Dialog open={rating !== null} onClose={() => setRating(null)} fullWidth maxWidth="sm">
        <DialogTitle>{rating ? `Rate — ${rating.name}` : "Rate"}</DialogTitle>
        <DialogContent>
          {rating && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {([["quality", "Quality"], ["reliability", "Reliability"], ["pricing", "Pricing"]] as const).map(([k, label]) => (
                <TextField key={k} id={`vn-r-${k}`} select label={label} value={rating[k]}
                  onChange={(e) => setRating({ ...rating, [k]: e.target.value })}>
                  <MenuItem value="">— not rated —</MenuItem>
                  {[5, 4, 3, 2, 1].map((n) => <MenuItem key={n} value={String(n)}>{`${n} / 5`}</MenuItem>)}
                </TextField>
              ))}
              <TextField id="vn-r-notes" label="Notes (optional)" multiline rows={3} value={rating.notes}
                onChange={(e) => setRating({ ...rating, notes: e.target.value })} />
              {setRatingM.error && (
                <Alert severity="error">
                  <strong>Could not save</strong> — {setRatingM.error.message}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setRating(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={setRatingM.isPending}
            onClick={() => rating && setRatingM.mutate({
              id: rating.id,
              qualityRating: rating.quality ? Number(rating.quality) : undefined,
              reliabilityRating: rating.reliability ? Number(rating.reliability) : undefined,
              pricingRating: rating.pricing ? Number(rating.pricing) : undefined,
              notes: rating.notes || undefined,
            })}
          >
            {setRatingM.isPending ? "Saving…" : "Save rating"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* add price */}
      <Dialog open={priceForm !== null} onClose={() => setPriceForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{`Add price${selected ? ` — ${selected.name}` : ""}`}</DialogTitle>
        <DialogContent>
          {priceForm && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField id="vp-mat" label="Material" placeholder="OPC 53 grade cement" value={priceForm.materialName}
                onChange={(e) => setPriceForm({ ...priceForm, materialName: e.target.value })} />
              <Stack direction="row" spacing={2}>
                <TextField id="vp-unit" label="Unit" placeholder="bag" value={priceForm.unit}
                  onChange={(e) => setPriceForm({ ...priceForm, unit: e.target.value })} sx={{ flex: 1 }} />
                <TextField id="vp-rate" label="Rate (₹)" type="number" value={priceForm.rateRupees}
                  slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                  onChange={(e) => setPriceForm({ ...priceForm, rateRupees: Number(e.target.value) })} sx={{ flex: 1 }} />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField id="vp-date" label="Effective date" type="date" value={priceForm.effectiveDate}
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) => setPriceForm({ ...priceForm, effectiveDate: e.target.value })} sx={{ flex: 1 }} />
                <TextField id="vp-src" select label="Source" value={priceForm.source}
                  onChange={(e) => setPriceForm({ ...priceForm, source: e.target.value as "QUOTE" | "INVOICE" | "MANUAL" })} sx={{ flex: 1 }}>
                  <MenuItem value="MANUAL">Manual</MenuItem>
                  <MenuItem value="QUOTE">Quote</MenuItem>
                  <MenuItem value="INVOICE">Invoice</MenuItem>
                </TextField>
              </Stack>
              <TextField id="vp-notes" label="Notes (optional)" value={priceForm.notes}
                onChange={(e) => setPriceForm({ ...priceForm, notes: e.target.value })} />
              {addPrice.error && (
                <Alert severity="error">
                  <strong>Could not save</strong> — {addPrice.error.message}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setPriceForm(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={addPrice.isPending || !priceForm?.materialName || !priceForm?.unit || (priceForm?.rateRupees ?? 0) <= 0}
            onClick={() => {
              if (!priceForm || !selectedId) return;
              addPrice.mutate({
                vendorId: selectedId,
                materialName: priceForm.materialName,
                unit: priceForm.unit,
                ratePaise: Math.round(priceForm.rateRupees * 100),
                effectiveDate: priceForm.effectiveDate,
                source: priceForm.source,
                notes: priceForm.notes || undefined,
              });
            }}
          >
            {addPrice.isPending ? "Saving…" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmModal
        open={!!confirmId} heading="Remove vendor?" body="This permanently removes the vendor and all its price records."
        confirmText="Remove" pending={remove.isPending}
        onConfirm={() => { if (confirmId) remove.mutate({ id: confirmId }); setConfirmId(null); }}
        onClose={() => setConfirmId(null)}
      />
      <ConfirmModal
        open={!!confirmPriceId} heading="Remove price record?" body="This removes the price record from the vendor's history."
        confirmText="Remove" pending={removePrice.isPending}
        onConfirm={() => { if (confirmPriceId) removePrice.mutate({ id: confirmPriceId }); setConfirmPriceId(null); }}
        onClose={() => setConfirmPriceId(null)}
      />
    </>
  );
}
