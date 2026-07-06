import { Box, Button, Stack, Tab, Tabs, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { formatINR } from "@esti/contracts";
import type { PeriodFilterInput } from "@esti/contracts";
import { useState } from "react";
import { RailLayout } from "../components/RailLayout.js";
import { PeriodFilter } from "../components/PeriodFilter.js";
import { downloadXlsx } from "../lib/exportXlsx.js";
import { trpc } from "../lib/trpc.js";

function periodLabel(p: string): string {
  const [y, m] = p.split("-");
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m)] ?? m} ${y}`;
}

const inr = (v: number) => formatINR(v);

const gstColumns: GridColDef[] = [
  { field: "period", headerName: "Period", flex: 1, minWidth: 120, valueFormatter: (v: string) => periodLabel(v) },
  { field: "count", headerName: "Invoices", flex: 1, minWidth: 100, type: "number" },
  { field: "taxable", headerName: "Taxable", flex: 1, minWidth: 140, type: "number", valueFormatter: inr },
  { field: "gst", headerName: "GST", flex: 1, minWidth: 140, type: "number", valueFormatter: inr },
  { field: "grandTotal", headerName: "Grand total", flex: 1, minWidth: 140, type: "number", valueFormatter: inr },
];

const tdsColumns: GridColDef[] = [
  { field: "period", headerName: "Period", flex: 1, minWidth: 120, valueFormatter: (v: string) => periodLabel(v) },
  { field: "count", headerName: "Invoices", flex: 1, minWidth: 100, type: "number" },
  { field: "gross", headerName: "Gross fees", flex: 1, minWidth: 140, type: "number", valueFormatter: inr },
  { field: "tds", headerName: "TDS", flex: 1, minWidth: 140, type: "number", valueFormatter: inr },
  { field: "net", headerName: "Net receivable", flex: 1, minWidth: 140, type: "number", valueFormatter: inr },
];

export function Filing() {
  const [period, setPeriod] = useState<PeriodFilterInput>({ preset: "CURRENT_FY" });
  const [tab, setTab] = useState(0);

  const gst = trpc.reports.gstAbstract.useQuery({ period });
  const tds = trpc.reports.tdsAbstract.useQuery({ period });
  const exportQ = trpc.reports.invoiceRegisterExport.useQuery(
    { period },
    { enabled: false },
  );

  const gstRows = (gst.data?.periods ?? []).map((p) => ({
    id: p.period,
    period: p.period,
    count: p.count,
    taxable: p.taxablePaise,
    gst: p.gstTotalPaise,
    grandTotal: p.invoiceTotalPaise,
  }));

  const tdsRows = (tds.data?.periods ?? []).map((p) => ({
    id: p.period,
    period: p.period,
    count: p.count,
    gross: p.grossPaise,
    tds: p.tdsPaise,
    net: p.netReceivablePaise,
  }));

  return (
    <RailLayout
      title="Filing abstracts"
      description="GST output tax (GSTR-1 / GSTR-3B) and TDS deducted u/s 194J, aggregated by month from issued and paid invoices."
      tabs={
        <Tabs
          orientation="vertical"
          value={tab}
          onChange={(_e, v: number) => setTab(v)}
          aria-label="Filing tabs"
        >
          <Tab label="GST abstract" />
          <Tab label="TDS abstract" />
        </Tabs>
      }
      aside={
        <Stack spacing={1.5}>
          <PeriodFilter value={period} onChange={setPeriod} />
          {gst.data && (
            <Box sx={{ p: 2 }}>
              <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
                <Typography variant="body2">
                  <strong>{gst.data.label}</strong> · {gst.data.from} to {gst.data.to}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  onClick={async () => {
                    const r = await exportQ.refetch();
                    if (r.data?.rows.length) downloadXlsx(r.data.rows, "Register", `invoice-register-${r.data.from}`);
                  }}
                >
                  Export invoice register (XLSX)
                </Button>
              </Stack>
            </Box>
          )}
        </Stack>
      }
    >
      {tab === 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>GST by month</Typography>
          <DataGrid
            rows={gstRows}
            columns={gstColumns}
            loading={gst.isLoading}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>TDS by month</Typography>
          <DataGrid
            rows={tdsRows}
            columns={tdsColumns}
            loading={tds.isLoading}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </Box>
      )}
    </RailLayout>
  );
}
