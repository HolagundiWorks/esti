import { Box, Stack, Typography } from "@mui/material";
import { formatINR, type PeriodFilterInput } from "@esti/contracts";
import { PeriodFilter } from "../PeriodFilter.js";
import { StatusDot } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

/**
 * Financial-year bar for the accounts rail — period selector plus carried-forward
 * summaries. Layout is single-column for the 20% glass rail (never a 2-col grid).
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
    <Stack spacing={1.5} sx={{ minWidth: 0, width: 1 }}>
      <PeriodFilter layout="rail" value={period} onChange={onPeriodChange} />

      <Box sx={{ py: 1, borderTop: 1, borderBottom: 1, borderColor: "divider" }}>
        <Stack spacing={0.75}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <StatusDot color="teal" label="Running" />
            <Typography variant="caption" color="text.secondary">Running projects</Typography>
          </Stack>
          <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
            {cf ? `${cf.runningCount} active / on-hold` : "—"}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-word" }}>
            Contract value: {cf ? formatINR(cf.runningContractPaise) : "—"}
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Stack spacing={0.75}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <StatusDot color="magenta" label="Receivables" />
            <Typography variant="caption" color="text.secondary">Prior-year receivables</Typography>
          </Stack>
          <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
            {cf ? formatINR(cf.priorReceivablePaise) : "—"}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-word" }}>
            {cf
              ? `${cf.priorReceivableCount} unpaid invoice(s) from closed projects`
              : "—"}
          </Typography>
        </Stack>
      </Box>

      {cf && cf.priorReceivables.length > 0 && (
        <Stack spacing={0.75}>
          <Typography variant="overline" color="text.secondary">
            Prior receivables
          </Typography>
          {cf.priorReceivables.map((r) => (
            <Box
              key={r.id}
              sx={{ py: 0.75, borderBottom: 1, borderColor: "divider", minWidth: 0 }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, wordBreak: "break-word" }}>
                {r.ref}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", wordBreak: "break-word" }}>
                {r.projectTitle}
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                {formatINR(r.netReceivablePaise ?? 0)}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
