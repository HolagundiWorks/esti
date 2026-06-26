import {
  Button,
  DataTableSkeleton,
  DatePicker,
  DatePickerInput,
  InlineNotification,
  Modal,
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
import { Add, TrashCan } from "@carbon/icons-react";
import {
  GRN_STATUS_TAG,
  can,
  type GrnStatus,
} from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
function fmtQty(v: string | number | null | undefined): string {
  const n = Number(v);
  return Number.isNaN(n) ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(3);
}

export function ProjectGrn({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils    = trpc.useUtils();
  const canWrite  = can(user?.role, "write");
  const canApprove = can(user?.role, "cost:approve");

  const listQ = trpc.grn.list.useQuery({ projectId });
  const grns  = listQ.data ?? [];

  // ── Create GRN header modal ────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ vendorName: "", deliveryDate: "", deliveryNoteRef: "", notes: "" });
  const createM = trpc.grn.create.useMutation({
    onSuccess: () => { utils.grn.list.invalidate({ projectId }); setCreateOpen(false); setForm({ vendorName: "", deliveryDate: "", deliveryNoteRef: "", notes: "" }); },
  });

  // ── Selected GRN for items view ────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const itemsQ = trpc.grn.listItems.useQuery({ grnId: selectedId! }, { enabled: !!selectedId });
  const items  = itemsQ.data ?? [];

  // ── Add item modal ─────────────────────────────────────────────────────────
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ description: "", unit: "", qtyReceived: "" });
  const addItemM = trpc.grn.addItem.useMutation({
    onSuccess: () => { utils.grn.listItems.invalidate({ grnId: selectedId! }); setAddItemOpen(false); setItemForm({ description: "", unit: "", qtyReceived: "" }); },
  });

  // ── Remove item ────────────────────────────────────────────────────────────
  const removeItemM = trpc.grn.removeItem.useMutation({
    onSuccess: () => utils.grn.listItems.invalidate({ grnId: selectedId! }),
  });

  // ── Verify GRN ────────────────────────────────────────────────────────────
  const verifyM = trpc.grn.verify.useMutation({
    onSuccess: () => { utils.grn.list.invalidate({ projectId }); setSelectedId(null); },
  });

  const selectedGrn = grns.find((g) => g.id === selectedId);

  if (listQ.isLoading) return <DataTableSkeleton columnCount={6} rowCount={4} showHeader={false} showToolbar={false} />;
  if (listQ.error) return <p className="esti-label--secondary" style={{ color: "var(--cds-support-error)" }}>{listQ.error.message}</p>;

  return (
    <Stack gap={5}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--cds-spacing-04)", flexWrap: "wrap" }}>
        <h4 style={{ margin: 0 }}>Goods Receipt Notes</h4>
        <Tag type="gray" size="sm">{grns.length} GRNs</Tag>
        {canWrite && (
          <Button kind="primary" size="sm" renderIcon={Add} onClick={() => setCreateOpen(true)}>
            Record delivery
          </Button>
        )}
      </div>

      {grns.length === 0 ? (
        <p className="esti-label--secondary">No deliveries recorded yet. Record the first GRN to begin material tracking.</p>
      ) : (
        <TableContainer>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Date</TableHeader>
                <TableHeader>Vendor</TableHeader>
                <TableHeader>Challan ref</TableHeader>
                <TableHeader>Work package</TableHeader>
                <TableHeader>Items</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader></TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {grns.map((g) => (
                <TableRow key={g.id} style={{ cursor: "pointer" }} onClick={() => setSelectedId(g.id === selectedId ? null : g.id)}>
                  <TableCell>{g.deliveryDate}</TableCell>
                  <TableCell>{g.vendorName}</TableCell>
                  <TableCell>{g.deliveryNoteRef ?? "—"}</TableCell>
                  <TableCell>{g.workPackageRef ? `${g.workPackageRef} — ${g.workPackageName}` : "—"}</TableCell>
                  <TableCell>{g.itemCount}</TableCell>
                  <TableCell>
                    <Tag type={GRN_STATUS_TAG[g.status as GrnStatus] ?? "gray"} size="sm">{g.status}</Tag>
                  </TableCell>
                  <TableCell>
                    {canApprove && g.status === "DRAFT" && (
                      <Button kind="ghost" size="sm"
                        disabled={verifyM.isPending}
                        onClick={(e) => { e.stopPropagation(); verifyM.mutate({ id: g.id }); }}
                      >Verify</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Items panel for selected GRN */}
      {selectedId && selectedGrn && (
        <Stack gap={3} style={{ borderLeft: "2px solid var(--cds-border-interactive)", paddingLeft: "var(--cds-spacing-05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--cds-spacing-04)" }}>
            <span className="esti-label--secondary">{selectedGrn.vendorName} · {selectedGrn.deliveryDate}</span>
            <Tag type={GRN_STATUS_TAG[selectedGrn.status as GrnStatus] ?? "gray"} size="sm">{selectedGrn.status}</Tag>
            {canWrite && selectedGrn.status === "DRAFT" && (
              <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => setAddItemOpen(true)}>Add item</Button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="esti-label--secondary">No items on this GRN yet.</p>
          ) : (
            <TableContainer>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Description</TableHeader>
                    <TableHeader>Unit</TableHeader>
                    <TableHeader>Qty received</TableHeader>
                    <TableHeader></TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.description}</TableCell>
                      <TableCell>{it.unit}</TableCell>
                      <TableCell>{fmtQty(it.qtyReceived)}</TableCell>
                      <TableCell>
                        {canWrite && selectedGrn.status === "DRAFT" && (
                          <Button kind="ghost" size="sm" hasIconOnly renderIcon={TrashCan}
                            iconDescription="Remove"
                            disabled={removeItemM.isPending}
                            onClick={() => removeItemM.mutate({ id: it.id, grnId: selectedId })}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      )}

      {/* Create GRN modal */}
      <Modal
        open={createOpen}
        modalHeading="Record delivery"
        primaryButtonText="Create GRN"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!form.vendorName || !form.deliveryDate || createM.isPending}
        onRequestSubmit={() => createM.mutate({ projectId, vendorName: form.vendorName, deliveryDate: form.deliveryDate, deliveryNoteRef: form.deliveryNoteRef || undefined, notes: form.notes || undefined })}
        onRequestClose={() => setCreateOpen(false)}
        onSecondarySubmit={() => setCreateOpen(false)}
      >
        <Stack gap={4}>
          <TextInput
            id="grn-vendor"
            labelText="Vendor / supplier name"
            value={form.vendorName}
            onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
          />
          <DatePicker
            datePickerType="single"
            dateFormat="Y-m-d"
            value={form.deliveryDate}
            onChange={([d]) => setForm({ ...form, deliveryDate: d ? new Date(d).toISOString().slice(0, 10) : "" })}
          >
            <DatePickerInput id="grn-date" labelText="Delivery date" placeholder="YYYY-MM-DD" />
          </DatePicker>
          <TextInput
            id="grn-ref"
            labelText="Delivery note / challan reference (optional)"
            value={form.deliveryNoteRef}
            onChange={(e) => setForm({ ...form, deliveryNoteRef: e.target.value })}
          />
          <TextArea
            id="grn-notes"
            labelText="Notes (optional)"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          {createM.error && (
            <InlineNotification kind="error" title="Error" subtitle={createM.error.message} lowContrast />
          )}
        </Stack>
      </Modal>

      {/* Add item modal */}
      <Modal
        open={addItemOpen}
        modalHeading="Add delivery item"
        primaryButtonText="Add item"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!itemForm.description || !itemForm.unit || !itemForm.qtyReceived || addItemM.isPending}
        onRequestSubmit={() => {
          if (!selectedId) return;
          addItemM.mutate({ grnId: selectedId, description: itemForm.description, unit: itemForm.unit, qtyReceived: Number(itemForm.qtyReceived) });
        }}
        onRequestClose={() => setAddItemOpen(false)}
        onSecondarySubmit={() => setAddItemOpen(false)}
      >
        <Stack gap={4}>
          <TextInput
            id="item-desc"
            labelText="Description"
            value={itemForm.description}
            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
          />
          <TextInput
            id="item-unit"
            labelText="Unit (e.g. cum, kg, bag)"
            value={itemForm.unit}
            onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
          />
          <TextInput
            id="item-qty"
            type="number"
            labelText="Quantity received"
            value={itemForm.qtyReceived}
            onChange={(e) => setItemForm({ ...itemForm, qtyReceived: e.target.value })}
          />
          {addItemM.error && (
            <InlineNotification kind="error" title="Error" subtitle={addItemM.error.message} lowContrast />
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
