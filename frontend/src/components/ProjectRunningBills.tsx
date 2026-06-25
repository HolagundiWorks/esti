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
import { Add } from "@carbon/icons-react";
import {
  RUNNING_BILL_STATUS_LABEL,
  type RunningBillStatus,
  formatINR,
  isWithinBalance,
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

type BillLine = {
  description: string;
  unit: string;
  qty: string;
  rate: string;
};

const blankLine = (): BillLine => ({ description: "", unit: "", qty: "1", rate: "" });

function nextActionLabel(status: RunningBillStatus) {
  const next = NEXT_STATUS[status];
  if (!next) return null;
  return RUNNING_BILL_STATUS_LABEL[next];
}

export function ProjectRunningBills({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.runningBills.listByProject.useQuery({ projectId });
  const contractorsQ = trpc.contractors.list.useQuery({ activeOnly: true });
  const packagesQ = trpc.workPackages.listByProject.useQuery({ projectId });
  const invalidate = () => {
    void utils.runningBills.listByProject.invalidate({ projectId });
    void utils.workPackages.billedSummary.invalidate();
  };
  const create = trpc.runningBills.create.useMutation({ onSuccess: invalidate });
  const advance = trpc.runningBills.advance.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [measurementDate, setMeasurementDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<BillLine[]>([blankLine()]);
  const [workPackageId, setWorkPackageId] = useState("");
  const [measuredQty, setMeasuredQty] = useState<Record<string, string>>({});

  // When a package is chosen, the bill measures against its frozen BOQ lines and
  // the office can never enter more than the remaining balance.
  const pkgSummaryQ = trpc.workPackages.billedSummary.useQuery(
    { workPackageId },
    { enabled: !!workPackageId },
  );
  const pkgItems = pkgSummaryQ.data ?? [];
  const overBilled = pkgItems.filter((r) => {
    const q = Number(measuredQty[r.id] || "0");
    return q > 0 && !isWithinBalance(q, r.balanceQty);
  });
  const hasPkgMeasure = pkgItems.some((r) => Number(measuredQty[r.id] || "0") > 0);

  const setLine = (idx: number, key: keyof BillLine, value: string) =>
    setLines((rows) => rows.map((row, i) => i === idx ? { ...row, [key]: value } : row));

  const resetForm = () => {
    setTitle("");
    setContractorId("");
    setMeasurementDate("");
    setNotes("");
    setLines([blankLine()]);
    setWorkPackageId("");
    setMeasuredQty({});
  };

  const canCreate = workPackageId
    ? Boolean(title.trim()) && hasPkgMeasure && overBilled.length === 0
    : Boolean(title.trim()) && lines.some((line) => line.description.trim());

  return (
    <div>
      <Stack orientation="horizontal" gap={4} style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3>Running bills</h3>
          <p style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
            Site measurement → contractor verification → office measurement check → contractor invoice → client approval.
          </p>
        </div>
        <Button size="sm" renderIcon={Add} onClick={() => setOpen(true)}>
          New measurement bill
        </Button>
      </Stack>

      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={6}
        empty={{
          title: "No running bills",
          description: "Create a measured bill after site quantities are taken by the site in-charge.",
        }}
      >
        <TableContainer title="PMC running bill workflow">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Measurement</TableHeader>
                <TableHeader>Total</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Next action</TableHeader>
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
                    <TableCell>{bill.measurementDate ?? "—"}</TableCell>
                    <TableCell>{formatINR(bill.totalPaise, { paise: false })}</TableCell>
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <Modal
        open={open}
        modalHeading="New running bill measurement"
        primaryButtonText={create.isPending ? "Creating..." : "Create measured bill"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!canCreate || create.isPending}
        size="lg"
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => {
          const items = workPackageId
            ? pkgItems
                .filter((r) => Number(measuredQty[r.id] || "0") > 0)
                .map((r) => ({
                  description: r.description,
                  unit: r.unit,
                  qty: Number(measuredQty[r.id]),
                  ratePaise: r.ratePaise,
                  workPackageItemId: r.id,
                  boqItemId: r.boqItemId ?? undefined,
                }))
            : lines
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
              measurementDate: measurementDate || undefined,
              notes: notes || undefined,
              items,
            },
            {
              onSuccess: () => {
                setOpen(false);
                resetForm();
              },
            },
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
            <Select
              id="rb-contractor"
              labelText="Contractor"
              value={contractorId}
              onChange={(e) => setContractorId(e.target.value)}
            >
              <SelectItem value="" text="No contractor selected" />
              {(contractorsQ.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id} text={c.name} />
              ))}
            </Select>
            <TextInput
              id="rb-date"
              labelText="Measurement date"
              type="date"
              value={measurementDate}
              onChange={(e) => setMeasurementDate(e.target.value)}
            />
          </Stack>
          <Select
            id="rb-package"
            labelText="Work package (optional)"
            helperText="Pick a package to measure against the approved BOQ balance; leave blank for a free-text bill."
            value={workPackageId}
            onChange={(e) => setWorkPackageId(e.target.value)}
          >
            <SelectItem value="" text="Free-text bill (no package)" />
            {(packagesQ.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id} text={`${p.ref} — ${p.name}`} />
            ))}
          </Select>

          {workPackageId ? (
            <>
              {overBilled.length > 0 && (
                <InlineNotification
                  kind="error"
                  lowContrast
                  hideCloseButton
                  title="Over-billing blocked"
                  subtitle={`${overBilled.length} line(s) exceed the approved balance. Reduce the measured quantity to continue.`}
                />
              )}
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Description</TableHeader>
                    <TableHeader>Unit</TableHeader>
                    <TableHeader>Approved</TableHeader>
                    <TableHeader>Billed</TableHeader>
                    <TableHeader>Balance</TableHeader>
                    <TableHeader>Measure now</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pkgItems.map((r) => {
                    const q = Number(measuredQty[r.id] || "0");
                    const over = q > 0 && !isWithinBalance(q, r.balanceQty);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{r.description}</TableCell>
                        <TableCell>{r.unit}</TableCell>
                        <TableCell>{r.approvedQty}</TableCell>
                        <TableCell>{r.billedQty}</TableCell>
                        <TableCell>
                          <Tag size="sm" type={r.balanceQty <= 0 ? "green" : "outline"}>
                            {r.balanceQty}
                          </Tag>
                        </TableCell>
                        <TableCell>
                          <TextInput
                            id={`rb-meas-${r.id}`}
                            labelText=""
                            hideLabel
                            size="sm"
                            type="number"
                            invalid={over}
                            invalidText={`Exceeds balance ${r.balanceQty}`}
                            value={measuredQty[r.id] ?? ""}
                            onChange={(e) =>
                              setMeasuredQty((m) => ({ ...m, [r.id]: e.target.value }))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          ) : (
            <>
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
              <Button kind="ghost" size="sm" onClick={() => setLines((rows) => [...rows, blankLine()])}>
                Add item
              </Button>
            </>
          )}
          <TextArea id="rb-notes" labelText="Measurement note" rows={3} value={notes}
            onChange={(e) => setNotes(e.target.value)} />
        </Stack>
      </Modal>
    </div>
  );
}

