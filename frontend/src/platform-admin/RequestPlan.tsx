import { useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { type PlanRequest, fetchMyRequest, requestPlan } from "./lib/auth";

const PLANS = [
  { code: "LITE", label: "Community — free forever" },
  { code: "PRO", label: "Pro" },
];

const STATUS_TAG: Record<string, "teal" | "green" | "red"> = {
  PENDING: "teal",
  FULFILLED: "green",
  REJECTED: "red",
};

function TagChip({ color, label }: { color: string; label: string }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor: `var(--cds-tag-background-${color})`,
        color: `var(--cds-tag-color-${color})`,
      }}
    />
  );
}

/** Sign-up → request a plan; an admin fulfils it and emails the licence. */
export default function RequestPlan() {
  const [req, setReq] = useState<PlanRequest | null>(null);
  const [plan, setPlan] = useState("LITE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchMyRequest().then(setReq);
  }, []);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await requestPlan(plan);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not send the request.");
      return;
    }
    setReq(res.request ?? (await fetchMyRequest()));
  }

  const pending = req?.status === "PENDING";
  const fulfilled = req?.status === "FULFILLED";

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1" component="h3" className="esti-label">
          Request a workspace
        </Typography>

        {fulfilled ? (
          <Alert severity="success">
            <AlertTitle>Approved</AlertTitle>
            {`Your ${req?.planCode} licence has been emailed to you. Check your inbox and activate it in your AORMS install.`}
          </Alert>
        ) : pending ? (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="body2">Request received —</Typography>
              <TagChip color={STATUS_TAG[req!.status] ?? "teal"} label={`${req!.planCode} · pending`} />
            </Stack>
            <Typography variant="body2" className="esti-label esti-label--secondary">
              An admin will review it and email your access link. You can change the tier below.
            </Typography>
          </Stack>
        ) : (
          <Typography variant="body2">
            Choose a plan and request access — we&apos;ll email your licence once approved.
          </Typography>
        )}

        {!fulfilled && (
          <>
            <FormControl>
              <FormLabel id="plan-label">Plan</FormLabel>
              <RadioGroup
                aria-labelledby="plan-label"
                name="plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              >
                {PLANS.map((p) => (
                  <FormControlLabel
                    key={p.code}
                    value={p.code}
                    control={<Radio />}
                    label={p.label}
                  />
                ))}
              </RadioGroup>
            </FormControl>
            <Box>
              <Button variant="contained" disabled={busy} onClick={submit}>
                {pending ? "Update request" : "Request access"}
              </Button>
            </Box>
          </>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
