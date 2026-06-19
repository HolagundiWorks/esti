import {
  Button,
  FileUploaderButton,
  InlineNotification,
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
import type { ReconcileColumnMapping } from "@esti/contracts";
import { formatINR, formatINRShort } from "@esti/contracts";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader.js";
import { downloadXlsx } from "../lib/exportXlsx.js";
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
      utils.dashboard.home.invalidate();
    },
  });
  const remap = trpc.reconcile.setColumnMapping.useMutation({
    onSuccess: () => {
      utils.reconcile.list.invalidate();
      if (openId) utils.reconcile.byId.invalidate({ id: openId });
    },
  });

  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [colMap, setColMap] = useState<ReconcileColumnMapping>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [remapCols, setRemapCols] = useState<ReconcileColumnMapping>({});

  async function upload() {
    if (!file || !label) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("label", label);
      fd.append("file", file);
      const hasMap = colMap.date || colMap.description || colMap.amount;
      if (hasMap) fd.append("columnMapping", JSON.stringify(colMap));
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
      setColMap({});
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
  const storedMap = (detailQ.data?.columnMapping as ReconcileColumnMapping | null) ?? {};

  return (
    <Stack gap={6}>
      <PageHeader
        title="Reconciliation"
        description="Match bank-statement credits against invoices (CSV / XLSX). Override column names when your bank export uses non-standard headers."
      />

      <Stack gap={4}>
        <Stack orientation="horizontal" gap={4}>
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
        </Stack>
        <Stack orientation="horizontal" gap={4}>
          <TextInput
            id="rcn-date-col"
            labelText="Date column (optional)"
            placeholder="e.g. Transaction Date"
            value={colMap.date ?? ""}
            onChange={(e) => setColMap((m) => ({ ...m, date: e.target.value || undefined }))}
            style={{ maxWidth: 220 }}
          />
          <TextInput
            id="rcn-desc-col"
            labelText="Description column (optional)"
            placeholder="e.g. Narration"
            value={colMap.description ?? ""}
            onChange={(e) => setColMap((m) => ({ ...m, description: e.target.value || undefined }))}
            style={{ maxWidth: 220 }}
          />
          <TextInput
            id="rcn-amt-col"
            labelText="Amount column (optional)"
            placeholder="e.g. Credit"
            value={colMap.amount ?? ""}
            onChange={(e) => setColMap((m) => ({ ...m, amount: e.target.value || undefined }))}
            style={{ maxWidth: 220 }}
          />
        </Stack>
      </Stack>
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
                    <Stack orientation="horizontal" gap={2}>
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => {
                          setOpenId(openId === r.id ? null : r.id);
                          setRemapCols((r.columnMapping as ReconcileColumnMapping) ?? {});
                        }}
                      >
                        {openId === r.id ? "Hide" : "Lines"}
                      </Button>
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => {
                          void utils.reconcile.exportRows.fetch({ id: r.id }).then((data) => {
                            if (data.rows.length) downloadXlsx(data.rows, "Reconcile", `${data.ref}-reconcile`);
                          });
                        }}
                      >
                        Export XLSX
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
                    </Stack>
                  )}
                  {r.status === "FAILED" && (
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={() => {
                        setOpenId(r.id);
                        setRemapCols((r.columnMapping as ReconcileColumnMapping) ?? {});
                      }}
                    >
                      Remap columns
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {openId && (
        <>
          {(detailQ.data?.status === "FAILED" || storedMap.date || storedMap.description) && (
            <Stack gap={4}>
              <p style={{ margin: 0 }}>
                <strong>Column mapping</strong> — re-run import with corrected headers.
              </p>
              <Stack orientation="horizontal" gap={4}>
                <TextInput
                  id="remap-date"
                  labelText="Date column"
                  value={remapCols.date ?? storedMap.date ?? ""}
                  onChange={(e) => setRemapCols((m) => ({ ...m, date: e.target.value || undefined }))}
                  style={{ maxWidth: 220 }}
                />
                <TextInput
                  id="remap-desc"
                  labelText="Description column"
                  value={remapCols.description ?? storedMap.description ?? ""}
                  onChange={(e) => setRemapCols((m) => ({ ...m, description: e.target.value || undefined }))}
                  style={{ maxWidth: 220 }}
                />
                <TextInput
                  id="remap-amt"
                  labelText="Amount column"
                  value={remapCols.amount ?? storedMap.amount ?? ""}
                  onChange={(e) => setRemapCols((m) => ({ ...m, amount: e.target.value || undefined }))}
                  style={{ maxWidth: 220 }}
                />
                <Button
                  size="sm"
                  disabled={remap.isPending}
                  onClick={() =>
                    remap.mutate({
                      id: openId,
                      mapping: {
                        date: remapCols.date ?? storedMap.date,
                        description: remapCols.description ?? storedMap.description,
                        amount: remapCols.amount ?? storedMap.amount,
                      },
                    })
                  }
                >
                  {remap.isPending ? "Reprocessing…" : "Reprocess"}
                </Button>
              </Stack>
            </Stack>
          )}

          <TableContainer title="Statement lines">
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
        </>
      )}
    </Stack>
  );
}
