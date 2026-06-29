import {
  Button,
  FileUploaderButton,
  InlineNotification,
  Modal,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from "@carbon/react";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

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

  return (
    <Stack gap={5}>
      <div className="esti-page-header">
        <div className="esti-grow" />
        <Button onClick={() => { setForm({}); setOpen(true); }}>New entry</Button>
      </div>
      <DataState
        loading={loading}
        isEmpty={rows.length === 0}
        columnCount={fields.length + 1}
        empty={{ title: "No entries", description: "Add a compliance reference entry." }}
      >
        <TableContainer>
          <Table size="sm">
            <TableHead>
              <TableRow>
                {fields.map((f) => <TableHeader key={f.key}>{f.label}</TableHeader>)}
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={String(r.id)}>
                  {fields.map((f) => (
                    <TableCell key={f.key}>{r[f.key] == null ? "—" : String(r[f.key])}</TableCell>
                  ))}
                  <TableCell>
                    <Button
                      kind="danger--ghost"
                      size="sm"
                      disabled={removing}
                      onClick={() => onRemove(String(r.id))}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <Modal
        open={open}
        modalHeading="New entry"
        primaryButtonText={creating ? "Saving…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={missingRequired || creating}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => { submit(); setOpen(false); }}
      >
        <Stack gap={5}>
          {fields.map((f) => (
            <TextInput
              key={f.key}
              id={`cmp-${f.key}`}
              labelText={f.label + (f.required ? " *" : "")}
              type={f.type === "number" ? "number" : "text"}
              value={form[f.key] ?? ""}
              onChange={set(f.key)}
            />
          ))}
        </Stack>
      </Modal>
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

  return (
    <Stack gap={5}>
      <div className="esti-page-header">
        <div className="esti-grow" />
        <Button onClick={() => setShowUpload((v) => !v)}>
          {showUpload ? "Cancel" : "Upload document"}
        </Button>
      </div>

      {showUpload && (
        <Stack gap={4} style={{ padding: "var(--cds-spacing-05)", background: "var(--cds-layer-01)" }}>
          <TextInput
            id="cdoc-title"
            labelText="Title"
            placeholder="e.g. NBC 2016 Part 3"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
          />
          <Stack gap={2}>
            <span className="esti-label">Category</span>
            <Stack orientation="horizontal" gap={2} style={{ flexWrap: "wrap" }}>
              {DOC_CATEGORIES.map((c) => (
                <Tag
                  key={c}
                  type={uploadCategory === c ? "blue" : "gray"}
                  size="sm"
                  onClick={() => setUploadCategory(c)}
                  style={{ cursor: "pointer" }}
                >
                  {c}
                </Tag>
              ))}
            </Stack>
          </Stack>
          <FileUploaderButton
            labelText={busy ? "Uploading…" : "Choose file (PDF / DWG / DXF / image)"}
            size="sm"
            accept={[".pdf", ".dwg", ".dxf", ".png", ".jpg"]}
            disableLabelChanges
            disabled={busy}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </Stack>
      )}

      {error && (
        <InlineNotification kind="error" title="Upload failed" subtitle={error} lowContrast onCloseButtonClick={() => setError(null)} />
      )}

      <DataState
        loading={q.isLoading}
        isEmpty={(q.data ?? []).length === 0}
        columnCount={4}
        empty={{ title: "No documents", description: "Upload NBC books, FAR notifications, fire NOC drawings, and other compliance reference documents." }}
      >
        <TableContainer>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Title</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>File</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {(q.data ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.title}</TableCell>
                  <TableCell>
                    <Tag type="blue" size="sm">{d.category}</Tag>
                  </TableCell>
                  <TableCell>
                    {d.url
                      ? <a href={d.url} target="_blank" rel="noreferrer">{d.fileName}</a>
                      : d.fileName}
                  </TableCell>
                  <TableCell>
                    <Button
                      kind="danger--ghost"
                      size="sm"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate({ id: d.id })}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
    </Stack>
  );
}

/** Studio › Libraries › Compliance Library — Documents tab (uploaded PDFs) + Rules tab (NBC · FAR · Setbacks · Fire · Regulations). */
export function ComplianceLibrary() {
  return (
    <Stack gap={6}>
      <PageHeader
        title="Compliance Library"
        description="Statutory reference data — NBC rules, FAR, setbacks, fire compliance, and regulations."
      />
      <Tabs>
        <TabList aria-label="Compliance library sections" contained>
          <Tab>Documents</Tab>
          <Tab>Rules</Tab>
        </TabList>
        <TabPanels>
          <TabPanel><DocumentsTab /></TabPanel>
          <TabPanel>
            <Tabs>
              <TabList aria-label="Compliance areas" contained>
                <Tab>NBC Rules</Tab>
                <Tab>FAR Rules</Tab>
                <Tab>Setbacks</Tab>
                <Tab>Fire Compliance</Tab>
                <Tab>Regulations</Tab>
              </TabList>
              <TabPanels>
                <TabPanel><NbcPanel /></TabPanel>
                <TabPanel><FarPanel /></TabPanel>
                <TabPanel><SetbackPanel /></TabPanel>
                <TabPanel><FirePanel /></TabPanel>
                <TabPanel><RegulationPanel /></TabPanel>
              </TabPanels>
            </Tabs>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
