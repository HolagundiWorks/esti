import ArrowForward from "@mui/icons-material/ArrowForward";
import { Alert, Button, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { AuthBrandBlock } from "../components/AormsLogo.js";
import { AuthRailLayout } from "../components/AuthRailLayout.js";
import { trpc } from "../lib/trpc.js";

/**
 * Forced first-login password rotation. Preloaded/community accounts ship with a
 * default password and `mustChangePassword`; the backend blocks every mutation
 * until it's cleared, and App renders this gate instead of the workspace until
 * the account sets its own password. Material UI.
 */
export function ForcePasswordChange() {
  const utils = trpc.useUtils();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const change = trpc.users.changePassword.useMutation({
    onSuccess: () => void utils.auth.me.invalidate(),
  });

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = Boolean(current) && next.length >= 8 && next === confirm;

  return (
    <AuthRailLayout
      variant="workspace"
      rail={
        <Stack spacing={3}>
          <Stack spacing={1}>
            <AuthBrandBlock />
            <h2>Set a new password</h2>
            <p className="esti-label esti-label--secondary">
              This account was preloaded with a default password. Choose your own before
              continuing — it can&apos;t be skipped.
            </p>
          </Stack>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit && !change.isPending) {
                change.mutate({ currentPassword: current, newPassword: next });
              }
            }}
          >
            <Stack spacing={2}>
              <TextField
                id="fpc-current"
                type="password"
                label="Current (default) password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                fullWidth
              />
              <TextField
                id="fpc-new"
                type="password"
                label="New password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                error={tooShort}
                helperText="At least 8 characters."
                required
                fullWidth
              />
              <TextField
                id="fpc-confirm"
                type="password"
                label="Confirm new password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                error={mismatch}
                helperText={mismatch ? "Passwords do not match." : undefined}
                required
                fullWidth
              />
              {change.error && (
                <Alert severity="error">{change.error.message}</Alert>
              )}
              <Button
                type="submit"
                size="large"
                variant="contained"
                endIcon={<ArrowForward />}
                disabled={change.isPending || !canSubmit}
              >
                {change.isPending ? "Saving…" : "Set password & continue"}
              </Button>
            </Stack>
          </form>
        </Stack>
      }
    />
  );
}
