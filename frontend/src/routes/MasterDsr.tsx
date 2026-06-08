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
  TextInput,
} from "@carbon/react";
import { formatINR } from "@esti/contracts";
import { useEffect, useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

const rupeesToPaise = (s: string) => Math.round(Number(s) * 100);

export function MasterDsr() {
  const utils = trpc.useUtils();
  const versionsQ = trpc.dsr.listVersions.useQuery();
  const [versionId, setVersionId] = useState("");
  useEffect(() => {
    if (!versionId && versionsQ.data && versionsQ.data.length > 0) setVersionId(versionsQ.data[0]!.id);
  }, [versionsQ.data, versionId]);

  const itemsQ = trpc.dsr.listItems.useQuery({ versionId }, { enabled: !!versionId });

  const [vOpen, setVOpen] = useState(false);
  const [vForm, setVForm] = useState({ label: "", description: "" });
  const createVersion = trpc.dsr.createVersion.useMutation({
    onSuccess: (row) => {
      utils.dsr.listVersions.invalidate();
      setVersionId(row.id);
      setVOpen(false);
      setVForm({ label: "", description: "" });
    },
  });
  const setActive = trpc.dsr.setActiveVersion.useMutation({ onSuccess: () => utils.dsr.listVersions.invalidate() });

  const [iOpen, setIOpen] = useState(false);
  const [iForm, setIForm] = useState({ code: "", description: "", unit: "", rate: "" });
  const createItem = trpc.dsr.createItem.useMutation({
    onSuccess: () => {
      utils.dsr.listItems.invalidate({ versionId });
      setIOpen(false);
      setIForm({ code: "", description: "", unit: "", rate: "" });
    },
  });
  const removeItem = trpc.dsr.removeItem.useMutation({ onSuccess: () => utils.dsr.listItems.invalidate({ versionId }) });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const activeVersion = versionsQ.data?.find((v) => v.id === versionId);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Master DSR</h1>
        <Button onClick={() => setVOpen(true)}>New version</Button>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", margin: "16px 0" }}>
        <Select id="dsr-ver" labelText="DSR version" value={versionId} onChange={(e) => setVersionId(e.target.value)} style={{ maxWidth: 280 }}>
          <SelectItem value="" text="Select…" />
          {(versionsQ.data ?? []).map((v) => (
            <SelectItem key={v.id} value={v.id} text={`${v.label}${v.active ? " (active)" : ""}`} />
          ))}
        </Select>
        {activeVersion && !activeVersion.active && (
          <Button kind="tertiary" onClick={() => setActive.mutate({ id: versionId })}>Set active</Button>
        )}
        <Button disabled={!versionId} onClick={() => setIOpen(true)}>Add item</Button>
      </div>

      <DataState
        loading={!!versionId && itemsQ.isLoading}
        isEmpty={!versionId || (itemsQ.data ?? []).length === 0}
        columnCount={5}
        empty={{
          title: versionId ? "No rate items in this version" : "Select or create a DSR version",
          description: versionId ? "Add schedule-of-rates items to build estimates from." : undefined,
          action: versionId ? <Button size="sm" onClick={() => setIOpen(true)}>Add item</Button> : undefined,
        }}
      >
      <TableContainer title="Rate items" description={activeVersion?.description ?? ""}>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Code</TableHeader>
              <TableHeader>Description</TableHeader>
              <TableHeader>Unit</TableHeader>
              <TableHeader>Rate</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(itemsQ.data ?? []).map((it) => (
              <TableRow key={it.id}>
                <TableCell>{it.code}</TableCell>
                <TableCell>{it.description}</TableCell>
                <TableCell>{it.unit}</TableCell>
                <TableCell>{formatINR(it.ratePaise)}</TableCell>
                <TableCell>
                  <Button kind="danger--ghost" size="sm" onClick={() => setConfirmId(it.id)}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      </DataState>

      <ConfirmModal
        open={!!confirmId}
        heading="Remove rate item?"
        body="This removes the item from this DSR version."
        confirmText="Remove"
        pending={removeItem.isPending}
        onConfirm={() => {
          if (confirmId) removeItem.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />

      <Modal
        open={vOpen}
        modalHeading="New DSR version"
        primaryButtonText={createVersion.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!vForm.label || createVersion.isPending}
        onRequestClose={() => setVOpen(false)}
        onRequestSubmit={() => createVersion.mutate({ label: vForm.label, description: vForm.description || undefined })}
      >
        <Stack gap={5}>
          <TextInput id="v-label" labelText="Version label" placeholder="e.g. 2026-27" value={vForm.label} onChange={(e) => setVForm((f) => ({ ...f, label: e.target.value }))} />
          <TextInput id="v-desc" labelText="Description (optional)" value={vForm.description} onChange={(e) => setVForm((f) => ({ ...f, description: e.target.value }))} />
        </Stack>
      </Modal>

      <Modal
        open={iOpen}
        modalHeading="Add rate item"
        primaryButtonText={createItem.isPending ? "Adding…" : "Add"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!iForm.code || !iForm.description || !iForm.unit || createItem.isPending}
        onRequestClose={() => setIOpen(false)}
        onRequestSubmit={() => createItem.mutate({ versionId, code: iForm.code, description: iForm.description, unit: iForm.unit, ratePaise: rupeesToPaise(iForm.rate) })}
      >
        <Stack gap={5}>
          <TextInput id="i-code" labelText="Code" value={iForm.code} onChange={(e) => setIForm((f) => ({ ...f, code: e.target.value }))} />
          <TextInput id="i-desc" labelText="Description" value={iForm.description} onChange={(e) => setIForm((f) => ({ ...f, description: e.target.value }))} />
          <TextInput id="i-unit" labelText="Unit" placeholder="cum, sqm, nos…" value={iForm.unit} onChange={(e) => setIForm((f) => ({ ...f, unit: e.target.value }))} />
          <TextInput id="i-rate" labelText="Rate (₹)" type="number" value={iForm.rate} onChange={(e) => setIForm((f) => ({ ...f, rate: e.target.value }))} />
        </Stack>
      </Modal>
    </div>
  );
}
