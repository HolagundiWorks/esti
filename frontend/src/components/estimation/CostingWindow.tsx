import {
  Button,
  Checkbox,
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
  Tile,
} from "@carbon/react";
import {
  BOQ_VALIDATION_LABEL,
  BOQ_VALIDATION_TAG,
  CALCULATION_TYPE_LABEL,
  COST_HEAD_LABEL,
  FORMULA_REGISTRY,
  formatINR,
  parseRupeeInput,
  type BasisKind,
  type CalculationType,
  type ComponentParamField,
  type CostHead,
  type EstimateConfidence,
} from "@esti/contracts";
import { useMemo, useState } from "react";
import { RateAnalysisPanel } from "../knowledge/RateAnalysisPanel.js";
import { trpc } from "../../lib/trpc.js";
import { pdfPollInterval } from "../../lib/pdfUi.js";

const COST_HEADS = Object.keys(COST_HEAD_LABEL) as CostHead[];
const CALC_TYPES = Object.keys(CALCULATION_TYPE_LABEL) as CalculationType[];

/** Calc types where the line value is a fixed lump amount (qty fixed to 1). */
const LUMP_TYPES = new Set<CalculationType>(["LUMPSUM", "NON_MODELED"]);

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

/**
 * Estimation OS — staged costing window. Operates on a single estimate across
 * three stages: a design-stage cost-head estimate (area-rate / % clause /
 * lumpsum / non-modeled), component-based execution detail (auto-BOQ from the
 * component master), and the office-wide rate-analysis build-up. Money is
 * integer paise throughout; the design and component procedures live in the
 * `estimation` tRPC namespace and write an audit entry on every change.
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

  const detailQ = trpc.estimates.byId.useQuery(
    { id: activeId ?? "" },
    { enabled: !!activeId },
  );
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
      setNewOpen(false);
      setNewTitle("");
    },
  });
  const setStage = trpc.estimation.setStage.useMutation({ onSuccess: invalidateActive });
  const addDesignItem = trpc.estimation.addItem.useMutation({
    onSuccess: () => {
      invalidateActive();
      setItemOpen(false);
    },
  });
  const updateDesignItem = trpc.estimation.updateItem.useMutation({ onSuccess: invalidateActive });
  const removeItem = trpc.estimates.removeItem.useMutation({ onSuccess: invalidateActive });
  const freeze = trpc.estimation.freeze.useMutation({
    onSuccess: () => {
      invalidateActive();
      void utils.estimation.versions.invalidate({ estimateId: activeId ?? "" });
      setFreezeOpen(false);
      setFreezeNote("");
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

  // --- modal / form state ---------------------------------------------------
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [itemOpen, setItemOpen] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeNote, setFreezeNote] = useState("");
  const [df, setDf] = useState({
    costHead: "OTHER" as CostHead,
    calculationType: "AREA_RATE" as CalculationType,
    description: "",
    unit: "nos",
    qty: "",
    rate: "",
    lead: "0",
    confidence: "MEDIUM" as EstimateConfidence,
    pct: "",
    basisKind: "SUBTOTAL" as BasisKind,
    basisCostHead: "SUBSTRUCTURE" as CostHead,
  });

  const items = itemsQ.data ?? [];
  const designGroups = useMemo(
    () =>
      COST_HEADS.map((head) => ({
        head,
        rows: items.filter((it) => (it.costHead ?? "OTHER") === head),
      })).filter((g) => g.rows.length > 0),
    [items],
  );

  function submitDesignItem() {
    if (!activeId) return;
    const isPct = df.calculationType === "PERCENTAGE";
    addDesignItem.mutate({
      estimateId: activeId,
      costHead: df.costHead,
      calculationType: df.calculationType,
      description: df.description,
      unit: df.unit,
      qty: Number(df.qty) || 0,
      ratePaise: parseRupeeInput(df.rate),
      itemLeadPct: Number(df.lead) || 0,
      confidence: df.confidence,
      pct: isPct ? Number(df.pct) || 0 : null,
      basis: isPct
        ? df.basisKind === "COST_HEAD"
          ? { kind: "COST_HEAD" as const, costHead: df.basisCostHead }
          : { kind: "SUBTOTAL" as const }
        : null,
    });
  }

  return (
    <Stack gap={5}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Select
          id="cw-estimate"
          labelText="Estimate"
          value={activeId ?? ""}
          onChange={(e) => setOpenId(e.target.value || null)}
          style={{ minWidth: 280 }}
        >
          {estimateRows.length === 0 && <SelectItem value="" text="No estimates yet" />}
          {estimateRows.map((e) => (
            <SelectItem key={e.id} value={e.id} text={`${e.ref} — ${e.title}`} />
          ))}
        </Select>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          New estimate
        </Button>
        {detail && (
          <>
            <Tag type={statusTone(detail.status)}>{detail.status}</Tag>
            <Tag type={detail.stage === "EXECUTION" ? "purple" : "blue"}>
              {detail.stage === "EXECUTION" ? "Execution" : "Design"} stage
            </Tag>
            {boqCheck && (
              <Tag
                type={
                  boqCheck.summary.clean
                    ? "green"
                    : boqCheck.summary.high > 0
                      ? "red"
                      : "magenta"
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
              <Button size="sm" kind="tertiary" onClick={() => setFreezeOpen(true)}>
                Freeze version
              </Button>
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
      </div>

      {!detail ? (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="No estimate selected"
          subtitle="Create an estimate to start a staged design / component costing."
        />
      ) : (
        <Tabs>
          <TabList aria-label="Costing stages" contained>
            <Tab>Design estimate</Tab>
            <Tab>Components / execution</Tab>
            <Tab>Rate analysis</Tab>
          </TabList>
          <TabPanels>
            {/* --- Design estimate ------------------------------------------ */}
            <TabPanel>
              <Stack gap={5}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <Select
                    id="cw-stage"
                    labelText="Stage"
                    size="sm"
                    disabled={!editable}
                    value={detail.stage ?? "DESIGN"}
                    onChange={(e) =>
                      setStage.mutate({ id: detail.id, stage: e.target.value as "DESIGN" | "EXECUTION" })
                    }
                  >
                    <SelectItem value="DESIGN" text="Design (ballpark)" />
                    <SelectItem value="EXECUTION" text="Execution (detailed)" />
                  </Select>
                  {editable && (
                    <Button size="sm" onClick={() => setItemOpen(true)}>
                      Add line
                    </Button>
                  )}
                </div>

                {boqCheck && (
                  <TableContainer
                    title="BOQ checks"
                    description="Automatic data-quality checks on this BOQ — advisory only; nothing is blocked."
                  >
                    {boqCheck.summary.clean ? (
                      <div style={{ padding: "0 1rem 1rem" }}>
                        <Tag type="green">No issues found</Tag>
                      </div>
                    ) : (
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
                    )}
                  </TableContainer>
                )}

                {designGroups.length === 0 ? (
                  <InlineNotification
                    kind="info"
                    lowContrast
                    hideCloseButton
                    title="No lines yet"
                    subtitle="Add a design-stage line — an area rate, a % clause, a lumpsum, or a non-modeled allowance."
                  />
                ) : (
                  designGroups.map((group) => {
                    const subtotal = group.rows.reduce((s, it) => s + it.amountPaise, 0);
                    return (
                      <TableContainer key={group.head} title={COST_HEAD_LABEL[group.head]}>
                        <Table size="sm">
                          <TableHead>
                            <TableRow>
                              <TableHeader>Description</TableHeader>
                              <TableHeader>Type</TableHeader>
                              <TableHeader>Unit</TableHeader>
                              <TableHeader>Qty / %</TableHeader>
                              <TableHeader>Rate / amount</TableHeader>
                              <TableHeader>Confidence</TableHeader>
                              <TableHeader>Amount</TableHeader>
                              <TableHeader></TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.rows.map((it) => {
                              const isPct = it.calculationType === "PERCENTAGE";
                              const isLump = LUMP_TYPES.has(it.calculationType as CalculationType);
                              const isComponent = it.sourceKind === "COMPONENT";
                              const canEdit = editable && !isComponent;
                              return (
                                <TableRow key={it.id}>
                                  <TableCell>
                                    {canEdit ? (
                                      <TextInput
                                        id={`d-desc-${it.id}`}
                                        labelText=""
                                        hideLabel
                                        size="sm"
                                        defaultValue={it.description}
                                        onBlur={(e) =>
                                          updateDesignItem.mutate({ id: it.id, description: e.target.value })
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
                                        "—"}
                                    </Tag>
                                  </TableCell>
                                  <TableCell>{it.unit}</TableCell>
                                  <TableCell>
                                    {isPct ? (
                                      canEdit ? (
                                        <TextInput
                                          id={`d-pct-${it.id}`}
                                          labelText=""
                                          hideLabel
                                          size="sm"
                                          type="number"
                                          defaultValue={String(it.pct ?? 0)}
                                          onBlur={(e) =>
                                            updateDesignItem.mutate({
                                              id: it.id,
                                              pct: Number(e.target.value) || 0,
                                            })
                                          }
                                        />
                                      ) : (
                                        `${it.pct ?? 0}%`
                                      )
                                    ) : isLump ? (
                                      "—"
                                    ) : canEdit ? (
                                      <TextInput
                                        id={`d-qty-${it.id}`}
                                        labelText=""
                                        hideLabel
                                        size="sm"
                                        type="number"
                                        defaultValue={String(it.qty)}
                                        onBlur={(e) =>
                                          updateDesignItem.mutate({ id: it.id, qty: Number(e.target.value) || 0 })
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
                                        onBlur={(e) =>
                                          updateDesignItem.mutate({
                                            id: it.id,
                                            ratePaise: parseRupeeInput(e.target.value),
                                          })
                                        }
                                      />
                                    ) : (
                                      formatINR(it.ratePaise)
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {it.confidence ? (
                                      <Tag size="sm" type={confidenceTone(it.confidence)}>
                                        {it.confidence}
                                      </Tag>
                                    ) : (
                                      "—"
                                    )}
                                  </TableCell>
                                  <TableCell>{formatINR(it.amountPaise)}</TableCell>
                                  <TableCell>
                                    {canEdit && (
                                      <Button
                                        kind="ghost"
                                        size="sm"
                                        onClick={() => removeItem.mutate({ id: it.id })}
                                      >
                                        Remove
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
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

            {/* --- Components / execution ----------------------------------- */}
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

            {/* --- Rate analysis (office-wide build-up) --------------------- */}
            <TabPanel>
              <RateAnalysisPanel embedded />
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}

      {/* --- New estimate modal ------------------------------------------- */}
      <Modal
        open={newOpen}
        modalHeading="New estimate"
        primaryButtonText={createEstimate.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!newTitle.trim() || createEstimate.isPending}
        onRequestClose={() => setNewOpen(false)}
        onRequestSubmit={() =>
          createEstimate.mutate({ projectId, title: newTitle.trim(), dsrVersionId: null, leadPct: 0 })
        }
      >
        <TextInput
          id="cw-new-title"
          labelText="Title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="e.g. Block A — design estimate"
        />
      </Modal>

      {/* --- Add design line modal ---------------------------------------- */}
      <Modal
        open={itemOpen}
        modalHeading="Add design-stage line"
        primaryButtonText={addDesignItem.isPending ? "Adding…" : "Add"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!df.description.trim() || addDesignItem.isPending}
        onRequestClose={() => setItemOpen(false)}
        onRequestSubmit={submitDesignItem}
      >
        <Stack gap={5}>
          <div style={{ display: "flex", gap: 12 }}>
            <Select
              id="cw-ch"
              labelText="Cost head"
              value={df.costHead}
              onChange={(e) => setDf((f) => ({ ...f, costHead: e.target.value as CostHead }))}
            >
              {COST_HEADS.map((h) => (
                <SelectItem key={h} value={h} text={COST_HEAD_LABEL[h]} />
              ))}
            </Select>
            <Select
              id="cw-ct"
              labelText="Calculation type"
              value={df.calculationType}
              onChange={(e) =>
                setDf((f) => ({ ...f, calculationType: e.target.value as CalculationType }))
              }
            >
              {CALC_TYPES.map((c) => (
                <SelectItem key={c} value={c} text={CALCULATION_TYPE_LABEL[c]} />
              ))}
            </Select>
          </div>
          <TextInput
            id="cw-desc"
            labelText="Description"
            value={df.description}
            onChange={(e) => setDf((f) => ({ ...f, description: e.target.value }))}
          />
          {df.calculationType === "PERCENTAGE" ? (
            <div style={{ display: "flex", gap: 12 }}>
              <TextInput
                id="cw-pct"
                labelText="Percentage %"
                type="number"
                value={df.pct}
                onChange={(e) => setDf((f) => ({ ...f, pct: e.target.value }))}
              />
              <Select
                id="cw-basis"
                labelText="Of basis"
                value={df.basisKind}
                onChange={(e) => setDf((f) => ({ ...f, basisKind: e.target.value as BasisKind }))}
              >
                <SelectItem value="SUBTOTAL" text="Whole subtotal" />
                <SelectItem value="COST_HEAD" text="A cost head" />
              </Select>
              {df.basisKind === "COST_HEAD" && (
                <Select
                  id="cw-basis-ch"
                  labelText="Cost head"
                  value={df.basisCostHead}
                  onChange={(e) =>
                    setDf((f) => ({ ...f, basisCostHead: e.target.value as CostHead }))
                  }
                >
                  {COST_HEADS.map((h) => (
                    <SelectItem key={h} value={h} text={COST_HEAD_LABEL[h]} />
                  ))}
                </Select>
              )}
            </div>
          ) : LUMP_TYPES.has(df.calculationType) ? (
            <div style={{ display: "flex", gap: 12 }}>
              <TextInput
                id="cw-unit"
                labelText="Unit"
                value={df.unit}
                onChange={(e) => setDf((f) => ({ ...f, unit: e.target.value }))}
              />
              <TextInput
                id="cw-amt"
                labelText="Amount (₹)"
                type="number"
                value={df.rate}
                onChange={(e) => setDf((f) => ({ ...f, rate: e.target.value }))}
              />
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12 }}>
              <TextInput
                id="cw-unit"
                labelText="Unit"
                value={df.unit}
                onChange={(e) => setDf((f) => ({ ...f, unit: e.target.value }))}
              />
              <TextInput
                id="cw-qty"
                labelText="Qty"
                type="number"
                value={df.qty}
                onChange={(e) => setDf((f) => ({ ...f, qty: e.target.value }))}
              />
              <TextInput
                id="cw-rate"
                labelText="Rate (₹)"
                type="number"
                value={df.rate}
                onChange={(e) => setDf((f) => ({ ...f, rate: e.target.value }))}
              />
              <TextInput
                id="cw-lead"
                labelText="Lead %"
                type="number"
                value={df.lead}
                onChange={(e) => setDf((f) => ({ ...f, lead: e.target.value }))}
              />
            </div>
          )}
          <Select
            id="cw-conf"
            labelText="Confidence"
            value={df.confidence}
            onChange={(e) =>
              setDf((f) => ({ ...f, confidence: e.target.value as EstimateConfidence }))
            }
          >
            <SelectItem value="LOW" text="Low" />
            <SelectItem value="MEDIUM" text="Medium" />
            <SelectItem value="HIGH" text="High" />
          </Select>
        </Stack>
      </Modal>

      {/* --- Freeze modal -------------------------------------------------- */}
      <Modal
        open={freezeOpen}
        modalHeading="Freeze this estimate"
        primaryButtonText={freeze.isPending ? "Freezing…" : "Freeze version"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!activeId || freeze.isPending}
        onRequestClose={() => setFreezeOpen(false)}
        onRequestSubmit={() => activeId && freeze.mutate({ estimateId: activeId, note: freezeNote.trim() || undefined })}
      >
        <Stack gap={4}>
          <p style={{ margin: 0 }} className="esti-label esti-label--secondary">
            Snapshots the current lines as an immutable version. Revise later to reopen for editing.
          </p>
          <TextArea
            id="cw-freeze-note"
            labelText="Note (optional)"
            rows={3}
            value={freezeNote}
            onChange={(e) => setFreezeNote(e.target.value)}
            placeholder="What this version represents…"
          />
        </Stack>
      </Modal>
    </Stack>
  );
}

// --- Components / execution tab ---------------------------------------------

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
type ItemRow = {
  id: string;
  description: string;
  unit: string;
  qty: number;
  amountPaise: number;
  sourceKind: string | null;
  estimateComponentId: string | null;
};

function paramFields(component: ComponentRow): ComponentParamField[] {
  const schema = Array.isArray(component.paramSchema)
    ? (component.paramSchema as ComponentParamField[])
    : [];
  if (schema.length > 0) return schema;
  // Fall back to the formula's required inputs as plain number fields.
  const def = FORMULA_REGISTRY[component.formulaKey as keyof typeof FORMULA_REGISTRY];
  return (def?.inputs ?? []).map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    unit: "",
    type: "NUMBER" as const,
    required: true,
  }));
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

  function submit() {
    if (!selected) return;
    onAdd({
      estimateId,
      componentId: selected.id,
      params: Object.fromEntries(
        fields.map((f) => [f.key, Number(params[f.key]) || 0]),
      ),
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
              <TableHeader></TableHeader>
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
