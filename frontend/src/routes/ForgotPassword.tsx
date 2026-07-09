import ArrowBack from "@mui/icons-material/ArrowBack";
import { Alert, Button, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { AuthBrandBlock } from "../components/AormsLogo.js";
import { AuthRailLayout } from "../components/AuthRailLayout.js";
import { trpc } from "../lib/trpc.js";

/** Request a workspace password-reset link (esti_user). Material UI. */
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const request = trpc.auth.requestPasswordReset.useMutation();

  return (
    <AuthRailLayout
      variant="workspace"
      rail={
        <Stack spacing={2}>
          <Stack spacing={1}>
            <AuthBrandBlock />
            <h3>Reset your password</h3>
            <p>Enter your email and we'll send a reset link if an account exists.</p>
          </Stack>

          {request.isSuccess ? (
            <Alert severity="success">
              If that email has an account, a reset link is on its way. The link is
              valid for 1 hour.
            </Alert>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                request.mutate({ email });
              }}
            >
              <Stack spacing={2}>
                <TextField
                  id="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                />
                {request.error && (
                  <Alert severity="error">{request.error.message}</Alert>
                )}
                <Button type="submit" variant="contained" disabled={request.isPending || !email}>
                  {request.isPending ? "Sending..." : "Send reset link"}
                </Button>
              </Stack>
            </form>
          )}

          <Button
            component={RouterLink}
            to="/login"
            variant="text"
            size="small"
            color="inherit"
            startIcon={<ArrowBack />}
          >
            Back to sign in
          </Button>
        </Stack>
      }
    />
  );
}
