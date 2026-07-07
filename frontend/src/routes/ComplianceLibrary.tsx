import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  styled,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { RailLayout } from "../components/RailLayout.js";
import { StatusDot } from "../components/StatusTag.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

const HiddenFileInput = styled("input")({ display: "none" });

type Field = { key: string; label: string; type?: "text" | "number"; required?: boolean };

/** Shared CRUD panel for one compliance-area table (presentational + form state). */
function CrudPanel({
  fields,
  rows,
  loading,
  creating,
  removing,
  onCreate,
  onRemove,
}: {
  fields: Field[];
  rows: Record<string, unknown>[];
  loading: boolean;
  creating: boolean;
  removing: boolean;
  onCreate: (payload: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const set = (k: string) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const missingRequired = fields.some((f) => f.required && !form[f.key]?.trim());

  const submit = () => {
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const v = form[f.key]?.trim();
      if (v === undefined || v === "") continue;
      payload[f.key] = f.type === "number" ? Number(v) : v;
    }
    onCreate(payload);
  };

  const columns: GridColDef[] = [
    ...fields.map((f): GridColDef => ({
      field: f.key,
      headerName: f.label,
      flex: 1,
      minWidth: 120,
      renderCell: (p) => (p.row[f.key] == null ? "—" : String(p.row[f.key])),
    })),
    {
      field: "__actions",
      headerName: "",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Button
          variant="text"
          color="error"
          size="small"
          disabled={removing}
          onClick={() => onRemove(String(p.row.id))}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={() => { setForm({}); setOpen(true); }}>New entry</Button>
      </Box>
      <DataState
        loading={loading}
        isEmpty={rows.length === 0}
        columnCount={fields.length + 1}
        empty={{ title: "No entries", description: "Add a compliance reference entry." }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New entry</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {fields.map((f) => (
              <TextField
                key={f.key}
                id={`cmp-${f.key}`}
                label={f.label + (f.required ? " *" : "")}
                type={f.type === "number" ? "number" : "text"}
                value={form[f.key] ?? ""}
                onChange={set(f.key)}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={missingRequired || creating}
            onClick={() => { submit(); setOpen(false); }}
          >
            {creating ? "Saving…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function FarPanel() {
  const u = trpc.useUtils();
  const q = trpc.compliance.far.list.useQuery();
  const inv = () => u.compliance.far.list.invalidate();
  const create = trpc.compliance.far.create.useMutation({ onSuccess: inv });
  const remove = trpc.compliance.far.remove.useMutation({ onSuccess: inv });
  return (
    <CrudPanel
      fields={[
        { key: "zone", label: "Zone", required: true },
        { key: "plotType", label: "Plot type" },
        { key: "plotAreaMinSqm", label: "Plot min (sqm)", type: "number" },
        { key: "plotAreaMaxSqm", label: "Plot max (sqm)", type: "number" },
        { key: "far", label: "FAR", type: "number" },
        { key: "groundCoveragePct", label: "Ground cover %", type: "number" },
        { key: "maxHeightM", label: "Max height (m)", type: "number" },
        { key: "notes", label: "Notes" },
      ]}
      rows={(q.data ?? []) as Record<string, unknown>[]}
      loading={q.isLoading}
      creating={create.isPending}
      removing={remove.isPending}
      onCreate={(p) => create.mutate(p as never)}
      onRemove={(id) => remove.mutate({ id })}
    />
  );
}

function SetbackPanel() {
  const u = trpc.useUtils();
  const q = trpc.compliance.setback.list.useQuery();
  const inv = () => u.compliance.setback.list.invalidate();
  const create = trpc.compliance.setback.create.useMutation({ onSuccess: inv });
  const remove = trpc.compliance.setback.remove.useMutation({ onSuccess: inv });
  return (
    <CrudPanel
      fields={[
        { key: "zone", label: "Zone", required: true },
        { key: "plotType", label: "Plot type" },
        { key: "frontageMinM", label: "Frontage min (m)", type: "number" },
        { key: "frontageMaxM", label: "Frontage max (m)", type: "number" },
        { key: "frontM", label: "Front (m)", type: "number" },
        { key: "rearM", label: "Rear (m)", type: "number" },
        { key: "side1M", label: "Side 1 (m)", type: "number" },
        { key: "side2M", label: "Side 2 (m)", type: "number" },
        { key: "notes", label: "Notes" },
      ]}
      rows={(q.data ?? []) as Record<string, unknown>[]}
      loading={q.isLoading}
      creating={create.isPending}
      removing={remove.isPending}
      onCreate={(p) => create.mutate(p as never)}
      onRemove={(id) => remove.mutate({ id })}
    />
  );
}

function NbcPanel() {
  const u = trpc.useUtils();
  const q = trpc.compliance.nbc.list.useQuery();
  const inv = () => u.compliance.nbc.list.invalidate();
  const create = trpc.compliance.nbc.create.useMutation({ onSuccess: inv });
  const remove = trpc.compliance.nbc.remove.useMutation({ onSuccess: inv });
  return (
    <CrudPanel
      fields={[
        { key: "clause", label: "Clause", required: true },
        { key: "title", label: "Title", required: true },
        { key: "requirement", label: "Requirement" },
        { key: "applicability", label: "Applicability" },
        { key: "notes", label: "Notes" },
      ]}
      rows={(q.data ?? []) as Record<string, unknown>[]}
      loading={q.isLoading}
      creating={create.isPending}
      removing={remove.isPending}
      onCreate={(p) => create.mutate(p as never)}
      onRemove={(id) => remove.mutate({ id })}
    />
  );
}

function FirePanel() {
  const u = trpc.useUtils();
  const q = trpc.compliance.fire.list.useQuery();
  const inv = () => u.compliance.fire.list.invalidate();
  const create = trpc.compliance.fire.create.useMutation({ onSuccess: inv });
  const remove = trpc.compliance.fire.remove.useMutation({ onSuccess: inv });
  return (
    <CrudPanel
      fields={[
        { key: "buildingType", label: "Building type", required: true },
        { key: "heightBandM", label: "Height band (m)" },
        { key: "requirement", label: "Requirement" },
        { key: "refugeArea", label: "Refuge area" },
        { key: "staircaseWidthM", label: "Staircase width (m)", type: "number" },
        { key: "notes", label: "Notes" },
      ]}
      rows={(q.data ?? []) as Record<string, unknown>[]}
      loading={q.isLoading}
      creating={create.isPending}
      removing={remove.isPending}
      onCreate={(p) => create.mutate(p as never)}
      onRemove={(id) => remove.mutate({ id })}
    />
  );
}

function RegulationPanel() {
  const u = trpc.useUtils();
  const q = trpc.compliance.regulation.list.useQuery();
  const inv = () => u.compliance.regulation.list.invalidate();
  const create = trpc.compliance.regulation.create.useMutation({ onSuccess: inv });
  const remove = trpc.compliance.regulation.remove.useMutation({ onSuccess: inv });
  return (
    <CrudPanel
      fields={[
        { key: "authority", label: "Authority", required: true },
        { key: "refNo", label: "Ref no." },
        { key: "title", label: "Title", required: true },
        { key: "summary", label: "Summary" },
        { key: "link", label: "Link" },
        { key: "notes", label: "Notes" },
      ]}
      rows={(q.data ?? []) as Record<string, unknown>[]}
      loading={q.isLoading}
      creating={create.isPending}
      removing={remove.isPending}
      onCreate={(p) => create.mutate(p as never)}
      onRemove={(id) => remove.mutate({ id })}
    />
  );
}

const DOC_CATEGORIES = ["NBC", "FAR", "SETBACK", "FIRE", "REGULATION", "OTHER"] as const;

function DocumentsTab() {
  const utils = trpc.useUtils();
  const q = trpc.compliance.listDocuments.useQuery();
  const remove = trpc.compliance.removeDocument.useMutation({
    onSuccess: () => utils.compliance.listDocuments.invalidate(),
  });
  const { authorizedFetch } = useUploadAuth();

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<string>("NBC");
  const [showUpload, setShowUpload] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const res = await authorizedFetch("/upload/compliance-doc", (fd) => {
        fd.append("title", uploadTitle.trim() || file.name);
        fd.append("category", uploadCategory);
        fd.append("file", file);
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      void utils.compliance.listDocuments.invalidate();
      setShowUpload(false);
      setUploadTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const columns: GridColDef[] = [
    { field: "title", headerName: "Title", flex: 1.5, minWidth: 180 },
    {
      field: "category",
      headerName: "Category",
      width: 150,
      renderCell: (p) => (
        <StatusDot color="blue" label={p.row.category} />
      ),
    },
    {
      field: "fileName",
      headerName: "File",
      flex: 1.5,
      minWidth: 180,
      renderCell: (p) =>
        p.row.url
          ? <a href={p.row.url} target="_blank" rel="noreferrer">{p.row.fileName}</a>
          : p.row.fileName,
    },
    {
      field: "__actions",
      headerName: "",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Button
          variant="text"
          color="error"
          size="small"
          disabled={remove.isPending}
          onClick={() => remove.mutate({ id: p.row.id })}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={() => setShowUpload((v) => !v)}>
          {showUpload ? "Cancel" : "Upload document"}
        </Button>
      </Box>

      {showUpload && (
        <Box sx={{ p: 2 }}>
          <Stack spacing={2}>
            <TextField
              id="cdoc-title"
              label="Title"
              placeholder="e.g. NBC 2016 Part 3"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
            />
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">Category</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                {DOC_CATEGORIES.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    size="small"
                    onClick={() => setUploadCategory(c)}
                    sx={{
                      cursor: "pointer",
                      backgroundColor: `var(--cds-tag-background-${uploadCategory === c ? "blue" : "gray"})`,
                      color: `var(--cds-tag-color-${uploadCategory === c ? "blue" : "gray"})`,
                    }}
                  />
                ))}
              </Stack>
            </Stack>
            <Box>
              <Button variant="outlined" size="small" component="label" disabled={busy}>
                {busy ? "Uploading…" : "Choose file (PDF / DWG / DXF / image)"}
                <HiddenFileInput
                  type="file"
                  accept=".pdf,.dwg,.dxf,.png,.jpg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file);
                  }}
                />
              </Button>
            </Box>
          </Stack>
        </Box>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      )}

      <DataState
        loading={q.isLoading}
        isEmpty={(q.data ?? []).length === 0}
        columnCount={4}
        empty={{ title: "No documents", description: "Upload NBC books, FAR notifications, fire NOC drawings, and other compliance reference documents." }}
      >
        <DataGrid
          rows={q.data ?? []}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>
    </Stack>
  );
}

/** Studio › Libraries › Compliance Library — Documents tab (uploaded PDFs) + Rules tab (NBC · FAR · Setbacks · Fire · Regulations). */
export function ComplianceLibrary() {
  const [tab, setTab] = useState(0);
  const [ruleTab, setRuleTab] = useState(0);
  return (
    <RailLayout
      title="Compliance Library"
      description="Statutory reference data — NBC rules, FAR, setbacks, fire compliance, and regulations."
      tabs={
        <Tabs
          orientation="vertical"
          value={tab}
          onChange={(_e, v) => setTab(v)}
          aria-label="Compliance library sections"
        >
          <Tab label="Documents" />
          <Tab label="Rules" />
        </Tabs>
      }
    >
      {tab === 0 && <DocumentsTab />}
      {tab === 1 && (
        <Stack spacing={2}>
          <Tabs
            value={ruleTab}
            onChange={(_e, v) => setRuleTab(v)}
            variant="scrollable"
            allowScrollButtonsMobile
            aria-label="Compliance areas"
          >
            <Tab label="NBC Rules" />
            <Tab label="FAR Rules" />
            <Tab label="Setbacks" />
            <Tab label="Fire Compliance" />
            <Tab label="Regulations" />
          </Tabs>
          {ruleTab === 0 && <NbcPanel />}
          {ruleTab === 1 && <FarPanel />}
          {ruleTab === 2 && <SetbackPanel />}
          {ruleTab === 3 && <FirePanel />}
          {ruleTab === 4 && <RegulationPanel />}
        </Stack>
      )}
    </RailLayout>
  );
}
