import {
  Button,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
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
  TextArea,
  TextInput,
} from "@carbon/react";
import {
  ComponentDiscipline,
  ComponentKind,
  ComponentRateSource,
  FORMULA_REGISTRY,
  FormulaKey,
} from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

const DISCIPLINES = ComponentDiscipline.options;
const KINDS = ComponentKind.options;
const RATE_SOURCES = ComponentRateSource.options;
const FORMULAS = FormulaKey.options;

const RATE_SOURCE_LABEL: Record<string, string> = {
  RATE_BOOK: "Rate book",
  RATE_ANALYSIS: "Rate analysis",
  MANUAL: "Manual",
};

const EMPTY_COMPONENT = {
  code: "",
  name: "",
  level: "",
  discipline: "STR",
  componentType: "",
  uom: "cum",
  kind: "PHYSICAL",
  formulaKey: "VOLUME_LWH",
  rateSource: "RATE_BOOK",
  notes: "",
};

function ComponentMasterTab() {
  const utils = trpc.useUtils();
  const listQ = trpc.components.list.useQuery({ includeArchived: false });
  const create = trpc.components.create.useMutation({
    onSuccess: () => {
      void utils.components.list.invalidate();
      setOpen(false);
      setForm(EMPTY_COMPONENT);
      setError(null);
    },
    onError: (e) => setError(e.message),
  });
  const archive = trpc.components.archive.useMutation({
    onSuccess: () => utils.components.list.invalidate(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_COMPONENT);
  const [error, setError] = useState<string | null>(null);

  const rows = listQ.data ?? [];

  return (
    <Stack gap={5}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p className="esti-label esti-label--secondary" style={{ margin: 0 }}>
          Shared component master — AORMS code, quantity formula, and rate source. Used by the
          project costing window to expand auto-BOQ lines.
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          New component
        </Button>
      </div>

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={7}
        empty={{
          title: "No components yet",
          description: "Add a component master to drive component-based estimation.",
        }}
      >
        <TableContainer title="Components">
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Code</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Discipline</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>UoM</TableHeader>
                <TableHeader>Formula</TableHeader>
                <TableHeader>Rate</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Tag size="sm" type="blue">
                      {c.code}
                    </Tag>
                  </TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.discipline}</TableCell>
                  <TableCell>{c.componentType}</TableCell>
                  <TableCell>{c.uom}</TableCell>
                  <TableCell>
                    {FORMULA_REGISTRY[c.formulaKey as keyof typeof FORMULA_REGISTRY]?.label ??
                      c.formulaKey}
                  </TableCell>
                  <TableCell>
                    <Tag size="sm" type="cool-gray">
                      {RATE_SOURCE_LABEL[c.rateSource] ?? c.rateSource}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    <Button kind="ghost" size="sm" onClick={() => archive.mutate({ id: c.id })}>
                      Archive
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
        modalHeading="New component"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !form.code.trim() || !form.name.trim() || !form.level.trim() || !form.componentType.trim() || create.isPending
        }
        onRequestClose={() => {
          setOpen(false);
          setError(null);
        }}
        onRequestSubmit={() =>
          create.mutate({
            code: form.code.trim().toUpperCase(),
            name: form.name.trim(),
            level: form.level.trim(),
            discipline: form.discipline as (typeof DISCIPLINES)[number],
            componentType: form.componentType.trim(),
            uom: form.uom.trim(),
            kind: form.kind as (typeof KINDS)[number],
            formulaKey: form.formulaKey as (typeof FORMULAS)[number],
            rateSource: form.rateSource as (typeof RATE_SOURCES)[number],
            notes: form.notes.trim() || undefined,
          })
        }
      >
        <Stack gap={5}>
          {error && (
            <InlineNotification kind="error" lowContrast hideCloseButton title="Could not create" subtitle={error} />
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput
              id="comp-code"
              labelText="AORMS code"
              placeholder="SB-STR-FT-01"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
            <TextInput
              id="comp-name"
              labelText="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput
              id="comp-level"
              labelText="Level"
              placeholder="SB / GF / T1…"
              value={form.level}
              onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
            />
            <Select
              id="comp-disc"
              labelText="Discipline"
              value={form.discipline}
              onChange={(e) => setForm((f) => ({ ...f, discipline: e.target.value }))}
            >
              {DISCIPLINES.map((d) => (
                <SelectItem key={d} value={d} text={d} />
              ))}
            </Select>
            <TextInput
              id="comp-type"
              labelText="Component type"
              placeholder="FOOTING / COLUMN…"
              value={form.componentType}
              onChange={(e) => setForm((f) => ({ ...f, componentType: e.target.value }))}
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput
              id="comp-uom"
              labelText="Unit of measure"
              value={form.uom}
              onChange={(e) => setForm((f) => ({ ...f, uom: e.target.value }))}
            />
            <Select
              id="comp-kind"
              labelText="Kind"
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
            >
              {KINDS.map((k) => (
                <SelectItem key={k} value={k} text={k} />
              ))}
            </Select>
          </div>
          <Select
            id="comp-formula"
            labelText="Quantity formula"
            value={form.formulaKey}
            onChange={(e) => setForm((f) => ({ ...f, formulaKey: e.target.value }))}
          >
            {FORMULAS.map((k) => (
              <SelectItem key={k} value={k} text={FORMULA_REGISTRY[k].label} />
            ))}
          </Select>
          <Select
            id="comp-rate"
            labelText="Rate source"
            value={form.rateSource}
            onChange={(e) => setForm((f) => ({ ...f, rateSource: e.target.value }))}
          >
            {RATE_SOURCES.map((r) => (
              <SelectItem key={r} value={r} text={RATE_SOURCE_LABEL[r] ?? r} />
            ))}
          </Select>
          <TextArea
            id="comp-notes"
            labelText="Notes (optional)"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <p className="esti-label esti-label--helper" style={{ margin: 0 }}>
            Params follow the selected formula&apos;s inputs. Link a rate-book item or rate analysis
            from the component once created.
          </p>
        </Stack>
      </Modal>
    </Stack>
  );
}

function IfcMappingTab() {
  const utils = trpc.useUtils();
  const mappingsQ = trpc.components.ifc.list.useQuery();
  const componentsQ = trpc.components.list.useQuery({ includeArchived: false });
  const create = trpc.components.ifc.create.useMutation({
    onSuccess: () => {
      void utils.components.ifc.list.invalidate();
      setOpen(false);
      setForm({ ifcEntity: "", predefinedType: "", componentId: "" });
    },
  });
  const remove = trpc.components.ifc.remove.useMutation({
    onSuccess: () => utils.components.ifc.list.invalidate(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ifcEntity: "", predefinedType: "", componentId: "" });

  const rows = mappingsQ.data ?? [];
  const components = componentsQ.data ?? [];

  return (
    <Stack gap={5}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p className="esti-label esti-label--secondary" style={{ margin: 0 }}>
          IFC entity → component reference catalog. Lets a takeoff / IFC import resolve a modeled
          entity to the component master that drives its quantity and rate.
        </p>
        <Button size="sm" disabled={components.length === 0} onClick={() => setOpen(true)}>
          New mapping
        </Button>
      </div>

      <DataState
        loading={mappingsQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={4}
        empty={{
          title: "No mappings yet",
          description: "Map IFC entities (e.g. IfcFooting / PAD_FOOTING) to component codes.",
        }}
      >
        <TableContainer title="IFC mappings">
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>IFC entity</TableHeader>
                <TableHeader>Predefined type</TableHeader>
                <TableHeader>Component</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.ifcEntity}</TableCell>
                  <TableCell>{m.predefinedType ?? "—"}</TableCell>
                  <TableCell>
                    {m.componentCode ? (
                      <Tag size="sm" type="blue">
                        {m.componentCode}
                      </Tag>
                    ) : null}{" "}
                    {m.componentName ?? ""}
                  </TableCell>
                  <TableCell>
                    <Button kind="ghost" size="sm" onClick={() => remove.mutate({ id: m.id })}>
                      Remove
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
        modalHeading="New IFC mapping"
        primaryButtonText={create.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.ifcEntity.trim() || !form.componentId || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            ifcEntity: form.ifcEntity.trim(),
            predefinedType: form.predefinedType.trim() || null,
            componentId: form.componentId,
          })
        }
      >
        <Stack gap={5}>
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput
              id="ifc-entity"
              labelText="IFC entity"
              placeholder="IfcFooting"
              value={form.ifcEntity}
              onChange={(e) => setForm((f) => ({ ...f, ifcEntity: e.target.value }))}
            />
            <TextInput
              id="ifc-type"
              labelText="Predefined type (optional)"
              placeholder="PAD_FOOTING"
              value={form.predefinedType}
              onChange={(e) => setForm((f) => ({ ...f, predefinedType: e.target.value }))}
            />
          </div>
          <Select
            id="ifc-comp"
            labelText="Component"
            value={form.componentId}
            onChange={(e) => setForm((f) => ({ ...f, componentId: e.target.value }))}
          >
            <SelectItem value="" text="Select a component…" />
            {components.map((c) => (
              <SelectItem key={c.id} value={c.id} text={`${c.code} — ${c.name}`} />
            ))}
          </Select>
        </Stack>
      </Modal>
    </Stack>
  );
}

/**
 * Knowledge Bank — component master library + IFC mapping catalog (Estimation
 * OS Phase 2). Read/edit browser for the shared components that drive
 * component-based estimation and auto-BOQ.
 */
export function ComponentLibrary({ embedded = false }: { embedded?: boolean }) {
  return (
    <Stack gap={embedded ? 5 : 7}>
      <Tabs>
        <TabList aria-label="Component library sections" contained>
          <Tab>Component master</Tab>
          <Tab>IFC mappings</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <ComponentMasterTab />
          </TabPanel>
          <TabPanel>
            <IfcMappingTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
