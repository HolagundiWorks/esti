import { Box, Chip, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { formatINR, type PeriodFilterInput } from "@esti/contracts";
import { PeriodFilter } from "../PeriodFilter.js";
import { trpc } from "../../lib/trpc.js";

const chipSx = (c: string) => ({
  backgroundColor: `var(--cds-tag-background-${c})`,
  color: `var(--cds-tag-color-${c})`,
});

/**
 * The financial-year bar for the accounts section: an FY period selector plus a
 * "carried forward" band that a financial year must never hide — running
 * projects (they span years) and receivables from projects closed in prior
 * years (money still owed). Both come from `accounts.carryForward`, which is
 * deliberately NOT scoped to the selected FY. Material UI.
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
    <Stack spacing={2}>
      <PeriodFilter value={period} onChange={onPeriodChange} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box className="esti-fill" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Chip size="small" label="Carried forward" sx={chipSx("teal")} />
                <span className="esti-label--secondary">Running projects</span>
              </Stack>
              <p className="esti-label">
                {cf ? `${cf.runningCount} active / on-hold` : "—"}
              </p>
              <p className="esti-label--helper">
                Contract value in play: {cf ? formatINR(cf.runningContractPaise) : "—"}
              </p>
            </Stack>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box className="esti-fill" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Chip size="small" label="Carried forward" sx={chipSx("magenta")} />
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
          </Box>
        </Grid>
      </Grid>

      {cf && cf.priorReceivables.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">
            Receivables from closed projects (previous years)
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Invoice</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Dated</TableCell>
                <TableCell>Outstanding</TableCell>
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
        </Stack>
      )}
    </Stack>
  );
}
