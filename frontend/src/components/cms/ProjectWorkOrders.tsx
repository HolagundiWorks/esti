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
import { Add, Checkmark, TrashCan } from "@carbon/icons-react";
import { formatINR } from "@esti/contracts";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

type WoItem = {
  id: string;
  description: string;
  unit: string;
  agreedRatePaise: number;
  sortOrder: number;
  createdAt: string;
  specificationId: string | null;
};

const STATUS_TAG: Record<string, "gray" | "blue" | "green"> = {
  DRAFT: "gray",
  ISSUED: "blue",
  CLOSED: "green",
};

const EMPTY_WO = {
  contractorId: "",
  ref: "",
  date: new Date().toISOString().slice(0, 10),
  scope: "",
};

const EMPTY_ITEM = { description: "", unit: "m³", agreedRatePaise: 0 };

export function ProjectWorkOrders({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const [selectedWoId, setSelectedWoId] = useState<string | null>(null);
  const [addWoOpen, setAddWoOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [woForm, setWoForm] = useState(EMPTY_WO);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);

  const workOrdersQ = trpc.cms.workOrders.listByProject.useQuery({ projectId });
  const woDetailQ = trpc.cms.workOrders.byId.useQuery(
    { id: selectedWoId! },
    { enabled: !!selectedWoId },
  );

  const invalidateAll = () => {
    void workOrdersQ.refetch();
    if (selectedWoId) {
      void utils.cms.workOrders.byId.invalidate({ id: selectedWoId });
    }
  };

  const createWoM = trpc.cms.workOrders.create.useMutation({
    onSuccess: () => {
      invalidateAll();
      setAddWoOpen(false);
      setWoForm(EMPTY_WO);
    },
  });

  const issueM = trpc.cms.workOrders.issue.useMutation({ onSuccess: invalidateAll });
  const removeWoM = trpc.cms.workOrders.remove.useMutation({
    onSuccess: () => {
      setSelectedWoId(null);
      invalidateAll();
    },
  });

  const addItemM = trpc.cms.workOrders.addItem.useMutation({
    onSuccess: () => {
      void utils.cms.workOrders.byId.invalidate({ id: selectedWoId! });
      setAddItemOpen(false);
      setItemForm(EMPTY_ITEM);
    },
  });

  const removeItemM = trpc.cms.workOrders.removeItem.useMutation({
    onSuccess: () => void utils.cms.workOrders.byId.invalidate({ id: selectedWoId! }),
  });

  const workOrders = workOrdersQ.data ?? [];
  const selectedWo = woDetailQ.data;
  const items: WoItem[] = selectedWo?.items ?? [];
  const woEditable = selectedWo?.status === "DRAFT" || selectedWo?.status === "ISSUED";

  return (
    <Stack gap={6}>
      <div className="esti-row-between">
        <h3>Work Orders</h3>
        <Button size="sm" renderIcon={Add} onClick={() => setAddWoOpen(true)}>
          New Work Order
        </Button>
      </div>

      <DataState
        loading={workOrdersQ.isLoading}
        isEmpty={!workOrdersQ.isLoading && workOrders.length === 0}
        empty={{
          title: "No work orders",
          description: "Create a work order to record a contractor agreement and agreed rates.",
        }}
        columnCount={6}
      >
        <TableContainer title="Work Orders">
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Contractor</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {workOrders.map((wo) => {
                const isSelected = selectedWoId === wo.id;
                return (
                  <TableRow
                    key={wo.id}
                    onClick={() => setSelectedWoId(isSelected ? null : wo.id)}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? "var(--cds-layer-selected)" : undefined,
                    }}
                  >
                    <TableCell>{wo.ref}</TableCell>
                    <TableCell>{wo.contractorName ?? "—"}</TableCell>
                    <TableCell>{wo.date}</TableCell>
                    <TableCell>
                      <Tag type={STATUS_TAG[wo.status] ?? "gray"} size="sm">
                        {wo.status}
                      </Tag>
                    </TableCell>
                    <TableCell>
                      <Stack orientation="horizontal" gap={2}>
                        {wo.status === "DRAFT" && (
                          <Button
                            kind="ghost"
                            size="sm"
                            renderIcon={Checkmark}
                            hasIconOnly
                            iconDescription="Issue Work Order"
                            onClick={(e) => {
                              e.stopPropagation();
                              issueM.mutate({ id: wo.id });
                            }}
                            disabled={issueM.isPending}
                          />
                        )}
                        {wo.status === "DRAFT" && (
                          <Button
                            kind="danger--ghost"
                            size="sm"
                            renderIcon={TrashCan}
                            hasIconOnly
                            iconDescription="Remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeWoM.mutate({ id: wo.id });
                            }}
                            disabled={removeWoM.isPending}
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

      {selectedWo && (
        <Stack gap={4}>
          <div className="esti-row-between">
            <h4>
              {selectedWo.ref} — Line Items
              {selectedWo.scope && (
                <span
                  style={{ display: "block", fontWeight: 400, fontSize: "var(--cds-body-01-font-size)" }}
                >
                  {selectedWo.scope}
                </span>
              )}
            </h4>
            {woEditable && (
              <Button size="sm" renderIcon={Add} onClick={() => setAddItemOpen(true)}>
                Add line item
              </Button>
            )}
          </div>

          <DataState
            loading={woDetailQ.isLoading}
            isEmpty={!woDetailQ.isLoading && items.length === 0}
            empty={{
              title: "No line items",
              description: "Add line items to define the scope and agreed rates for this work order.",
            }}
            columnCount={5}
          >
            <TableContainer>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Description</TableHeader>
                    <TableHeader>Unit</TableHeader>
                    <TableHeader>Agreed rate</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{formatINR(item.agreedRatePaise)}</TableCell>
                      <TableCell>
                        {woEditable && (
                          <Button
                            kind="danger--ghost"
                            size="sm"
                            renderIcon={TrashCan}
                            hasIconOnly
                            iconDescription="Remove line item"
                            onClick={() => removeItemM.mutate({ id: item.id })}
                            disabled={removeItemM.isPending}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DataState>
        </Stack>
      )}

      {/* New Work Order Modal */}
      <Modal
        open={addWoOpen}
        modalHeading="New Work Order"
        primaryButtonText={createWoM.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          createWoM.isPending ||
          !woForm.contractorId ||
          !woForm.ref ||
          !woForm.date
        }
        onRequestSubmit={() => {
          createWoM.mutate({
            projectId,
            contractorId: woForm.contractorId,
            ref: woForm.ref,
            date: woForm.date,
            scope: woForm.scope || undefined,
          });
        }}
        onRequestClose={() => setAddWoOpen(false)}
        onSecondarySubmit={() => setAddWoOpen(false)}
      >
        <Stack gap={5}>
          <ContractorSelect
            value={woForm.contractorId}
            onChange={(id) => setWoForm((f) => ({ ...f, contractorId: id }))}
          />
          <TextInput
            id="wo-ref"
            labelText="Work Order Ref"
            placeholder="WO-2026-001"
            value={woForm.ref}
            onChange={(e) => setWoForm((f) => ({ ...f, ref: e.target.value }))}
          />
          <TextInput
            id="wo-date"
            labelText="Date"
            type="date"
            value={woForm.date}
            onChange={(e) => setWoForm((f) => ({ ...f, date: e.target.value }))}
          />
          <TextInput
            id="wo-scope"
            labelText="Scope summary (optional)"
            value={woForm.scope}
            onChange={(e) => setWoForm((f) => ({ ...f, scope: e.target.value }))}
          />
        </Stack>
      </Modal>

      {/* Add Line Item Modal */}
      <Modal
        open={addItemOpen}
        modalHeading="Add Line Item"
        primaryButtonText={addItemM.isPending ? "Adding…" : "Add"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={
          addItemM.isPending ||
          !itemForm.description ||
          !itemForm.unit
        }
        onRequestSubmit={() => {
          if (!selectedWoId) return;
          addItemM.mutate({
            workOrderId: selectedWoId,
            description: itemForm.description,
            unit: itemForm.unit,
            agreedRatePaise: itemForm.agreedRatePaise,
          });
        }}
        onRequestClose={() => setAddItemOpen(false)}
        onSecondarySubmit={() => setAddItemOpen(false)}
      >
        <Stack gap={5}>
          <TextInput
            id="wi-desc"
            labelText="Description"
            placeholder="M30 Concrete (Foundation)"
            value={itemForm.description}
            onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
          />
          <TextInput
            id="wi-unit"
            labelText="Unit"
            placeholder="m³"
            value={itemForm.unit}
            onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))}
          />
          <NumberInput
            id="wi-rate"
            label="Agreed rate (₹)"
            helperText="Enter in rupees; stored as paise."
            value={itemForm.agreedRatePaise / 100}
            onChange={(_e, { value }) =>
              setItemForm((f) => ({ ...f, agreedRatePaise: Math.round(Number(value) * 100) }))
            }
            min={0}
            step={0.5}
          />
        </Stack>
      </Modal>
    </Stack>
  );
}

function ContractorSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const contractorsQ = trpc.contractors.list.useQuery();
  const contractors = contractorsQ.data ?? [];
  return (
    <Select
      id="wo-contractor"
      labelText="Contractor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <SelectItem value="" text="Select contractor…" />
      {contractors.map((c) => (
        <SelectItem key={c.id} value={c.id} text={c.name} />
      ))}
    </Select>
  );
}
