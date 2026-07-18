import {
  Alert,
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
import AddIcon from "@mui/icons-material/Add";
import {
  CONTRACTOR_CATEGORIES,
  ContractorCategory,
  contractorScore,
  type ContractorCategoryCode,
} from "@esti/contracts";
import { useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusDot } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

type FormState = {
  id?: string;
  name: string; category: ContractorCategoryCode;
  companyName: string; contactPerson: string;
  gstin: string; pan: string; email: string; phone: string; city: string; state: string;
};

const EMPTY: FormState = {
  name: "", category: "CIVIL", companyName: "", contactPerson: "",
  gstin: "", pan: "", email: "", phone: "", city: "", state: "",
};

function scoreTag(score: number): "green" | "teal" | "blue" | "gray" {
  if (score >= 4.5) return "green";
  if (score >= 3.5) return "teal";
  if (score > 0) return "blue";
  return "gray";
}

export function Contractors() {
  const utils = trpc.useUtils();
  const [category, setCategory] = useState("");
  const listQ = trpc.contractors.list.useQuery({
    category: category ? (category as ContractorCategoryCode) : undefined,
  });
  const rows = listQ.data ?? [];

  const invalidate = () => utils.contractors.list.invalidate();
  const [form, setForm] = useState<FormState | null>(null);
  const [rating, setRating] = useState<{ id: string; name: string; quality: string; timeliness: string; safety: string; notes: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const create = trpc.contractors.create.useMutation({ meta: { errorTitle: "Couldn't create the contractor" }, onSuccess: () => { invalidate(); setForm(null); } });
  const update = trpc.contractors.update.useMutation({ meta: { errorTitle: "Couldn't update the contractor" }, onSuccess: () => { invalidate(); setForm(null); } });
  const setRatingM = trpc.contractors.setRating.useMutation({ meta: { errorTitle: "Couldn't save the rating" }, onSuccess: () => { invalidate(); setRating(null); } });
  const remove = trpc.contractors.remove.useMutation({ meta: { errorTitle: "Couldn't delete the contractor" }, onSuccess: invalidate });

  const saving = create.isPending || update.isPending;
  const err = create.error || update.error;

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

  useScreenActions(
    form !== null || rating !== null
      ? []
      : [
          {
            id: "new-contractor",
            zone: "center",
            tone: "primary",
            label: "New contractor",
            icon: <AddIcon />,
            onClick: () => setForm({ ...EMPTY }),
          },
        ],
    [form, rating],
  );

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1.4,
      minWidth: 180,
      renderCell: (p) => {
        const c = p.row;
        return (
          <Box sx={{ py: 0.5 }}>
            <span>{c.name}</span>
            {!c.active && (
              <Box component="span" sx={{ ml: 1 }}>
                <StatusDot color="gray" label="Inactive" />
              </Box>
            )}
            {c.companyName && <div className="esti-label esti-label--secondary">{c.companyName}</div>}
            {(c.city || c.state) && (
              <div className="esti-label esti-label--helper">
                {[c.city, c.state].filter(Boolean).join(", ")}
              </div>
            )}
          </Box>
        );
      },
    },
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => CONTRACTOR_CATEGORIES[row.category as ContractorCategoryCode] ?? row.category,
    },
    {
      field: "contact",
      headerName: "Contact",
      flex: 1.2,
      minWidth: 160,
      sortable: false,
      renderCell: (p) => {
        const c = p.row;
        return (
          <Box sx={{ py: 0.5 }}>
            <span>{c.contactPerson ?? "—"}</span>
            {c.phone && <div className="esti-label esti-label--helper">{c.phone}</div>}
            {c.email && <div className="esti-label esti-label--helper">{c.email}</div>}
          </Box>
        );
      },
    },
    {
      field: "gstin",
      headerName: "GSTIN / PAN",
      flex: 1,
      minWidth: 150,
      sortable: false,
      renderCell: (p) => {
        const c = p.row;
        return (
          <Box sx={{ py: 0.5 }}>
            <span>{c.gstin ?? "—"}</span>
            {c.pan && <div className="esti-label esti-label--helper">{c.pan}</div>}
          </Box>
        );
      },
    },
    {
      field: "performance",
      headerName: "Performance",
      flex: 1,
      minWidth: 130,
      sortable: false,
      renderCell: (p) => {
        const score = contractorScore(p.row);
        return score > 0 ? (
          <StatusDot color={scoreTag(score)} label={`${score.toFixed(1)} / 5`} />
        ) : (
          <StatusDot color="gray" label="Unrated" />
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 200,
      renderCell: (p) => {
        const c = p.row;
        return (
          <RowActionsMenu
            actions={[
              {
                label: "Edit",
                onClick: () => setForm({
                  id: c.id, name: c.name, category: c.category as ContractorCategoryCode,
                  companyName: c.companyName ?? "", contactPerson: c.contactPerson ?? "",
                  gstin: c.gstin ?? "", pan: c.pan ?? "", email: c.email ?? "", phone: c.phone ?? "",
                  city: c.city ?? "", state: c.state ?? "",
                }),
              },
              {
                label: "Rate",
                onClick: () => setRating({
                  id: c.id, name: c.name,
                  quality: c.qualityRating ? String(c.qualityRating) : "",
                  timeliness: c.timelinessRating ? String(c.timelinessRating) : "",
                  safety: c.safetyRating ? String(c.safetyRating) : "",
                  notes: c.notes ?? "",
                }),
              },
              {
                label: "Remove",
                danger: true,
                onClick: () => setConfirmId(c.id),
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <>
      <RailLayout
        title="Contractors"
        description="Construction contractor register — trades, statutory ids and on-site performance."
        aside={
          <Stack spacing={1.5}>
            <TextField
              id="ct-cat"
              select
              size="small"
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              fullWidth
            >
              <MenuItem value="">All categories</MenuItem>
              {ContractorCategory.options.map((c) => (
                <MenuItem key={c} value={c}>{CONTRACTOR_CATEGORIES[c]}</MenuItem>
              ))}
            </TextField>
          </Stack>
        }
      >
      <PageBreadcrumb items={[{ label: "Third Parties" }, { label: "Contractors" }]} />
      {listQ.error && (
        <Alert severity="error">{listQ.error.message}</Alert>
      )}

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={6}
        empty={{ title: "No contractors yet", description: "Add a contractor to invite to tenders and track on site." }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          getRowHeight={() => "auto"}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>
      </RailLayout>

      {/* create / edit */}
      <Dialog aria-labelledby="contractors-form-title" open={form !== null} onClose={() => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle id="contractors-form-title">{form?.id ? "Edit contractor" : "New contractor"}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField id="ct-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField id="ct-fcat" select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ContractorCategoryCode })}>
                {ContractorCategory.options.map((c) => <MenuItem key={c} value={c}>{CONTRACTOR_CATEGORIES[c]}</MenuItem>)}
              </TextField>
              <TextField id="ct-company" label="Company (optional)" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              <Stack direction="row" spacing={2}>
                <TextField id="ct-contact" label="Contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} sx={{ flex: 1 }} />
                <TextField id="ct-phone" label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} sx={{ flex: 1 }} />
              </Stack>
              <TextField id="ct-email" label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Stack direction="row" spacing={2}>
                <TextField id="ct-gstin" label="GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} sx={{ flex: 1 }} />
                <TextField id="ct-pan" label="PAN" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} sx={{ flex: 1 }} />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField id="ct-city" label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} sx={{ flex: 1 }} />
                <TextField id="ct-state" label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} sx={{ flex: 1 }} />
              </Stack>
              {err && <Alert severity="error">{err.message}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setForm(null)}>Cancel</Button>
          <Button variant="contained" disabled={!form?.name || saving} onClick={submit}>
            {saving ? "Saving…" : form?.id ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* rating */}
      <Dialog aria-labelledby="contractors-rate-title" open={rating !== null} onClose={() => setRating(null)} fullWidth maxWidth="sm">
        <DialogTitle id="contractors-rate-title">{rating ? `Rate — ${rating.name}` : "Rate"}</DialogTitle>
        <DialogContent>
          {rating && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {([["quality", "Quality"], ["timeliness", "Timeliness"], ["safety", "Safety"]] as const).map(([k, label]) => (
                <TextField key={k} id={`ct-r-${k}`} select label={label} value={rating[k]}
                  onChange={(e) => setRating({ ...rating, [k]: e.target.value })}>
                  <MenuItem value="">— not rated —</MenuItem>
                  {[5, 4, 3, 2, 1].map((n) => <MenuItem key={n} value={String(n)}>{`${n} / 5`}</MenuItem>)}
                </TextField>
              ))}
              <TextField id="ct-r-notes" label="Notes (optional)" multiline rows={3} value={rating.notes}
                onChange={(e) => setRating({ ...rating, notes: e.target.value })} />
              {setRatingM.error && <Alert severity="error">{setRatingM.error.message}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setRating(null)}>Cancel</Button>
          <Button variant="contained" disabled={setRatingM.isPending} onClick={() => rating && setRatingM.mutate({
            id: rating.id,
            qualityRating: rating.quality ? Number(rating.quality) : undefined,
            timelinessRating: rating.timeliness ? Number(rating.timeliness) : undefined,
            safetyRating: rating.safety ? Number(rating.safety) : undefined,
            notes: rating.notes || undefined,
          })}>
            {setRatingM.isPending ? "Saving…" : "Save rating"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmModal
        open={!!confirmId} heading="Remove contractor?" body="This permanently removes the contractor from the register."
        confirmText="Remove" pending={remove.isPending}
        onConfirm={() => { if (confirmId) remove.mutate({ id: confirmId }); setConfirmId(null); }}
        onClose={() => setConfirmId(null)}
      />
    </>
  );
}
