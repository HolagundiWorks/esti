import {
  Alert,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { ReactNode } from "react";
import type { ReconcileColumnMapping } from "@esti/contracts";
import { formatINR, formatINRShort } from "@esti/contracts";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader.js";
import { downloadXlsx } from "../lib/exportXlsx.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

// Visually-hidden native file input (styled component, not a raw control tag).
const HiddenFileInput = styled("input")({ display: "none" });

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

/** Status badge rendered over the Carbon `--cds-tag-*` token vars (exact colours). */
function TagChip({ color, label }: { color: string; label: ReactNode }) {
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        backgroundColor: `var(--cds-tag-background-${color})`,
        color: `var(--cds-tag-color-${color})`,
      }}
    />
  );
}

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
  const { authorizedFetch } = useUploadAuth();
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
      const res = await authorizedFetch("/upload/reconcile", (fd) => {
        fd.append("label", label);
        fd.append("file", file);
        const hasMap = colMap.date || colMap.description || colMap.amount;
        if (hasMap) fd.append("columnMapping", JSON.stringify(colMap));
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

  const batchColumns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.7, minWidth: 110 },
    {
      field: "label",
      headerName: "Label",
      flex: 1.2,
      minWidth: 180,
      sortable: false,
      renderCell: (p) => (
        <Stack spacing={0}>
          <span>{p.row.label}</span>
          <Typography variant="caption" color="text.secondary">{p.row.fileName}</Typography>
        </Stack>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      minWidth: 130,
      sortable: false,
      renderCell: (p) => (
        <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
          <TagChip color={STATUS_TAG[p.row.status] ?? "gray"} label={p.row.status} />
          {p.row.status === "FAILED" && p.row.errorText && (
            <Typography variant="caption" color="error">{p.row.errorText}</Typography>
          )}
        </Stack>
      ),
    },
    { field: "rowCount", headerName: "Rows", flex: 0.5, minWidth: 90 },
    {
      field: "matched",
      headerName: "Matched",
      flex: 0.7,
      minWidth: 110,
      sortable: false,
      renderCell: (p) => `${p.row.matchedCount}/${p.row.rowCount}`,
    },
    {
      field: "credit",
      headerName: "Credit (matched / total)",
      flex: 1.2,
      minWidth: 190,
      sortable: false,
      renderCell: (p) =>
        `${formatINRShort(p.row.matchedCreditPaise)} / ${formatINRShort(p.row.totalCreditPaise)}`,
    },
    {
      field: "actions",
      headerName: "",
      flex: 1.4,
      minWidth: 260,
      sortable: false,
      filterable: false,
      renderCell: (p) => {
        const r = p.row;
        return (
          <>
            {r.status === "READY" && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setOpenId(openId === r.id ? null : r.id);
                    setRemapCols((r.columnMapping as ReconcileColumnMapping) ?? {});
                  }}
                >
                  {openId === r.id ? "Hide" : "Lines"}
                </Button>
                <Button
                  variant="text"
                  size="small"
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
                    variant="text"
                    size="small"
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
                variant="text"
                size="small"
                onClick={() => {
                  setOpenId(r.id);
                  setRemapCols((r.columnMapping as ReconcileColumnMapping) ?? {});
                }}
              >
                Remap columns
              </Button>
            )}
          </>
        );
      },
    },
  ];

  const lineColumns: GridColDef[] = [
    { field: "date", headerName: "Date", flex: 0.8, minWidth: 110, renderCell: (p) => p.row.date ?? "—" },
    { field: "description", headerName: "Description", flex: 1.5, minWidth: 200 },
    {
      field: "amountPaise",
      headerName: "Amount",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => formatINR(p.row.amountPaise),
    },
    {
      field: "matchType",
      headerName: "Match",
      flex: 0.7,
      minWidth: 120,
      sortable: false,
      renderCell: (p) => <TagChip color={MATCH_TAG[p.row.matchType] ?? "gray"} label={p.row.matchType} />,
    },
    {
      field: "matchedInvoiceRef",
      headerName: "Invoice",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => p.row.matchedInvoiceRef ?? "—",
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Reconciliation"
        description="Match bank-statement credits against invoices (CSV / XLSX). Override column names when your bank export uses non-standard headers."
      />

      <Stack spacing={2}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "flex-end" }}>
          <TextField
            id="rcn-label"
            label="Batch label"
            placeholder="e.g. HDFC Apr 2026"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="esti-input-md"
          />
          <Button variant="outlined" component="label">
            {file ? file.name : "Choose statement"}
            <HiddenFileInput
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFile(e.target.files?.[0] ?? null)
              }
            />
          </Button>
          <Button variant="contained" disabled={!file || !label || busy} onClick={upload}>
            {busy ? "Uploading…" : "Upload & reconcile"}
          </Button>
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            id="rcn-date-col"
            label="Date column (optional)"
            placeholder="e.g. Transaction Date"
            value={colMap.date ?? ""}
            onChange={(e) => setColMap((m) => ({ ...m, date: e.target.value || undefined }))}
            className="esti-input-sm"
          />
          <TextField
            id="rcn-desc-col"
            label="Description column (optional)"
            placeholder="e.g. Narration"
            value={colMap.description ?? ""}
            onChange={(e) => setColMap((m) => ({ ...m, description: e.target.value || undefined }))}
            className="esti-input-sm"
          />
          <TextField
            id="rcn-amt-col"
            label="Amount column (optional)"
            placeholder="e.g. Credit"
            value={colMap.amount ?? ""}
            onChange={(e) => setColMap((m) => ({ ...m, amount: e.target.value || undefined }))}
            className="esti-input-sm"
          />
        </Stack>
      </Stack>
      {error && (
        <Alert severity="error">
          <strong>Upload failed</strong> — {error}
        </Alert>
      )}
      {settleMsg && (
        <Alert severity="success" onClose={() => setSettleMsg(null)}>
          <strong>Settled</strong> — {settleMsg}
        </Alert>
      )}

      <DataGrid
        rows={listQ.data ?? []}
        columns={batchColumns}
        density="compact"
        disableRowSelectionOnClick
        getRowHeight={() => "auto"}
        hideFooter
        autoHeight
      />

      {openId && (
        <>
          {(detailQ.data?.status === "FAILED" || storedMap.date || storedMap.description) && (
            <Stack spacing={2}>
              <Typography variant="body2">
                <strong>Column mapping</strong> — re-run import with corrected headers.
              </Typography>
              <Stack direction="row" spacing={2} sx={{ alignItems: "flex-end" }}>
                <TextField
                  id="remap-date"
                  label="Date column"
                  value={remapCols.date ?? storedMap.date ?? ""}
                  onChange={(e) => setRemapCols((m) => ({ ...m, date: e.target.value || undefined }))}
                  sx={{ maxWidth: 220 }}
                />
                <TextField
                  id="remap-desc"
                  label="Description column"
                  value={remapCols.description ?? storedMap.description ?? ""}
                  onChange={(e) => setRemapCols((m) => ({ ...m, description: e.target.value || undefined }))}
                  sx={{ maxWidth: 220 }}
                />
                <TextField
                  id="remap-amt"
                  label="Amount column"
                  value={remapCols.amount ?? storedMap.amount ?? ""}
                  onChange={(e) => setRemapCols((m) => ({ ...m, amount: e.target.value || undefined }))}
                  sx={{ maxWidth: 220 }}
                />
                <Button
                  variant="contained"
                  size="small"
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

          <Typography variant="h6" component="h3">Statement lines</Typography>
          <DataGrid
            rows={lines}
            columns={lineColumns}
            getRowId={(r) => r.row}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </>
      )}
    </Stack>
  );
}
