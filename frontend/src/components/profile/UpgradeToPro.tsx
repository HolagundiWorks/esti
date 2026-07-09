import Check from "@mui/icons-material/Check";
import { Alert, AlertTitle, Box, Stack, Typography } from "@mui/material";
import { STANDARD_LICENCE_LABEL, type LicenseStatus } from "@esti/contracts";
import { trpc } from "../../lib/trpc.js";
import { StatusDot } from "../StatusTag.js";

const STATUS_TAG: Record<LicenseStatus, "green" | "teal" | "red" | "gray"> = {
  VALID: "green",
  GRACE: "teal",
  EXPIRED: "red",
  UNLICENSED: "gray",
};

const STATUS_LABEL: Record<LicenseStatus, string> = {
  VALID: "Active",
  GRACE: "Grace period",
  EXPIRED: "Expired",
  UNLICENSED: "Not activated",
};

/** Standard AORMS licence summary — one product, no upgrade funnel. */
export function UpgradeToPro() {
  const licenseQ = trpc.license.status.useQuery();
  const view = licenseQ.data;
  if (!view) return null;

  const status = view.status ?? "UNLICENSED";
  const active = status === "VALID" || status === "GRACE";

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {active && <Check fontSize="small" />}
          <Typography variant="h6" component="h3" sx={{ flex: 1 }}>
            {STANDARD_LICENCE_LABEL}
          </Typography>
          <StatusDot color={STATUS_TAG[status]} label={STATUS_LABEL[status]} />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          One standard AORMS licence — full workspace, unlimited users, 5 GB storage
          included. Extra storage and hosted AI are usage-billed; you can add your own
          API key under Company → AI.
        </Typography>
        {status === "GRACE" && view.graceDaysLeft != null && (
          <Alert severity="warning">
            <AlertTitle>Licence in grace period</AlertTitle>
            {`${view.graceDaysLeft} day(s) remaining — renew in Company → Licence.`}
          </Alert>
        )}
        {status === "EXPIRED" && (
          <Alert severity="error">
            <AlertTitle>Licence expired</AlertTitle>
            Activate a current key in Company → Licence to restore writes.
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
