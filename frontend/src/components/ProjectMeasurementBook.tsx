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
  MEASUREMENT_STATUS_LABEL,
  type MeasurementStatus,
  isWithinBalance,
} from "@esti/contracts";
import { useState } from "react";
import { DataState } from "./DataState.js";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<MeasurementStatus, "blue" | "green" | "red" | "teal"> = {
  MEASURED: "blue",
  APPROVED: "green",
  REJECTED: "red",
  BILLED: "teal",
};

/**
 * Construction Cost OS Phase C — site Measurement Book. A measurement is taken
 * against a work-package BOQ line, approved (the double-billing guard runs at
 * approval), then consumed by a running bill. This panel sits above the running
 * bills in the costing "Site measurement" tab.
 */
export function ProjectMeasurementBook({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const packagesQ = trpc.workPackages.listByProject.useQuery({ projectId });

  const [workPackageId, setWorkPackageId] = useState("");
  const summaryQ = trpc.workPackages.billedSummary.useQuery(
    { workPackageId },
    { enabled: !!workPackageId },
  );
  const recordsQ = trpc.measurementBook.listByWorkPackage.useQuery(
    { workPackageId },
    { enabled: !!workPackageId },
  );
  const items = summaryQ.data ?? [];

  const invalidate = () => {
    void utils.measurementBook.listByWorkPackage.invalidate({ workPackageId });
    void utils.workPackages.billedSummary.invalidate({ workPackageId });
  };
  const create = trpc.measurementBook.create.useMutation({ onSuccess: invalidate });
  const approve = trpc.measurementBook.approve.useMutation({ onSuccess: invalidate });
  const reject = trpc.measurementBook.reject.useMutation({ onSuccess: invalidate });
  const remove = trpc.measurementBook.remove.useMutation({ onSuccess: invalidate });

  const [open, setOpen] = useState(false);
  const [workPackageItemId, setWorkPackageItemId] = useState("");
  const [qty, setQty] = useState("");
  const [location, setLocation] = useState("");
  const [floor, setFloor] = useState("");
  const [zone, setZone] = useState("");
  const [measuredByName, setMeasuredByName] = useState("");
  const [notes, setNotes] = useState("");

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const selectedItem = items.find((r) => r.id === workPackageItemId);
  const qtyNum = Number(qty || "0");
  const overBalance =
    !!selectedItem && qtyNum > 0 && !isWithinBalance(qtyNum, selectedItem.balanceQty);
  const canCreate = !!workPackageItemId && qtyNum > 0 && !overBalance;

  const resetForm = () => {
    setWorkPackageItemId("");
    setQty("");
    setLocation("");
    setFloor("");
    setZone("");
    setMeasuredByName("");
    setNotes("");
  };

  return (
    <div>
      <Stack
        orientation="horizontal"
        gap={4}
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <h3>Measurement book</h3>
          <p style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
            Record site measurements against a work-package BOQ line, then approve them. Only
            approved measurements can be pulled into a running bill.
          </p>
        </div>
        <Button
          size="sm"
          renderIcon={Add}
          disabled={!workPackageId}
          onClick={() => setOpen(true)}
        >
          New measurement
        </Button>
      </Stack>

      <Stack gap={5} style={{ marginTop: "var(--cds-spacing-05)" }}>
        <Select
          id="mb-package"
          labelText="Work package"
          helperText="Pick a package to record and review its site measurements."
          value={workPackageId}
          onChange={(e) => {
            setWorkPackageId(e.target.value);
            resetForm();
          }}
        >
          <SelectItem value="" text="Select a work package" />
          {(packagesQ.data ?? []).map((p) => (
            <SelectItem key={p.id} value={p.id} text={`${p.ref} — ${p.name}`} />
          ))}
        </Select>

        {workPackageId && (
          <DataState
            loading={recordsQ.isLoading}
            isEmpty={(recordsQ.data ?? []).length === 0}
            columnCount={6}
            empty={{
              title: "No measurements yet",
              description: "Record a site measurement against a BOQ line to begin.",
            }}
          >
            <TableContainer title="Site measurements">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>BOQ line</TableHeader>
                    <TableHeader>Location</TableHeader>
                    <TableHeader>Qty</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(recordsQ.data ?? []).map((rec) => {
                    const status = rec.status as MeasurementStatus;
                    const place = [rec.floor, rec.zone, rec.location]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <TableRow key={rec.id}>
                        <TableCell>{rec.ref}</TableCell>
                        <TableCell>{rec.description}</TableCell>
                        <TableCell>{place || "—"}</TableCell>
                        <TableCell>
                          {rec.qty} {rec.unit}
                        </TableCell>
                        <TableCell>
                          <Tag size="sm" type={STATUS_TAG[status]}>
                            {MEASUREMENT_STATUS_LABEL[status]}
                          </Tag>
                        </TableCell>
                        <TableCell>
                          {status === "MEASURED" && (
                            <Stack orientation="horizontal" gap={2}>
                              <Button
                                size="sm"
                                kind="tertiary"
                                disabled={approve.isPending}
                                onClick={() => approve.mutate({ id: rec.id, projectId })}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                kind="danger--tertiary"
                                onClick={() => {
                                  setRejectId(rec.id);
                                  setRejectReason("");
                                }}
                              >
                                Reject
                              </Button>
                            </Stack>
                          )}
                          {status === "REJECTED" && (
                            <Button
                              size="sm"
                              kind="ghost"
                              disabled={remove.isPending}
                              onClick={() => remove.mutate({ id: rec.id, projectId })}
                            >
                              Delete
                            </Button>
                          )}
                          {status === "APPROVED" && (
                            <Tag size="sm" type="green">
                              Ready to bill
                            </Tag>
                          )}
                          {status === "BILLED" && (
                            <Tag size="sm" type="teal">
                              Billed
                            </Tag>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </DataState>
        )}
      </Stack>

      <Modal
        open={open}
        modalHeading="New site measurement"
        primaryButtonText={create.isPending ? "Recording..." : "Record measurement"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!canCreate || create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => {
          create.mutate(
            {
              projectId,
              workPackageId,
              workPackageItemId,
              qty: qtyNum,
              location: location || undefined,
              floor: floor || undefined,
              zone: zone || undefined,
              measuredByName: measuredByName || undefined,
              notes: notes || undefined,
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
              title="Could not record measurement"
              subtitle={create.error.message}
            />
          )}
          <Select
            id="mb-item"
            labelText="BOQ line"
            value={workPackageItemId}
            onChange={(e) => setWorkPackageItemId(e.target.value)}
          >
            <SelectItem value="" text="Select a BOQ line" />
            {items.map((r) => (
              <SelectItem
                key={r.id}
                value={r.id}
                text={`${r.description} — balance ${r.balanceQty} ${r.unit}`}
              />
            ))}
          </Select>
          <TextInput
            id="mb-qty"
            labelText="Measured quantity"
            type="number"
            value={qty}
            invalid={overBalance}
            invalidText={
              selectedItem ? `Exceeds remaining balance of ${selectedItem.balanceQty} ${selectedItem.unit}` : ""
            }
            helperText={
              selectedItem
                ? `Approved ${selectedItem.approvedQty} · billed ${selectedItem.billedQty} · pending approval ${selectedItem.approvedUnbilledQty} · balance ${selectedItem.balanceQty} ${selectedItem.unit}`
                : ""
            }
            onChange={(e) => setQty(e.target.value)}
          />
          <Stack orientation="horizontal" gap={4}>
            <TextInput id="mb-floor" labelText="Floor" value={floor} onChange={(e) => setFloor(e.target.value)} />
            <TextInput id="mb-zone" labelText="Zone / block" value={zone} onChange={(e) => setZone(e.target.value)} />
          </Stack>
          <TextInput
            id="mb-location"
            labelText="Location / grid"
            helperText="Floor + zone + location must be unique per BOQ line (duplicate-location guard)."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <TextInput
            id="mb-measured-by"
            labelText="Measured by"
            helperText="Defaults to you when left blank."
            value={measuredByName}
            onChange={(e) => setMeasuredByName(e.target.value)}
          />
          <TextArea
            id="mb-notes"
            labelText="Notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Stack>
      </Modal>

      <Modal
        open={rejectId !== null}
        danger
        modalHeading="Reject measurement"
        primaryButtonText={reject.isPending ? "Rejecting..." : "Reject"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={rejectReason.trim().length < 2 || reject.isPending}
        onRequestClose={() => setRejectId(null)}
        onRequestSubmit={() => {
          if (!rejectId) return;
          reject.mutate(
            { id: rejectId, projectId, reason: rejectReason.trim() },
            { onSuccess: () => setRejectId(null) },
          );
        }}
      >
        <Stack gap={5}>
          {reject.error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Could not reject"
              subtitle={reject.error.message}
            />
          )}
          <TextInput
            id="mb-reject-reason"
            labelText="Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </Stack>
      </Modal>
    </div>
  );
}
