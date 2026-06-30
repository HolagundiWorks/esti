import { useState } from "react";
import {
  Button,
  Modal,
  NumberInput,
  ProgressBar,
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
import { can } from "@esti/contracts";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";
import { useAuth } from "../../lib/auth.js";

export function ProjectSiteMeasurement({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ date: today, description: "", executedQty: 0, remarks: "" });

  const elementsQ = trpc.cms.elements.listByProject.useQuery({ projectId });
  const summaryQ = trpc.cms.measurements.summaryByProject.useQuery({ projectId });
  const recordsQ = trpc.cms.measurements.listByElement.useQuery(
    { elementId: selectedId! },
    { enabled: !!selectedId },
  );

  const invalidate = () => {
    void summaryQ.refetch();
    if (selectedId) utils.cms.measurements.listByElement.invalidate({ elementId: selectedId });
  };

  const createM = trpc.cms.measurements.create.useMutation({
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
      setForm({ date: today, description: "", executedQty: 0, remarks: "" });
    },
  });
  const verifyM = trpc.cms.measurements.verify.useMutation({ onSuccess: invalidate });
  const removeM = trpc.cms.measurements.remove.useMutation({ onSuccess: invalidate });

  const canApprove = !!(user && can(user.role, "cost:approve"));
  const elements = elementsQ.data?.elements ?? [];
  const summary = summaryQ.data ?? [];
  const selectedElement = elements.find((e) => e.id === selectedId);

  function getSummary(elementId: string) {
    return summary.find((s) => s.elementId === elementId);
  }

  return (
    <Stack gap={6}>
      <h3>Site Measurement Book</h3>
      <DataState
        loading={elementsQ.isLoading}
        isEmpty={!elementsQ.isLoading && (elementsQ.data?.elements.length ?? 0) === 0}
        empty={{ title: "No elements", description: "Add elements in the Estimate tab first." }}
        columnCount={6}
      >
        <TableContainer title="Elements — execution progress">
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Code</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Estimated qty</TableHeader>
                <TableHeader>Verified qty</TableHeader>
                <TableHeader>Progress</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {elements.map((el) => {
                const s = getSummary(el.id);
                const verifiedQty = s?.cumulativeVerifiedQty ?? 0;
                const pct = s?.percentComplete ?? 0;
                const isSelected = selectedId === el.id;
                return (
                  <TableRow
                    key={el.id}
                    onClick={() => setSelectedId(isSelected ? null : el.id)}
                    style={{ cursor: "pointer", background: isSelected ? "var(--cds-layer-selected)" : undefined }}
                  >
                    <TableCell>{el.code}</TableCell>
                    <TableCell>{el.description}</TableCell>
                    <TableCell>{el.unit ?? "—"}</TableCell>
                    <TableCell>{el.quantity.toFixed(3)}</TableCell>
                    <TableCell>{verifiedQty.toFixed(3)}</TableCell>
                    <TableCell style={{ minWidth: "120px" }}>
                      <ProgressBar label=" " value={pct} max={100} size="small" hideLabel />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      {selectedElement && (
        <Stack gap={4}>
          <div className="esti-row-between">
            <h4>
              {selectedElement.code}: {selectedElement.description}
            </h4>
            <Button size="sm" renderIcon={Add} onClick={() => setAddOpen(true)}>
              Add measurement
            </Button>
          </div>
          <DataState
            loading={recordsQ.isLoading}
            isEmpty={!recordsQ.isLoading && (recordsQ.data?.length ?? 0) === 0}
            empty={{ title: "No measurements", description: "Record the first site measurement for this element." }}
            columnCount={6}
          >
            <TableContainer>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Description</TableHeader>
                    <TableHeader>Executed qty</TableHeader>
                    <TableHeader>Remarks</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(recordsQ.data ?? []).map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>{rec.date}</TableCell>
                      <TableCell>{rec.description ?? "—"}</TableCell>
                      <TableCell>{rec.executedQty.toFixed(3)}</TableCell>
                      <TableCell>{rec.remarks ?? "—"}</TableCell>
                      <TableCell>
                        <Tag type={rec.status === "VERIFIED" ? "green" : "cool-gray"} size="sm">
                          {rec.status}
                        </Tag>
                      </TableCell>
                      <TableCell>
                        <Stack orientation="horizontal" gap={2}>
                          {rec.status === "DRAFT" && canApprove && (
                            <Button
                              kind="ghost"
                              size="sm"
                              renderIcon={Checkmark}
                              hasIconOnly
                              iconDescription="Verify measurement"
                              onClick={() => verifyM.mutate({ id: rec.id })}
                              disabled={verifyM.isPending}
                            />
                          )}
                          {rec.status === "DRAFT" && (
                            <Button
                              kind="danger--ghost"
                              size="sm"
                              renderIcon={TrashCan}
                              hasIconOnly
                              iconDescription="Remove"
                              onClick={() => removeM.mutate({ id: rec.id })}
                              disabled={removeM.isPending}
                            />
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DataState>
        </Stack>
      )}

      <Modal
        open={addOpen}
        modalHeading={`Add measurement — ${selectedElement?.code ?? ""}`}
        primaryButtonText={createM.isPending ? "Saving…" : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={createM.isPending || form.executedQty <= 0 || !form.date}
        onRequestSubmit={() => {
          if (!selectedId) return;
          createM.mutate({
            projectId,
            elementId: selectedId,
            date: form.date,
            description: form.description || undefined,
            executedQty: form.executedQty,
            remarks: form.remarks || undefined,
          });
        }}
        onRequestClose={() => setAddOpen(false)}
        onSecondarySubmit={() => setAddOpen(false)}
      >
        <Stack gap={5}>
          <TextInput
            id="sm-date"
            labelText="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <TextInput
            id="sm-desc"
            labelText="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <NumberInput
            id="sm-qty"
            label={`Executed quantity${selectedElement?.unit ? ` (${selectedElement.unit})` : ""}`}
            value={form.executedQty}
            onChange={(_e, { value }) =>
              setForm((f) => ({ ...f, executedQty: Number(value) }))
            }
            min={0}
            step={0.001}
          />
          <TextInput
            id="sm-remarks"
            labelText="Remarks (optional)"
            value={form.remarks}
            onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
