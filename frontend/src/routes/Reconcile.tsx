import {
  Button,
  FileUploaderButton,
  InlineNotification,
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
import { formatINR, formatINRShort } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  PENDING: "gray",
  PROCESSING: "blue",
  READY: "green",
  FAILED: "red",
};

const MATCH_TAG: Record<string, "green" | "teal" | "cyan" | "gray"> = {
  ref_amount: "green",
  ref: "teal",
  amount: "cyan",
  none: "gray",
};

type Line = {
  row: number;
  date: string | null;
  description: string;
  amountPaise: number;
  matchType: keyof typeof MATCH_TAG;
  matchedInvoiceRef: string | null;
};

export function Reconcile() {
  const utils = trpc.useUtils();
  const listQ = trpc.reconcile.list.useQuery(undefined, {
    refetchInterval: (q) =>
      (q.state.data ?? []).some(
        (r) => r.status === "PENDING" || r.status === "PROCESSING",
      )
        ? 2000
        : false,
  });
  const [settleMsg, setSettleMsg] = useState<string | null>(null);
  const settle = trpc.reconcile.settle.useMutation({
    onSuccess: (res) => {
      setSettleMsg(
        `Settled ${res.settled} invoice(s) as PAID · ${res.skipped} skipped`,
      );
      utils.reconcile.list.invalidate();
      utils.dashboard.summary.invalidate();
    },
  });

  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function upload() {
    if (!file || !label) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("label", label);
      fd.append("file", file);
      const res = await fetch("/upload/reconcile", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`,
        );
      setLabel("");
      setFile(null);
      utils.reconcile.list.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const detailQ = trpc.reconcile.byId.useQuery(
    { id: openId ?? "" },
    { enabled: !!openId },
  );
  const lines = (detailQ.data?.lines as Line[] | null) ?? [];

  return (
    <div>
      <h1>Reconciliation</h1>
      <p>Match bank-statement credits against invoices (CSV / XLSX).</p>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          margin: "16px 0",
        }}
      >
        <TextInput
          id="rcn-label"
          labelText="Batch label"
          placeholder="e.g. HDFC Apr 2026"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <FileUploaderButton
          labelText={file ? file.name : "Choose statement"}
          accept={[".csv", ".xlsx", ".xls"]}
          disableLabelChanges
          buttonKind="tertiary"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFile(e.target.files?.[0] ?? null)
          }
        />
        <Button size="md" disabled={!file || !label || busy} onClick={upload}>
          {busy ? "Uploading…" : "Upload & reconcile"}
        </Button>
      </div>
      {error && (
        <InlineNotification
          kind="error"
          title="Upload failed"
          subtitle={error}
          lowContrast
        />
      )}
      {settleMsg && (
        <InlineNotification
          kind="success"
          title="Settled"
          subtitle={settleMsg}
          lowContrast
          onCloseButtonClick={() => setSettleMsg(null)}
        />
      )}

      <TableContainer title="Reconciliation batches">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Label</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Rows</TableHeader>
              <TableHeader>Matched</TableHeader>
              <TableHeader>Credit (matched / total)</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(listQ.data ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.ref}</TableCell>
                <TableCell>
                  {r.label}
                  <div>{r.fileName}</div>
                </TableCell>
                <TableCell>
                  <Tag type={STATUS_TAG[r.status] ?? "gray"}>{r.status}</Tag>
                  {r.status === "FAILED" && r.errorText && (
                    <div>{r.errorText}</div>
                  )}
                </TableCell>
                <TableCell>{r.rowCount}</TableCell>
                <TableCell>
                  {r.matchedCount}/{r.rowCount}
                </TableCell>
                <TableCell>
                  {formatINRShort(r.matchedCreditPaise)} /{" "}
                  {formatINRShort(r.totalCreditPaise)}
                </TableCell>
                <TableCell>
                  {r.status === "READY" && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => setOpenId(openId === r.id ? null : r.id)}
                      >
                        {openId === r.id ? "Hide" : "Lines"}
                      </Button>
                      {r.matchedCount > 0 && (
                        <Button
                          kind="ghost"
                          size="sm"
                          disabled={settle.isPending}
                          onClick={() => settle.mutate({ id: r.id })}
                        >
                          Settle matched
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {openId && (
        <TableContainer title="Statement lines" style={{ marginTop: 24 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Date</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Match</TableHeader>
                <TableHeader>Invoice</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.row}>
                  <TableCell>{l.date ?? "—"}</TableCell>
                  <TableCell>{l.description}</TableCell>
                  <TableCell>{formatINR(l.amountPaise)}</TableCell>
                  <TableCell>
                    <Tag type={MATCH_TAG[l.matchType] ?? "gray"}>
                      {l.matchType}
                    </Tag>
                  </TableCell>
                  <TableCell>{l.matchedInvoiceRef ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
