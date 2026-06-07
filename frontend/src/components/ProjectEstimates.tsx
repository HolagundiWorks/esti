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
  TextInput,
} from "@carbon/react";
import { formatINR } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

const rupeesToPaise = (s: string) => Math.round(Number(s) * 100);

export function ProjectEstimates({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const estimatesQ = trpc.estimates.listByProject.useQuery({ projectId }, { enabled: !!projectId });
  const versionsQ = trpc.dsr.listVersions.useQuery();
  const [openId, setOpenId] = useState<string | null>(null);
  const itemsQ = trpc.estimates.items.useQuery({ estimateId: openId ?? "" }, { enabled: !!openId });

  const invalidateList = () => utils.estimates.listByProject.invalidate({ projectId });
  const invalidateItems = () => openId && utils.estimates.items.invalidate({ estimateId: openId });

  const [newOpen, setNewOpen] = useState(false);
  const [nf, setNf] = useState({ title: "", dsrVersionId: "", leadPct: "0" });
  const create = trpc.estimates.create.useMutation({
    onSuccess: (row) => {
      invalidateList();
      setNewOpen(false);
      setNf({ title: "", dsrVersionId: "", leadPct: "0" });
      setOpenId(row.id);
    },
  });

  const setLead = trpc.estimates.setLead.useMutation({ onSuccess: invalidateList });
  const approve = trpc.estimates.approve.useMutation({ onSuccess: invalidateList });
  const addItem = trpc.estimates.addItem.useMutation({
    onSuccess: () => {
      invalidateItems();
      invalidateList();
      setItemOpen(false);
    },
  });
  const removeItem = trpc.estimates.removeItem.useMutation({
    onSuccess: () => {
      invalidateItems();
      invalidateList();
    },
  });

  const open = (estimatesQ.data ?? []).find((e) => e.id === openId) ?? null;
  const dsrItemsQ = trpc.dsr.listItems.useQuery(
    { versionId: open?.dsrVersionId ?? "" },
    { enabled: !!open?.dsrVersionId },
  );

  const [itemOpen, setItemOpen] = useState(false);
  const [itf, setItf] = useState({ dsrItemId: "", description: "", unit: "", qty: "", rate: "", itemLeadPct: "0" });
  function pickDsr(id: string) {
    const d = (dsrItemsQ.data ?? []).find((x) => x.id === id);
    setItf((f) => ({
      ...f,
      dsrItemId: id,
      description: d?.description ?? f.description,
      unit: d?.unit ?? f.unit,
      rate: d ? String(d.ratePaise / 100) : f.rate,
    }));
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 }}>
        <h3>Estimation / BOQ</h3>
        <Button size="sm" onClick={() => setNewOpen(true)}>New estimate</Button>
      </div>

      <TableContainer title="Estimates" description="Approved estimate becomes the project BOQ">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Lead %</TableHeader>
              <TableHeader>Total</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(estimatesQ.data ?? []).map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.ref}</TableCell>
                <TableCell>{e.title}</TableCell>
                <TableCell>{e.leadPct}%</TableCell>
                <TableCell>{formatINR(e.totalPaise)}</TableCell>
                <TableCell>
                  <Tag type={e.status === "APPROVED" ? "green" : "blue"}>{e.status}</Tag>
                </TableCell>
                <TableCell>
                  <Button kind="ghost" size="sm" onClick={() => setOpenId(openId === e.id ? null : e.id)}>
                    {openId === e.id ? "Hide" : "Open"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {open && (
        <div style={{ marginTop: 16, borderLeft: "3px solid #0f62fe", paddingLeft: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <h4 style={{ marginRight: "auto" }}>{open.ref} · {open.title}</h4>
            {open.status === "DRAFT" && (
              <>
                <TextInput
                  id="est-lead"
                  labelText="Whole-estimate lead %"
                  type="number"
                  defaultValue={open.leadPct}
                  onBlur={(e) => setLead.mutate({ id: open.id, leadPct: Number(e.target.value) || 0 })}
                  style={{ maxWidth: 180 }}
                />
                <Button size="sm" onClick={() => setItemOpen(true)}>Add item</Button>
                <Button size="sm" kind="tertiary" onClick={() => approve.mutate({ id: open.id })}>Approve → BOQ</Button>
              </>
            )}
          </div>

          <TableContainer title="Line items">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Description</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Qty</TableHeader>
                  <TableHeader>Rate</TableHeader>
                  <TableHeader>Item lead %</TableHeader>
                  <TableHeader>Amount</TableHeader>
                  <TableHeader></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(itemsQ.data ?? []).map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.description}</TableCell>
                    <TableCell>{it.unit}</TableCell>
                    <TableCell>{it.qty}</TableCell>
                    <TableCell>{formatINR(it.ratePaise)}</TableCell>
                    <TableCell>{it.itemLeadPct}%</TableCell>
                    <TableCell>{formatINR(it.amountPaise)}</TableCell>
                    <TableCell>
                      {open.status === "DRAFT" && (
                        <Button kind="ghost" size="sm" onClick={() => removeItem.mutate({ id: it.id })}>Remove</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <p style={{ textAlign: "right", marginTop: 8 }}>
            Subtotal {formatINR(open.subtotalPaise)} · <strong>Total {formatINR(open.totalPaise)}</strong>
          </p>
        </div>
      )}

      <Modal
        open={newOpen}
        modalHeading="New estimate"
        primaryButtonText={create.isPending ? "Creating…" : "Create"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!nf.title || create.isPending}
        onRequestClose={() => setNewOpen(false)}
        onRequestSubmit={() =>
          create.mutate({
            projectId,
            title: nf.title,
            dsrVersionId: nf.dsrVersionId || null,
            leadPct: Number(nf.leadPct) || 0,
          })
        }
      >
        <Stack gap={5}>
          <TextInput id="ne-title" labelText="Title" value={nf.title} onChange={(e) => setNf((f) => ({ ...f, title: e.target.value }))} />
          <Select id="ne-ver" labelText="DSR version" value={nf.dsrVersionId} onChange={(e) => setNf((f) => ({ ...f, dsrVersionId: e.target.value }))}>
            <SelectItem value="" text="None" />
            {(versionsQ.data ?? []).map((v) => <SelectItem key={v.id} value={v.id} text={v.label} />)}
          </Select>
          <TextInput id="ne-lead" labelText="Whole-estimate lead %" type="number" value={nf.leadPct} onChange={(e) => setNf((f) => ({ ...f, leadPct: e.target.value }))} />
        </Stack>
      </Modal>

      <Modal
        open={itemOpen}
        modalHeading="Add line item"
        primaryButtonText={addItem.isPending ? "Adding…" : "Add"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!open || !itf.description || !itf.unit || itf.qty === "" || addItem.isPending}
        onRequestClose={() => setItemOpen(false)}
        onRequestSubmit={() =>
          open &&
          addItem.mutate({
            estimateId: open.id,
            dsrItemId: itf.dsrItemId || null,
            description: itf.description,
            unit: itf.unit,
            qty: Number(itf.qty) || 0,
            ratePaise: rupeesToPaise(itf.rate),
            itemLeadPct: Number(itf.itemLeadPct) || 0,
          })
        }
      >
        <Stack gap={5}>
          {(dsrItemsQ.data ?? []).length > 0 && (
            <Select id="it-dsr" labelText="From DSR (optional)" value={itf.dsrItemId} onChange={(e) => pickDsr(e.target.value)}>
              <SelectItem value="" text="Manual entry" />
              {(dsrItemsQ.data ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id} text={`${d.code} — ${d.description}`} />
              ))}
            </Select>
          )}
          <TextInput id="it-desc" labelText="Description" value={itf.description} onChange={(e) => setItf((f) => ({ ...f, description: e.target.value }))} />
          <div style={{ display: "flex", gap: 12 }}>
            <TextInput id="it-unit" labelText="Unit" value={itf.unit} onChange={(e) => setItf((f) => ({ ...f, unit: e.target.value }))} />
            <TextInput id="it-qty" labelText="Qty" type="number" value={itf.qty} onChange={(e) => setItf((f) => ({ ...f, qty: e.target.value }))} />
            <TextInput id="it-rate" labelText="Rate (₹)" type="number" value={itf.rate} onChange={(e) => setItf((f) => ({ ...f, rate: e.target.value }))} />
            <TextInput id="it-lead" labelText="Item lead %" type="number" value={itf.itemLeadPct} onChange={(e) => setItf((f) => ({ ...f, itemLeadPct: e.target.value }))} />
          </div>
        </Stack>
      </Modal>
    </>
  );
}
