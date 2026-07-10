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
import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusDot } from "../components/StatusTag.js";
import { useSignal } from "../lib/useSignal.js";
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
  openSignal,
}: {
  fields: Field[];
  rows: Record<string, unknown>[];
  loading: boolean;
  creating: boolean;
  removing: boolean;
  onCreate: (payload: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
  /** When this number changes, open the create dialog (rail-triggered). */
  openSignal?: number;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  useSignal(openSignal, () => { setForm({}); setOpen(true); });
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
        <RowActionsMenu
          actions={[
            {
              label: "Delete",
              danger: true,
              disabled: removing,
              onClick: () => onRemove(String(p.row.id)),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <Stack spacing={2}>
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

function FarPanel({ openSignal }: { openSignal?: number }) {
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
      openSignal={openSignal}
    />
  );
}

function SetbackPanel({ openSignal }: { openSignal?: number }) {
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
      openSignal={openSignal}
    />
  );
}

function NbcPanel({ openSignal }: { openSignal?: number }) {
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
      openSignal={openSignal}
    />
  );
}

function FirePanel({ openSignal }: { openSignal?: number }) {
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
      openSignal={openSignal}
    />
  );
}

function RegulationPanel({ openSignal }: { openSignal?: number }) {
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
      openSignal={openSignal}
    />
  );
}

const DOC_CATEGORIES = ["NBC", "FAR", "SETBACK", "FIRE", "REGULATION", "OTHER"] as const;

function DocumentsTab({ openSignal }: { openSignal?: number }) {
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
  useSignal(openSignal, () => setShowUpload((v) => !v)); // rail "Upload document"

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
        <RowActionsMenu
          actions={[
            {
              label: "Delete",
              danger: true,
              disabled: remove.isPending,
              onClick: () => remove.mutate({ id: p.row.id }),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <Stack spacing={2}>
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
  // Rail-triggered create/upload — bump a counter to open the active panel's action.
  const [docSignal, setDocSignal] = useState(0);
  const [ruleSignal, setRuleSignal] = useState(0);

  useScreenActions(
    [
      tab === 0
        ? {
            id: "upload-document",
            zone: "center",
            tone: "primary",
            label: "Upload Document",
            icon: <AddIcon />,
            onClick: () => setDocSignal((s) => s + 1),
          }
        : {
            id: "new-entry",
            zone: "center",
            tone: "primary",
            label: "New Entry",
            icon: <AddIcon />,
            onClick: () => setRuleSignal((s) => s + 1),
          },
    ],
    [tab],
  );

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
      <PageBreadcrumb
        items={[
          { label: "Library" },
          { label: "Compliance" },
        ]}
      />
      {tab === 0 && <DocumentsTab openSignal={docSignal} />}
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
          {ruleTab === 0 && <NbcPanel openSignal={ruleSignal} />}
          {ruleTab === 1 && <FarPanel openSignal={ruleSignal} />}
          {ruleTab === 2 && <SetbackPanel openSignal={ruleSignal} />}
          {ruleTab === 3 && <FirePanel openSignal={ruleSignal} />}
          {ruleTab === 4 && <RegulationPanel openSignal={ruleSignal} />}
        </Stack>
      )}
    </RailLayout>
  );
}
