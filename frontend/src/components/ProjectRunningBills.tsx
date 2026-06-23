import {
  Button,
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
  const invalidate = () => utils.runningBills.listByProject.invalidate({ projectId });
  const create = trpc.runningBills.create.useMutation({ onSuccess: invalidate });
  const advance = trpc.runningBills.advance.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [measurementDate, setMeasurementDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<BillLine[]>([blankLine()]);

  const setLine = (idx: number, key: keyof BillLine, value: string) =>
    setLines((rows) => rows.map((row, i) => i === idx ? { ...row, [key]: value } : row));

  const canCreate = title.trim() && lines.some((line) => line.description.trim());

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
          create.mutate({
            projectId,
            contractorId: contractorId || undefined,
            title,
            measurementDate: measurementDate || undefined,
            notes: notes || undefined,
            items: lines
              .filter((line) => line.description.trim())
              .map((line) => ({
                description: line.description,
                unit: line.unit || "nos",
                qty: Number(line.qty || "0"),
                ratePaise: parseRupeeInput(line.rate || "0"),
              })),
          });
          setOpen(false);
          setTitle("");
          setContractorId("");
          setMeasurementDate("");
          setNotes("");
          setLines([blankLine()]);
        }}
      >
        <Stack gap={5}>
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
          <TextArea id="rb-notes" labelText="Measurement note" rows={3} value={notes}
            onChange={(e) => setNotes(e.target.value)} />
        </Stack>
      </Modal>
    </div>
  );
}

