import {
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
import AddIcon from "@mui/icons-material/Add";
import { useEffect, useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { ConfirmModal } from "../ConfirmModal.js";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

const blankItemForm = () => ({
  category: "",
  item: "",
  make: "",
  specification: "",
  finish: "",
  remarks: "",
});

export function SpecCatalogManager({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const versionsQ = trpc.specCatalog.listVersions.useQuery();
  const [versionId, setVersionId] = useState("");
  useEffect(() => {
    if (!versionId && versionsQ.data && versionsQ.data.length > 0) {
      const active = versionsQ.data.find((v) => v.active);
      setVersionId(active?.id ?? versionsQ.data[0]!.id);
    }
  }, [versionsQ.data, versionId]);

  const itemsQ = trpc.specCatalog.listItems.useQuery(
    { versionId },
    { enabled: !!versionId },
  );

  const [vOpen, setVOpen] = useState(false);
  const [vForm, setVForm] = useState({ label: "", description: "" });
  const createVersion = trpc.specCatalog.createVersion.useMutation({
    meta: { errorTitle: "Couldn't create the catalogue version" },
    onSuccess: (row) => {
      utils.specCatalog.listVersions.invalidate();
      setVersionId(row.id);
      setVOpen(false);
      setVForm({ label: "", description: "" });
    },
  });
  const setActive = trpc.specCatalog.setActiveVersion.useMutation({
    meta: { errorTitle: "Couldn't activate the catalogue version" },
    onSuccess: () => {
      utils.specCatalog.listVersions.invalidate();
      utils.specCatalog.activeCatalog.invalidate();
    },
  });

  const [iOpen, setIOpen] = useState(false);
  const [iForm, setIForm] = useState(blankItemForm());
  const createItem = trpc.specCatalog.createItem.useMutation({
    meta: { errorTitle: "Couldn't create the specification" },
    onSuccess: () => {
      utils.specCatalog.listItems.invalidate({ versionId });
      utils.specCatalog.activeCatalog.invalidate();
      setIOpen(false);
      setIForm(blankItemForm());
    },
  });
  const removeItem = trpc.specCatalog.removeItem.useMutation({
    meta: { errorTitle: "Couldn't delete the specification" },
    onSuccess: () => {
      utils.specCatalog.listItems.invalidate({ versionId });
      utils.specCatalog.activeCatalog.invalidate();
    },
  });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const activeVersion = versionsQ.data?.find((v) => v.id === versionId);

  useScreenActions(
    [
      {
        id: "spec-new-version",
        zone: "center",
        tone: "primary",
        label: "New version",
        icon: <AddIcon />,
        onClick: () => setVOpen(true),
      },
      {
        id: "spec-add-item",
        zone: "center",
        tone: "primary",
        label: "Add item",
        icon: <AddIcon />,
        disabled: !versionId,
        onClick: () => setIOpen(true),
      },
      ...(activeVersion && !activeVersion.active
        ? [
            {
              id: "spec-set-active",
              zone: "right" as const,
              label: "Set active",
              onClick: () => setActive.mutate({ id: versionId }),
            },
          ]
        : []),
    ],
    [versionId, activeVersion?.active],
  );

  const columns: GridColDef[] = [
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      valueGetter: (value: string | null) => value ?? "—",
    },
    { field: "item", headerName: "Item", flex: 1 },
    {
      field: "make",
      headerName: "Make",
      flex: 1,
      valueGetter: (value: string | null) => value ?? "—",
    },
    {
      field: "specification",
      headerName: "Specification",
      flex: 2,
      valueGetter: (value: string | null) => value ?? "—",
    },
    {
      field: "finish",
      headerName: "Finish",
      flex: 1,
      valueGetter: (value: string | null) => value ?? "—",
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 110,
      renderCell: (params) => (
        <Button
          variant="text"
          color="error"
          size="small"
          onClick={() => setConfirmId(params.row.id)}
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <Typography variant={embedded ? "h5" : "h4"} component={embedded ? "h2" : "h1"}>
          Brand catalogue
        </Typography>
        <Typography variant="body2">
          Versioned make / brand and finish schedule rows used when creating
          project spec sheets.
        </Typography>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <TextField
          id="spec-catalog-ver"
          select
          label="Catalogue version"
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">Select…</MenuItem>
          {(versionsQ.data ?? []).map((v) => (
            <MenuItem key={v.id} value={v.id}>
              {`${v.label}${v.active ? " (active)" : ""}`}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <DataState
        loading={!!versionId && itemsQ.isLoading}
        isEmpty={!versionId || (itemsQ.data ?? []).length === 0}
        columnCount={6}
        empty={{
          title: versionId
            ? "No catalogue items in this version"
            : "Select or create a catalogue version",
          description: versionId
            ? "Add category, item, make, specification, and finish rows."
            : undefined,
          action: versionId ? (
            <Button size="small" variant="contained" onClick={() => setIOpen(true)}>
              Add item
            </Button>
          ) : undefined,
        }}
      >
        <Stack spacing={1}>
          <Stack spacing={0.5}>
            <Typography variant="h6" component="h3">Catalogue items</Typography>
            {activeVersion?.description && (
              <Typography variant="body2">{activeVersion.description}</Typography>
            )}
          </Stack>
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
        heading="Remove catalogue item?"
        body="Project spec sheets that already copied this row keep their snapshot."
        confirmText="Remove"
        pending={removeItem.isPending}
        onConfirm={() => {
          if (confirmId) removeItem.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />

      <Dialog aria-labelledby="spec-catalog-manager-version-title" open={vOpen} onClose={() => setVOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle id="spec-catalog-manager-version-title">New catalogue version</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="sc-label"
              label="Version label"
              placeholder="e.g. Office standard 2026"
              value={vForm.label}
              onChange={(e) => setVForm((f) => ({ ...f, label: e.target.value }))}
              fullWidth
            />
            <TextField
              id="sc-desc"
              label="Description (optional)"
              value={vForm.description}
              onChange={(e) =>
                setVForm((f) => ({ ...f, description: e.target.value }))
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setVOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!vForm.label || createVersion.isPending}
            onClick={() =>
              createVersion.mutate({
                label: vForm.label,
                description: vForm.description || undefined,
              })
            }
          >
            {createVersion.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog aria-labelledby="spec-catalog-manager-item-title" open={iOpen} onClose={() => setIOpen(false)} fullWidth maxWidth="md">
        <DialogTitle id="spec-catalog-manager-item-title">Add catalogue item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                id="sci-category"
                label="Category"
                value={iForm.category}
                onChange={(e) =>
                  setIForm((f) => ({ ...f, category: e.target.value }))
                }
                fullWidth
              />
              <TextField
                id="sci-item"
                label="Item"
                value={iForm.item}
                onChange={(e) => setIForm((f) => ({ ...f, item: e.target.value }))}
                fullWidth
              />
              <TextField
                id="sci-make"
                label="Make"
                value={iForm.make}
                onChange={(e) => setIForm((f) => ({ ...f, make: e.target.value }))}
                fullWidth
              />
            </Stack>
            <TextField
              id="sci-spec"
              label="Specification"
              multiline
              minRows={3}
              value={iForm.specification}
              onChange={(e) =>
                setIForm((f) => ({ ...f, specification: e.target.value }))
              }
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                id="sci-finish"
                label="Finish"
                value={iForm.finish}
                onChange={(e) =>
                  setIForm((f) => ({ ...f, finish: e.target.value }))
                }
                fullWidth
              />
              <TextField
                id="sci-remarks"
                label="Remarks"
                value={iForm.remarks}
                onChange={(e) =>
                  setIForm((f) => ({ ...f, remarks: e.target.value }))
                }
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setIOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!iForm.item.trim() || createItem.isPending}
            onClick={() =>
              createItem.mutate({
                versionId,
                category: iForm.category || undefined,
                item: iForm.item,
                make: iForm.make || undefined,
                specification: iForm.specification || undefined,
                finish: iForm.finish || undefined,
                remarks: iForm.remarks || undefined,
              })
            }
          >
            {createItem.isPending ? "Adding…" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
