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
import {
  MEASUREMENT_UOM_LABEL,
  MeasureKind,
  MeasurementUom,
  PlanMarkerKind,
} from "@esti/contracts";
import { useScreenActions } from "@hcw/ui-kit";
import { ConfirmModal } from "../ConfirmModal.js";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

const MEASURE_KIND_OPTIONS: MeasureKind[] = ["L", "LB", "LBH", "COUNT"];
const UOM_OPTIONS: MeasurementUom[] = ["SQM", "CUM", "RMT", "NOS", "KG", "LTR"];
const MARKER_OPTIONS: PlanMarkerKind[] = [
  "WALL",
  "DOOR",
  "WINDOW",
  "COLUMN",
  "HEIGHT",
  "SECTION",
  "POLYLINE",
  "COUNT",
];

const blankItemForm = () => ({
  code: "",
  chapter: "",
  particulars: "",
  uom: "SQM" as MeasurementUom,
  measureKind: "LB" as MeasureKind,
  markerKinds: [] as PlanMarkerKind[],
  defaultBreadthMm: "",
});

export function ItemLibraryManager({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const versionsQ = trpc.itemLibrary.listVersions.useQuery();
  const [versionId, setVersionId] = useState("");
  useEffect(() => {
    if (!versionId && versionsQ.data && versionsQ.data.length > 0) {
      const active = versionsQ.data.find((v) => v.active);
      setVersionId(active?.id ?? versionsQ.data[0]!.id);
    }
  }, [versionsQ.data, versionId]);

  const itemsQ = trpc.itemLibrary.listItems.useQuery(
    { versionId },
    { enabled: !!versionId },
  );

  const [vOpen, setVOpen] = useState(false);
  const [vLabel, setVLabel] = useState("");
  const createVersion = trpc.itemLibrary.createVersion.useMutation({
    meta: { errorTitle: "Couldn't create the library version" },
    onSuccess: (row) => {
      utils.itemLibrary.listVersions.invalidate();
      setVersionId(row.id);
      setVOpen(false);
      setVLabel("");
    },
  });
  const setActive = trpc.itemLibrary.setActiveVersion.useMutation({
    meta: { errorTitle: "Couldn't activate the library version" },
    onSuccess: () => {
      utils.itemLibrary.listVersions.invalidate();
      utils.itemLibrary.activeCatalog.invalidate();
    },
  });

  const [iOpen, setIOpen] = useState(false);
  const [iForm, setIForm] = useState(blankItemForm());
  const upsertItem = trpc.itemLibrary.upsertItem.useMutation({
    meta: { errorTitle: "Couldn't save the item" },
    onSuccess: () => {
      utils.itemLibrary.listItems.invalidate({ versionId });
      utils.itemLibrary.activeCatalog.invalidate();
      setIOpen(false);
      setIForm(blankItemForm());
    },
  });
  const removeItem = trpc.itemLibrary.removeItem.useMutation({
    meta: { errorTitle: "Couldn't delete the item" },
    onSuccess: () => {
      utils.itemLibrary.listItems.invalidate({ versionId });
      utils.itemLibrary.activeCatalog.invalidate();
    },
  });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const activeVersion = versionsQ.data?.find((v) => v.id === versionId);

  useScreenActions(
    [
      {
        id: "items-new-version",
        zone: "center",
        tone: "primary",
        label: "New version",
        icon: <AddIcon />,
        onClick: () => setVOpen(true),
      },
      {
        id: "items-add-item",
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
              id: "items-set-active",
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
    { field: "code", headerName: "Code", width: 90 },
    { field: "chapter", headerName: "Chapter", flex: 1 },
    { field: "particulars", headerName: "Particulars", flex: 2 },
    {
      field: "uom",
      headerName: "UOM",
      width: 80,
      valueGetter: (value: MeasurementUom) => MEASUREMENT_UOM_LABEL[value] ?? value,
    },
    { field: "measureKind", headerName: "Measure", width: 90 },
    {
      field: "markerKinds",
      headerName: "Markers",
      flex: 1,
      valueGetter: (_v, row) =>
        Array.isArray(row.markerKinds) && row.markerKinds.length > 0
          ? row.markerKinds.join(", ")
          : "—",
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
          Standard items library
        </Typography>
        <Typography variant="body2">
          Office BOQ templates — code, particulars, UOM, and dimension rules for project
          measurement sheets and plan markup (Phase 2).
        </Typography>
      </Stack>

      <TextField
        id="item-library-ver"
        select
        label="Library version"
        value={versionId}
        onChange={(e) => setVersionId(e.target.value)}
        sx={{ minWidth: 280 }}
      >
        <MenuItem value="">Select…</MenuItem>
        {(versionsQ.data ?? []).map((v) => (
          <MenuItem key={v.id} value={v.id}>
            {`${v.label}${v.active ? " (active)" : ""}`}
          </MenuItem>
        ))}
      </TextField>

      <DataState
        loading={!!versionId && itemsQ.isLoading}
        isEmpty={!versionId || (itemsQ.data ?? []).length === 0}
        columnCount={7}
        empty={{
          title: versionId ? "No items in this version" : "Select or create a library version",
          description: versionId
            ? "Add standard measurement items with code, chapter, and UOM."
            : undefined,
          action: versionId ? (
            <Button size="small" variant="contained" onClick={() => setIOpen(true)}>
              Add item
            </Button>
          ) : undefined,
        }}
      >
        <Stack spacing={1}>
          <Typography variant="h6" component="h3">
            Library items
          </Typography>
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
        heading="Remove library item?"
        body="Existing measurement rows keep their particulars snapshot."
        confirmText="Remove"
        pending={removeItem.isPending}
        onConfirm={() => {
          if (confirmId) removeItem.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />

      <Dialog aria-labelledby="item-library-manager-version-title" open={vOpen} onClose={() => setVOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle id="item-library-manager-version-title">New library version</DialogTitle>
        <DialogContent>
          <TextField
            id="il-label"
            label="Version label"
            placeholder="e.g. Office standard 2026"
            value={vLabel}
            onChange={(e) => setVLabel(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setVOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!vLabel.trim() || createVersion.isPending}
            onClick={() => createVersion.mutate({ label: vLabel.trim() })}
          >
            {createVersion.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog aria-labelledby="item-library-manager-item-title" open={iOpen} onClose={() => setIOpen(false)} fullWidth maxWidth="md">
        <DialogTitle id="item-library-manager-item-title">Add library item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                id="ili-code"
                label="Code"
                value={iForm.code}
                onChange={(e) => setIForm((f) => ({ ...f, code: e.target.value }))}
                sx={{ width: 120 }}
              />
              <TextField
                id="ili-chapter"
                label="Chapter"
                value={iForm.chapter}
                onChange={(e) => setIForm((f) => ({ ...f, chapter: e.target.value }))}
                fullWidth
              />
            </Stack>
            <TextField
              id="ili-particulars"
              label="Particulars"
              multiline
              minRows={2}
              value={iForm.particulars}
              onChange={(e) => setIForm((f) => ({ ...f, particulars: e.target.value }))}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                id="ili-uom"
                select
                label="UOM"
                value={iForm.uom}
                onChange={(e) =>
                  setIForm((f) => ({ ...f, uom: e.target.value as MeasurementUom }))
                }
                sx={{ minWidth: 120 }}
              >
                {UOM_OPTIONS.map((u) => (
                  <MenuItem key={u} value={u}>
                    {MEASUREMENT_UOM_LABEL[u]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                id="ili-measure"
                select
                label="Measure kind"
                value={iForm.measureKind}
                onChange={(e) =>
                  setIForm((f) => ({ ...f, measureKind: e.target.value as MeasureKind }))
                }
                sx={{ minWidth: 140 }}
              >
                {MEASURE_KIND_OPTIONS.map((k) => (
                  <MenuItem key={k} value={k}>
                    {k}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                id="ili-breadth"
                label="Default breadth (mm)"
                value={iForm.defaultBreadthMm}
                onChange={(e) =>
                  setIForm((f) => ({ ...f, defaultBreadthMm: e.target.value }))
                }
                sx={{ minWidth: 160 }}
              />
            </Stack>
            <TextField
              id="ili-markers"
              select
              slotProps={{ select: { multiple: true } }}
              label="Plan marker kinds (Phase 2)"
              value={iForm.markerKinds}
              onChange={(e) => {
                const v = e.target.value;
                setIForm((f) => ({
                  ...f,
                  markerKinds: (typeof v === "string" ? v.split(",") : v) as PlanMarkerKind[],
                }));
              }}
              fullWidth
            >
              {MARKER_OPTIONS.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setIOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={
              !iForm.code.trim() ||
              !iForm.chapter.trim() ||
              !iForm.particulars.trim() ||
              upsertItem.isPending
            }
            onClick={() =>
              upsertItem.mutate({
                versionId,
                code: iForm.code.trim(),
                chapter: iForm.chapter.trim(),
                particulars: iForm.particulars.trim(),
                uom: iForm.uom,
                measureKind: iForm.measureKind,
                markerKinds: iForm.markerKinds,
                defaultBreadthMm: iForm.defaultBreadthMm
                  ? Number.parseInt(iForm.defaultBreadthMm, 10)
                  : null,
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
