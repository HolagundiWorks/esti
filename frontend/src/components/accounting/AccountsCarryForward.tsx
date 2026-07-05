import {
  Column,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from "@carbon/react";
import { formatINR, type PeriodFilterInput } from "@esti/contracts";
import { PeriodFilter } from "../PeriodFilter.js";
import { trpc } from "../../lib/trpc.js";

/**
 * The financial-year bar for the accounts section: an FY period selector plus a
 * "carried forward" band that a financial year must never hide — running
 * projects (they span years) and receivables from projects closed in prior
 * years (money still owed). Both come from `accounts.carryForward`, which is
 * deliberately NOT scoped to the selected FY.
 */
export function AccountsCarryForward({
  period,
  onPeriodChange,
}: {
  period: PeriodFilterInput;
  onPeriodChange: (next: PeriodFilterInput) => void;
}) {
  const cfQ = trpc.accounts.carryForward.useQuery(period);
  const cf = cfQ.data;

  return (
    <Stack gap={5}>
      <PeriodFilter value={period} onChange={onPeriodChange} />

      <Grid fullWidth>
        <Column lg={8} md={4} sm={4}>
          <Tile className="esti-fill">
            <Stack gap={3}>
              <Stack orientation="horizontal" gap={3}>
                <Tag type="teal" size="sm">
                  Carried forward
                </Tag>
                <span className="esti-label--secondary">Running projects</span>
              </Stack>
              <p className="esti-label">
                {cf ? `${cf.runningCount} active / on-hold` : "—"}
              </p>
              <p className="esti-label--helper">
                Contract value in play: {cf ? formatINR(cf.runningContractPaise) : "—"}
              </p>
            </Stack>
          </Tile>
        </Column>
        <Column lg={8} md={4} sm={4}>
          <Tile className="esti-fill">
            <Stack gap={3}>
              <Stack orientation="horizontal" gap={3}>
                <Tag type="magenta" size="sm">
                  Carried forward
                </Tag>
                <span className="esti-label--secondary">Prior-year receivables</span>
              </Stack>
              <p className="esti-label">
                {cf ? formatINR(cf.priorReceivablePaise) : "—"}
              </p>
              <p className="esti-label--helper">
                {cf
                  ? `${cf.priorReceivableCount} unpaid invoice(s) on projects closed in earlier years`
                  : "—"}
              </p>
            </Stack>
          </Tile>
        </Column>
      </Grid>

      {cf && cf.priorReceivables.length > 0 && (
        <TableContainer title="Receivables from closed projects (previous years)">
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Invoice</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Dated</TableHeader>
                <TableHeader>Outstanding</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {cf.priorReceivables.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.ref}</TableCell>
                  <TableCell>{r.projectTitle}</TableCell>
                  <TableCell>{r.dateInvoice ?? "—"}</TableCell>
                  <TableCell>{formatINR(r.netReceivablePaise ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
