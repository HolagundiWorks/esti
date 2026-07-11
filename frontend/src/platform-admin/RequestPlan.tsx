import { Alert, AlertTitle, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { type PlanRequest, fetchMyRequest } from "./lib/auth";
import { AORMS_PORTALS, AORMS_STUDIO } from "../lib/product-nomenclature.js";

/** Licence status for the linked platform account — one standard product. */
export default function RequestPlan() {
  const [req, setReq] = useState<PlanRequest | null>(null);

  useEffect(() => {
    void fetchMyRequest().then(setReq);
  }, []);

  const fulfilled = req?.status === "FULFILLED";
  const pending = req?.status === "PENDING";

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1" component="h3" className="esti-label">
          Your licence
        </Typography>

        {fulfilled ? (
          <Alert severity="success">
            <AlertTitle>Active</AlertTitle>
            Your standard AORMS licence is linked to this account. Manage activation in
            Company → Licence if you received a new key.
          </Alert>
        ) : pending ? (
          <Alert severity="info">
            <AlertTitle>Request pending</AlertTitle>
            We are processing your workspace request and will email access details shortly.
          </Alert>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Every {AORMS_PORTALS.account.name} uses the same standard licence — {AORMS_STUDIO.title}, 5 GB
            included, unlimited users. Create a firm at{" "}
            <a href="/account?mode=create">/account?mode=create</a> or write to{" "}
            <a href="mailto:hi@aorms.in">hi@aorms.in</a> for billing questions.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
