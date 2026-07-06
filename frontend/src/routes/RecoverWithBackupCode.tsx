import ArrowForward from "@mui/icons-material/ArrowForward";
import { Alert, AlertTitle, Button, Chip, Paper, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

/**
 * Offline account recovery (Community edition): reset the password with the
 * one-time backup code printed at first run — the only recovery path when there
 * is no email/online. On success a fresh backup code is shown once. Material UI.
 */
export function RecoverWithBackupCode() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [newCode, setNewCode] = useState<string | null>(null);

  const recover = trpc.auth.recoverWithBackupCode.useMutation({
    onSuccess: (r) => setNewCode(r.backupCode),
  });

  const canSubmit = code.trim().length > 0 && next.length >= 8;

  return (
    <div className="cds--g100">
      <main className="esti-login-shell">
        <div className="esti-login-panel">
          <Paper sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Stack spacing={1}>
                <h2>Recover with backup code</h2>
                <p className="esti-label esti-label--secondary">
                  Enter the one-time backup code from your first run and choose a new password.
                </p>
              </Stack>

              {newCode ? (
                <Stack spacing={2}>
                  <Alert severity="success">
                    <AlertTitle>Password reset</AlertTitle>
                    Save your new backup code below — the old one no longer works.
                  </Alert>
                  <Stack spacing={0.5}>
                    <span className="esti-label esti-label--secondary">New backup code</span>
                    <Stack direction="row">
                      <Chip
                        label={newCode}
                        size="medium"
                        sx={{
                          backgroundColor: "var(--cds-tag-background-cool-gray)",
                          color: "var(--cds-tag-color-cool-gray)",
                        }}
                      />
                    </Stack>
                  </Stack>
                  <Button
                    variant="contained"
                    endIcon={<ArrowForward />}
                    onClick={() => navigate("/login", { replace: true })}
                  >
                    Continue to sign in
                  </Button>
                </Stack>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (canSubmit && !recover.isPending) recover.mutate({ code: code.trim(), newPassword: next });
                  }}
                >
                  <Stack spacing={2}>
                    <TextField
                      id="rec-code"
                      label="Backup code"
                      placeholder="XXXX-XXXX-XXXX"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      fullWidth
                    />
                    <TextField
                      id="rec-pass"
                      type="password"
                      label="New password"
                      helperText="At least 8 characters."
                      autoComplete="new-password"
                      value={next}
                      onChange={(e) => setNext(e.target.value)}
                      required
                      fullWidth
                    />
                    {recover.error && (
                      <Alert severity="error">
                        <AlertTitle>Recovery failed</AlertTitle>
                        {recover.error.message}
                      </Alert>
                    )}
                    <Button
                      type="submit"
                      variant="contained"
                      endIcon={<ArrowForward />}
                      disabled={recover.isPending || !canSubmit}
                    >
                      {recover.isPending ? "Resetting…" : "Reset password"}
                    </Button>
                  </Stack>
                </form>
              )}

              <Button component={RouterLink} to="/login" variant="text" size="small">
                Back to sign in
              </Button>
            </Stack>
          </Paper>
        </div>
      </main>
    </div>
  );
}
