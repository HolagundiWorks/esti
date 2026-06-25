import {
  Button,
  Checkbox,
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
import { Add, DocumentPdf } from "@carbon/icons-react";
import {
  BILL_TYPE_LABEL,
  type BillType,
  RUNNING_BILL_STATUS_LABEL,
  type RunningBillStatus,
  formatINR,
  netPayable,
  parseRupeeInput,
} from "@esti/contracts";
import { useState } from "react";
import { DataState } from "./DataState.js";
import { trpc } from "../lib/trpc.js";

const NEXT_STATUS: Record<RunningBillStatus, RunningBillStatus | null> = {
  MEASURED: "SENT_TO_CONTRACTOR",
  SENT_TO_CONTRACTOR: "CONTRACTOR_VERIFIED",
  CONTRACTOR_VERIFIED: "SENT_TO_OFFICE",
  SENT_TO_OFFICE: "MEASUREMENT_VERIFIED",
  MEASUREMENT_VERIFIED: "APPROVED_MEASUREMENT_SENT",
  APPROVED_MEASUREMENT_SENT: "CONTRACTOR_INVOICED",
  CONTRACTOR_INVOICED: "OFFICE_APPROVED",
  OFFICE_APPROVED: "SENT_TO_CLIENT",
  SENT_TO_CLIENT: null,
};

const BILL_TYPES = Object.keys(BILL_TYPE_LABEL) as BillType[];

type BillLine = { description: string; unit: string; qty: string; rate: string };
const blankLine = (): BillLine => ({ description: "", unit: "", qty: "1", rate: "" });

function nextActionLabel(status: RunningBillStatus) {
  const next = NEXT_STATUS[status];
  return next ? RUNNING_BILL_STATUS_LABEL[next] : null;
}

export function ProjectRunningBills({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.runningBills.listByProject.useQuery({ projectId });
  const contractorsQ = trpc.contractors.list.useQuery({ activeOnly: true });
  const packagesQ = trpc.workPackages.listByProject.useQuery({ projectId });
  const invalidate = () => {
    void utils.runningBills.listByProject.invalidate({ projectId });
    void utils.workPackages.billedSummary.invalidate();
    void utils.measurementBook.listByWorkPackage.invalidate();
  };
  const create = trpc.runningBills.create.useMutation({ onSuccess: invalidate });
  const advance = trpc.runningBills.advance.useMutation({ onSuccess: invalidate });
  const generatePdf = trpc.runningBills.generatePdf.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [billType, setBillType] = useState<BillType>("RA");
  const [contractorId, setContractorId] = useState("");
  const [measurementDate, setMeasurementDate] = useState("");
  const [notes, setNotes] = useState("");
  const [workPackageId, setWorkPackageId] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [lines, setLines] = useState<BillLine[]>([]);
  // Deduction inputs (rupee strings → paise on submit).
  const [retention, setRetention] = useState("");
  const [advanceRecovery, setAdvanceRecovery] = useState("");
  const [taxTds, setTaxTds] = useState("");
  const [otherRecovery, setOtherRecovery] = useState("");

  // Strict: BOQ/work-package lines come ONLY from approved (unbilled) measurements.
  const recordsQ = trpc.measurementBook.listByWorkPackage.useQuery(
    { workPackageId },
    { enabled: !!workPackageId },
  );
  const summaryQ = trpc.workPackages.billedSummary.useQuery(
    { workPackageId },
    { enabled: !!workPackageId },
  );
  const rateByItem = new Map((summaryQ.data ?? []).map((r) => [r.id, r.ratePaise]));
  const approvedRecords = (recordsQ.data ?? []).filter((r) => r.status === "APPROVED");
  const recordAmount = (rec: { workPackageItemId: string | null; qty: number }) =>
    Math.round(rec.qty * (rec.workPackageItemId ? (rateByItem.get(rec.workPackageItemId) ?? 0) : 0));

  const selectedRecordIds = approvedRecords.filter((r) => selected[r.id]).map((r) => r.id);
  const recordsGross = approvedRecords
    .filter((r) => selected[r.id])
    .reduce((sum, r) => sum + recordAmount(r), 0);
  const freeGross = lines
    .filter((l) => l.description.trim())
    .reduce((sum, l) => sum + Math.round(Number(l.qty || "0") * parseRupeeInput(l.rate || "0")), 0);
  const gross = recordsGross + freeGross;
  const deductions = {
    retentionPaise: parseRupeeInput(retention || "0"),
    advanceRecoveryPaise: parseRupeeInput(advanceRecovery || "0"),
    taxTdsPaise: parseRupeeInput(taxTds || "0"),
    otherRecoveryPaise: parseRupeeInput(otherRecovery || "0"),
  };
  const net = netPayable(gross, deductions);

  const setLine = (idx: number, key: keyof BillLine, value: string) =>
    setLines((rows) => rows.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));

  const resetForm = () => {
    setTitle("");
    setBillType("RA");
    setContractorId("");
    setMeasurementDate("");
    setNotes("");
    setWorkPackageId("");
    setSelected({});
    setLines([]);
    setRetention("");
    setAdvanceRecovery("");
    setTaxTds("");
    setOtherRecovery("");
  };

  const hasFreeLine = lines.some((l) => l.description.trim());
  const canCreate =
    Boolean(title.trim()) && (selectedRecordIds.length > 0 || hasFreeLine);

  return (
    <div>
      <Stack orientation="horizontal" gap={4} style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3>Running bills</h3>
          <p style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
            Bill approved site measurements → contractor verification → office check → contractor
            invoice → client approval. Deductions yield the net payable.
          </p>
        </div>
        <Button size="sm" renderIcon={Add} onClick={() => setOpen(true)}>
          New running bill
        </Button>
      </Stack>

      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={7}
        empty={{
          title: "No running bills",
          description: "Approve site measurements, then raise a running bill from them.",
        }}
      >
        <TableContainer title="PMC running bill workflow">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Net payable</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Next action</TableHeader>
                <TableHeader>Document</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data ?? []).map((bill) => {
                const status = bill.status as RunningBillStatus;
                const next = NEXT_STATUS[status];
                return (
                  <TableRow key={bill.id}>
                    <TableCell>{bill.ref}</TableCell>
                    <TableCell>{bill.title}</TableCell>
                    <TableCell>{BILL_TYPE_LABEL[bill.billType as BillType] ?? bill.billType}</TableCell>
                    <TableCell>
                      {formatINR(bill.netPayablePaise, { paise: false })}
                      <span style={{ color: "var(--cds-text-secondary)" }}>
                        {" "}
                        / {formatINR(bill.totalPaise, { paise: false })} gross
                      </span>
                    </TableCell>
                    <TableCell>
                      <Tag size="sm" type={status === "SENT_TO_CLIENT" ? "green" : "blue"}>
                        {RUNNING_BILL_STATUS_LABEL[status]}
                      </Tag>
                    </TableCell>
                    <TableCell>
                      {next ? (
                        <Button
                          size="sm"
                          kind="tertiary"
                          disabled={advance.isPending}
                          onClick={() => advance.mutate({ id: bill.id, projectId, status: next })}
                        >
                          {nextActionLabel(status)}
                        </Button>
                      ) : (
                        <Tag size="sm" type="green">Closed</Tag>
                      )}
                    </TableCell>
                    <TableCell>
                      {bill.pdfStatus === "READY" ? (
                        <Tag size="sm" type="teal">PDF ready</Tag>
                      ) : bill.pdfStatus === "PENDING" ? (
                        <Tag size="sm" type="blue">Generating…</Tag>
                      ) : (
                        <Button
                          size="sm"
                          kind="ghost"
                          renderIcon={DocumentPdf}
                          disabled={generatePdf.isPending}
                          onClick={() => generatePdf.mutate({ id: bill.id, projectId })}
                        >
                          Generate PDF
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <Modal
        open={open}
        modalHeading="New running bill"
        primaryButtonText={create.isPending ? "Creating..." : "Create bill"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!canCreate || create.isPending}
        size="lg"
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => {
          const items = lines
            .filter((line) => line.description.trim())
            .map((line) => ({
              description: line.description,
              unit: line.unit || "nos",
              qty: Number(line.qty || "0"),
              ratePaise: parseRupeeInput(line.rate || "0"),
            }));
          create.mutate(
            {
              projectId,
              contractorId: contractorId || undefined,
              workPackageId: workPackageId || undefined,
              title,
              billType,
              measurementDate: measurementDate || undefined,
              notes: notes || undefined,
              measurementRecordIds: selectedRecordIds.length > 0 ? selectedRecordIds : undefined,
              items: items.length > 0 ? items : undefined,
              deductions,
            },
            { onSuccess: () => { setOpen(false); resetForm(); } },
          );
        }}
      >
        <Stack gap={5}>
          {create.error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Could not create bill"
              subtitle={create.error.message}
            />
          )}
          <TextInput id="rb-title" labelText="Bill title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Stack orientation="horizontal" gap={4}>
            <Select id="rb-type" labelText="Bill type" value={billType} onChange={(e) => setBillType(e.target.value as BillType)}>
              {BILL_TYPES.map((t) => (
                <SelectItem key={t} value={t} text={BILL_TYPE_LABEL[t]} />
              ))}
            </Select>
            <Select id="rb-contractor" labelText="Contractor" value={contractorId} onChange={(e) => setContractorId(e.target.value)}>
              <SelectItem value="" text="No contractor selected" />
              {(contractorsQ.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id} text={c.name} />
              ))}
            </Select>
            <TextInput id="rb-date" labelText="Measurement date" type="date" value={measurementDate} onChange={(e) => setMeasurementDate(e.target.value)} />
          </Stack>

          <Select
            id="rb-package"
            labelText="Work package"
            helperText="Pick a package to bill its approved measurements; free-text lines below cover extras."
            value={workPackageId}
            onChange={(e) => { setWorkPackageId(e.target.value); setSelected({}); }}
          >
            <SelectItem value="" text="Free-text bill only (no package)" />
            {(packagesQ.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id} text={`${p.ref} — ${p.name}`} />
            ))}
          </Select>

          {workPackageId && (
            <>
              <h4>Approved measurements</h4>
              {approvedRecords.length === 0 ? (
                <InlineNotification
                  kind="info"
                  lowContrast
                  hideCloseButton
                  title="No approved measurements"
                  subtitle="Approve measurements in the Measurement book above before billing this package."
                />
              ) : (
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Bill</TableHeader>
                      <TableHeader>Ref</TableHeader>
                      <TableHeader>BOQ line</TableHeader>
                      <TableHeader>Location</TableHeader>
                      <TableHeader>Qty</TableHeader>
                      <TableHeader>Amount</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {approvedRecords.map((rec) => {
                      const place = [rec.floor, rec.zone, rec.location].filter(Boolean).join(" · ");
                      return (
                        <TableRow key={rec.id}>
                          <TableCell>
                            <Checkbox
                              id={`rb-sel-${rec.id}`}
                              labelText=""
                              hideLabel
                              checked={!!selected[rec.id]}
                              onChange={(_e, { checked }) =>
                                setSelected((s) => ({ ...s, [rec.id]: checked }))
                              }
                            />
                          </TableCell>
                          <TableCell>{rec.ref}</TableCell>
                          <TableCell>{rec.description}</TableCell>
                          <TableCell>{place || "—"}</TableCell>
                          <TableCell>{rec.qty} {rec.unit}</TableCell>
                          <TableCell>{formatINR(recordAmount(rec), { paise: false })}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </>
          )}

          <h4>Free-text lines (extras)</h4>
          {lines.length > 0 && (
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Description</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Qty</TableHeader>
                  <TableHeader>Rate</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <TextInput id={`rb-desc-${idx}`} labelText="" hideLabel size="sm" value={line.description}
                        onChange={(e) => setLine(idx, "description", e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <TextInput id={`rb-unit-${idx}`} labelText="" hideLabel size="sm" value={line.unit}
                        onChange={(e) => setLine(idx, "unit", e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <TextInput id={`rb-qty-${idx}`} labelText="" hideLabel size="sm" type="number" value={line.qty}
                        onChange={(e) => setLine(idx, "qty", e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <TextInput id={`rb-rate-${idx}`} labelText="" hideLabel size="sm" type="number" value={line.rate}
                        onChange={(e) => setLine(idx, "rate", e.target.value)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Button kind="ghost" size="sm" onClick={() => setLines((rows) => [...rows, blankLine()])}>
            Add free-text line
          </Button>

          <h4>Deductions</h4>
          <Stack orientation="horizontal" gap={4}>
            <TextInput id="rb-retention" labelText="Retention" type="number" value={retention} onChange={(e) => setRetention(e.target.value)} />
            <TextInput id="rb-advance" labelText="Advance recovery" type="number" value={advanceRecovery} onChange={(e) => setAdvanceRecovery(e.target.value)} />
            <TextInput id="rb-tax" labelText="Tax / TDS" type="number" value={taxTds} onChange={(e) => setTaxTds(e.target.value)} />
            <TextInput id="rb-other" labelText="Other recoveries" type="number" value={otherRecovery} onChange={(e) => setOtherRecovery(e.target.value)} />
          </Stack>
          <p style={{ margin: 0 }}>
            <strong>Gross:</strong> {formatINR(gross, { paise: false })} ·{" "}
            <strong>Net payable:</strong> {formatINR(net, { paise: false })}
          </p>

          <TextArea id="rb-notes" labelText="Measurement note" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Stack>
      </Modal>
    </div>
  );
}
