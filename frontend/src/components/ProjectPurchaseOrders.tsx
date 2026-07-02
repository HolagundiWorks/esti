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
  TextInput,
} from "@carbon/react";
import { Add, TrashCan } from "@carbon/icons-react";
import { PoStatus, formatINR, poLineAmountPaise } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";
import { ConfirmModal } from "./ConfirmModal.js";
import { DataState } from "./DataState.js";

const PO_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  ISSUED: "blue",
  RECEIVED: "green",
  CANCELLED: "red",
};

type Line = {
  description: string;
  unit: string;
  qty: string;
  rate: string;
  specItemId: string;
};
const blankLine = (): Line => ({
  description: "",
  unit: "",
  qty: "1",
  rate: "",
  specItemId: "",
});

export function ProjectPurchaseOrders({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.purchaseOrders.listByProject.useQuery({ projectId });
  const specOptsQ = trpc.purchaseOrders.listSpecLineOptions.useQuery(
    { projectId },
    { enabled: !!projectId },
  );
  const invalidate = () =>
    utils.purchaseOrders.listByProject.invalidate({ projectId });
  const updateStatus = trpc.purchaseOrders.updateStatus.useMutation({
    onSuccess: invalidate,
  });
  const remove = trpc.purchaseOrders.remove.useMutation({
    onSuccess: invalidate,
  });

  const [open, setOpen] = useState(false);
  const [vendor, setVendor] = useState("");
  const [title, setTitle] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const create = trpc.purchaseOrders.create.useMutation({
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setVendor("");
      setTitle("");
      setLines([blankLine()]);
    },
  });

  const setLine = (i: number, k: keyof Line, v: string) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));

  const linkSpecLine = (i: number, specItemId: string) => {
    const opt = specOptsQ.data?.find((o) => o.specItemId === specItemId);
    setLines((ls) =>
      ls.map((l, idx) =>
        idx === i
          ? {
              ...l,
              specItemId,
              description: opt
                ? [opt.item, opt.make].filter(Boolean).join(" — ")
                : l.description,
            }
          : l,
      ),
    );
  };
  const previewTotal = lines.reduce(
    (s, l) =>
      s +
      poLineAmountPaise(
        Number(l.qty || "0"),
        Math.round(Number(l.rate || "0") * 100),
      ),
    0,
  );
  const canSubmit =
    lines.some((l) => l.description.trim() || l.specItemId) && !create.isPending;

  return (
    <div style={{ marginTop: "var(--cds-spacing-06)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3>Purchase orders</h3>
        <Button size="sm" renderIcon={Add} onClick={() => setOpen(true)}>
          New PO
        </Button>
      </div>

      <DataState
        loading={listQ.isLoading}
        isEmpty={(listQ.data ?? []).length === 0}
        columnCount={5}
        empty={{
          title: "No purchase orders",
          description: "Raise a PO from project specifications or ad-hoc line items.",
        }}
      >
        <TableContainer title="Purchase orders">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Vendor / title</TableHeader>
                <TableHeader>Total</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(listQ.data ?? []).map((po) => (
                <TableRow key={po.id}>
                  <TableCell>{po.ref}</TableCell>
                  <TableCell>
                    {po.vendor ?? "—"}
                    {po.title && <div>{po.title}</div>}
                  </TableCell>
                  <TableCell>
                    {formatINR(po.totalPaise, { paise: false })}
                  </TableCell>
                  <TableCell>
                    <Select
                      id={`po-st-${po.id}`}
                      labelText=""
                      hideLabel
                      size="sm"
                      value={po.status}
                      onChange={(e) =>
                        updateStatus.mutate({
                          id: po.id,
                          status: e.target
                            .value as (typeof PoStatus.options)[number],
                        })
                      }
                    >
                      {PoStatus.options.map((s) => (
                        <SelectItem key={s} value={s} text={s} />
                      ))}
                    </Select>
                    <Tag
                      type={PO_TAG[po.status] ?? "gray"}
                      size="sm"
                      style={{ marginLeft: "var(--cds-spacing-02)" }}
                    >
                      {po.status}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    <Button
                      kind="danger--ghost"
                      size="sm"
                      onClick={() => setConfirmId(po.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      <ConfirmModal
        open={!!confirmId}
        heading="Delete purchase order?"
        body="This permanently removes the PO and its line items."
        confirmText="Delete"
        pending={remove.isPending}
        onConfirm={() => {
          if (confirmId) remove.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />

      <Modal
        open={open}
        modalHeading="New purchase order"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!canSubmit}
        size="lg"
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            vendor: vendor || undefined,
            title: title || undefined,
            items: lines
              .filter((l) => l.description.trim() || l.specItemId)
              .map((l) => {
                const opt = specOptsQ.data?.find((o) => o.specItemId === l.specItemId);
                return {
                  description: l.description,
                  unit: l.unit || undefined,
                  qty: Number(l.qty || "0"),
                  ratePaise: Math.round(Number(l.rate || "0") * 100),
                  specItemId: l.specItemId || undefined,
                  catalogItemId: opt?.catalogItemId ?? undefined,
                };
              }),
          })
        }
      >
        <Stack gap={5}>
          <div style={{ display: "flex", gap: "var(--cds-spacing-04)" }}>
            <TextInput
              id="po-vendor"
              labelText="Vendor (optional)"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
            <TextInput
              id="po-title"
              labelText="Title / reference (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {(specOptsQ.data?.length ?? 0) > 0 && (
            <InlineNotification
              kind="info"
              lowContrast
              hideCloseButton
              subtitle="Link lines to specification sheet rows from the Knowledge Bank catalogue."
              title="Procurement from specifications"
            />
          )}

          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Specification</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Qty</TableHeader>
                <TableHeader>Rate (₹)</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((l, i) => (
                <TableRow key={i}>
                  <TableCell style={{ minWidth: 220 }}>
                    <Select
                      id={`l-spec-${i}`}
                      labelText=""
                      hideLabel
                      size="sm"
                      value={l.specItemId}
                      onChange={(e) => linkSpecLine(i, e.target.value)}
                    >
                      <SelectItem value="" text="— Ad hoc —" />
                      {(specOptsQ.data ?? []).map((o) => (
                        <SelectItem key={o.specItemId} value={o.specItemId} text={o.label} />
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextInput
                      id={`l-d-${i}`}
                      labelText=""
                      hideLabel
                      size="sm"
                      value={l.description}
                      onChange={(e) =>
                        setLine(i, "description", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell style={{ width: 90 }}>
                    <TextInput
                      id={`l-u-${i}`}
                      labelText=""
                      hideLabel
                      size="sm"
                      value={l.unit}
                      onChange={(e) => setLine(i, "unit", e.target.value)}
                    />
                  </TableCell>
                  <TableCell style={{ width: 90 }}>
                    <TextInput
                      id={`l-q-${i}`}
                      labelText=""
                      hideLabel
                      size="sm"
                      type="number"
                      value={l.qty}
                      onChange={(e) => setLine(i, "qty", e.target.value)}
                    />
                  </TableCell>
                  <TableCell style={{ width: 120 }}>
                    <TextInput
                      id={`l-r-${i}`}
                      labelText=""
                      hideLabel
                      size="sm"
                      type="number"
                      value={l.rate}
                      onChange={(e) => setLine(i, "rate", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    {formatINR(
                      poLineAmountPaise(
                        Number(l.qty || "0"),
                        Math.round(Number(l.rate || "0") * 100),
                      ),
                      { paise: false },
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      kind="ghost"
                      size="sm"
                      hasIconOnly
                      iconDescription="Remove line"
                      renderIcon={TrashCan}
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines((ls) => ls.filter((_, idx) => idx !== i))
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Add}
              onClick={() => setLines((ls) => [...ls, blankLine()])}
            >
              Add line
            </Button>
            <strong>Total: {formatINR(previewTotal, { paise: false })}</strong>
          </div>
        </Stack>
      </Modal>
    </div>
  );
}
