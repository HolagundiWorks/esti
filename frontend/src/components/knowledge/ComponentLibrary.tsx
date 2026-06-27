import {
  Button,
  InlineNotification,
  Loading,
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
  type BoqSplitter,
  ComponentDiscipline,
  ComponentKind,
  ComponentRateSource,
  FORMULA_REGISTRY,
  FormulaKey,
  type MaterialSplitter,
  validateExpression,
} from "@esti/contracts";
import { useEffect, useMemo, useState } from "react";
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
const LIFECYCLE_TAG: Record<string, "gray" | "green" | "warm-gray" | "red"> = {
  DRAFT: "gray",
  PUBLISHED: "green",
  DEPRECATED: "warm-gray",
  ARCHIVED: "red",
};

interface Field {
  key: string;
  label: string;
  unit: string;
}

const EMPTY_NEW = {
  code: "",
  name: "",
  level: "",
  discipline: "STR",
  componentType: "",
  uom: "cum",
  kind: "PHYSICAL",
  formulaKey: "VOLUME_LWH",
  rateSource: "RATE_BOOK",
};

/** Small valid/invalid pill for a formula, validated against the allowed vars. */
function FormulaStatus({ expr, allowed }: { expr: string; allowed: string[] }) {
  if (!expr.trim()) return <Tag size="sm" type="cool-gray">empty</Tag>;
  const v = validateExpression(expr, allowed);
  if (v.ok) return <Tag size="sm" type="green">valid</Tag>;
  return (
    <Tag size="sm" type="red">
      {v.error ? "syntax" : `unknown: ${v.unknownVars.join(", ")}`}
    </Tag>
  );
}

/** The single-workspace editor for one RuleSet (the expert/Builder layer — formulas visible). */
function RuleSetEditor({ id, onChanged }: { id: string; onChanged: () => void }) {
  const utils = trpc.useUtils();
  const detailQ = trpc.components.byId.useQuery({ id });
  const update = trpc.components.update.useMutation();
  const publish = trpc.components.publishVersion.useMutation();
  const deprecate = trpc.components.deprecate.useMutation();
  const duplicate = trpc.components.duplicate.useMutation();
  const addRelated = trpc.components.addRelated.useMutation();
  const removeRelated = trpc.components.removeRelated.useMutation();
  const listQ = trpc.components.list.useQuery({ includeArchived: false });

  const [fields, setFields] = useState<Field[]>([]);
  const [quantityFormula, setQuantityFormula] = useState("");
  const [boqSplitters, setBoqSplitters] = useState<BoqSplitter[]>([]);
  const [materialSplitters, setMaterialSplitters] = useState<MaterialSplitter[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [depChild, setDepChild] = useState("");
  const [depFormula, setDepFormula] = useState("");

  const detail = detailQ.data;
  useEffect(() => {
    if (!detail) return;
    const ps = Array.isArray(detail.paramSchema) ? (detail.paramSchema as Field[]) : [];
    setFields(ps.map((f) => ({ key: f.key, label: f.label ?? f.key, unit: f.unit ?? "" })));
    setQuantityFormula(detail.quantityFormula ?? "");
    setBoqSplitters(Array.isArray(detail.boqSplitters) ? (detail.boqSplitters as BoqSplitter[]) : []);
    setMaterialSplitters(
      Array.isArray(detail.materialSplitters) ? (detail.materialSplitters as MaterialSplitter[]) : [],
    );
  }, [detail]);

  const fieldKeys = useMemo(() => fields.map((f) => f.key).filter(Boolean), [fields]);
  const derivedVars = useMemo(() => [...fieldKeys, "quantity"], [fieldKeys]);
  const boqOutNames = useMemo(() => boqSplitters.map((b) => b.outputName).filter(Boolean), [boqSplitters]);
  const depAllowed = useMemo(() => [...fieldKeys, "quantity", ...boqOutNames], [fieldKeys, boqOutNames]);

  const others = (listQ.data ?? []).filter((c) => c.id !== id);

  if (detailQ.isLoading || !detail) return <Loading withOverlay={false} description="Loading RuleSet" />;

  const save = () => {
    setError(null);
    update.mutate(
      {
        id,
        paramSchema: fields.map((f) => ({ key: f.key, label: f.label, unit: f.unit, type: "NUMBER", required: true })),
        quantityFormula: quantityFormula.trim() || null,
        boqSplitters,
        materialSplitters,
      },
      {
        onSuccess: () => {
          void utils.components.byId.invalidate({ id });
          onChanged();
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <Stack gap={6}>
      <Stack gap={3} orientation="horizontal">
        <Tag type="blue" size="md">{detail.code}</Tag>
        <strong style={{ flex: 1 }}>{detail.name}</strong>
        <Tag type={LIFECYCLE_TAG[detail.lifecycle ?? "DRAFT"] ?? "gray"} size="md">
          {detail.lifecycle ?? "DRAFT"} · v{detail.version ?? "1.0"}
        </Tag>
      </Stack>

      {error && <InlineNotification kind="error" lowContrast title="Save failed" subtitle={error} onCloseButtonClick={() => setError(null)} />}

      {/* Measurement fields */}
      <Stack gap={3}>
        <Stack gap={2} orientation="horizontal">
          <strong style={{ flex: 1 }}>Measurement inputs</strong>
          <Button size="sm" kind="ghost" onClick={() => setFields((f) => [...f, { key: "", label: "", unit: "" }])}>
            Add field
          </Button>
        </Stack>
        <Table size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Key (identifier)</TableHeader>
              <TableHeader>Label</TableHeader>
              <TableHeader>Unit</TableHeader>
              <TableHeader>{""}</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {fields.map((f, i) => (
              <TableRow key={i}>
                <TableCell>
                  <TextInput id={`fk-${i}`} labelText="" size="sm" value={f.key} placeholder="length"
                    onChange={(e) => setFields((arr) => arr.map((x, j) => (j === i ? { ...x, key: e.target.value.replace(/[^A-Za-z0-9_]/g, "") } : x)))} />
                </TableCell>
                <TableCell>
                  <TextInput id={`fl-${i}`} labelText="" size="sm" value={f.label}
                    onChange={(e) => setFields((arr) => arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                </TableCell>
                <TableCell>
                  <TextInput id={`fu-${i}`} labelText="" size="sm" value={f.unit} placeholder="m"
                    onChange={(e) => setFields((arr) => arr.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))} />
                </TableCell>
                <TableCell>
                  <Button kind="ghost" size="sm" onClick={() => setFields((arr) => arr.filter((_, j) => j !== i))}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Stack>

      {/* Quantity formula */}
      <Stack gap={2}>
        <Stack gap={3} orientation="horizontal">
          <strong style={{ flex: 1 }}>Quantity formula</strong>
          <FormulaStatus expr={quantityFormula} allowed={fieldKeys} />
        </Stack>
        <TextInput id="qty-formula" labelText="" placeholder="(nos * length * height * thickness) / 1000000000"
          value={quantityFormula} onChange={(e) => setQuantityFormula(e.target.value)} />
        <p className="esti-label esti-label--helper" style={{ margin: 0 }}>
          References the field keys above. Leave blank to use the preset “{FORMULA_REGISTRY[detail.formulaKey as FormulaKey]?.label ?? detail.formulaKey}”.
        </p>
      </Stack>

      {/* BOQ splitters */}
      <SplitterTable title="BOQ outputs" nameLabel="Output name" allowed={derivedVars}
        rows={boqSplitters.map((s) => ({ name: s.outputName, formula: s.formula, uom: s.uom }))}
        onChange={(rows) => setBoqSplitters(rows.map((r) => ({ outputName: r.name, formula: r.formula, uom: r.uom })))} />

      {/* Material splitters */}
      <SplitterTable title="Material consumption" nameLabel="Material" allowed={derivedVars}
        rows={materialSplitters.map((s) => ({ name: s.materialName, formula: s.formula, uom: s.uom }))}
        onChange={(rows) => setMaterialSplitters(rows.map((r) => ({ materialName: r.name, formula: r.formula, uom: r.uom })))} />

      {/* Dependencies */}
      <Stack gap={3}>
        <strong>Dependencies (auto-generated child work)</strong>
        <Table size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Child</TableHeader>
              <TableHeader>Mapping formula</TableHeader>
              <TableHeader>{""}</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(detail.related ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{others.find((o) => o.id === r.childComponentId)?.code ?? r.childComponentId.slice(0, 8)}</TableCell>
                <TableCell>{r.quantityFormula ?? `(ratio ${r.ratioFormulaKey ?? "—"} × ${r.qtyFactor})`}</TableCell>
                <TableCell>
                  <Button kind="ghost" size="sm" onClick={() => removeRelated.mutate({ id: r.id }, { onSuccess: () => utils.components.byId.invalidate({ id }) })}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell>
                <Select id="dep-child" labelText="" size="sm" value={depChild} onChange={(e) => setDepChild(e.target.value)}>
                  <SelectItem value="" text="Select child…" />
                  {others.map((o) => <SelectItem key={o.id} value={o.id} text={`${o.code} — ${o.name}`} />)}
                </Select>
              </TableCell>
              <TableCell>
                <TextInput id="dep-formula" labelText="" size="sm" placeholder="wall_area * 2" value={depFormula} onChange={(e) => setDepFormula(e.target.value)} />
              </TableCell>
              <TableCell>
                <Stack gap={2} orientation="horizontal">
                  <FormulaStatus expr={depFormula} allowed={depAllowed} />
                  <Button kind="ghost" size="sm" disabled={!depChild || !depFormula.trim()}
                    onClick={() => addRelated.mutate(
                      { parentComponentId: id, childComponentId: depChild, quantityFormula: depFormula.trim(), qtyFactor: 1, sequence: (detail.related ?? []).length },
                      { onSuccess: () => { setDepChild(""); setDepFormula(""); void utils.components.byId.invalidate({ id }); }, onError: (e) => setError(e.message) },
                    )}>Add</Button>
                </Stack>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p className="esti-label esti-label--helper" style={{ margin: 0 }}>
          Mapping references the parent’s inputs, the derived <code>quantity</code>, and any identifier-named BOQ output (e.g. <code>wall_area</code>).
        </p>
      </Stack>

      {/* Save + versioning */}
      <Stack gap={3} orientation="horizontal">
        <Button onClick={save} disabled={update.isPending}>{update.isPending ? "Saving…" : "Save RuleSet"}</Button>
        {detail.lifecycle !== "PUBLISHED" && (
          <Button kind="tertiary" disabled={publish.isPending}
            onClick={() => publish.mutate({ id }, { onSuccess: () => { void utils.components.byId.invalidate({ id }); onChanged(); }, onError: (e) => setError(e.message) })}>Publish</Button>
        )}
        <Button kind="ghost"
          onClick={() => duplicate.mutate({ id, version: `${Number(detail.version ?? "1.0") + 0.1}` }, { onSuccess: onChanged, onError: (e) => setError(e.message) })}>Duplicate → new draft</Button>
        {detail.lifecycle === "PUBLISHED" && (
          <Button kind="danger--ghost" onClick={() => deprecate.mutate({ id }, { onSuccess: () => { void utils.components.byId.invalidate({ id }); onChanged(); } })}>Deprecate</Button>
        )}
      </Stack>
    </Stack>
  );
}

/** Reusable editable splitter table (BOQ / material). */
function SplitterTable({
  title,
  nameLabel,
  allowed,
  rows,
  onChange,
}: {
  title: string;
  nameLabel: string;
  allowed: string[];
  rows: { name: string; formula: string; uom: string }[];
  onChange: (rows: { name: string; formula: string; uom: string }[]) => void;
}) {
  return (
    <Stack gap={3}>
      <Stack gap={2} orientation="horizontal">
        <strong style={{ flex: 1 }}>{title}</strong>
        <Button size="sm" kind="ghost" onClick={() => onChange([...rows, { name: "", formula: "", uom: "" }])}>Add row</Button>
      </Stack>
      <Table size="sm">
        <TableHead>
          <TableRow>
            <TableHeader>{nameLabel}</TableHeader>
            <TableHeader>Formula</TableHeader>
            <TableHeader>Unit</TableHeader>
            <TableHeader>{""}</TableHeader>
            <TableHeader>{""}</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>
                <TextInput id={`${title}-n-${i}`} labelText="" size="sm" value={r.name}
                  onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              </TableCell>
              <TableCell>
                <TextInput id={`${title}-f-${i}`} labelText="" size="sm" value={r.formula} placeholder="quantity * 500"
                  onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, formula: e.target.value } : x)))} />
              </TableCell>
              <TableCell>
                <TextInput id={`${title}-u-${i}`} labelText="" size="sm" value={r.uom}
                  onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, uom: e.target.value } : x)))} />
              </TableCell>
              <TableCell><FormulaStatus expr={r.formula} allowed={allowed} /></TableCell>
              <TableCell>
                <Button kind="ghost" size="sm" onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}

function RuleSetBuilderTab() {
  const utils = trpc.useUtils();
  const listQ = trpc.components.list.useQuery({ includeArchived: false });
  const create = trpc.components.create.useMutation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_NEW);
  const [error, setError] = useState<string | null>(null);

  const rows = listQ.data ?? [];

  return (
    <Stack gap={5}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p className="esti-label esti-label--secondary" style={{ margin: 0 }}>
          RuleSet Builder (expert) — author a work item’s measurement inputs, quantity formula, BOQ &amp;
          material splits, and dependency chain, then publish a version. Operators only see the result.
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>New RuleSet</Button>
      </div>

      <DataState
        loading={listQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={5}
        empty={{ title: "No RuleSets yet", description: "Author a work item to drive parametric estimation." }}
      >
        <TableContainer title="RuleSets">
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Code</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>UoM</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>{""}</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><Tag size="sm" type="blue">{c.code}</Tag></TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.uom}</TableCell>
                  <TableCell>
                    <Tag size="sm" type={LIFECYCLE_TAG[(c as { lifecycle?: string }).lifecycle ?? "DRAFT"] ?? "gray"}>
                      {(c as { lifecycle?: string }).lifecycle ?? "DRAFT"}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    <Button kind="ghost" size="sm" onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}>
                      {c.id === selectedId ? "Close" : "Edit"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      {selectedId && (
        <div style={{ borderTop: "1px solid var(--cds-border-subtle)", paddingTop: "1rem" }}>
          <RuleSetEditor id={selectedId} onChanged={() => void utils.components.list.invalidate()} />
        </div>
      )}

      <Modal
        open={open}
        modalHeading="New RuleSet"
        primaryButtonText={create.isPending ? "Creating…" : "Create draft"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.code.trim() || !form.name.trim() || !form.level.trim() || !form.componentType.trim() || create.isPending}
        onRequestClose={() => { setOpen(false); setError(null); }}
        onRequestSubmit={() =>
          create.mutate(
            {
              code: form.code.trim().toUpperCase(),
              name: form.name.trim(),
              level: form.level.trim(),
              discipline: form.discipline as (typeof DISCIPLINES)[number],
              componentType: form.componentType.trim(),
              uom: form.uom.trim(),
              kind: form.kind as (typeof KINDS)[number],
              formulaKey: form.formulaKey as (typeof FORMULAS)[number],
              rateSource: form.rateSource as (typeof RATE_SOURCES)[number],
            },
            {
              onSuccess: (row) => {
                void utils.components.list.invalidate();
                setOpen(false);
                setForm(EMPTY_NEW);
                setSelectedId(row.id);
              },
              onError: (e) => setError(e.message),
            },
          )
        }
      >
        <Stack gap={5}>
          {error && <InlineNotification kind="error" lowContrast hideCloseButton title="Could not create" subtitle={error} />}
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput id="rs-code" labelText="AORMS code" placeholder="GF-ARC-BRW-01" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            <TextInput id="rs-name" labelText="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput id="rs-level" labelText="Level" placeholder="GF" value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} />
            <Select id="rs-disc" labelText="Discipline" value={form.discipline} onChange={(e) => setForm((f) => ({ ...f, discipline: e.target.value }))}>
              {DISCIPLINES.map((d) => <SelectItem key={d} value={d} text={d} />)}
            </Select>
            <TextInput id="rs-type" labelText="Type" placeholder="BRICKWALL" value={form.componentType} onChange={(e) => setForm((f) => ({ ...f, componentType: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput id="rs-uom" labelText="Unit of measure" value={form.uom} onChange={(e) => setForm((f) => ({ ...f, uom: e.target.value }))} />
            <Select id="rs-rate" labelText="Rate source" value={form.rateSource} onChange={(e) => setForm((f) => ({ ...f, rateSource: e.target.value }))}>
              {RATE_SOURCES.map((r) => <SelectItem key={r} value={r} text={RATE_SOURCE_LABEL[r] ?? r} />)}
            </Select>
          </div>
          <p className="esti-label esti-label--helper" style={{ margin: 0 }}>
            Creates a DRAFT. Add inputs, the quantity formula, splits and dependencies in the editor, then Publish.
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
          IFC entity → RuleSet reference catalog. Lets a takeoff / IFC import resolve a modeled entity to the
          RuleSet that drives its quantity and rate.
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
          description: "Map IFC entities (e.g. IfcFooting / PAD_FOOTING) to RuleSet codes.",
        }}
      >
        <TableContainer title="IFC mappings">
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>IFC entity</TableHeader>
                <TableHeader>Predefined type</TableHeader>
                <TableHeader>RuleSet</TableHeader>
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
            labelText="RuleSet"
            value={form.componentId}
            onChange={(e) => setForm((f) => ({ ...f, componentId: e.target.value }))}
          >
            <SelectItem value="" text="Select a RuleSet…" />
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
 * Knowledge Bank — the RuleSet Builder (expert layer) + IFC mapping catalog.
 * Authors the construction-intelligence templates (work item → measurement
 * inputs → quantity formula → BOQ/material splits → dependency chain → version)
 * that the project costing window executes.
 */
export function ComponentLibrary({ embedded = false }: { embedded?: boolean }) {
  return (
    <Stack gap={embedded ? 5 : 7}>
      <Tabs>
        <TabList aria-label="RuleSet builder sections" contained>
          <Tab>RuleSets</Tab>
          <Tab>IFC mappings</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <RuleSetBuilderTab />
          </TabPanel>
          <TabPanel>
            <IfcMappingTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
