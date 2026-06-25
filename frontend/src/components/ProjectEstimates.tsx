import {
  Button,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
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
import { formatINR, parseRupeeInput } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { downloadXlsx } from "../lib/exportXlsx.js";
import { pdfPollInterval } from "../lib/pdfUi.js";

function EstimatePdf({ id, initial }: { id: string; initial: string }) {
  const utils = trpc.useUtils();
  const q = trpc.estimates.byId.useQuery(
    { id },
    {
      refetchInterval: (query) =>
        pdfPollInterval(query.state.data?.pdfStatus, initial !== "NONE"),
      enabled: initial !== "NONE" || !!id,
    },
  );
  const gen = trpc.estimates.generatePdf.useMutation({
    onSuccess: () => utils.estimates.byId.invalidate({ id }),
  });
  const status = q.data?.pdfStatus ?? initial;
  const url = q.data?.pdfUrl ?? null;
  if (status === "READY" && url) {
    return (
      <Button kind="ghost" size="sm" href={url} target="_blank" rel="noreferrer">
        Open PDF
      </Button>
    );
  }
  if (status === "PENDING" || status === "PROCESSING") {
    return <span style={{ fontSize: "0.875rem" }}>Generating…</span>;
  }
  return (
    <Button kind="ghost" size="sm" disabled={gen.isPending} onClick={() => gen.mutate({ id })}>
      {status === "FAILED" ? "Retry PDF" : "Generate PDF"}
    </Button>
  );
}

function sourceTag(sourceKind?: string | null) {
  switch (sourceKind) {
    case "TAKEOFF_IMPORT":
      return { label: "TAKEOFF", type: "purple" as const };
    case "DSR_PICK":
      return { label: "DSR", type: "blue" as const };
    case "BULK_IMPORT":
      return { label: "IMPORT", type: "cyan" as const };
    default:
      return { label: "MANUAL", type: "gray" as const };
  }
}

/** How a single source measurement was measured on the drawing. */
function measuredText(r: {
  measureKind?: string | null;
  itemCount: number;
  realLength: number;
  heightMm?: number | null;
  unit: string;
}): string {
  if (r.measureKind === "COUNT") return `${r.itemCount} no.`;
  if (r.heightMm) return `${r.realLength.toFixed(2)} m × ${(r.heightMm / 1000).toFixed(2)} m ht`;
  return `${r.realLength.toFixed(2)} ${r.unit}`;
}

/**
 * Calculation breakdown for one estimate line: the takeoff measurements that sum
 * to its quantity, each with the element's catalog unit. Shows where the number
 * came from instead of a bare quantity.
 */
function ItemCalculation({ itemId }: { itemId: string }) {
  const q = trpc.estimates.itemSources.useQuery({ itemId });
  if (q.isLoading) return <p>Loading calculation…</p>;
  const d = q.data;
  if (!d || d.rows.length === 0) {
    return <p className="esti-label esti-label--secondary">This line was entered manually — no linked takeoff measurements.</p>;
  }
  return (
    <Stack gap={4}>
      <p className="esti-label">
        Quantity <strong>{d.qty} {d.unit}</strong> = sum of {d.rows.length} takeoff measurement(s).
      </p>
      <Table size="sm">
        <TableHead>
          <TableRow>
            <TableHeader>Drawing</TableHeader>
            <TableHeader>Element</TableHeader>
            <TableHeader>Measured</TableHeader>
            <TableHeader>BOQ qty</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {d.rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.drawingRef ?? "—"}</TableCell>
              <TableCell>
                {r.elementLabel}{" "}
                <span className="esti-label esti-label--secondary">({r.label})</span>
              </TableCell>
              <TableCell>{measuredText(r)}</TableCell>
              <TableCell>
                {(r.boqQty ?? 0).toFixed(3)} {r.boqUnit}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p>
        <strong>Total {d.total.toFixed(3)} {d.unit}</strong>
      </p>
    </Stack>
  );
}

/** Parse CSV/TSV bulk lines: description, unit, qty, rate (₹), itemLeadPct */
function parseEstimateBulk(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = line.split(/[\t,;]/).map((c) => c.trim());
      const [description, unit, qty, rate, lead = "0"] = cols;
      if (!description || !unit) return null;
      return {
        description,
        unit,
        qty: Number(qty) || 0,
        ratePaise: parseRupeeInput(rate ?? "0"),
        itemLeadPct: Number(lead) || 0,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

export function ProjectEstimates({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const estimatesQ = trpc.estimates.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const versionsQ = trpc.dsr.listVersions.useQuery();
  const publishedVersions = (versionsQ.data ?? []).filter((v) => v.status !== "DRAFT");
  const [openId, setOpenId] = useState<string | null>(null);
  const itemsQ = trpc.estimates.items.useQuery(
    { estimateId: openId ?? "" },
    { enabled: !!openId },
  );

  const invalidateList = () =>
    utils.estimates.listByProject.invalidate({ projectId });
  const invalidateItems = () =>
    openId && utils.estimates.items.invalidate({ estimateId: openId });

  const [newOpen, setNewOpen] = useState(false);
  const [nf, setNf] = useState({ title: "", dsrVersionId: "", leadPct: "0" });
  const create = trpc.estimates.create.useMutation({
    onSuccess: (row) => {
      invalidateList();
      setNewOpen(false);
      setNf({ title: "", dsrVersionId: "", leadPct: "0" });
      setOpenId(row.id);
    },
  });

  const setLead = trpc.estimates.setLead.useMutation({
    onSuccess: invalidateList,
  });
  const approve = trpc.estimates.approve.useMutation({
    onSuccess: invalidateList,
  });
  const updateItem = trpc.estimates.updateItem.useMutation({
    onSuccess: () => {
      invalidateItems();
      invalidateList();
    },
  });
  const bulkImport = trpc.estimates.bulkImport.useMutation({
    onSuccess: () => {
      invalidateItems();
      invalidateList();
      setBulkOpen(false);
      setBulkText("");
    },
  });
  const revise = trpc.estimates.revise.useMutation({
    onSuccess: () => {
      invalidateList();
      setReviseOpen(false);
      setReviseNote("");
    },
  });
  const addItem = trpc.estimates.addItem.useMutation({
    onSuccess: () => {
      invalidateItems();
      invalidateList();
      setItemOpen(false);
    },
  });
  const removeItem = trpc.estimates.removeItem.useMutation({
    onSuccess: () => {
      invalidateItems();
      invalidateList();
    },
  });
  const importTakeoff = trpc.measurements.applyToEstimate.useMutation({
    onSuccess: () => {
      invalidateItems();
      invalidateList();
    },
  });
  const setDsrVersion = trpc.estimates.setDsrVersion.useMutation({
    onSuccess: () => invalidateList(),
  });
  const createFromTakeoff = trpc.estimates.createFromTakeoff.useMutation({
    onSuccess: (res) => {
      invalidateList();
      setTakeoffOpen(false);
      setTakeoffForm({ title: "Takeoff estimate", dsrVersionId: "", leadPct: "0" });
      setOpenId(res.estimate.id);
    },
  });

  const open = (estimatesQ.data ?? []).find((e) => e.id === openId) ?? null;
  const dsrLabel =
    (versionsQ.data ?? []).find((v) => v.id === open?.dsrVersionId)?.label ?? null;
  const takeoffPreviewQ = trpc.measurements.takeoffPreview.useQuery(
    { projectId, dsrVersionId: open?.dsrVersionId ?? "" },
    { enabled: !!projectId && !!open?.dsrVersionId && open.status === "DRAFT" },
  );
  const takeoffMeasQ = trpc.measurements.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const dsrItemsQ = trpc.dsr.listItems.useQuery(
    { versionId: open?.dsrVersionId ?? "" },
    { enabled: !!open?.dsrVersionId },
  );
  // Phase 4: estimation can pull from the Phase 6 analysed-rate library.
  const rateAnalysesQ = trpc.rateAnalysis.list.useQuery(undefined, {
    enabled: !!open,
  });

  const [itemOpen, setItemOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseNote, setReviseNote] = useState("");
  const [calcItemId, setCalcItemId] = useState<string | null>(null);
  const [takeoffOpen, setTakeoffOpen] = useState(false);
  const [takeoffForm, setTakeoffForm] = useState({
    title: "Takeoff estimate",
    dsrVersionId: "",
    leadPct: "0",
  });
  const [itf, setItf] = useState({
    dsrItemId: "",
    description: "",
    unit: "",
    qty: "",
    rate: "",
    itemLeadPct: "0",
  });
  function pickDsr(id: string) {
    const d = (dsrItemsQ.data ?? []).find((x) => x.id === id);
    setItf((f) => ({
      ...f,
      dsrItemId: id,
      description: d?.description ?? f.description,
      unit: d?.unit ?? f.unit,
      rate: d ? String(d.ratePaise / 100) : f.rate,
    }));
  }
  function pickAnalysed(id: string) {
    const a = (rateAnalysesQ.data ?? []).find((x) => x.id === id);
    setItf((f) => ({
      ...f,
      dsrItemId: "",
      description: a?.description ?? f.description,
      unit: a?.unit ?? f.unit,
      rate: a ? String(a.analysedRatePaise / 100) : f.rate,
    }));
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 32,
        }}
      >
        <h3>Estimation / BOQ</h3>
        <Stack orientation="horizontal" gap={3}>
          {(takeoffMeasQ.data?.rows ?? []).length > 0 && (
            <Button size="sm" kind="tertiary" onClick={() => setTakeoffOpen(true)}>
              Prepare from takeoff
            </Button>
          )}
          <Button size="sm" onClick={() => setNewOpen(true)}>
            New estimate
          </Button>
        </Stack>
      </div>

      <TableContainer
        title="Estimates"
        description="Approved estimate becomes the project BOQ"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Ver</TableHeader>
              <TableHeader>Lead %</TableHeader>
              <TableHeader>Total</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(estimatesQ.data ?? []).map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.ref}</TableCell>
                <TableCell>{e.title}</TableCell>
                <TableCell>v{e.versionNo ?? 1}</TableCell>
                <TableCell>{e.leadPct}%</TableCell>
                <TableCell>{formatINR(e.totalPaise)}</TableCell>
                <TableCell>
                  <Tag type={e.status === "APPROVED" ? "green" : "blue"}>
                    {e.status}
                  </Tag>
                </TableCell>
                <TableCell>
                  <Button
                    kind="ghost"
                    size="sm"
                    onClick={() => setOpenId(openId === e.id ? null : e.id)}
                  >
                    {openId === e.id ? "Hide" : "Open"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {open && (
        <div style={{ marginTop: 16, paddingLeft: 16 }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <h4 style={{ marginRight: "auto" }}>
              {open.ref} · {open.title}
              {(open.versionNo ?? 1) > 1 && (
                <span style={{ fontWeight: 400, opacity: 0.8 }}> · v{open.versionNo}</span>
              )}
            </h4>
            {open.dsrVersionId ? (
              <Tag type="blue">DSR: {dsrLabel ?? open.dsrVersionId}</Tag>
            ) : (
              open.status === "DRAFT" && (
                <Select
                  id="est-dsr"
                  labelText="Link DSR version"
                  size="sm"
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) setDsrVersion.mutate({ id: open.id, dsrVersionId: id });
                  }}
                >
                  <SelectItem value="" text="Select DSR…" />
                  {publishedVersions.map((v) => (
                    <SelectItem key={v.id} value={v.id} text={v.label} />
                  ))}
                </Select>
              )
            )}
            {open.status === "DRAFT" && (
              <>
                <TextInput
                  id="est-lead"
                  labelText="Whole-estimate lead %"
                  type="number"
                  defaultValue={open.leadPct}
                  onBlur={(e) =>
                    setLead.mutate({
                      id: open.id,
                      leadPct: Number(e.target.value) || 0,
                    })
                  }
                  style={{ maxWidth: 180 }}
                />
                <Button size="sm" onClick={() => setItemOpen(true)}>
                  Add item
                </Button>
                <Button size="sm" kind="tertiary" onClick={() => setBulkOpen(true)}>
                  Bulk import
                </Button>
                <Button
                  size="sm"
                  kind="tertiary"
                  disabled={
                    importTakeoff.isPending || !open.dsrVersionId || !(takeoffMeasQ.data?.rows ?? []).length
                  }
                  onClick={() =>
                    importTakeoff.mutate({ projectId, estimateId: open.id })
                  }
                >
                  Import takeoff quantities
                </Button>
                <Button
                  size="sm"
                  kind="tertiary"
                  onClick={() => approve.mutate({ id: open.id })}
                >
                  Approve → BOQ
                </Button>
              </>
            )}
            {open.status === "APPROVED" && (
              <Button size="sm" kind="tertiary" onClick={() => setReviseOpen(true)}>
                Revise
              </Button>
            )}
            <Button
              size="sm"
              kind="ghost"
              onClick={() => {
                void utils.estimates.exportRows.fetch({ estimateId: open.id }).then((data) => {
                  if (data.rows.length) downloadXlsx(data.rows, "BOQ", `${open.ref}-boq`);
                });
              }}
            >
              Export XLSX
            </Button>
            <EstimatePdf id={open.id} initial={open.pdfStatus ?? "NONE"} />
          </div>
          {open.revisionNote && (
            <p style={{ marginTop: 8, opacity: 0.85 }}>
              Revision note: {open.revisionNote}
            </p>
          )}

          {open.status === "DRAFT" && !open.dsrVersionId && (
            <InlineNotification
              kind="warning"
              lowContrast
              hideCloseButton
              title="DSR version required"
              subtitle="Link a DSR version to apply schedule rates to takeoff quantities."
              style={{ marginTop: 12 }}
            />
          )}

          {open.status === "DRAFT" &&
            open.dsrVersionId &&
            (takeoffPreviewQ.data?.lines.length ?? 0) > 0 && (
              <TableContainer
                title="Takeoff → costing preview (draft)"
                description="Measured quantities mapped to DSR items. Import to add as estimate lines."
                style={{ marginTop: 16 }}
              >
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>DSR</TableHeader>
                      <TableHeader>Description</TableHeader>
                      <TableHeader>Qty</TableHeader>
                      <TableHeader>Rate</TableHeader>
                      <TableHeader>Amount</TableHeader>
                      <TableHeader>Takeoff names</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(takeoffPreviewQ.data?.lines ?? []).map((line) => (
                      <TableRow key={line.elementTypeId}>
                        <TableCell>{line.elementLabel}</TableCell>
                        <TableCell>
                          {line.dsrMatched ? (
                            <Tag type="green" size="sm">
                              {line.dsrItemCode}
                            </Tag>
                          ) : (
                            <Tag type="red" size="sm">
                              No match
                            </Tag>
                          )}
                        </TableCell>
                        <TableCell>{line.description}</TableCell>
                        <TableCell>
                          {line.qty.toFixed(3)} {line.unit}
                        </TableCell>
                        <TableCell>{formatINR(line.ratePaise)}</TableCell>
                        <TableCell>{formatINR(line.amountPaise)}</TableCell>
                        <TableCell style={{ fontSize: "0.8125rem", opacity: 0.85 }}>
                          {line.takeoffNames.join(", ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p style={{ marginTop: 8 }}>
                  Preview subtotal {formatINR(takeoffPreviewQ.data?.subtotalPaise ?? 0)}
                  {(takeoffPreviewQ.data?.unmatchedDsrCount ?? 0) > 0 && (
                    <span style={{ color: "var(--cds-support-warning)" }}>
                      {" "}
                      · {(takeoffPreviewQ.data?.unmatchedDsrCount ?? 0)} line(s) without DSR
                      match (rate ₹0 until mapped in master DSR)
                    </span>
                  )}
                </p>
              </TableContainer>
            )}

          <TableContainer title="Line items" style={{ marginTop: 16 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Description</TableHeader>
                  <TableHeader>Source</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Qty</TableHeader>
                  <TableHeader>Rate</TableHeader>
                  <TableHeader>Item lead %</TableHeader>
                  <TableHeader>Amount</TableHeader>
                  <TableHeader></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(itemsQ.data ?? []).map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      {open.status === "DRAFT" ? (
                        <TextInput
                          id={`desc-${it.id}`}
                          labelText=""
                          hideLabel
                          size="sm"
                          defaultValue={it.description}
                          onBlur={(e) =>
                            updateItem.mutate({ id: it.id, description: e.target.value })
                          }
                        />
                      ) : (
                        it.description
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack gap={2}>
                        <Tag size="sm" type={sourceTag(it.sourceKind).type}>
                          {sourceTag(it.sourceKind).label}
                        </Tag>
                        {it.dsrItemCode && (
                          <span className="esti-label esti-label--helper">
                            {it.dsrItemCode}
                          </span>
                        )}
                        {it.sourceKind === "TAKEOFF_IMPORT" && (
                          <Button kind="ghost" size="sm" onClick={() => setCalcItemId(it.id)}>
                            View calculation
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {open.status === "DRAFT" ? (
                        <TextInput
                          id={`unit-${it.id}`}
                          labelText=""
                          hideLabel
                          size="sm"
                          defaultValue={it.unit}
                          onBlur={(e) =>
                            updateItem.mutate({ id: it.id, unit: e.target.value })
                          }
                        />
                      ) : (
                        it.unit
                      )}
                    </TableCell>
                    <TableCell>
                      {open.status === "DRAFT" ? (
                        <TextInput
                          id={`qty-${it.id}`}
                          labelText=""
                          hideLabel
                          size="sm"
                          type="number"
                          defaultValue={String(it.qty)}
                          onBlur={(e) =>
                            updateItem.mutate({
                              id: it.id,
                              qty: Number(e.target.value) || 0,
                            })
                          }
                        />
                      ) : (
                        it.qty
                      )}
                    </TableCell>
                    <TableCell>
                      {open.status === "DRAFT" ? (
                        <TextInput
                          id={`rate-${it.id}`}
                          labelText=""
                          hideLabel
                          size="sm"
                          type="number"
                          defaultValue={String(it.ratePaise / 100)}
                          onBlur={(e) =>
                            updateItem.mutate({
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
                      {open.status === "DRAFT" ? (
                        <TextInput
                          id={`lead-${it.id}`}
                          labelText=""
                          hideLabel
                          size="sm"
                          type="number"
                          defaultValue={String(it.itemLeadPct)}
                          onBlur={(e) =>
                            updateItem.mutate({
                              id: it.id,
                              itemLeadPct: Number(e.target.value) || 0,
                            })
                          }
                        />
                      ) : (
                        `${it.itemLeadPct}%`
                      )}
                    </TableCell>
                    <TableCell>{formatINR(it.amountPaise)}</TableCell>
                    <TableCell>
                      {open.status === "DRAFT" && (
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <p style={{ marginTop: 8 }}>
            Subtotal {formatINR(open.subtotalPaise)} ·{" "}
            <strong>Total {formatINR(open.totalPaise)}</strong>
          </p>
        </div>
      )}

      <Modal
        open={!!calcItemId}
        passiveModal
        size="lg"
        modalHeading="Quantity calculation"
        modalLabel="Related measurements"
        onRequestClose={() => setCalcItemId(null)}
      >
        {calcItemId && <ItemCalculation itemId={calcItemId} />}
      </Modal>

      <Modal
        open={newOpen}
        modalHeading="New estimate"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!nf.title || create.isPending}
        onRequestClose={() => setNewOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            title: nf.title,
            dsrVersionId: nf.dsrVersionId || null,
            leadPct: Number(nf.leadPct) || 0,
          })
        }
      >
        <Stack gap={5}>
          <TextInput
            id="ne-title"
            labelText="Title"
            value={nf.title}
            onChange={(e) => setNf((f) => ({ ...f, title: e.target.value }))}
          />
          <Select
            id="ne-ver"
            labelText="DSR version"
            value={nf.dsrVersionId}
            onChange={(e) =>
              setNf((f) => ({ ...f, dsrVersionId: e.target.value }))
            }
          >
            <SelectItem value="" text="None" />
            {publishedVersions.map((v) => (
              <SelectItem key={v.id} value={v.id} text={v.label} />
            ))}
          </Select>
          <TextInput
            id="ne-lead"
            labelText="Whole-estimate lead %"
            type="number"
            value={nf.leadPct}
            onChange={(e) => setNf((f) => ({ ...f, leadPct: e.target.value }))}
          />
        </Stack>
      </Modal>

      <Modal
        open={takeoffOpen}
        modalHeading="Prepare draft estimate from takeoff"
        primaryButtonText={createFromTakeoff.isPending ? "Preparing…" : "Create draft estimate"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !takeoffForm.title || !takeoffForm.dsrVersionId || createFromTakeoff.isPending
        }
        onRequestClose={() => setTakeoffOpen(false)}
        onRequestSubmit={() =>
          createFromTakeoff.mutate({
            projectId,
            title: takeoffForm.title,
            dsrVersionId: takeoffForm.dsrVersionId,
            leadPct: Number(takeoffForm.leadPct) || 0,
          })
        }
      >
        <Stack gap={5}>
          <p style={{ margin: 0, opacity: 0.9 }}>
            Creates a draft estimate from all measured quantities on this project&apos;s
            drawings. Each element type is linked to the matching DSR item code and
            schedule rate.
          </p>
          <TextInput
            id="to-title"
            labelText="Estimate title"
            value={takeoffForm.title}
            onChange={(e) => setTakeoffForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Select
            id="to-dsr"
            labelText="DSR version (rates)"
            value={takeoffForm.dsrVersionId}
            onChange={(e) =>
              setTakeoffForm((f) => ({ ...f, dsrVersionId: e.target.value }))
            }
          >
            <SelectItem value="" text="Select DSR version…" />
            {publishedVersions.map((v) => (
              <SelectItem key={v.id} value={v.id} text={v.label} />
            ))}
          </Select>
          <TextInput
            id="to-lead"
            labelText="Whole-estimate lead %"
            type="number"
            value={takeoffForm.leadPct}
            onChange={(e) => setTakeoffForm((f) => ({ ...f, leadPct: e.target.value }))}
          />
        </Stack>
      </Modal>

      <Modal
        open={itemOpen}
        modalHeading="Add line item"
        primaryButtonText={addItem.isPending ? "Adding…" : "Add"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          !open ||
          !itf.description ||
          !itf.unit ||
          itf.qty === "" ||
          addItem.isPending
        }
        onRequestClose={() => setItemOpen(false)}
        onRequestSubmit={() =>
          open &&
          addItem.mutate({
            estimateId: open.id,
            dsrItemId: itf.dsrItemId || null,
            description: itf.description,
            unit: itf.unit,
            qty: Number(itf.qty) || 0,
            ratePaise: parseRupeeInput(itf.rate),
            itemLeadPct: Number(itf.itemLeadPct) || 0,
          })
        }
      >
        <Stack gap={5}>
          {(dsrItemsQ.data ?? []).length > 0 && (
            <Select
              id="it-dsr"
              labelText="From rate book (optional)"
              value={itf.dsrItemId}
              onChange={(e) => pickDsr(e.target.value)}
            >
              <SelectItem value="" text="Manual entry" />
              {(dsrItemsQ.data ?? []).map((d) => (
                <SelectItem
                  key={d.id}
                  value={d.id}
                  text={`${d.code} — ${d.description}`}
                />
              ))}
            </Select>
          )}
          {(rateAnalysesQ.data ?? []).length > 0 && (
            <Select
              id="it-analysed"
              labelText="From analysed rate (optional)"
              helperText="Composite rates built in Knowledge Bank → Rate Analysis."
              defaultValue=""
              onChange={(e) => pickAnalysed(e.target.value)}
            >
              <SelectItem value="" text="—" />
              {(rateAnalysesQ.data ?? []).map((a) => (
                <SelectItem
                  key={a.id}
                  value={a.id}
                  text={`${a.code} — ${a.description} (${formatINR(a.analysedRatePaise)}/${a.unit})`}
                />
              ))}
            </Select>
          )}
          <TextInput
            id="it-desc"
            labelText="Description"
            value={itf.description}
            onChange={(e) =>
              setItf((f) => ({ ...f, description: e.target.value }))
            }
          />
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput
              id="it-unit"
              labelText="Unit"
              value={itf.unit}
              onChange={(e) => setItf((f) => ({ ...f, unit: e.target.value }))}
            />
            <TextInput
              id="it-qty"
              labelText="Qty"
              type="number"
              value={itf.qty}
              onChange={(e) => setItf((f) => ({ ...f, qty: e.target.value }))}
            />
            <TextInput
              id="it-rate"
              labelText="Rate (₹)"
              type="number"
              value={itf.rate}
              onChange={(e) => setItf((f) => ({ ...f, rate: e.target.value }))}
            />
            <TextInput
              id="it-lead"
              labelText="Item lead %"
              type="number"
              value={itf.itemLeadPct}
              onChange={(e) =>
                setItf((f) => ({ ...f, itemLeadPct: e.target.value }))
              }
            />
          </div>
        </Stack>
      </Modal>

      <Modal
        open={bulkOpen}
        modalHeading="Bulk import line items"
        primaryButtonText={bulkImport.isPending ? "Importing…" : "Import"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!open || !bulkText.trim() || bulkImport.isPending}
        onRequestClose={() => setBulkOpen(false)}
        onRequestSubmit={() => {
          if (!open) return;
          const rows = parseEstimateBulk(bulkText);
          if (rows.length) bulkImport.mutate({ estimateId: open.id, rows });
        }}
      >
        <Stack gap={4}>
          <p style={{ margin: 0, opacity: 0.85 }}>
            One line per item: description, unit, qty, rate (₹), item lead % (optional).
            Comma, tab, or semicolon separated.
          </p>
          <TextArea
            id="bulk-est"
            labelText="Paste rows"
            rows={10}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"Excavation, cum, 120, 450, 0\nPCC 1:4:8, cum, 45, 5200, 5"}
          />
        </Stack>
      </Modal>

      <Modal
        open={reviseOpen}
        modalHeading="Revise approved estimate"
        primaryButtonText={revise.isPending ? "Revising…" : "Create revision"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!reviseNote.trim() || revise.isPending}
        onRequestClose={() => setReviseOpen(false)}
        onRequestSubmit={() =>
          open && revise.mutate({ id: open.id, revisionNote: reviseNote.trim() })
        }
      >
        <TextArea
          id="rev-note"
          labelText="Revision note"
          rows={4}
          value={reviseNote}
          onChange={(e) => setReviseNote(e.target.value)}
          placeholder="Describe what changed and why…"
        />
      </Modal>
    </>
  );
}
