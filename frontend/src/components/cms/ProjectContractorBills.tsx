import { useState } from "react";
import {
  Button,
  Modal,
  NumberInput,
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
  TextInput,
} from "@carbon/react";
import {
  Add,
  Certificate,
  Checkmark,
  Pause,
  SendAlt,
  TrashCan,
} from "@carbon/icons-react";
import { can, formatINR } from "@esti/contracts";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";
import { useAuth } from "../../lib/auth.js";

const BILL_STATUS_TAG: Record<string, "gray" | "blue" | "green" | "warm-gray" | "red"> = {
  DRAFT: "gray",
  SUBMITTED: "blue",
  CERTIFIED: "green",
  HELD: "warm-gray",
  REJECTED: "red",
};

const EMPTY_BILL = {
  workOrderId: "",
  billNo: "",
  periodFrom: "",
  periodTo: "",
  remarks: "",
};

const EMPTY_LINE = { elementId: "", woItemId: "", claimedQty: 0 };

export function ProjectContractorBills({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addBillOpen, setAddBillOpen] = useState(false);
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [actionForm, setActionForm] = useState<{ billId: string; action: "certify" | "hold" | "reject"; remarks: string } | null>(null);
  const [billForm, setBillForm] = useState(EMPTY_BILL);
  const [lineForm, setLineForm] = useState(EMPTY_LINE);

  const billsQ = trpc.cms.bills.listByProject.useQuery({ projectId });
  const billDetailQ = trpc.cms.bills.byId.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId },
  );
  const workOrdersQ = trpc.cms.workOrders.listByProject.useQuery({ projectId });
  const elementsQ = trpc.cms.elements.listByProject.useQuery({ projectId });

  const woDetailQ = trpc.cms.workOrders.byId.useQuery(
    { id: billForm.workOrderId },
    { enabled: !!billForm.workOrderId && addLineOpen },
  );

  const canApprove = !!(user && can(user.role, "cost:approve"));

  const invalidate = () => {
    void billsQ.refetch();
    if (selectedId) void utils.cms.bills.byId.invalidate({ id: selectedId });
  };

  const createBillM = trpc.cms.bills.create.useMutation({
    onSuccess: () => {
      invalidate();
      setAddBillOpen(false);
      setBillForm(EMPTY_BILL);
    },
  });

  const addLineM = trpc.cms.bills.addLine.useMutation({
    onSuccess: () => {
      invalidate();
      setAddLineOpen(false);
      setLineForm(EMPTY_LINE);
    },
  });

  const submitM = trpc.cms.bills.submit.useMutation({ onSuccess: invalidate });
  const certifyM = trpc.cms.bills.certify.useMutation({
    onSuccess: () => { invalidate(); setActionForm(null); },
  });
  const holdM = trpc.cms.bills.hold.useMutation({
    onSuccess: () => { invalidate(); setActionForm(null); },
  });
  const rejectM = trpc.cms.bills.reject.useMutation({
    onSuccess: () => { invalidate(); setActionForm(null); },
  });
  const removeM = trpc.cms.bills.remove.useMutation({
    onSuccess: () => { setSelectedId(null); invalidate(); },
  });

  const bills = billsQ.data ?? [];
  const selectedBill = billDetailQ.data;
  const workOrders = (workOrdersQ.data ?? []).filter((w) => w.status !== "DRAFT");
  const elements = elementsQ.data?.elements ?? [];
  const woItems = woDetailQ.data?.items ?? [];

  function doAction(remarks: string) {
    if (!actionForm) return;
    const input = { id: actionForm.billId, remarks: remarks || undefined };
    if (actionForm.action === "certify") certifyM.mutate(input);
    else if (actionForm.action === "hold") holdM.mutate(input);
    else rejectM.mutate(input);
  }

  return (
    <Stack gap={6}>
      <div className="esti-row-between">
        <h3>Contractor Bills</h3>
        <Button size="sm" renderIcon={Add} onClick={() => setAddBillOpen(true)}>
          New Bill
        </Button>
      </div>

      <DataState
        loading={billsQ.isLoading}
        isEmpty={!billsQ.isLoading && bills.length === 0}
        empty={{
          title: "No contractor bills",
          description: "Create a bill against a work order to begin the certification process.",
        }}
        columnCount={7}
      >
        <TableContainer title="Contractor Bills">
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Bill No.</TableHeader>
                <TableHeader>Contractor</TableHeader>
                <TableHeader>Period</TableHeader>
                <TableHeader>Claimed</TableHeader>
                <TableHeader>Certified</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {bills.map((b) => {
                const isSelected = selectedId === b.id;
                return (
                  <TableRow
                    key={b.id}
                    onClick={() => setSelectedId(isSelected ? null : b.id)}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? "var(--cds-layer-selected)" : undefined,
                    }}
                  >
                    <TableCell>{b.billNo}</TableCell>
                    <TableCell>{b.contractorName ?? "—"}</TableCell>
                    <TableCell>
                      {b.periodFrom} — {b.periodTo}
                    </TableCell>
                    <TableCell>{formatINR(b.claimedAmountPaise)}</TableCell>
                    <TableCell>
                      {b.certifiedAmountPaise > 0 ? formatINR(b.certifiedAmountPaise) : "—"}
                    </TableCell>
                    <TableCell>
                      <Tag type={BILL_STATUS_TAG[b.status] ?? "gray"} size="sm">
                        {b.status}
                      </Tag>
                    </TableCell>
                    <TableCell>
                      <Stack orientation="horizontal" gap={2}>
                        {b.status === "DRAFT" && (
                          <Button
                            kind="ghost"
                            size="sm"
                            renderIcon={SendAlt}
                            hasIconOnly
                            iconDescription="Submit"
                            onClick={(e) => { e.stopPropagation(); submitM.mutate({ id: b.id }); }}
                            disabled={submitM.isPending}
                          />
                        )}
                        {b.status === "SUBMITTED" && canApprove && (
                          <>
                            <Button
                              kind="ghost"
                              size="sm"
                              renderIcon={Certificate}
                              hasIconOnly
                              iconDescription="Certify"
                              onClick={(e) => { e.stopPropagation(); setActionForm({ billId: b.id, action: "certify", remarks: "" }); }}
                            />
                            <Button
                              kind="ghost"
                              size="sm"
                              renderIcon={Pause}
                              hasIconOnly
                              iconDescription="Hold"
                              onClick={(e) => { e.stopPropagation(); setActionForm({ billId: b.id, action: "hold", remarks: "" }); }}
                            />
                          </>
                        )}
                        {b.status === "DRAFT" && (
                          <Button
                            kind="danger--ghost"
                            size="sm"
                            renderIcon={TrashCan}
                            hasIconOnly
                            iconDescription="Remove"
                            onClick={(e) => { e.stopPropagation(); removeM.mutate({ id: b.id }); }}
                            disabled={removeM.isPending}
                          />
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      {selectedBill && (
        <Stack gap={4}>
          <div className="esti-row-between">
            <h4>
              {selectedBill.billNo} — Line Items
            </h4>
            {selectedBill.status === "DRAFT" && (
              <Button size="sm" renderIcon={Add} onClick={() => setAddLineOpen(true)}>
                Add line
              </Button>
            )}
          </div>

          <DataState
            loading={billDetailQ.isLoading}
            isEmpty={!billDetailQ.isLoading && (selectedBill.lines?.length ?? 0) === 0}
            empty={{ title: "No lines", description: "Add line items to the bill." }}
            columnCount={7}
          >
            <TableContainer>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Element</TableHeader>
                    <TableHeader>Description</TableHeader>
                    <TableHeader>Unit</TableHeader>
                    <TableHeader>Rate</TableHeader>
                    <TableHeader>Claimed qty</TableHeader>
                    <TableHeader>Claimed amount</TableHeader>
                    <TableHeader>Certified qty</TableHeader>
                    <TableHeader>Certified amount</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selectedBill.lines ?? []).map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.elementCode ?? "—"}</TableCell>
                      <TableCell>{line.woItemDescription ?? line.elementDescription ?? "—"}</TableCell>
                      <TableCell>{line.woItemUnit ?? "—"}</TableCell>
                      <TableCell>{formatINR(line.ratePaise)}</TableCell>
                      <TableCell>{line.claimedQty.toFixed(3)}</TableCell>
                      <TableCell>{formatINR(line.claimedAmountPaise)}</TableCell>
                      <TableCell>
                        {selectedBill.status === "SUBMITTED" && canApprove ? (
                          <CertifyQtyInput
                            lineId={line.id}
                            current={line.certifiedQty ?? line.claimedQty}
                            max={line.claimedQty}
                            onSaved={() => void utils.cms.bills.byId.invalidate({ id: selectedId! })}
                          />
                        ) : (
                          line.certifiedQty != null ? line.certifiedQty.toFixed(3) : "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {line.certifiedAmountPaise != null ? formatINR(line.certifiedAmountPaise) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DataState>
        </Stack>
      )}

      {/* New Bill Modal */}
      <Modal
        open={addBillOpen}
        modalHeading="New Contractor Bill"
        primaryButtonText={createBillM.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          createBillM.isPending || !billForm.workOrderId || !billForm.billNo || !billForm.periodFrom || !billForm.periodTo
        }
        onRequestSubmit={() =>
          createBillM.mutate({
            projectId,
            workOrderId: billForm.workOrderId,
            billNo: billForm.billNo,
            periodFrom: billForm.periodFrom,
            periodTo: billForm.periodTo,
            remarks: billForm.remarks || undefined,
          })
        }
        onRequestClose={() => setAddBillOpen(false)}
        onSecondarySubmit={() => setAddBillOpen(false)}
      >
        <Stack gap={5}>
          <Select
            id="bill-wo"
            labelText="Work Order"
            value={billForm.workOrderId}
            onChange={(e) => setBillForm((f) => ({ ...f, workOrderId: e.target.value }))}
          >
            <SelectItem value="" text="Select issued work order…" />
            {workOrders.map((w) => (
              <SelectItem key={w.id} value={w.id} text={`${w.ref} — ${w.contractorName ?? "Contractor"}`} />
            ))}
          </Select>
          <TextInput
            id="bill-no"
            labelText="Bill No."
            placeholder="RA-01"
            value={billForm.billNo}
            onChange={(e) => setBillForm((f) => ({ ...f, billNo: e.target.value }))}
          />
          <TextInput
            id="bill-from"
            labelText="Period from"
            type="date"
            value={billForm.periodFrom}
            onChange={(e) => setBillForm((f) => ({ ...f, periodFrom: e.target.value }))}
          />
          <TextInput
            id="bill-to"
            labelText="Period to"
            type="date"
            value={billForm.periodTo}
            onChange={(e) => setBillForm((f) => ({ ...f, periodTo: e.target.value }))}
          />
          <TextInput
            id="bill-remarks"
            labelText="Remarks (optional)"
            value={billForm.remarks}
            onChange={(e) => setBillForm((f) => ({ ...f, remarks: e.target.value }))}
          />
        </Stack>
      </Modal>

      {/* Add Line Modal */}
      <Modal
        open={addLineOpen}
        modalHeading="Add Bill Line"
        primaryButtonText={addLineM.isPending ? "Adding…" : "Add"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={addLineM.isPending || !lineForm.elementId || !lineForm.woItemId || lineForm.claimedQty <= 0}
        onRequestSubmit={() => {
          if (!selectedId) return;
          addLineM.mutate({
            billId: selectedId,
            elementId: lineForm.elementId,
            woItemId: lineForm.woItemId,
            claimedQty: lineForm.claimedQty,
          });
        }}
        onRequestClose={() => setAddLineOpen(false)}
        onSecondarySubmit={() => setAddLineOpen(false)}
      >
        <Stack gap={5}>
          <Select
            id="line-element"
            labelText="Element"
            value={lineForm.elementId}
            onChange={(e) => setLineForm((f) => ({ ...f, elementId: e.target.value }))}
          >
            <SelectItem value="" text="Select element…" />
            {elements.map((el) => (
              <SelectItem key={el.id} value={el.id} text={`${el.code} — ${el.description}`} />
            ))}
          </Select>
          <Select
            id="line-wo-item"
            labelText="WO Line Item (rate source)"
            value={lineForm.woItemId}
            onChange={(e) => setLineForm((f) => ({ ...f, woItemId: e.target.value }))}
          >
            <SelectItem value="" text="Select WO item…" />
            {woItems.map((item) => (
              <SelectItem key={item.id} value={item.id} text={`${item.description} (${item.unit}) — ${formatINR(item.agreedRatePaise)}`} />
            ))}
          </Select>
          <NumberInput
            id="line-qty"
            label="Claimed quantity"
            value={lineForm.claimedQty}
            onChange={(_e, { value }) => setLineForm((f) => ({ ...f, claimedQty: Number(value) }))}
            min={0}
            step={0.001}
          />
        </Stack>
      </Modal>

      {/* Action Modal (certify / hold / reject) */}
      <Modal
        open={!!actionForm}
        modalHeading={
          actionForm?.action === "certify"
            ? "Certify Bill"
            : actionForm?.action === "hold"
            ? "Hold Bill"
            : "Reject Bill"
        }
        primaryButtonText={
          certifyM.isPending || holdM.isPending || rejectM.isPending
            ? "Processing…"
            : actionForm?.action === "certify"
            ? "Certify"
            : actionForm?.action === "hold"
            ? "Hold"
            : "Reject"
        }
        secondaryButtonText="Cancel"
        danger={actionForm?.action === "reject"}
        onRequestSubmit={() => doAction(actionForm?.remarks ?? "")}
        onRequestClose={() => setActionForm(null)}
        onSecondarySubmit={() => setActionForm(null)}
      >
        <Stack gap={5}>
          {actionForm?.action === "certify" && (
            <p>
              Ensure line-item certified quantities have been set. The bill's certified total will be
              computed from the line items.
            </p>
          )}
          <TextInput
            id="action-remarks"
            labelText="Remarks (optional)"
            value={actionForm?.remarks ?? ""}
            onChange={(e) =>
              setActionForm((f) => f ? { ...f, remarks: e.target.value } : f)
            }
          />
        </Stack>
      </Modal>
    </Stack>
  );
}

function CertifyQtyInput({
  lineId,
  current,
  max,
  onSaved,
}: {
  lineId: string;
  current: number;
  max: number;
  onSaved: () => void;
}) {
  const [val, setVal] = useState(current);
  const updateM = trpc.cms.bills.updateLine.useMutation({ onSuccess: onSaved });

  return (
    <Stack orientation="horizontal" gap={2}>
      <div className="esti-input-sm">
        <NumberInput
          id={`cq-${lineId}`}
          label=""
          hideLabel
          value={val}
          onChange={(_e, { value }) => setVal(Number(value))}
          min={0}
          max={max}
          step={0.001}
          size="sm"
        />
      </div>
      <Button
        kind="ghost"
        size="sm"
        renderIcon={Checkmark}
        hasIconOnly
        iconDescription="Set certified qty"
        onClick={() => updateM.mutate({ id: lineId, certifiedQty: val })}
        disabled={updateM.isPending}
      />
    </Stack>
  );
}
