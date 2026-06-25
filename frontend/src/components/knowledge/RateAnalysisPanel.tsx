import {
  Button,
  Column,
  Grid,
  InlineNotification,
  Modal,
  NumberInput,
  Select,
  SelectItem,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
  Tile,
} from "@carbon/react";
import { Add, Calculator, ChevronRight, TrashCan } from "@carbon/icons-react";
import {
  RATE_COMPONENT_CATEGORY_LABEL,
  RateComponentCategory,
  analysedRate,
  formatINR,
  rateComponentAmount,
} from "@esti/contracts";
import { useState } from "react";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

const CATEGORIES = RateComponentCategory.options;

interface AddComponentForm {
  category: string;
  description: string;
  unit: string;
  qty: number;
  ratePaise: number;
}

const EMPTY_COMPONENT: AddComponentForm = {
  category: "MATERIAL",
  description: "",
  unit: "",
  qty: 1,
  ratePaise: 0,
};

function RateAnalysisDetail({ id }: { id: string }) {
  const utils = trpc.useUtils();
  const detailQ = trpc.rateAnalysis.byId.useQuery({ id });
  const versionsQ = trpc.dsr.listVersions.useQuery();
  const addComponent = trpc.rateAnalysis.addComponent.useMutation({
    onSuccess: () => utils.rateAnalysis.byId.invalidate({ id }),
  });
  const deleteComponent = trpc.rateAnalysis.deleteComponent.useMutation({
    onSuccess: () => utils.rateAnalysis.byId.invalidate({ id }),
  });
  const updateHeader = trpc.rateAnalysis.update.useMutation({
    onSuccess: () => utils.rateAnalysis.byId.invalidate({ id }),
  });
  const publishMut = trpc.rateAnalysis.publish.useMutation({
    onSuccess: () => {
      utils.rateAnalysis.byId.invalidate({ id });
      utils.rateAnalysis.list.invalidate();
    },
  });

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<AddComponentForm>(EMPTY_COMPONENT);
  const [overheadEdit, setOverheadEdit] = useState<string>("");
  const [overheadEditing, setOverheadEditing] = useState(false);

  const analysis = detailQ.data;
  if (!analysis) return <DataState loading={detailQ.isLoading} isEmpty={false} columnCount={4} empty={{ title: "Not found" }}>{null}</DataState>;

  const components = analysis.components ?? [];
  const grouped: Record<string, typeof components> = {};
  for (const c of components) {
    (grouped[c.category] ??= []).push(c);
  }

  function handleAddComponent() {
    addComponent.mutate({
      rateAnalysisId: id,
      category: form.category as RateComponentCategory,
      description: form.description,
      unit: form.unit,
      qty: form.qty,
      ratePaise: form.ratePaise,
      sortOrder: components.length,
    });
    setForm(EMPTY_COMPONENT);
    setAddOpen(false);
  }

  function handleOverheadSave() {
    const pct = parseFloat(overheadEdit);
    if (!isNaN(pct)) {
      updateHeader.mutate({ id, overheadPct: Math.max(0, Math.min(100, pct)) });
    }
    setOverheadEditing(false);
  }

  const liveDirectCost = components.reduce((s, c) => s + c.amountPaise, 0);
  const liveAnalysed = analysedRate(liveDirectCost, analysis.overheadPct);

  const writableVersions = (versionsQ.data ?? []).filter(
    (v) => !v.readOnly && v.status === "PUBLISHED",
  );

  return (
    <Stack gap={5}>
      {/* Header summary */}
      <Grid narrow>
        <Column sm={4} md={4} lg={5}>
          <Tile>
            <Stack gap={3}>
              <div>
                <p className="esti-label--secondary">Code</p>
                <p>{analysis.code}</p>
              </div>
              <div>
                <p className="esti-label--secondary">Description</p>
                <p>{analysis.description}</p>
              </div>
              <div>
                <p className="esti-label--secondary">Unit</p>
                <p>{analysis.unit}</p>
              </div>
              <div>
                <p className="esti-label--secondary">Status</p>
                <Tag type={analysis.status === "PUBLISHED" ? "green" : "gray"} size="sm">
                  {analysis.status}
                </Tag>
              </div>
            </Stack>
          </Tile>
        </Column>
        <Column sm={4} md={4} lg={5}>
          <Tile>
            <Stack gap={3}>
              <div>
                <p className="esti-label--secondary">Direct cost</p>
                <p>{formatINR(liveDirectCost)}</p>
              </div>
              <div>
                <p className="esti-label--secondary">Overhead %</p>
                {overheadEditing ? (
                  <Stack orientation="horizontal" gap={3}>
                    <TextInput
                      id="ra-overhead"
                      labelText=""
                      size="sm"
                      value={overheadEdit}
                      onChange={(e) => setOverheadEdit(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleOverheadSave()}
                      style={{ width: 80 }}
                    />
                    <Button size="sm" kind="primary" onClick={handleOverheadSave}>
                      Save
                    </Button>
                  </Stack>
                ) : (
                  <Stack orientation="horizontal" gap={3} style={{ alignItems: "center" }}>
                    <p>{analysis.overheadPct}%</p>
                    {analysis.status !== "PUBLISHED" && (
                      <Button
                        size="sm"
                        kind="ghost"
                        onClick={() => {
                          setOverheadEdit(String(analysis.overheadPct));
                          setOverheadEditing(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </Stack>
                )}
              </div>
              <div>
                <p className="esti-label--secondary">Analysed rate</p>
                <p><strong>{formatINR(liveAnalysed)}</strong> / {analysis.unit}</p>
              </div>
            </Stack>
          </Tile>
        </Column>
        <Column sm={4} md={8} lg={6}>
          <Tile>
            <Stack gap={3}>
              <div>
                <p className="esti-label--secondary">Rate-book version</p>
                {analysis.status === "PUBLISHED" ? (
                  <p>{(versionsQ.data ?? []).find((v) => v.id === analysis.dsrVersionId)?.label ?? "—"}</p>
                ) : (
                  <Select
                    id="ra-version"
                    labelText=""
                    size="sm"
                    value={analysis.dsrVersionId ?? ""}
                    onChange={(e) =>
                      updateHeader.mutate({ id, dsrVersionId: e.target.value || null })
                    }
                  >
                    <SelectItem value="" text="— not linked —" />
                    {writableVersions.map((v) => (
                      <SelectItem key={v.id} value={v.id} text={v.label} />
                    ))}
                  </Select>
                )}
              </div>
              {analysis.status === "DRAFT" && (
                <Button
                  kind="primary"
                  size="sm"
                  renderIcon={Calculator}
                  disabled={!analysis.dsrVersionId || publishMut.isPending}
                  onClick={() => publishMut.mutate({ id })}
                >
                  Publish to rate book
                </Button>
              )}
              {publishMut.error && (
                <InlineNotification
                  kind="error"
                  title="Publish failed"
                  subtitle={publishMut.error.message}
                  lowContrast
                />
              )}
            </Stack>
          </Tile>
        </Column>
      </Grid>

      {/* Component lines */}
      <Stack gap={3}>
        <Stack orientation="horizontal" gap={4} style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h4>Component build-up</h4>
          {analysis.status !== "PUBLISHED" && (
            <Button
              kind="primary"
              size="sm"
              renderIcon={Add}
              onClick={() => setAddOpen(true)}
            >
              Add line
            </Button>
          )}
        </Stack>

        {CATEGORIES.map((cat) => {
          const rows = grouped[cat] ?? [];
          if (rows.length === 0) return null;
          return (
            <Stack key={cat} gap={2}>
              <Tag type="blue" size="sm">
                {RATE_COMPONENT_CATEGORY_LABEL[cat as keyof typeof RATE_COMPONENT_CATEGORY_LABEL]}
              </Tag>
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Description</TableHeader>
                      <TableHeader>Unit</TableHeader>
                      <TableHeader>Qty</TableHeader>
                      <TableHeader>Rate</TableHeader>
                      <TableHeader>Amount</TableHeader>
                      {analysis.status !== "PUBLISHED" && <TableHeader />}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.description}</TableCell>
                        <TableCell>{c.unit}</TableCell>
                        <TableCell>{c.qty}</TableCell>
                        <TableCell>{formatINR(c.ratePaise)}</TableCell>
                        <TableCell>{formatINR(c.amountPaise)}</TableCell>
                        {analysis.status !== "PUBLISHED" && (
                          <TableCell>
                            <Button
                              kind="ghost"
                              size="sm"
                              hasIconOnly
                              renderIcon={TrashCan}
                              iconDescription="Remove"
                              onClick={() => deleteComponent.mutate({ id: c.id })}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          );
        })}

        {components.length === 0 && (
          <p className="esti-label--secondary">No components yet. Add lines above.</p>
        )}
      </Stack>

      {/* Add component modal */}
      <Modal
        open={addOpen}
        modalHeading="Add component line"
        primaryButtonText="Add"
        secondaryButtonText="Cancel"
        onRequestClose={() => setAddOpen(false)}
        onRequestSubmit={handleAddComponent}
        primaryButtonDisabled={!form.description || !form.unit || form.qty <= 0}
      >
        <Stack gap={5}>
          <Select
            id="comp-category"
            labelText="Category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {CATEGORIES.map((c) => (
              <SelectItem
                key={c}
                value={c}
                text={RATE_COMPONENT_CATEGORY_LABEL[c as keyof typeof RATE_COMPONENT_CATEGORY_LABEL]}
              />
            ))}
          </Select>
          <TextInput
            id="comp-desc"
            labelText="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Stack orientation="horizontal" gap={4}>
            <TextInput
              id="comp-unit"
              labelText="Unit"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              style={{ flex: 1 }}
            />
            <NumberInput
              id="comp-qty"
              label="Qty"
              value={form.qty}
              min={0.001}
              step={0.5}
              onChange={(_e, { value }) =>
                setForm((f) => ({ ...f, qty: typeof value === "number" ? value : parseFloat(String(value)) || 1 }))
              }
              style={{ flex: 1 }}
            />
          </Stack>
          <Stack orientation="horizontal" gap={4} style={{ alignItems: "flex-end" }}>
            <NumberInput
              id="comp-rate"
              label="Rate (₹)"
              value={form.ratePaise / 100}
              min={0}
              step={1}
              onChange={(_e, { value }) =>
                setForm((f) => ({
                  ...f,
                  ratePaise: Math.round((typeof value === "number" ? value : parseFloat(String(value)) || 0) * 100),
                }))
              }
              style={{ flex: 1 }}
            />
            <Tile style={{ flex: 1 }}>
              <p className="esti-label--secondary">Amount</p>
              <p>{formatINR(rateComponentAmount(form.qty, form.ratePaise))}</p>
            </Tile>
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
}

interface NewAnalysisForm {
  code: string;
  description: string;
  unit: string;
  overheadPct: number;
}

const EMPTY_ANALYSIS: NewAnalysisForm = { code: "", description: "", unit: "Sqm", overheadPct: 10 };

export function RateAnalysisPanel({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const listQ = trpc.rateAnalysis.list.useQuery(undefined);
  const deleteMut = trpc.rateAnalysis.delete.useMutation({
    onSuccess: () => utils.rateAnalysis.list.invalidate(),
  });
  const createMut = trpc.rateAnalysis.create.useMutation({
    onSuccess: (data) => {
      utils.rateAnalysis.list.invalidate();
      setSelected(data.id);
      setCreateOpen(false);
    },
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewAnalysisForm>(EMPTY_ANALYSIS);

  const items = listQ.data ?? [];

  function handleCreate() {
    createMut.mutate({
      code: form.code,
      description: form.description,
      unit: form.unit,
      overheadPct: form.overheadPct,
    });
  }

  return (
    <Stack gap={embedded ? 5 : 7}>
      {!embedded && (
        <p>
          Build composite rates from material, labour, machinery, and sundry components. Publish
          a finished analysis directly into a rate-book version.
        </p>
      )}

      <Grid narrow>
        {/* Left: list */}
        <Column sm={4} md={3} lg={4}>
          <Stack gap={3}>
            <Stack orientation="horizontal" gap={3} style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h4>Analyses</h4>
              <Button kind="primary" size="sm" renderIcon={Add} onClick={() => setCreateOpen(true)}>
                New
              </Button>
            </Stack>
            <DataState
              loading={listQ.isLoading}
              isEmpty={items.length === 0}
              columnCount={1}
              empty={{ title: "No analyses", description: "Create your first rate analysis above." }}
            >
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Code</TableHeader>
                      <TableHeader>Description</TableHeader>
                      <TableHeader>Analysed rate</TableHeader>
                      <TableHeader />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((a) => (
                      <TableRow
                        key={a.id}
                        style={{ cursor: "pointer", background: selected === a.id ? "var(--cds-layer-selected)" : undefined }}
                        onClick={() => setSelected(a.id)}
                      >
                        <TableCell>
                          <Stack orientation="horizontal" gap={2} style={{ alignItems: "center" }}>
                            {a.code}
                            <Tag type={a.status === "PUBLISHED" ? "green" : "gray"} size="sm">
                              {a.status}
                            </Tag>
                          </Stack>
                        </TableCell>
                        <TableCell>{a.description}</TableCell>
                        <TableCell>{formatINR(a.analysedRatePaise)} / {a.unit}</TableCell>
                        <TableCell>
                          <Button
                            kind="ghost"
                            size="sm"
                            hasIconOnly
                            renderIcon={ChevronRight}
                            iconDescription="Open"
                            onClick={() => setSelected(a.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DataState>
          </Stack>
        </Column>

        {/* Right: detail */}
        <Column sm={4} md={5} lg={12}>
          {selected ? (
            <RateAnalysisDetail key={selected} id={selected} />
          ) : (
            <Tile>
              <p className="esti-label--secondary">Select an analysis to view its component build-up.</p>
            </Tile>
          )}
        </Column>
      </Grid>

      {/* Create modal */}
      <Modal
        open={createOpen}
        modalHeading="New rate analysis"
        primaryButtonText="Create"
        secondaryButtonText="Cancel"
        onRequestClose={() => { setCreateOpen(false); setForm(EMPTY_ANALYSIS); }}
        onRequestSubmit={handleCreate}
        primaryButtonDisabled={!form.code || !form.description || !form.unit || createMut.isPending}
      >
        <Stack gap={5}>
          <TextInput
            id="ra-code"
            labelText="Code"
            helperText="e.g. BW230 or CON-M20"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          />
          <TextInput
            id="ra-desc"
            labelText="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Stack orientation="horizontal" gap={4}>
            <TextInput
              id="ra-unit"
              labelText="Unit"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              style={{ flex: 1 }}
            />
            <NumberInput
              id="ra-overhead"
              label="Overhead %"
              value={form.overheadPct}
              min={0}
              max={100}
              step={1}
              onChange={(_e, { value }) =>
                setForm((f) => ({
                  ...f,
                  overheadPct: typeof value === "number" ? value : parseFloat(String(value)) || 0,
                }))
              }
              style={{ flex: 1 }}
            />
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
}
