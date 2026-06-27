import {
  Button,
  Checkbox,
  ComboBox,
  Dropdown,
  InlineNotification,
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
  TextInput,
  Tile,
} from "@carbon/react";
import { Add, ChevronDown, ChevronUp, TrashCan } from "@carbon/icons-react";
import {
  BOQ_VALIDATION_LABEL,
  BOQ_VALIDATION_TAG,
  CALCULATION_TYPE_LABEL,
  COST_HEAD_LABEL,
  FORMULA_REGISTRY,
  formatINR,
  measurementBookQty,
  measurementColumnsForUnit,
  measurementRowQty,
  parseRupeeInput,
  type CalculationType,
  type ComponentParamField,
  type CostHead,
  type DerivedItem,
  type MeasurementBookRow,
} from "@esti/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { RateAnalysisPanel } from "../knowledge/RateAnalysisPanel.js";
import { trpc } from "../../lib/trpc.js";
import { pdfPollInterval } from "../../lib/pdfUi.js";

const COST_HEADS = Object.keys(COST_HEAD_LABEL) as CostHead[];

/** Calc types where the line value is a fixed lump amount (qty fixed to 1). */
const LUMP_TYPES = new Set<CalculationType>(["LUMPSUM", "NON_MODELED"]);

const DIM_LABEL: Record<"length" | "breadth" | "depth", string> = {
  length: "Length",
  breadth: "Breadth",
  depth: "Depth",
};

function confidenceTone(c?: string | null): "red" | "teal" | "green" | "gray" {
  if (c === "LOW") return "red";
  if (c === "HIGH") return "green";
  if (c === "MEDIUM") return "teal";
  return "gray";
}

function calcTone(c?: string | null): "purple" | "cyan" | "teal" | "gray" {
  if (c === "PERCENTAGE") return "purple";
  if (c === "COMPONENT") return "cyan";
  if (c === "AREA_RATE") return "teal";
  return "gray";
}

function statusTone(status: string): "green" | "purple" | "teal" | "blue" {
  if (status.endsWith("FROZEN") || status === "APPROVED") return "green";
  if (status === "EXECUTION_DETAILING") return "purple";
  if (status === "UNDER_REVIEW") return "teal";
  return "blue";
}

/** Generate / open the estimate PDF (cost-head grouped in the worker template). */
function EstimatePdf({ id }: { id: string }) {
  const utils = trpc.useUtils();
  const q = trpc.estimates.byId.useQuery(
    { id },
    { refetchInterval: (query) => pdfPollInterval(query.state.data?.pdfStatus, true) },
  );
  const gen = trpc.estimates.generatePdf.useMutation({
    onSuccess: () => utils.estimates.byId.invalidate({ id }),
  });
  const status = q.data?.pdfStatus ?? "NONE";
  const url = q.data?.pdfUrl ?? null;
  if (status === "READY" && url) {
    return (
      <Button kind="ghost" size="sm" href={url} target="_blank" rel="noreferrer">
        Open PDF
      </Button>
    );
  }
  if (status === "PENDING" || status === "PROCESSING") {
    return <span className="esti-label esti-label--secondary">Generating…</span>;
  }
  return (
    <Button kind="ghost" size="sm" disabled={gen.isPending} onClick={() => gen.mutate({ id })}>
      {status === "FAILED" ? "Retry PDF" : "Generate PDF"}
    </Button>
  );
}

type EstimateRow = { id: string; ref: string; title: string; status: string };
type ItemRow = {
  id: string;
  description: string;
  unit: string;
  qty: number;
  ratePaise: number;
  itemLeadPct: number;
  amountPaise: number;
  costHead: string | null;
  calculationType: string | null;
  confidence: string | null;
  pct: number | null;
  sourceKind: string | null;
  sourcePayload?: unknown;
};

function readMeasurements(item: ItemRow): MeasurementBookRow[] {
  const sp = item.sourcePayload as { measurements?: MeasurementBookRow[] } | null | undefined;
  return Array.isArray(sp?.measurements) ? (sp!.measurements as MeasurementBookRow[]) : [];
}

// --- Inline estimate title (rename without a modal) -------------------------

function InlineTitle({
  id,
  title,
  editable,
  onRename,
}: {
  id: string;
  title: string;
  editable: boolean;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  useEffect(() => setDraft(title), [title, id]);
  if (!editable || !editing) {
    return (
      <Stack orientation="horizontal" gap={3}>
        <h4 style={{ margin: 0 }}>{title}</h4>
        {editable && (
          <Button kind="ghost" size="sm" onClick={() => setEditing(true)}>
            Rename
          </Button>
        )}
      </Stack>
    );
  }
  const commit = () => {
    const t = draft.trim();
    if (t && t !== title) onRename(t);
    setEditing(false);
  };
  return (
    <TextInput
      id={`est-title-${id}`}
      labelText="Estimate name"
      hideLabel
      size="sm"
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(title);
          setEditing(false);
        }
      }}
    />
  );
}

// --- Inline rate-book item search (Add Item, no modal) ----------------------

type RatebookItem = { id: string; code: string; description: string; unit: string; ratePaise: number };

function AddItemRow({
  versionId,
  costHead,
  onPick,
  onBlank,
  adding,
}: {
  versionId: string | null;
  costHead: CostHead;
  onPick: (it: RatebookItem) => void;
  onBlank: () => void;
  adding: boolean;
}) {
  const itemsQ = trpc.dsr.listItems.useQuery(
    { versionId: versionId ?? "" },
    { enabled: !!versionId },
  );
  const items = (itemsQ.data ?? []) as RatebookItem[];
  return (
    <Stack orientation="horizontal" gap={3} style={{ alignItems: "flex-end" }}>
      <div style={{ minWidth: 360 }}>
        <ComboBox
          id={`add-item-${costHead}`}
          titleText=""
          aria-label="Search rate book"
          placeholder={
            versionId ? "Add item — type to search the rate book…" : "Select a rate book first →"
          }
          disabled={!versionId || adding}
          items={items}
          itemToString={(it) => (it ? `${(it as RatebookItem).code} — ${(it as RatebookItem).description}` : "")}
          shouldFilterItem={({ item, inputValue }) => {
            const it = item as RatebookItem;
            const q = (inputValue ?? "").toLowerCase();
            return (
              it.code.toLowerCase().includes(q) || it.description.toLowerCase().includes(q)
            );
          }}
          onChange={({ selectedItem }) => {
            if (selectedItem) onPick(selectedItem as RatebookItem);
          }}
        />
      </div>
      <Button kind="tertiary" size="sm" disabled={adding} onClick={onBlank} renderIcon={Add}>
        Blank line
      </Button>
    </Stack>
  );
}

// --- Measurement book (unit-driven child table, keyboard-first) -------------

function MeasurementBook({
  itemId,
  unit,
  initial,
  autoFocusFirst,
  onSave,
}: {
  itemId: string;
  unit: string;
  initial: MeasurementBookRow[];
  autoFocusFirst: boolean;
  onSave: (rows: MeasurementBookRow[]) => void;
}) {
  const cols = measurementColumnsForUnit(unit);
  const lastField = cols.length ? cols[cols.length - 1]! : "nos";
  const [rows, setRows] = useState<MeasurementBookRow[]>(
    initial.length ? initial : [{ label: "", nos: 1 }],
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueSave = (next: MeasurementBookRow[]) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSave(next), 400);
  };
  const flush = (next: MeasurementBookRow[]) => {
    if (timer.current) clearTimeout(timer.current);
    onSave(next);
  };
  const update = (i: number, patch: Partial<MeasurementBookRow>) =>
    setRows((rs) => {
      const next = rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
      queueSave(next);
      return next;
    });
  const addRow = () =>
    setRows((rs) => {
      const next = [...rs, { label: "", nos: 1 } as MeasurementBookRow];
      return next;
    });
  const removeRow = (i: number) =>
    setRows((rs) => {
      const next = rs.filter((_, idx) => idx !== i);
      const result = next.length ? next : [{ label: "", nos: 1 } as MeasurementBookRow];
      flush(next);
      return result;
    });

  const focusCell = (rowIdx: number, field: string) =>
    setTimeout(() => document.getElementById(`mb-${itemId}-${rowIdx}-${field}`)?.focus(), 0);

  const cellKeyDown = (e: React.KeyboardEvent, rowIdx: number, field: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (field === lastField) {
        if (rowIdx === rows.length - 1) addRow();
        focusCell(rowIdx + 1, "label");
      }
    }
  };

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  return (
    <Table size="sm">
      <TableHead>
        <TableRow>
          <TableHeader>Element</TableHeader>
          <TableHeader>Nos</TableHeader>
          {cols.map((c) => (
            <TableHeader key={c}>{DIM_LABEL[c]} (m)</TableHeader>
          ))}
          <TableHeader>Qty ({unit})</TableHeader>
          <TableHeader />
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            <TableCell>
              <TextInput
                id={`mb-${itemId}-${i}-label`}
                labelText=""
                hideLabel
                size="sm"
                autoFocus={autoFocusFirst && i === 0}
                value={r.label ?? ""}
                placeholder={`Element ${i + 1}`}
                onChange={(e) => update(i, { label: e.target.value })}
              />
            </TableCell>
            <TableCell>
              <TextInput
                id={`mb-${itemId}-${i}-nos`}
                labelText=""
                hideLabel
                size="sm"
                type="number"
                value={String(r.nos ?? 1)}
                onChange={(e) => update(i, { nos: Number(e.target.value) || 0 })}
                onKeyDown={(e) => cellKeyDown(e, i, "nos")}
              />
            </TableCell>
            {cols.map((c) => (
              <TableCell key={c}>
                <TextInput
                  id={`mb-${itemId}-${i}-${c}`}
                  labelText=""
                  hideLabel
                  size="sm"
                  type="number"
                  value={r[c] == null ? "" : String(r[c])}
                  onChange={(e) => update(i, { [c]: num(e.target.value) } as Partial<MeasurementBookRow>)}
                  onKeyDown={(e) => cellKeyDown(e, i, c)}
                />
              </TableCell>
            ))}
            <TableCell>{measurementRowQty(r).toFixed(3)}</TableCell>
            <TableCell>
              <Button
                kind="ghost"
                size="sm"
                hasIconOnly
                iconDescription="Remove row"
                renderIcon={TrashCan}
                onClick={() => removeRow(i)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Estimation OS — keyboard-first, no-modal costing window. A single inline
 * workspace: rename the estimate in place, pick a rate book in the side popover,
 * `+ Add Item` to search it, then build each line's quantity in a unit-driven
 * measurement book (the parent qty is the sum, written to the line via
 * `estimates.updateItem`). Components/execution and rate-analysis stay as tabs.
 */
export function CostingWindow({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const estimatesQ = trpc.estimates.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const estimateRows = (estimatesQ.data ?? []) as EstimateRow[];
  const [openId, setOpenId] = useState<string | null>(null);
  const open = estimateRows.find((e) => e.id === openId) ?? estimateRows[0] ?? null;
  const activeId = open?.id ?? null;

  const detailQ = trpc.estimates.byId.useQuery({ id: activeId ?? "" }, { enabled: !!activeId });
  const detail = detailQ.data ?? null;
  const itemsQ = trpc.estimates.items.useQuery(
    { estimateId: activeId ?? "" },
    { enabled: !!activeId },
  );
  const boqCheckQ = trpc.estimates.validateBoq.useQuery(
    { estimateId: activeId ?? "" },
    { enabled: !!activeId },
  );
  const boqCheck = boqCheckQ.data ?? null;
  const placedQ = trpc.estimation.listComponents.useQuery(
    { estimateId: activeId ?? "" },
    { enabled: !!activeId },
  );
  const versionsQ = trpc.estimation.versions.useQuery(
    { estimateId: activeId ?? "" },
    { enabled: !!activeId },
  );
  const componentsQ = trpc.components.list.useQuery({ projectId });
  const ratebooksQ = trpc.dsr.listVersions.useQuery();
  const ratebooks = (ratebooksQ.data ?? []) as { id: string; label: string; status: string }[];

  const editable = detail?.status === "DRAFT";

  const invalidateActive = () => {
    if (!activeId) return;
    void utils.estimates.byId.invalidate({ id: activeId });
    void utils.estimates.items.invalidate({ estimateId: activeId });
    void utils.estimates.validateBoq.invalidate({ estimateId: activeId });
    void utils.estimation.listComponents.invalidate({ estimateId: activeId });
    void utils.estimates.listByProject.invalidate({ projectId });
  };

  // --- mutations ------------------------------------------------------------
  const createEstimate = trpc.estimates.create.useMutation({
    onSuccess: (row) => {
      void utils.estimates.listByProject.invalidate({ projectId });
      setOpenId(row.id);
    },
  });
  const renameEstimate = trpc.estimates.rename.useMutation({ onSuccess: invalidateActive });
  const setDsrVersion = trpc.estimates.setDsrVersion.useMutation({ onSuccess: invalidateActive });
  const setStage = trpc.estimation.setStage.useMutation({ onSuccess: invalidateActive });
  const addItem = trpc.estimates.addItem.useMutation({
    onSuccess: () => {
      invalidateActive();
      setJustAdded(true);
    },
  });
  const updateBoqItem = trpc.estimates.updateItem.useMutation({ onSuccess: invalidateActive });
  const removeItem = trpc.estimates.removeItem.useMutation({ onSuccess: invalidateActive });
  const addDesignItem = trpc.estimation.addItem.useMutation({ onSuccess: invalidateActive });
  const freeze = trpc.estimation.freeze.useMutation({
    onSuccess: () => {
      invalidateActive();
      void utils.estimation.versions.invalidate({ estimateId: activeId ?? "" });
      setFreezeNote("");
      setFreezing(false);
    },
  });
  const revise = trpc.estimates.revise.useMutation({ onSuccess: invalidateActive });
  const addComponent = trpc.estimation.addComponent.useMutation({
    onSuccess: () => {
      invalidateActive();
      void utils.estimation.versions.invalidate({ estimateId: activeId ?? "" });
    },
  });
  const removeComponent = trpc.estimation.removeComponent.useMutation({ onSuccess: invalidateActive });

  // --- inline state ---------------------------------------------------------
  const [addHead, setAddHead] = useState<CostHead>("OTHER");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const [freezeNote, setFreezeNote] = useState("");

  const items = (itemsQ.data ?? []) as ItemRow[];

  // After an Add, auto-open the newest line's measurement book and focus it.
  useEffect(() => {
    if (!justAdded || items.length === 0) return;
    const newest = items[items.length - 1]!;
    setExpandedId(newest.id);
    setJustAdded(false);
  }, [justAdded, items]);

  const designGroups = useMemo(
    () =>
      COST_HEADS.map((head) => ({
        head,
        rows: items.filter((it) => (it.costHead ?? "OTHER") === head),
      })).filter((g) => g.rows.length > 0),
    [items],
  );

  const activeRatebook = ratebooks.find((r) => r.id === (detail?.dsrVersionId ?? "")) ?? null;

  function pickRatebookItem(it: RatebookItem) {
    if (!activeId) return;
    addItem.mutate({
      estimateId: activeId,
      dsrItemId: it.id,
      description: it.description,
      unit: it.unit,
      qty: 0,
      ratePaise: it.ratePaise,
      itemLeadPct: 0,
      costHead: addHead,
    });
  }
  function addBlankLine() {
    if (!activeId) return;
    addItem.mutate({
      estimateId: activeId,
      dsrItemId: null,
      description: "New item",
      unit: "nos",
      qty: 0,
      ratePaise: 0,
      itemLeadPct: 0,
      costHead: addHead,
    });
  }

  return (
    <Stack gap={5}>
      {/* --- Workspace header (inline; no modals) --------------------------- */}
      <Stack orientation="horizontal" gap={4} style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ minWidth: 240 }}>
          <Dropdown
            id="cw-estimate"
            titleText="Estimate"
            size="sm"
            label="Select an estimate"
            items={estimateRows}
            selectedItem={open}
            itemToString={(e) => (e ? `${(e as EstimateRow).ref} — ${(e as EstimateRow).title}` : "")}
            onChange={({ selectedItem }) => setOpenId((selectedItem as EstimateRow | null)?.id ?? null)}
          />
        </div>
        <Button
          size="sm"
          renderIcon={Add}
          disabled={createEstimate.isPending}
          onClick={() => {
            const n = estimateRows.length + 1;
            createEstimate.mutate({
              projectId,
              title: `Estimate ${String(n).padStart(3, "0")}`,
              dsrVersionId: null,
              leadPct: 0,
            });
          }}
        >
          New estimate
        </Button>
        {detail && (
          <>
            <InlineTitle
              id={detail.id}
              title={detail.title}
              editable={!!editable}
              onRename={(title) => renameEstimate.mutate({ id: detail.id, title })}
            />
            <Tag type={statusTone(detail.status)}>{detail.status}</Tag>
            {boqCheck && (
              <Tag
                type={
                  boqCheck.summary.clean ? "green" : boqCheck.summary.high > 0 ? "red" : "magenta"
                }
              >
                {boqCheck.summary.clean
                  ? "Checks: clean"
                  : `Checks: ${boqCheck.summary.total} issue${
                      boqCheck.summary.total === 1 ? "" : "s"
                    }`}
              </Tag>
            )}
            <span style={{ marginLeft: "auto" }} />
            <EstimatePdf id={detail.id} />
            {editable ? (
              freezing ? (
                <Stack orientation="horizontal" gap={2} style={{ alignItems: "flex-end" }}>
                  <TextInput
                    id="cw-freeze-note"
                    size="sm"
                    labelText="Freeze note"
                    hideLabel
                    placeholder="Note (optional)…"
                    value={freezeNote}
                    onChange={(e) => setFreezeNote(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={freeze.isPending}
                    onClick={() =>
                      activeId &&
                      freeze.mutate({ estimateId: activeId, note: freezeNote.trim() || undefined })
                    }
                  >
                    {freeze.isPending ? "Freezing…" : "Confirm freeze"}
                  </Button>
                  <Button size="sm" kind="ghost" onClick={() => setFreezing(false)}>
                    Cancel
                  </Button>
                </Stack>
              ) : (
                <Button size="sm" kind="tertiary" onClick={() => setFreezing(true)}>
                  Freeze version
                </Button>
              )
            ) : (
              <Button
                size="sm"
                kind="tertiary"
                disabled={revise.isPending}
                onClick={() => revise.mutate({ id: detail.id, revisionNote: "Reopened for editing" })}
              >
                Revise
              </Button>
            )}
          </>
        )}
      </Stack>

      {!detail ? (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="No estimate selected"
          subtitle="Create an estimate to start a staged design / component costing."
        />
      ) : (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Tabs>
              <TabList aria-label="Costing stages" contained>
                <Tab>Design estimate</Tab>
                <Tab>Components / execution</Tab>
                <Tab>Rate analysis</Tab>
              </TabList>
              <TabPanels>
                {/* --- Design estimate ------------------------------------- */}
                <TabPanel>
                  <Stack gap={5}>
                    <Stack orientation="horizontal" gap={4} style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
                      <Select
                        id="cw-stage"
                        labelText="Stage"
                        size="sm"
                        disabled={!editable}
                        value={detail.stage ?? "DESIGN"}
                        onChange={(e) =>
                          setStage.mutate({
                            id: detail.id,
                            stage: e.target.value as "DESIGN" | "EXECUTION",
                          })
                        }
                      >
                        <SelectItem value="DESIGN" text="Design (ballpark)" />
                        <SelectItem value="EXECUTION" text="Execution (detailed)" />
                      </Select>
                      {editable && (
                        <Select
                          id="cw-addhead"
                          labelText="Add under"
                          size="sm"
                          value={addHead}
                          onChange={(e) => setAddHead(e.target.value as CostHead)}
                        >
                          {COST_HEADS.map((h) => (
                            <SelectItem key={h} value={h} text={COST_HEAD_LABEL[h]} />
                          ))}
                        </Select>
                      )}
                    </Stack>

                    {editable && (
                      <AddItemRow
                        versionId={detail.dsrVersionId ?? null}
                        costHead={addHead}
                        onPick={pickRatebookItem}
                        onBlank={addBlankLine}
                        adding={addItem.isPending}
                      />
                    )}

                    {boqCheck && !boqCheck.summary.clean && (
                      <TableContainer
                        title="BOQ checks"
                        description="Automatic data-quality checks — advisory only; nothing is blocked."
                      >
                        <Table size="sm">
                          <TableHead>
                            <TableRow>
                              <TableHeader>Line</TableHeader>
                              <TableHeader>Check</TableHeader>
                              <TableHeader>Detail</TableHeader>
                              <TableHeader>Severity</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {boqCheck.issues.map((issue, i) => (
                              <TableRow key={`${issue.itemId}-${issue.kind}-${i}`}>
                                <TableCell>{issue.line}</TableCell>
                                <TableCell>{BOQ_VALIDATION_LABEL[issue.kind]}</TableCell>
                                <TableCell>{issue.detail}</TableCell>
                                <TableCell>
                                  <Tag size="sm" type={BOQ_VALIDATION_TAG[issue.severity]}>
                                    {issue.severity}
                                  </Tag>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}

                    {designGroups.length === 0 ? (
                      <InlineNotification
                        kind="info"
                        lowContrast
                        hideCloseButton
                        title="No lines yet"
                        subtitle="Pick a rate book in the panel, then + Add Item and start typing."
                      />
                    ) : (
                      designGroups.map((group) => {
                        const subtotal = group.rows.reduce((s, it) => s + it.amountPaise, 0);
                        return (
                          <TableContainer key={group.head} title={COST_HEAD_LABEL[group.head]}>
                            <Table size="sm">
                              <TableHead>
                                <TableRow>
                                  <TableHeader />
                                  <TableHeader>Description</TableHeader>
                                  <TableHeader>Type</TableHeader>
                                  <TableHeader>Unit</TableHeader>
                                  <TableHeader>Qty</TableHeader>
                                  <TableHeader>Rate</TableHeader>
                                  <TableHeader>Amount</TableHeader>
                                  <TableHeader />
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {group.rows.flatMap((it) => {
                                  const isPct = it.calculationType === "PERCENTAGE";
                                  const isLump = LUMP_TYPES.has(it.calculationType as CalculationType);
                                  const isComponent = it.sourceKind === "COMPONENT";
                                  const canEdit = editable && !isComponent;
                                  const canMeasure = canEdit && !isPct && !isLump;
                                  const mRows = readMeasurements(it);
                                  const expanded = expandedId === it.id;
                                  const main = (
                                    <TableRow key={it.id}>
                                      <TableCell>
                                        {canMeasure && (
                                          <Button
                                            kind="ghost"
                                            size="sm"
                                            hasIconOnly
                                            iconDescription={expanded ? "Hide measurements" : "Measurements"}
                                            renderIcon={expanded ? ChevronUp : ChevronDown}
                                            onClick={() => setExpandedId(expanded ? null : it.id)}
                                          />
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {canEdit ? (
                                          <TextInput
                                            id={`d-desc-${it.id}`}
                                            labelText=""
                                            hideLabel
                                            size="sm"
                                            defaultValue={it.description}
                                            onBlur={(e) =>
                                              updateBoqItem.mutate({ id: it.id, description: e.target.value })
                                            }
                                          />
                                        ) : (
                                          it.description
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Tag size="sm" type={calcTone(it.calculationType)}>
                                          {CALCULATION_TYPE_LABEL[it.calculationType as CalculationType] ??
                                            it.calculationType ??
                                            "Rate book"}
                                        </Tag>
                                      </TableCell>
                                      <TableCell>
                                        {canEdit && !isPct && !isLump ? (
                                          <TextInput
                                            id={`d-unit-${it.id}`}
                                            labelText=""
                                            hideLabel
                                            size="sm"
                                            defaultValue={it.unit}
                                            style={{ maxWidth: 90 }}
                                            onBlur={(e) =>
                                              updateBoqItem.mutate({ id: it.id, unit: e.target.value })
                                            }
                                          />
                                        ) : (
                                          it.unit
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {isPct ? (
                                          `${it.pct ?? 0}%`
                                        ) : isLump ? (
                                          "—"
                                        ) : mRows.length > 0 ? (
                                          <span title="Derived from the measurement book">
                                            {it.qty} ∑
                                          </span>
                                        ) : canEdit ? (
                                          <TextInput
                                            id={`d-qty-${it.id}`}
                                            labelText=""
                                            hideLabel
                                            size="sm"
                                            type="number"
                                            defaultValue={String(it.qty)}
                                            style={{ maxWidth: 110 }}
                                            onBlur={(e) =>
                                              updateBoqItem.mutate({ id: it.id, qty: Number(e.target.value) || 0 })
                                            }
                                          />
                                        ) : (
                                          it.qty
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {isPct ? (
                                          "—"
                                        ) : canEdit ? (
                                          <TextInput
                                            id={`d-rate-${it.id}`}
                                            labelText=""
                                            hideLabel
                                            size="sm"
                                            type="number"
                                            defaultValue={String(it.ratePaise / 100)}
                                            style={{ maxWidth: 120 }}
                                            onBlur={(e) =>
                                              updateBoqItem.mutate({
                                                id: it.id,
                                                ratePaise: parseRupeeInput(e.target.value),
                                              })
                                            }
                                          />
                                        ) : (
                                          formatINR(it.ratePaise)
                                        )}
                                      </TableCell>
                                      <TableCell>{formatINR(it.amountPaise)}</TableCell>
                                      <TableCell>
                                        {canEdit && (
                                          <Button
                                            kind="ghost"
                                            size="sm"
                                            hasIconOnly
                                            iconDescription="Remove line"
                                            renderIcon={TrashCan}
                                            onClick={() => removeItem.mutate({ id: it.id })}
                                          />
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                  if (!expanded || !canMeasure) return [main];
                                  return [
                                    main,
                                    <TableRow key={`${it.id}-mb`}>
                                      <TableCell colSpan={8}>
                                        <MeasurementBook
                                          itemId={it.id}
                                          unit={it.unit}
                                          initial={mRows}
                                          autoFocusFirst
                                          onSave={(rows) =>
                                            updateBoqItem.mutate({ id: it.id, measurements: rows })
                                          }
                                        />
                                        <p className="esti-label esti-label--secondary" style={{ marginTop: 4 }}>
                                          Tab across cells · Enter on the last dimension starts a new row · qty ={" "}
                                          {measurementBookQty(mRows).toFixed(3)} {it.unit}
                                        </p>
                                      </TableCell>
                                    </TableRow>,
                                  ];
                                })}
                              </TableBody>
                            </Table>
                            <p style={{ marginTop: 8 }}>
                              <strong>
                                {COST_HEAD_LABEL[group.head]} subtotal {formatINR(subtotal)}
                              </strong>
                            </p>
                          </TableContainer>
                        );
                      })
                    )}

                    {editable && (
                      <Button
                        kind="ghost"
                        size="sm"
                        renderIcon={Add}
                        onClick={() =>
                          activeId &&
                          addDesignItem.mutate({
                            estimateId: activeId,
                            costHead: addHead,
                            calculationType: "PERCENTAGE",
                            description: "Contingency",
                            unit: "%",
                            qty: 0,
                            ratePaise: 0,
                            itemLeadPct: 0,
                            confidence: "MEDIUM",
                            pct: 0,
                            basis: { kind: "SUBTOTAL" },
                          })
                        }
                      >
                        Add % / special line
                      </Button>
                    )}

                    <p style={{ marginTop: 8 }}>
                      Subtotal {formatINR(detail.subtotalPaise)} · Lead {detail.leadPct}% ·{" "}
                      <strong>Total {formatINR(detail.totalPaise)}</strong>
                    </p>

                    {(versionsQ.data ?? []).length > 0 && (
                      <TableContainer
                        title="Frozen versions"
                        description="Each freeze snapshots the estimate; history is never overwritten."
                      >
                        <Table size="sm">
                          <TableHead>
                            <TableRow>
                              <TableHeader>Ver</TableHeader>
                              <TableHeader>Stage</TableHeader>
                              <TableHeader>Status</TableHeader>
                              <TableHeader>Total</TableHeader>
                              <TableHeader>Frozen</TableHeader>
                              <TableHeader>Note</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(versionsQ.data ?? []).map((v) => (
                              <TableRow key={v.id}>
                                <TableCell>v{v.versionNo}</TableCell>
                                <TableCell>{v.stage}</TableCell>
                                <TableCell>
                                  <Tag size="sm" type={statusTone(v.status)}>
                                    {v.status}
                                  </Tag>
                                </TableCell>
                                <TableCell>{formatINR(v.totalPaise)}</TableCell>
                                <TableCell>
                                  {v.frozenAt ? new Date(v.frozenAt).toLocaleDateString() : "—"}
                                </TableCell>
                                <TableCell>{v.note ?? "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Stack>
                </TabPanel>

                {/* --- Components / execution ------------------------------- */}
                <TabPanel>
                  <ComponentsTab
                    estimateId={detail.id}
                    editable={!!editable}
                    components={componentsQ.data ?? []}
                    placed={placedQ.data ?? []}
                    items={items}
                    onAdd={(payload) => addComponent.mutate(payload)}
                    onRemove={(id) => removeComponent.mutate({ estimateComponentId: id })}
                    adding={addComponent.isPending}
                  />
                </TabPanel>

                {/* --- Rate analysis --------------------------------------- */}
                <TabPanel>
                  <RateAnalysisPanel embedded />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </div>

          {/* --- Persistent rate-book popover ------------------------------ */}
          <Tile style={{ width: 260, flexShrink: 0 }}>
            <Stack gap={4}>
              <h5 style={{ margin: 0 }}>Rate book</h5>
              <Dropdown
                id="cw-ratebook"
                titleText="Active rate book"
                size="sm"
                label="Select a rate book"
                disabled={!editable}
                items={ratebooks}
                selectedItem={activeRatebook}
                itemToString={(r) => (r ? (r as { label: string }).label : "")}
                onChange={({ selectedItem }) =>
                  selectedItem &&
                  detail &&
                  setDsrVersion.mutate({ id: detail.id, dsrVersionId: (selectedItem as { id: string }).id })
                }
              />
              <p className="esti-label esti-label--helper">
                Items added from <strong>+ Add Item</strong> are searched in this rate book; rates
                come from it.
              </p>
            </Stack>
          </Tile>
        </div>
      )}
    </Stack>
  );
}

// --- Components / execution tab (unchanged) ---------------------------------

type ComponentRow = {
  id: string;
  code: string;
  name: string;
  uom: string;
  formulaKey: string;
  paramSchema?: unknown;
  discipline: string;
};
type PlacedRow = {
  id: string;
  componentId: string;
  computedQty: number | null;
  uom: string | null;
  costHead: string | null;
};

function paramFields(component: ComponentRow): ComponentParamField[] {
  const schema = Array.isArray(component.paramSchema)
    ? (component.paramSchema as ComponentParamField[])
    : [];
  if (schema.length > 0) return schema;
  const def = FORMULA_REGISTRY[component.formulaKey as keyof typeof FORMULA_REGISTRY];
  return (def?.inputs ?? []).map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    unit: "",
    type: "NUMBER" as const,
    required: true,
  }));
}

/** Recursive, expandable view of a derived RuleSet tree (parent quantity → BOQ
 *  outputs → materials → child dependency chain). Formulas stay hidden — the
 *  operator sees only results (UI Rules 6 + 7). */
function DerivedTree({ node, depth = 0 }: { node: DerivedItem; depth?: number }) {
  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
        <span aria-hidden>{depth > 0 ? "└─" : "▼"}</span>
        <strong>{node.name}</strong>
        <Tag size="sm" type="green">
          {node.quantity} {node.uom}
        </Tag>
      </div>
      {node.boq.length > 0 && (
        <p className="esti-label esti-label--helper" style={{ margin: "2px 0 2px 20px" }}>
          BOQ: {node.boq.map((b) => `${b.outputName} ${b.quantity} ${b.uom}`).join(" · ")}
        </p>
      )}
      {node.materials.length > 0 && (
        <p className="esti-label esti-label--helper" style={{ margin: "2px 0 2px 20px" }}>
          Materials: {node.materials.map((m) => `${m.materialName} ${m.quantity} ${m.uom}`).join(" · ")}
        </p>
      )}
      {node.children.map((c) => (
        <DerivedTree key={c.code} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

function ComponentsTab({
  estimateId,
  editable,
  components,
  placed,
  items,
  onAdd,
  onRemove,
  adding,
}: {
  estimateId: string;
  editable: boolean;
  components: ComponentRow[];
  placed: PlacedRow[];
  items: ItemRow[];
  onAdd: (payload: {
    estimateId: string;
    componentId: string;
    params: Record<string, number>;
    costHead?: CostHead;
    includeRelated: boolean;
  }) => void;
  onRemove: (estimateComponentId: string) => void;
  adding: boolean;
}) {
  const [componentId, setComponentId] = useState("");
  const [costHead, setCostHead] = useState<CostHead>("OTHER");
  const [includeRelated, setIncludeRelated] = useState(true);
  const [params, setParams] = useState<Record<string, string>>({});
  const selected = components.find((c) => c.id === componentId) ?? null;
  const fields = selected ? paramFields(selected) : [];
  const byId = new Map(components.map((c) => [c.id, c]));

  // Live derivation preview — "enter once, see everything derived". Missing
  // inputs default to 0 so the tree always renders as the operator types.
  const numericParams = Object.fromEntries(fields.map((f) => [f.key, Number(params[f.key]) || 0]));
  const previewQ = trpc.estimation.derivePreview.useQuery(
    { componentId: selected?.id ?? "", params: numericParams, includeDependencies: includeRelated },
    { enabled: !!selected, retry: false },
  );

  function submit() {
    if (!selected) return;
    onAdd({
      estimateId,
      componentId: selected.id,
      params: Object.fromEntries(fields.map((f) => [f.key, Number(params[f.key]) || 0])),
      costHead,
      includeRelated,
    });
    setParams({});
  }

  const autoLines = items.filter((it) => it.sourceKind === "COMPONENT");

  return (
    <Stack gap={5}>
      {!editable && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Estimate frozen"
          subtitle="Revise the estimate to place components and regenerate auto-BOQ lines."
        />
      )}
      {editable && (
        <Tile>
          <Stack gap={5}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <Select
                id="cw-comp"
                labelText="Component"
                value={componentId}
                onChange={(e) => {
                  setComponentId(e.target.value);
                  setParams({});
                }}
                style={{ minWidth: 320 }}
              >
                <SelectItem value="" text="Select a component…" />
                {components.map((c) => (
                  <SelectItem key={c.id} value={c.id} text={`${c.code} — ${c.name}`} />
                ))}
              </Select>
              <Select
                id="cw-comp-ch"
                labelText="Cost head"
                value={costHead}
                onChange={(e) => setCostHead(e.target.value as CostHead)}
              >
                {COST_HEADS.map((h) => (
                  <SelectItem key={h} value={h} text={COST_HEAD_LABEL[h]} />
                ))}
              </Select>
            </div>
            {selected && (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {fields.map((f) =>
                    f.type === "SELECT" && f.options ? (
                      <Select
                        key={f.key}
                        id={`cw-p-${f.key}`}
                        labelText={f.unit ? `${f.label} (${f.unit})` : f.label}
                        value={params[f.key] ?? ""}
                        onChange={(e) => setParams((p) => ({ ...p, [f.key]: e.target.value }))}
                      >
                        <SelectItem value="" text="—" />
                        {f.options.map((o) => (
                          <SelectItem key={o} value={o} text={o} />
                        ))}
                      </Select>
                    ) : (
                      <TextInput
                        key={f.key}
                        id={`cw-p-${f.key}`}
                        labelText={f.unit ? `${f.label} (${f.unit})` : f.label}
                        type={f.type === "TEXT" ? "text" : "number"}
                        value={params[f.key] ?? ""}
                        onChange={(e) => setParams((p) => ({ ...p, [f.key]: e.target.value }))}
                        style={{ maxWidth: 200 }}
                      />
                    ),
                  )}
                </div>
                {previewQ.data ? (
                  <Tile>
                    <Stack gap={3}>
                      <strong>Derived — entered once, computed for you</strong>
                      <DerivedTree node={previewQ.data} />
                    </Stack>
                  </Tile>
                ) : previewQ.isError ? (
                  <p className="esti-label esti-label--helper" style={{ margin: 0 }}>
                    Enter all measurement inputs to preview the derivation.
                  </p>
                ) : null}
                <Stack orientation="horizontal" gap={5} style={{ alignItems: "center" }}>
                  <Checkbox
                    id="cw-incl-related"
                    labelText="Include related templates (e.g. footing → PCC, formwork, rebar)"
                    checked={includeRelated}
                    onChange={(_e, { checked }) => setIncludeRelated(checked)}
                  />
                  <Button size="sm" disabled={adding} onClick={submit}>
                    {adding ? "Adding…" : "Add to estimate"}
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </Tile>
      )}

      <TableContainer
        title="Placed components"
        description="Each placement expands into auto-BOQ lines below."
      >
        <Table size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Code</TableHeader>
              <TableHeader>Component</TableHeader>
              <TableHeader>Qty</TableHeader>
              <TableHeader>Cost head</TableHeader>
              <TableHeader />
            </TableRow>
          </TableHead>
          <TableBody>
            {placed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>No components placed yet.</TableCell>
              </TableRow>
            ) : (
              placed.map((p) => {
                const comp = byId.get(p.componentId);
                return (
                  <TableRow key={p.id}>
                    <TableCell>{comp?.code ?? "—"}</TableCell>
                    <TableCell>{comp?.name ?? p.componentId}</TableCell>
                    <TableCell>
                      {(p.computedQty ?? 0).toFixed(3)} {p.uom ?? comp?.uom ?? ""}
                    </TableCell>
                    <TableCell>
                      {p.costHead ? (
                        <Tag size="sm" type="cool-gray">
                          {COST_HEAD_LABEL[p.costHead as CostHead] ?? p.costHead}
                        </Tag>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {editable && (
                        <Button kind="ghost" size="sm" onClick={() => onRemove(p.id)}>
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {autoLines.length > 0 && (
        <TableContainer title="Auto-BOQ lines" description="Generated from the placed components.">
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Description</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Qty</TableHeader>
                <TableHeader>Amount</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {autoLines.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.description}</TableCell>
                  <TableCell>{it.unit}</TableCell>
                  <TableCell>{it.qty}</TableCell>
                  <TableCell>{formatINR(it.amountPaise)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
