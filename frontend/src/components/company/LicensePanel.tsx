import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { STANDARD_LICENCE_LABEL, type LicenseStatus } from "@esti/contracts";
import { useState } from "react";
import { trpc } from "../../lib/trpc.js";
import { StatusDot } from "../StatusTag.js";

const STATUS_TAG: Record<LicenseStatus, "green" | "teal" | "red" | "gray"> = {
  VALID: "green",
  GRACE: "teal",
  EXPIRED: "red",
  UNLICENSED: "gray",
  SUSPENDED: "red",
};

const STATUS_LABEL: Record<LicenseStatus, string> = {
  VALID: "Active",
  GRACE: "Grace period",
  EXPIRED: "Expired",
  UNLICENSED: "Not activated",
  SUSPENDED: "Suspended",
};

const cap = (n: number | null) => (n === null ? "Unlimited" : String(n));
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString() : "—";

/** Firm licence — activation + status. The plan is licence-derived (owner only). */
export function LicensePanel() {
  const utils = trpc.useUtils();
  const q = trpc.license.status.useQuery();
  const [key, setKey] = useState("");

  const activate = trpc.license.activate.useMutation({
    meta: { errorTitle: "Couldn't activate the license" },
    onSuccess: () => {
      setKey("");
      void utils.license.status.invalidate();
      void utils.settings.get.invalidate();
    },
  });
  const refresh = trpc.license.refresh.useMutation({
    meta: { errorTitle: "Couldn't refresh the license" },
    onSuccess: () => void utils.license.status.invalidate(),
  });

  const view = q.data;
  const status = view?.status ?? "UNLICENSED";

  return (
    <Box sx={{ p: 3, maxWidth: 760 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography component="h3" className="esti-label">Licence</Typography>
          {view && <StatusDot color="blue" label={STANDARD_LICENCE_LABEL} />}
          <StatusDot color={STATUS_TAG[status]} label={STATUS_LABEL[status]} />
        </Stack>

        {view && view.status !== "UNLICENSED" && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Stack spacing={1}>
                <Typography component="p" className="esti-label esti-label--secondary">Staff seats</Typography>
                <Typography variant="body2">{cap(view.seats.staff)}</Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Stack spacing={1}>
                <Typography component="p" className="esti-label esti-label--secondary">Accountant seats</Typography>
                <Typography variant="body2">{cap(view.seats.accountants)}</Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Stack spacing={1}>
                <Typography component="p" className="esti-label esti-label--secondary">HR seats</Typography>
                <Typography variant="body2">{cap(view.seats.hrManagers)}</Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Stack spacing={1}>
                <Typography component="p" className="esti-label esti-label--secondary">Valid until</Typography>
                <Typography variant="body2">{fmtDate(view.expiresAt)}</Typography>
              </Stack>
            </Grid>
          </Grid>
        )}

        {status === "GRACE" && view?.graceDaysLeft != null && (
          <Alert severity="warning">
            <AlertTitle>Licence expired — grace period</AlertTitle>
            {`Reconnect to renew. ${view.graceDaysLeft} day(s) of grace remaining before writes are blocked.`}
          </Alert>
        )}
        {status === "EXPIRED" && (
          <Alert severity="error">
            <AlertTitle>Licence expired</AlertTitle>
            Writes are blocked until the licence is renewed. Activate a current key below.
          </Alert>
        )}
        {status === "SUSPENDED" && (
          <Alert severity="error">
            <AlertTitle>Licence suspended</AlertTitle>
            Billing hold — writes are blocked until the operator reinstates the licence.
            Refresh after payment clears, or contact support.
          </Alert>
        )}

        <Stack spacing={1}>
          <TextField
            id="lic-key"
            label="Activation key"
            placeholder="ESTI-XXXX-XXXX-XXXX-XXXX"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            fullWidth
          />
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={() => activate.mutate({ key })}
              disabled={!key.trim() || activate.isPending}
            >
              {activate.isPending ? "Activating…" : "Activate"}
            </Button>
            <Button
              variant="text"
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending || status === "UNLICENSED"}
            >
              {refresh.isPending ? "Refreshing…" : "Refresh now"}
            </Button>
          </Stack>
          {activate.error && (
            <Alert severity="error">
              <AlertTitle>Could not activate</AlertTitle>
              {activate.error.message}
            </Alert>
          )}
        </Stack>

        <Typography component="p" className="esti-label esti-label--helper">
          Standard AORMS licence — billing and storage add-ons are handled by Human
          Centric Works. Keys are issued when you subscribe or renew.
        </Typography>
      </Stack>
    </Box>
  );
}
