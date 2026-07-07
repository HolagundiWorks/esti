import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import Add from "@mui/icons-material/Add";
import Delete from "@mui/icons-material/Delete";
import Share from "@mui/icons-material/Share";
import { formatINR } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { pdfPollInterval } from "../lib/pdfUi.js";
import { shareViaWhatsApp } from "../lib/whatsapp.js";
import { ConfirmModal } from "./ConfirmModal.js";
import { DataState } from "./DataState.js";
import { ProjectMom } from "./ProjectMom.js";
import { ProjectInspectionDetail } from "./ProjectInspectionDetail.js";
import { DocumentReviseButton } from "./DocumentReviseButton.js";
import { StatusDot } from "./StatusTag.js";

/** Generic PDF action cell: generate via worker, poll, then open. */
function pdfPollOpts(initial: string) {
  return {
    refetchInterval: (q: {
      state: { data?: { pdfStatus?: string } | null };
    }) => pdfPollInterval(q.state.data?.pdfStatus, initial !== "NONE"),
    enabled: initial !== "NONE",
  };
}

function InspectionPdf({ id, initial }: { id: string; initial: string }) {
  const utils = trpc.useUtils();
  const q = trpc.inspections.byId.useQuery({ id }, pdfPollOpts(initial));
  const gen = trpc.inspections.generatePdf.useMutation({
    onSuccess: () => utils.inspections.byId.invalidate({ id }),
  });
  return (
    <PdfButton
      status={q.data?.pdfStatus ?? initial}
      url={q.data?.pdfUrl ?? null}
      pending={gen.isPending}
      onGen={() => gen.mutate({ id })}
      share={{ text: "Please find the attached site inspection report.", fileName: "inspection.pdf" }}
    />
  );
}
function SpecPdf({ id, initial }: { id: string; initial: string }) {
  const utils = trpc.useUtils();
  const q = trpc.spec.byId.useQuery({ id }, pdfPollOpts(initial));
  const gen = trpc.spec.generatePdf.useMutation({
    onSuccess: () => utils.spec.byId.invalidate({ id }),
  });
  return (
    <PdfButton
      status={q.data?.pdfStatus ?? initial}
      url={q.data?.pdfUrl ?? null}
      pending={gen.isPending}
      onGen={() => gen.mutate({ id })}
      share={{ text: "Please find the attached specification sheet.", fileName: "specification.pdf" }}
    />
  );
}
function PdfButton({
  status,
  url,
  pending,
  onGen,
  share,
}: {
  status: string;
  url: string | null;
  pending: boolean;
  onGen: () => void;
  /** When set, shows a "WhatsApp" action once the PDF is ready. */
  share?: { text: string; fileName: string };
}) {
  if (status === "READY" && url)
    return (
      <Stack direction="row" spacing={0.5}>
        <Button variant="text" size="small" href={url} target="_blank" rel="noreferrer">
          Open PDF
        </Button>
        {share && (
          <Button
            variant="text"
            size="small"
            startIcon={<Share />}
            onClick={() =>
              void shareViaWhatsApp({ fileUrl: url, fileName: share.fileName, text: share.text })
            }
          >
            WhatsApp
          </Button>
        )}
      </Stack>
    );
  if (status === "PENDING" || status === "PROCESSING")
    return <span>Generating…</span>;
  return (
    <Button variant="text" size="small" disabled={pending} onClick={onGen}>
      {status === "FAILED" ? "Retry PDF" : "Generate PDF"}
    </Button>
  );
}

export function ProjectDocuments({ projectId, includeSpecs = true }: { projectId: string; includeSpecs?: boolean }) {
  return (
    <Stack spacing={4} sx={{ mt: 2 }}>
      <Inspections projectId={projectId} />
      <ProjectMom projectId={projectId} />
      {includeSpecs && <ProjectSpecSheets projectId={projectId} />}
      <FinalEstimationRecords projectId={projectId} />
    </Stack>
  );
}

// --- Final estimation records (frozen CMS sets, archived from the BOQ tab) ---
function FinalEstimationRecords({ projectId }: { projectId: string }) {
  const setsQ = trpc.cms.finalSet.listByProject.useQuery({ projectId });
  const sets = setsQ.data ?? [];
  const columns: GridColDef[] = [
    { field: "revisionNo", headerName: "Rev", width: 90, renderCell: (p) => `Rev ${p.row.revisionNo}` },
    { field: "title", headerName: "Title", flex: 1.4, minWidth: 160 },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (p) => (
        <StatusDot color={p.row.status === "FINAL" ? "green" : "gray"} label={p.row.status} />
      ),
    },
    {
      field: "totalPaise",
      headerName: "Total",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => formatINR(p.row.totalPaise),
    },
    {
      field: "document",
      headerName: "Document",
      sortable: false,
      filterable: false,
      flex: 1,
      minWidth: 140,
      renderCell: (p) =>
        p.row.pdfStatus === "READY" && p.row.pdfKey ? (
          <Button variant="text" size="small" href={`/files/${p.row.pdfKey}`} target="_blank" rel="noreferrer">
            Open PDF
          </Button>
        ) : p.row.pdfStatus === "PENDING" || p.row.pdfStatus === "PROCESSING" ? (
          <span>Generating…</span>
        ) : (
          <StatusDot color="gray" label={p.row.pdfStatus} />
        ),
    },
  ];
  return (
    <div>
      <Typography variant="h6" component="h3">Final estimation records</Typography>
      <DataState
        loading={setsQ.isLoading}
        isEmpty={!setsQ.isLoading && sets.length === 0}
        columnCount={5}
        empty={{
          title: "No final estimation records",
          description: "Freeze an estimate in Cost Management → BOQ to archive a revision here.",
        }}
      >
        <DataGrid
          rows={sets}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>
    </div>
  );
}

// --- Site inspections -------------------------------------------------------
function Inspections({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.inspections.listByProject.useQuery({ projectId });
  const inv = () => utils.inspections.listByProject.invalidate({ projectId });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    dateVisit: "",
    weather: "",
    attendees: "",
    progress: "",
    observations: "",
    instructions: "",
    inspectorName: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((x) => ({ ...x, [k]: e.target.value }));
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const create = trpc.inspections.create.useMutation({
    onSuccess: () => {
      inv();
      setOpen(false);
    },
  });
  const remove = trpc.inspections.remove.useMutation({ onSuccess: inv });

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.8, minWidth: 110 },
    {
      field: "dateVisit",
      headerName: "Date",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => p.row.dateVisit ?? "—",
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (p) => (
        <StatusDot
          color={p.row.status === "ISSUED" || p.row.pdfStatus === "READY" ? "green" : "gray"}
          label={p.row.status ?? "DRAFT"}
        />
      ),
    },
    {
      field: "inspectorName",
      headerName: "Inspector",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => p.row.inspectorName ?? "—",
    },
    {
      field: "document",
      headerName: "Document",
      sortable: false,
      filterable: false,
      flex: 1.2,
      minWidth: 200,
      renderCell: (p) => <InspectionPdf id={p.row.id} initial={p.row.pdfStatus} />,
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 160,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <Button variant="text" size="small" onClick={() => setDetailId(p.row.id)}>Open</Button>
          <Button variant="text" color="error" size="small" onClick={() => setConfirmId(p.row.id)}>
            Delete
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <div>
      <Box className="esti-row-between" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" component="h3">Site inspection reports</Typography>
        <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setOpen(true)}>
          New report
        </Button>
      </Box>
      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={4}
        empty={{
          title: "No inspection reports",
          description:
            "Record a site visit with observations and instructions.",
        }}
      >
        <DataGrid
          rows={listQ.data ?? []}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>
      <ConfirmModal
        open={!!confirmId}
        heading="Delete report?"
        body="This permanently removes the inspection report."
        confirmText="Delete"
        pending={remove.isPending}
        onConfirm={() => {
          if (confirmId) remove.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />
      <ProjectInspectionDetail
        inspectionId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New site inspection report</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField
                id="si-date"
                label="Date of visit"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={f.dateVisit}
                onChange={set("dateVisit")}
                fullWidth
              />
              <TextField
                id="si-weather"
                label="Weather"
                value={f.weather}
                onChange={set("weather")}
                fullWidth
              />
              <TextField
                id="si-by"
                label="Inspected by"
                value={f.inspectorName}
                onChange={set("inspectorName")}
                fullWidth
              />
            </Box>
            <TextField
              id="si-att"
              label="Attendees"
              value={f.attendees}
              onChange={set("attendees")}
            />
            <TextField
              id="si-prog"
              label="Progress of work"
              multiline
              rows={2}
              value={f.progress}
              onChange={set("progress")}
            />
            <TextField
              id="si-obs"
              label="Observations"
              multiline
              rows={3}
              value={f.observations}
              onChange={set("observations")}
            />
            <TextField
              id="si-ins"
              label="Instructions issued"
              multiline
              rows={3}
              value={f.instructions}
              onChange={set("instructions")}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                dateVisit: f.dateVisit || undefined,
                weather: f.weather || undefined,
                attendees: f.attendees || undefined,
                progress: f.progress || undefined,
                observations: f.observations || undefined,
                instructions: f.instructions || undefined,
                inspectorName: f.inspectorName || undefined,
              })
            }
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

// --- Spec sheets ------------------------------------------------------------
type Row = {
  catalogItemId?: string;
  category: string;
  item: string;
  make: string;
  specification: string;
  finish: string;
  remarks: string;
};
const blankRow = (): Row => ({
  category: "",
  item: "",
  make: "",
  specification: "",
  finish: "",
  remarks: "",
});

function rowFromCatalog(item: {
  id: string;
  category: string | null;
  item: string;
  make: string | null;
  specification: string | null;
  finish: string | null;
  remarks: string | null;
}): Row {
  return {
    catalogItemId: item.id,
    category: item.category ?? "",
    item: item.item,
    make: item.make ?? "",
    specification: item.specification ?? "",
    finish: item.finish ?? "",
    remarks: item.remarks ?? "",
  };
}

export function ProjectSpecSheets({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.spec.listByProject.useQuery({ projectId });
  const catalogQ = trpc.specCatalog.activeCatalog.useQuery();
  const inv = () => utils.spec.listByProject.invalidate({ projectId });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [pickId, setPickId] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const catalogItems = catalogQ.data?.items ?? [];
  const hasValidRow = rows.some(
    (r) => r.catalogItemId || r.item.trim().length > 0,
  );
  const create = trpc.spec.create.useMutation({
    onSuccess: () => {
      inv();
      setOpen(false);
      setTitle("");
      setRows([blankRow()]);
    },
  });
  const remove = trpc.spec.remove.useMutation({ onSuccess: inv });
  const setCell = (i: number, k: keyof Row, v: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.8, minWidth: 110 },
    { field: "title", headerName: "Title", flex: 1.4, minWidth: 160 },
    {
      field: "versionNo",
      headerName: "Ver",
      width: 80,
      renderCell: (p) => p.row.versionNo ?? 1,
    },
    {
      field: "document",
      headerName: "Document",
      sortable: false,
      filterable: false,
      flex: 1.4,
      minWidth: 240,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <SpecPdf id={p.row.id} initial={p.row.pdfStatus} />
          {(p.row.status === "ISSUED" || p.row.pdfStatus === "READY") && (
            <DocumentReviseButton
              entityType="SPEC_SHEET"
              entityId={p.row.id}
              onDone={inv}
            />
          )}
        </Stack>
      ),
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 110,
      renderCell: (p) => (
        <Button variant="text" color="error" size="small" onClick={() => setConfirmId(p.row.id)}>
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Box className="esti-row-between" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" component="h3">Specification sheets</Typography>
        <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setOpen(true)}>
          New spec sheet
        </Button>
      </Box>
      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={3}
        empty={{
          title: "No specification sheets",
          description: "Capture materials, makes and finishes by category.",
        }}
      >
        <DataGrid
          rows={listQ.data ?? []}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>
      <ConfirmModal
        open={!!confirmId}
        heading="Delete spec sheet?"
        body="This permanently removes the specification sheet."
        confirmText="Delete"
        pending={remove.isPending}
        onConfirm={() => {
          if (confirmId) remove.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New specification sheet</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="ss-title"
              label="Sheet title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {!catalogQ.isLoading && catalogItems.length === 0 && (
              <Alert severity="info">
                <AlertTitle>No active specification catalogue</AlertTitle>
                Add and activate a catalogue version in Knowledge Bank → Specification.
              </Alert>
            )}
            {catalogItems.length > 0 && (
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-end" }}>
                <TextField
                  id="ss-catalog-pick"
                  select
                  label="Add from catalogue"
                  value={pickId}
                  onChange={(e) => setPickId(e.target.value)}
                  sx={{ minWidth: 260 }}
                >
                  <MenuItem value="">Select catalogue item…</MenuItem>
                  {catalogItems.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {`${item.category ? `${item.category} · ` : ""}${item.item}`}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="outlined"
                  disabled={!pickId}
                  onClick={() => {
                    const picked = catalogItems.find((item) => item.id === pickId);
                    if (!picked) return;
                    setRows((rs) => [...rs.filter((r) => r.item.trim() || r.catalogItemId), rowFromCatalog(picked)]);
                    setPickId("");
                  }}
                >
                  Add row
                </Button>
              </Stack>
            )}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>Make</TableCell>
                  <TableCell>Specification</TableCell>
                  <TableCell>Finish</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    {(
                      [
                        "category",
                        "item",
                        "make",
                        "specification",
                        "finish",
                      ] as (keyof Row)[]
                    ).map((k) => (
                      <TableCell key={k}>
                        <TextField
                          id={`s-${k}-${i}`}
                          aria-label={k}
                          size="small"
                          value={r[k]}
                          onChange={(e) => setCell(i, k, e.target.value)}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <IconButton
                        size="small"
                        aria-label="Remove row"
                        disabled={rows.length === 1}
                        onClick={() =>
                          setRows((rs) => rs.filter((_, idx) => idx !== i))
                        }
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box>
              <Button
                variant="text"
                size="small"
                startIcon={<Add />}
                onClick={() => setRows((rs) => [...rs, blankRow()])}
              >
                Add row
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!title || !hasValidRow || create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                title,
                items: rows
                  .filter((r) => r.catalogItemId || r.item.trim())
                  .map((r) => ({
                    catalogItemId: r.catalogItemId,
                    category: r.category || undefined,
                    item: r.item.trim() || undefined,
                    make: r.make || undefined,
                    specification: r.specification || undefined,
                    finish: r.finish || undefined,
                    remarks: r.remarks || undefined,
                  })),
              })
            }
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
