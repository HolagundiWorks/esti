import {
  DatePicker,
  DatePickerInput,
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
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

/** Render a YYYY-MM period key as e.g. "Apr 2026". */
function periodLabel(p: string): string {
  const [y, m] = p.split("-");
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m)] ?? m} ${y}`;
}

export function Filing() {
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);
  const range = from && to ? { fromDate: from, toDate: to } : undefined;

  const gst = trpc.reports.gstAbstract.useQuery(range);
  const tds = trpc.reports.tdsAbstract.useQuery(range);

  function onRange(dates: Date[]) {
    if (dates.length === 2 && dates[0] && dates[1]) {
      setFrom(dates[0].toISOString().slice(0, 10));
      setTo(dates[1].toISOString().slice(0, 10));
    } else {
      setFrom(undefined);
      setTo(undefined);
    }
  }

  return (
    <Stack gap={6}>
      <div>
        <h2>Filing abstracts</h2>
        <p style={{ color: "#6f6f6f" }}>
          GST output tax (GSTR-1 / GSTR-3B) and TDS deducted u/s 194J, aggregated by month from issued and
          paid invoices. Default period is the current financial year.
        </p>
      </div>

      <DatePicker datePickerType="range" dateFormat="Y-m-d" onChange={onRange}>
        <DatePickerInput id="filing-from" labelText="From" placeholder="YYYY-MM-DD" size="md" />
        <DatePickerInput id="filing-to" labelText="To" placeholder="YYYY-MM-DD" size="md" />
      </DatePicker>

      <Tabs>
        <TabList aria-label="Filing abstracts">
          <Tab>GST abstract</Tab>
          <Tab>TDS abstract</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            {gst.data && (
              <Stack gap={4}>
                <p style={{ color: "#6f6f6f" }}>
                  Period {gst.data.from} → {gst.data.to}
                </p>
                <TableContainer title="GST output tax by month" description="Taxable value and output GST">
                  <Table size="lg">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Period</TableHeader>
                        <TableHeader>Invoices</TableHeader>
                        <TableHeader>Taxable</TableHeader>
                        <TableHeader>CGST</TableHeader>
                        <TableHeader>SGST</TableHeader>
                        <TableHeader>IGST</TableHeader>
                        <TableHeader>Output GST</TableHeader>
                        <TableHeader>Invoice total</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gst.data.periods.map((r) => (
                        <TableRow key={r.period}>
                          <TableCell>{periodLabel(r.period)}</TableCell>
                          <TableCell>{r.count}</TableCell>
                          <TableCell>{formatINR(r.taxablePaise)}</TableCell>
                          <TableCell>{formatINR(r.cgstPaise)}</TableCell>
                          <TableCell>{formatINR(r.sgstPaise)}</TableCell>
                          <TableCell>{formatINR(r.igstPaise)}</TableCell>
                          <TableCell>{formatINR(r.gstTotalPaise)}</TableCell>
                          <TableCell>{formatINR(r.invoiceTotalPaise)}</TableCell>
                        </TableRow>
                      ))}
                      {gst.data.periods.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8}>No invoices in this period.</TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell>
                          <strong>Total</strong>
                        </TableCell>
                        <TableCell>
                          <strong>{gst.data.totals.count}</strong>
                        </TableCell>
                        <TableCell>
                          <strong>{formatINR(gst.data.totals.taxablePaise)}</strong>
                        </TableCell>
                        <TableCell>
                          <strong>{formatINR(gst.data.totals.cgstPaise)}</strong>
                        </TableCell>
                        <TableCell>
                          <strong>{formatINR(gst.data.totals.sgstPaise)}</strong>
                        </TableCell>
                        <TableCell>
                          <strong>{formatINR(gst.data.totals.igstPaise)}</strong>
                        </TableCell>
                        <TableCell>
                          <strong>{formatINR(gst.data.totals.gstTotalPaise)}</strong>
                        </TableCell>
                        <TableCell>
                          <strong>{formatINR(gst.data.totals.invoiceTotalPaise)}</strong>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                {gst.data.totals.compositionLevyPaise > 0 && (
                  <Tile>
                    Composition levy payable: <strong>{formatINR(gst.data.totals.compositionLevyPaise)}</strong>
                  </Tile>
                )}
              </Stack>
            )}
          </TabPanel>

          <TabPanel>
            {tds.data && (
              <Stack gap={4}>
                <p style={{ color: "#6f6f6f" }}>
                  Period {tds.data.from} → {tds.data.to} · TDS deducted by clients on professional fees (u/s
                  194J).
                </p>
                <TableContainer title="TDS deducted by month" description="For 26AS / TDS-credit reconciliation">
                  <Table size="lg">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Period</TableHeader>
                        <TableHeader>Invoices</TableHeader>
                        <TableHeader>Gross fees</TableHeader>
                        <TableHeader>TDS deducted</TableHeader>
                        <TableHeader>Net received</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tds.data.periods.map((r) => (
                        <TableRow key={r.period}>
                          <TableCell>{periodLabel(r.period)}</TableCell>
                          <TableCell>{r.count}</TableCell>
                          <TableCell>{formatINR(r.grossPaise)}</TableCell>
                          <TableCell>{formatINR(r.tdsPaise)}</TableCell>
                          <TableCell>{formatINR(r.netReceivablePaise)}</TableCell>
                        </TableRow>
                      ))}
                      {tds.data.periods.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5}>No TDS deducted in this period.</TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell>
                          <strong>Total</strong>
                        </TableCell>
                        <TableCell>
                          <strong>{tds.data.totals.count}</strong>
                        </TableCell>
                        <TableCell>
                          <strong>{formatINR(tds.data.totals.grossPaise)}</strong>
                        </TableCell>
                        <TableCell>
                          <strong>{formatINR(tds.data.totals.tdsPaise)}</strong>
                        </TableCell>
                        <TableCell>
                          <strong>{formatINR(tds.data.totals.netReceivablePaise)}</strong>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
