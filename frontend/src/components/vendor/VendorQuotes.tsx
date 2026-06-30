import { useState } from "react";
import {
  Button,
  InlineNotification,
  Modal,
  NumberInput,
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
import { Add, Checkmark, Close, Renew, TrashCan, View } from "@carbon/icons-react";
import { canonicalUnit, formatINR, parseRateText } from "@esti/contracts";
import { DataState } from "../DataState.js";
import { ConfirmModal } from "../ConfirmModal.js";
import { trpc } from "../../lib/trpc.js";

const STATUS_TAG: Record<string, "blue" | "green" | "red"> = {
  RECEIVED: "blue",
  ACCEPTED: "green",
  REJECTED: "red",
};

type QuoteLine = { materialName: string; unit: string; rateRupees: number };

const today = () => new Date().toISOString().slice(0, 10);

export function VendorQuotes({ vendorId }: { vendorId: string }) {
  const utils = trpc.useUtils();
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  // new-quote form
  const [header, setHeader] = useState({ ref: "", quoteDate: today(), notes: "" });
  const [raw, setRaw] = useState("");
  const [lines, setLines] = useState<QuoteLine[] | null>(null);

  const quotesQ = trpc.vendors.quotes.listByVendor.useQuery({ vendorId });
  const detailQ = trpc.vendors.quotes.byId.useQuery({ id: openId! }, { enabled: !!openId });

  const invalidate = () => {
    void quotesQ.refetch();
    void utils.vendors.pricesByVendor.invalidate({ vendorId });
  };
  const createM = trpc.vendors.quotes.create.useMutation({
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
      setHeader({ ref: "", quoteDate: today(), notes: "" });
      setRaw("");
      setLines(null);
    },
  });
  const acceptM = trpc.vendors.quotes.accept.useMutation({ onSuccess: invalidate });
  const rejectM = trpc.vendors.quotes.reject.useMutation({ onSuccess: invalidate });
  const removeM = trpc.vendors.quotes.remove.useMutation({
    onSuccess: () => { setOpenId(null); invalidate(); },
  });

  const quotes = quotesQ.data ?? [];

  function parse() {
    const res = parseRateText(raw, "material");
    setLines(
      res.rows
        .filter((r) => r.description.trim() !== "")
        .map((r) => ({
          materialName: r.description,
          unit: r.rawUnit ?? "",
          rateRupees: r.ratePaise == null ? 0 : r.ratePaise / 100,
        })),
    );
  }

  function setLine(i: number, patch: Partial<QuoteLine>) {
    setLines((ls) => (ls ? ls.map((l, j) => (j === i ? { ...l, ...patch } : l)) : ls));
  }

  function save() {
    const usable = (lines ?? []).filter((l) => l.materialName.trim() && l.unit.trim() && l.rateRupees > 0);
    if (usable.length === 0) return;
    createM.mutate({
      vendorId,
      ref: header.ref.trim(),
      quoteDate: header.quoteDate,
      notes: header.notes || undefined,
      lines: usable.map((l) => ({
        materialName: l.materialName.trim(),
        unit: canonicalUnit(l.unit) ?? l.unit.trim(),
        ratePaise: Math.round(l.rateRupees * 100),
      })),
    });
  }

  const usableLines = (lines ?? []).filter((l) => l.materialName.trim() && l.unit.trim() && l.rateRupees > 0).length;

  return (
    <Stack gap={4}>
      <div className="esti-row-between">
        <h4>Quotations</h4>
        <Button size="sm" renderIcon={Add} onClick={() => setAddOpen(true)}>New quote</Button>
      </div>

      <DataState
        loading={quotesQ.isLoading}
        isEmpty={!quotesQ.isLoading && quotes.length === 0}
        empty={{ title: "No quotations", description: "Record a quote received from this vendor; accept it to feed pricing history." }}
        columnCount={6}
      >
        <TableContainer>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Lines</TableHeader>
                <TableHeader>Total</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>{q.ref}</TableCell>
                  <TableCell>{q.quoteDate}</TableCell>
                  <TableCell>{q.lineCount}</TableCell>
                  <TableCell>{formatINR(q.totalPaise)}</TableCell>
                  <TableCell>
                    <Tag type={STATUS_TAG[q.status] ?? "blue"} size="sm">{q.status}</Tag>
                  </TableCell>
                  <TableCell>
                    <Stack orientation="horizontal" gap={2}>
                      <Button kind="ghost" size="sm" renderIcon={View} hasIconOnly iconDescription="View lines"
                        onClick={() => setOpenId(openId === q.id ? null : q.id)} />
                      {q.status === "RECEIVED" && (
                        <>
                          <Button kind="ghost" size="sm" renderIcon={Checkmark} hasIconOnly iconDescription="Accept → pricing history"
                            onClick={() => acceptM.mutate({ id: q.id })} disabled={acceptM.isPending} />
                          <Button kind="ghost" size="sm" renderIcon={Close} hasIconOnly iconDescription="Reject"
                            onClick={() => rejectM.mutate({ id: q.id })} disabled={rejectM.isPending} />
                        </>
                      )}
                      <Button kind="danger--ghost" size="sm" renderIcon={TrashCan} hasIconOnly iconDescription="Remove"
                        onClick={() => setConfirmRemove(q.id)} />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      {openId && detailQ.data && (
        <TableContainer title={`${detailQ.data.ref} — lines`}>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Material</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Rate</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {detailQ.data.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.materialName}</TableCell>
                  <TableCell>{l.unit}</TableCell>
                  <TableCell>{formatINR(l.ratePaise)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {acceptM.data && acceptM.data.priced > 0 && (
        <InlineNotification kind="success" lowContrast hideCloseButton
          title="Quote accepted" subtitle={`${acceptM.data.priced} price records added to pricing history.`} />
      )}

      {/* New quote modal — paste & parse */}
      <Modal
        open={addOpen}
        modalHeading="New vendor quote"
        size="lg"
        primaryButtonText={createM.isPending ? "Saving…" : `Save ${usableLines} lines`}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={createM.isPending || !header.ref || usableLines === 0}
        onRequestSubmit={save}
        onRequestClose={() => setAddOpen(false)}
        onSecondarySubmit={() => setAddOpen(false)}
      >
        <Stack gap={5}>
          <Stack orientation="horizontal" gap={5}>
            <TextInput id="vq-ref" labelText="Quote ref" placeholder="Q-2026-014" value={header.ref}
              onChange={(e) => setHeader({ ...header, ref: e.target.value })} />
            <TextInput id="vq-date" labelText="Quote date" type="date" value={header.quoteDate}
              onChange={(e) => setHeader({ ...header, quoteDate: e.target.value })} />
          </Stack>
          <TextArea id="vq-raw" labelText="Paste quote text" rows={6}
            placeholder={"1. OPC 53 cement   bag   420\n2. River sand   Cum   2400"}
            value={raw} onChange={(e) => setRaw(e.target.value)} />
          <Button kind="tertiary" size="sm" renderIcon={Renew} onClick={parse} disabled={raw.trim() === ""}>
            Parse lines
          </Button>

          {lines && (
            <TableContainer title={`${usableLines} usable lines`}>
              <Table size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Material</TableHeader>
                    <TableHeader>Unit → canonical</TableHeader>
                    <TableHeader>Rate (₹)</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((l, i) => {
                    const canon = canonicalUnit(l.unit);
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          <TextInput id={`vql-d-${i}`} labelText="" hideLabel size="sm" value={l.materialName}
                            onChange={(e) => setLine(i, { materialName: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Stack orientation="horizontal" gap={2} className="esti-row">
                            <div className="esti-input-sm">
                              <TextInput id={`vql-u-${i}`} labelText="" hideLabel size="sm" value={l.unit}
                                onChange={(e) => setLine(i, { unit: e.target.value })} />
                            </div>
                            {l.unit.trim() !== "" && (
                              <Tag type={canon ? "green" : "red"} size="sm">{canon ?? "unknown"}</Tag>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <div className="esti-input-sm">
                            <NumberInput id={`vql-r-${i}`} label="" hideLabel size="sm" min={0} step={0.5}
                              value={l.rateRupees}
                              onChange={(_e, { value }) => setLine(i, { rateRupees: Number(value) })} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {createM.error && (
            <InlineNotification kind="error" lowContrast hideCloseButton title="Could not save" subtitle={createM.error.message} />
          )}
        </Stack>
      </Modal>

      <ConfirmModal
        open={!!confirmRemove} heading="Remove quote?" body="This deletes the quotation and its lines. Pricing history already recorded stays."
        confirmText="Remove" pending={removeM.isPending}
        onConfirm={() => { if (confirmRemove) removeM.mutate({ id: confirmRemove }); setConfirmRemove(null); }}
        onClose={() => setConfirmRemove(null)}
      />
    </Stack>
  );
}
