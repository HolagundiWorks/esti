import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatDimensionMm,
  formatINR,
  MEASUREMENT_UOM_LABEL,
  MeasurementUom,
  deriveElementHeightMm,
  resolveStructuralDeductions,
} from "@esti/contracts";
import { useScreenActions } from "@hcw/ui-kit";
import { ConfirmModal } from "../ConfirmModal.js";
import { DataState } from "../DataState.js";
import { PlanReaderPanel } from "./PlanReaderPanel.js";
import { trpc } from "../../lib/trpc.js";

function metresToMm(value: string): number | null {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 1000);
}

function mmToMetresInput(mm: number | null | undefined): string {
  if (mm == null) return "";
  return (mm / 1000).toFixed(3);
}

type RowForm = {
  particulars: string;
  lengthM: string;
  breadthM: string;
  heightM: string;
  quantity: string;
  uom: MeasurementUom;
  rateInr: string;
  levelId: string;
  /** blank = inherit level / project */
  beamDepthM: string;
  lintelHeightM: string;
};

const blankRowForm = (): RowForm => ({
  particulars: "",
  lengthM: "",
  breadthM: "",
  heightM: "",
  quantity: "",
  uom: "SQM",
  rateInr: "",
  levelId: "",
  beamDepthM: "",
  lintelHeightM: "",
});

export function ProjectMeasurementPanel({ projectId }: { projectId: string }) {
  const [mode, setMode] = useState<"sheet" | "plan">("sheet");
  const utils = trpc.useUtils();
  const bookQ = trpc.measurement.getBook.useQuery({ projectId }, { enabled: !!projectId });
  const levelsQ = trpc.measurement.listLevels.useQuery({ projectId }, { enabled: !!projectId });
  const structuralQ = trpc.measurement.getStructuralDefaults.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const catalogQ = trpc.itemLibrary.activeCatalog.useQuery();

  const upsertRow = trpc.measurement.upsertRow.useMutation({
    onSuccess: () => utils.measurement.getBook.invalidate({ projectId }),
  });
  const addFromLibrary = trpc.measurement.addFromLibrary.useMutation({
    onSuccess: () => utils.measurement.getBook.invalidate({ projectId }),
  });
  const removeRow = trpc.measurement.removeRow.useMutation({
    onSuccess: () => utils.measurement.getBook.invalidate({ projectId }),
  });
  const [rowOpen, setRowOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [rowForm, setRowForm] = useState(blankRowForm());
  const [pickOpen, setPickOpen] = useState(false);
  const [pickItemId, setPickItemId] = useState("");
  const [pickLevelId, setPickLevelId] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const syncHeights = trpc.measurement.syncHeightsFromLevels.useMutation({
    onSuccess: (res) => {
      utils.measurement.getBook.invalidate({ projectId });
      setSyncMsg(
        res.syncedRows > 0
          ? `Updated height on ${res.syncedRows} linked row${res.syncedRows === 1 ? "" : "s"}.`
          : "No linked rows to update (assign a level on each row first).",
      );
    },
  });

  const book = bookQ.data?.book;
  const rows = bookQ.data?.rows ?? [];
  const levels = levelsQ.data ?? [];

  const heightFromLevel = (
    levelId: string,
    recipe: "STOREY" | "COLUMN" | "WALL" = "STOREY",
    rowBeamM = "",
    rowLintelM = "",
  ) => {
    const lvl = levels.find((l) => l.id === levelId);
    const project = structuralQ.data;
    if (!lvl || !project) return "";
    const effective = resolveStructuralDeductions(
      project,
      { beamDepthMm: lvl.beamDepthMm, lintelHeightMm: lvl.lintelHeightMm },
      {
        beamDepthMm: rowBeamM.trim() ? metresToMm(rowBeamM) : null,
        lintelHeightMm: rowLintelM.trim() ? metresToMm(rowLintelM) : null,
      },
    );
    const h = deriveElementHeightMm({
      storeyHeightMm: lvl.storeyHeightMm,
      recipe,
      deductions: effective,
    });
    return h != null ? (h / 1000).toFixed(3) : "";
  };

  const levelLabel = useMemo(() => {
    const map = new Map(levels.map((l) => [l.id, `${l.code} — ${l.name}`]));
    return (id: string | null) => (id ? (map.get(id) ?? "—") : "All levels");
  }, [levels]);

  useScreenActions(
    mode !== "sheet"
      ? []
      : [
          {
            id: "meas-add-row",
            zone: "center",
            tone: "primary",
            label: "Add row",
            icon: <AddIcon />,
            disabled: !book,
            onClick: () => {
              setEditId(null);
              setRowForm(blankRowForm());
              setRowOpen(true);
            },
          },
          {
            id: "meas-from-library",
            zone: "center",
            label: "From library",
            disabled: !book || !(catalogQ.data?.items.length ?? 0),
            onClick: () => setPickOpen(true),
          },
          {
            id: "meas-sync-heights",
            zone: "right",
            label: "Sync heights",
            disabled: !book || levels.length === 0 || syncHeights.isPending,
            onClick: () => syncHeights.mutate({ projectId }),
          },
        ],
    [mode, book, catalogQ.data?.items.length, levels.length, syncHeights.isPending],
  );

  const columns: GridColDef[] = [
    {
      field: "levelId",
      headerName: "Level",
      width: 120,
      valueGetter: (_v, row) => levelLabel(row.levelId as string | null),
    },
    {
      field: "libraryItemCode",
      headerName: "Code",
      width: 80,
      valueGetter: (v: string | null) => v ?? "—",
    },
    { field: "particulars", headerName: "Particulars", flex: 2 },
    {
      field: "lengthMm",
      headerName: "Length (m)",
      width: 100,
      valueGetter: (_v, row) => formatDimensionMm(row.lengthMm as number | null),
    },
    {
      field: "breadthMm",
      headerName: "Breadth (m)",
      width: 110,
      valueGetter: (_v, row) => formatDimensionMm(row.breadthMm as number | null),
    },
    {
      field: "heightMm",
      headerName: "Height (m)",
      width: 100,
      valueGetter: (_v, row) => formatDimensionMm(row.heightMm as number | null),
    },
    {
      field: "quantity",
      headerName: "Qty",
      width: 90,
      valueGetter: (_v, row) => {
        const uom = row.uom as MeasurementUom;
        const q = row.quantity as number;
        return `${q.toFixed(3)} ${MEASUREMENT_UOM_LABEL[uom] ?? uom}`;
      },
    },
    {
      field: "ratePaise",
      headerName: "Rate",
      width: 100,
      valueGetter: (v: number | null) => (v != null ? formatINR(v) : "—"),
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      width: 140,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setEditId(params.row.id);
              setRowForm({
                particulars: params.row.particulars,
                lengthM: mmToMetresInput(params.row.lengthMm),
                breadthM: mmToMetresInput(params.row.breadthMm),
                heightM: mmToMetresInput(params.row.heightMm),
                quantity: String(params.row.quantity ?? ""),
                uom: params.row.uom,
                rateInr: params.row.ratePaise != null ? String(params.row.ratePaise / 100) : "",
                levelId: params.row.levelId ?? "",
                beamDepthM: mmToMetresInput(params.row.beamDepthMm),
                lintelHeightM: mmToMetresInput(params.row.lintelHeightMm),
              });
              setRowOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="small"
            variant="text"
            color="error"
            onClick={() => setConfirmId(params.row.id)}
          >
            Remove
          </Button>
        </Stack>
      ),
    },
  ];

  const saveRow = () => {
    if (!book) return;
    const lengthMm = metresToMm(rowForm.lengthM);
    const breadthMm = metresToMm(rowForm.breadthM);
    const qtyOverride = rowForm.quantity ? Number.parseFloat(rowForm.quantity) : undefined;
    const derivation =
      qtyOverride != null && Number.isFinite(qtyOverride) ? ("OVERRIDE" as const) : ("MANUAL" as const);
    // When a level is linked, height is owned by the level stack — don't send a
    // manual value (server recomputes from storey + slab/beam/lintel).
    const heightMm = rowForm.levelId ? null : metresToMm(rowForm.heightM);
    const ratePaise = rowForm.rateInr
      ? Math.round(Number.parseFloat(rowForm.rateInr) * 100)
      : null;

    upsertRow.mutate({
      bookId: book.id,
      id: editId ?? undefined,
      levelId: rowForm.levelId || null,
      particulars: rowForm.particulars.trim(),
      lengthMm,
      breadthMm,
      heightMm,
      beamDepthMm: rowForm.beamDepthM.trim() ? metresToMm(rowForm.beamDepthM) : null,
      lintelHeightMm: rowForm.lintelHeightM.trim() ? metresToMm(rowForm.lintelHeightM) : null,
      quantity: derivation === "OVERRIDE" ? qtyOverride : undefined,
      uom: rowForm.uom,
      ratePaise,
      derivation,
    });
    setRowOpen(false);
  };

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h6" component="h3">
            Measurement
          </Typography>
          <Typography variant="body2" className="esti-label--secondary">
            {mode === "plan"
              ? "Calibrate the DXF plan, mark walls / doors / windows, then push selected markup to the sheet."
              : "Assign a level on each row — height is linked to that level’s storey (column/wall deduct slab·beam·lintel)."}
          </Typography>
        </Stack>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={(_e, v) => {
            if (v) setMode(v);
          }}
        >
          <ToggleButton value="sheet">Sheet</ToggleButton>
          <ToggleButton value="plan">Plan</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {mode === "plan" ? (
        <PlanReaderPanel projectId={projectId} />
      ) : (
        <>
      {syncMsg && (
        <Alert severity="success" onClose={() => setSyncMsg(null)}>
          {syncMsg}
        </Alert>
      )}
      {levels.length === 0 ? (
        <Alert severity="info">
          <AlertTitle>Define floors in Setup</AlertTitle>
          Map LVL 0–10 to floor names and storey heights (LVL n = floor between n → n+1) under{" "}
          <Link to={`/projects/${projectId}?tab=settings`}>Project → Settings</Link>, then assign
          measurement rows to those levels.
        </Alert>
      ) : (
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
            {levels.map((l, i) => {
              const next = levels[i + 1];
              const span = next ? `${l.code}→${next.code}` : `${l.code}→roof`;
              return (
                <Typography key={l.id} variant="body2" className="esti-label">
                  {l.code} · {l.name} · {span} · H {(l.storeyHeightMm / 1000).toFixed(2)} m · FFL{" "}
                  {(l.elevationMm / 1000).toFixed(2)} m
                </Typography>
              );
            })}
          </Stack>
          <Typography variant="caption" className="esti-label--secondary">
            Heights stay linked: saving floors or structural deductions in Settings updates these
            rows. Use <strong>Sync heights</strong> in the action dock to re-apply now.
          </Typography>
        </Stack>
      )}

      <DataState
        loading={bookQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={9}
        empty={{
          title: "No measurement rows yet",
          description: "Add rows manually or pick items from the standard library.",
          action: (
            <Button size="small" variant="contained" onClick={() => setPickOpen(true)}>
              From library
            </Button>
          ),
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
          getRowHeight={() => "auto"}
        />
      </DataState>

      <ConfirmModal
        open={!!confirmId}
        heading="Remove measurement row?"
        body="This cannot be undone."
        confirmText="Remove"
        pending={removeRow.isPending}
        onConfirm={() => {
          if (confirmId) removeRow.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />

      <Dialog open={rowOpen} onClose={() => setRowOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editId ? "Edit row" : "Add measurement row"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Level"
              value={rowForm.levelId}
              onChange={(e) => {
                const levelId = e.target.value;
                setRowForm((f) => ({
                  ...f,
                  levelId,
                  heightM: levelId
                    ? heightFromLevel(levelId, "STOREY", f.beamDepthM, f.lintelHeightM)
                    : f.heightM,
                }));
              }}
              helperText={
                levels.length === 0
                  ? "Configure floors in Project → Settings first"
                  : "Links this row’s height to the level storey (beam/lintel: row → level → project)"
              }
            >
              <MenuItem value="">— not linked —</MenuItem>
              {levels.map((l, i) => {
                const next = levels[i + 1];
                const span = next ? `${l.code}→${next.code}` : `${l.code}→roof`;
                const beam =
                  l.beamDepthMm != null
                    ? `${(l.beamDepthMm / 1000).toFixed(2)} m beam`
                    : "proj beam";
                return (
                  <MenuItem key={l.id} value={l.id}>
                    {l.code} — {l.name} ({span}, H {(l.storeyHeightMm / 1000).toFixed(2)} m, {beam})
                  </MenuItem>
                );
              })}
            </TextField>
            <TextField
              label="Particulars"
              multiline
              minRows={2}
              value={rowForm.particulars}
              onChange={(e) => setRowForm((f) => ({ ...f, particulars: e.target.value }))}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Length (m)"
                value={rowForm.lengthM}
                onChange={(e) => setRowForm((f) => ({ ...f, lengthM: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Breadth (m)"
                value={rowForm.breadthM}
                onChange={(e) => setRowForm((f) => ({ ...f, breadthM: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Height (m)"
                value={rowForm.heightM}
                onChange={(e) => setRowForm((f) => ({ ...f, heightM: e.target.value }))}
                fullWidth
                slotProps={{ input: { readOnly: !!rowForm.levelId } }}
                helperText={
                  rowForm.levelId
                    ? "Linked — from level + beam/lintel"
                    : "Manual (or pick a level to link)"
                }
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Beam depth (m)"
                value={rowForm.beamDepthM}
                onChange={(e) => {
                  const beamDepthM = e.target.value;
                  setRowForm((f) => ({
                    ...f,
                    beamDepthM,
                    heightM: f.levelId
                      ? heightFromLevel(f.levelId, "STOREY", beamDepthM, f.lintelHeightM)
                      : f.heightM,
                  }));
                }}
                fullWidth
                placeholder="Inherit level / project"
                helperText="Override when this span has a different beam"
              />
              <TextField
                label="Lintel (m)"
                value={rowForm.lintelHeightM}
                onChange={(e) => {
                  const lintelHeightM = e.target.value;
                  setRowForm((f) => ({
                    ...f,
                    lintelHeightM,
                    heightM: f.levelId
                      ? heightFromLevel(f.levelId, "STOREY", f.beamDepthM, lintelHeightM)
                      : f.heightM,
                  }));
                }}
                fullWidth
                placeholder="Inherit level / project"
                helperText="Override for walls with a different lintel"
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Qty override"
                helperText="Leave blank to auto-derive"
                value={rowForm.quantity}
                onChange={(e) => setRowForm((f) => ({ ...f, quantity: e.target.value }))}
                fullWidth
              />
              <TextField
                select
                label="UOM"
                value={rowForm.uom}
                onChange={(e) =>
                  setRowForm((f) => ({ ...f, uom: e.target.value as MeasurementUom }))
                }
                sx={{ minWidth: 120 }}
              >
                {(["SQM", "CUM", "RMT", "NOS", "KG", "LTR"] as MeasurementUom[]).map((u) => (
                  <MenuItem key={u} value={u}>
                    {MEASUREMENT_UOM_LABEL[u]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Rate (₹)"
                value={rowForm.rateInr}
                onChange={(e) => setRowForm((f) => ({ ...f, rateInr: e.target.value }))}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRowOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!rowForm.particulars.trim() || upsertRow.isPending}
            onClick={saveRow}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pickOpen} onClose={() => setPickOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add from standard library</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Level"
              value={pickLevelId}
              onChange={(e) => setPickLevelId(e.target.value)}
              fullWidth
              helperText="Links height to this level’s storey"
            >
              <MenuItem value="">— not linked —</MenuItem>
              {levels.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.code} — {l.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Library item"
              value={pickItemId}
              onChange={(e) => setPickItemId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">Select…</MenuItem>
              {(catalogQ.data?.items ?? []).map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {`${item.code} — ${item.particulars}`}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPickOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!pickItemId || !book || addFromLibrary.isPending}
            onClick={() => {
              if (!book || !pickItemId) return;
              addFromLibrary.mutate({
                bookId: book.id,
                libraryItemId: pickItemId,
                levelId: pickLevelId || null,
              });
              setPickOpen(false);
              setPickItemId("");
              setPickLevelId("");
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
        </>
      )}
    </Stack>
  );
}
