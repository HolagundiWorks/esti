import {
  Button,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Tile,
} from "@carbon/react";
import { formatINR } from "@esti/contracts";
import type { PeriodFilterInput } from "@esti/contracts";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader.js";
import { PeriodFilter } from "../components/PeriodFilter.js";
import { downloadXlsx } from "../lib/exportXlsx.js";
import { trpc } from "../lib/trpc.js";

function periodLabel(p: string): string {
  const [y, m] = p.split("-");
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m)] ?? m} ${y}`;
}

export function Filing() {
  const [period, setPeriod] = useState<PeriodFilterInput>({ preset: "CURRENT_FY" });

  const gst = trpc.reports.gstAbstract.useQuery({ period });
  const tds = trpc.reports.tdsAbstract.useQuery({ period });
  const exportQ = trpc.reports.invoiceRegisterExport.useQuery(
    { period },
    { enabled: false },
  );

  return (
    <Stack gap={6}>
      <PageHeader
        title="Filing abstracts"
        description="GST output tax (GSTR-1 / GSTR-3B) and TDS deducted u/s 194J, aggregated by month from issued and paid invoices."
      />

      <PeriodFilter value={period} onChange={setPeriod} />

      {gst.data && (
        <Tile>
          <p><strong>{gst.data.label}</strong> · {gst.data.from} to {gst.data.to}</p>
          <Button
            size="sm"
            kind="tertiary"
            onClick={async () => {
              const r = await exportQ.refetch();
              if (r.data?.rows.length) downloadXlsx(r.data.rows, "Register", `invoice-register-${r.data.from}`);
            }}
          >
            Export invoice register (XLSX)
          </Button>
        </Tile>
      )}

      <Tabs>
        <TabList aria-label="Filing tabs" contained>
          <Tab>GST abstract</Tab>
          <Tab>TDS abstract</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <TableContainer title="GST by month">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Period</TableHeader>
                    <TableHeader>Invoices</TableHeader>
                    <TableHeader>Taxable</TableHeader>
                    <TableHeader>GST</TableHeader>
                    <TableHeader>Grand total</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(gst.data?.periods ?? []).map((p) => (
                    <TableRow key={p.period}>
                      <TableCell>{periodLabel(p.period)}</TableCell>
                      <TableCell>{p.count}</TableCell>
                      <TableCell>{formatINR(p.taxablePaise)}</TableCell>
                      <TableCell>{formatINR(p.gstTotalPaise)}</TableCell>
                      <TableCell>{formatINR(p.invoiceTotalPaise)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
          <TabPanel>
            <TableContainer title="TDS by month">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Period</TableHeader>
                    <TableHeader>Invoices</TableHeader>
                    <TableHeader>Gross fees</TableHeader>
                    <TableHeader>TDS</TableHeader>
                    <TableHeader>Net receivable</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(tds.data?.periods ?? []).map((p) => (
                    <TableRow key={p.period}>
                      <TableCell>{periodLabel(p.period)}</TableCell>
                      <TableCell>{p.count}</TableCell>
                      <TableCell>{formatINR(p.grossPaise)}</TableCell>
                      <TableCell>{formatINR(p.tdsPaise)}</TableCell>
                      <TableCell>{formatINR(p.netReceivablePaise)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
