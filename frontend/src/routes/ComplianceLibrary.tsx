import {
  Button,
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
  TextInput,
} from "@carbon/react";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
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

/** Studio › Libraries › Compliance Library — NBC · FAR · Setbacks · Fire · Regulations. */
export function ComplianceLibrary() {
  return (
    <Stack gap={6}>
      <PageHeader
        title="Compliance Library"
        description="Statutory reference data — NBC rules, FAR, setbacks, fire compliance, and regulations."
      />
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
    </Stack>
  );
}
