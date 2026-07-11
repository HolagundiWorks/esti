import {
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  INVOICE_STATUS_TAG,
  InvoiceStatus,
  formatINR,
  type InvoiceStatus as InvoiceStatusT,
} from "@esti/contracts";
import { useEffect, useMemo } from "react";
import { InvoicePdfCell } from "../InvoicePdfCell.js";
import { DataState } from "../DataState.js";
import { StatusTag } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

export function ProjectInvoicesPanel({
  projectId,
  highlightInvoiceId,
  canManage,
}: {
  projectId: string;
  highlightInvoiceId?: string | null;
  canManage: boolean;
}) {
  const utils = trpc.useUtils();
  const listQ = trpc.invoices.listByProject.useQuery({ projectId, limit: 200 });

  const updateStatus = trpc.invoices.updateStatus.useMutation({
    meta: { errorTitle: "Couldn't update the invoice status" },
    onSuccess: () => {
      void utils.invoices.listByProject.invalidate({ projectId });
      void utils.dashboard.home.invalidate();
    },
  });

  useEffect(() => {
    if (!highlightInvoiceId) return;
    const row = document.querySelector(`[data-id="${highlightInvoiceId}"]`);
    row?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightInvoiceId, listQ.data]);

  const columns: GridColDef[] = useMemo(
    () => [
      { field: "ref", headerName: "Ref", flex: 0.8, minWidth: 120 },
      { field: "documentKind", headerName: "Document", flex: 1, minWidth: 140 },
      {
        field: "taxablePaise",
        headerName: "Taxable",
        flex: 1,
        minWidth: 120,
        renderCell: (p) => formatINR(p.row.taxablePaise, { paise: false }),
      },
      {
        field: "gstTotalPaise",
        headerName: "GST",
        flex: 1,
        minWidth: 110,
        renderCell: (p) => formatINR(p.row.gstTotalPaise, { paise: false }),
      },
      {
        field: "netReceivablePaise",
        headerName: "Net",
        flex: 1,
        minWidth: 110,
        renderCell: (p) => formatINR(p.row.netReceivablePaise, { paise: false }),
      },
      {
        field: "status",
        headerName: "Status",
        flex: 1.2,
        minWidth: 180,
        sortable: false,
        renderCell: (iv) => (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", height: 1 }}>
            <TextField
              id={`pinv-st-${iv.row.id}`}
              select
              size="small"
              variant="standard"
              value={iv.row.status}
              disabled={
                !canManage ||
                iv.row.status === "PAID" ||
                iv.row.status === "CANCELLED"
              }
              onChange={(e) =>
                updateStatus.mutate({
                  id: iv.row.id,
                  status: e.target.value as (typeof InvoiceStatus.options)[number],
                })
              }
              sx={{ minWidth: 110 }}
              slotProps={{ htmlInput: { "aria-label": "Invoice status" } }}
            >
              {InvoiceStatus.options.map((st) => (
                <MenuItem key={st} value={st}>
                  {st}
                </MenuItem>
              ))}
            </TextField>
            <StatusTag value={iv.row.status as InvoiceStatusT} map={INVOICE_STATUS_TAG} />
          </Stack>
        ),
      },
      {
        field: "document",
        headerName: "PDF",
        flex: 1,
        minWidth: 150,
        sortable: false,
        filterable: false,
        renderCell: (iv) => (
          <InvoicePdfCell
            invoiceId={iv.row.id}
            initialStatus={iv.row.pdfStatus}
            canManage={canManage}
          />
        ),
      },
    ],
    [canManage, updateStatus],
  );

  return (
    <DataState
      loading={listQ.isLoading}
      isEmpty={(listQ.data ?? []).length === 0}
      columnCount={7}
      empty={{
        title: "No invoices for this project",
        description: "Raise invoices from Office → Consultancy Invoices or the project billing workflow.",
      }}
    >
      <DataGrid
        rows={listQ.data ?? []}
        columns={columns}
        density="compact"
        getRowHeight={() => "auto"}
        disableRowSelectionOnClick
        hideFooter
        autoHeight
        getRowClassName={(p) =>
          p.id === highlightInvoiceId ? "esti-row-highlight" : ""
        }
      />
      {highlightInvoiceId && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Highlighting invoice selected from Studio Intelligence.
        </Typography>
      )}
    </DataState>
  );
}
