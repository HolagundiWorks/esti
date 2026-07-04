import { ArrowRight } from "@carbon/icons-react";
import { Button, Form, InlineNotification, Stack, Tag, TextInput, Theme, Tile } from "@carbon/react";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

/**
 * Offline account recovery (Community edition): reset the password with the
 * one-time backup code printed at first run — the only recovery path when there
 * is no email/online. On success a fresh backup code is shown once.
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
    <Theme theme="g100">
      <main className="esti-login-shell">
        <div className="esti-login-panel">
          <Tile>
            <Stack gap={6}>
              <Stack gap={2}>
                <h2>Recover with backup code</h2>
                <p className="esti-label esti-label--secondary">
                  Enter the one-time backup code from your first run and choose a new password.
                </p>
              </Stack>

              {newCode ? (
                <Stack gap={4}>
                  <InlineNotification
                    kind="success"
                    lowContrast
                    hideCloseButton
                    title="Password reset"
                    subtitle="Save your new backup code below — the old one no longer works."
                  />
                  <Stack gap={1}>
                    <span className="esti-label esti-label--secondary">New backup code</span>
                    <Tag type="cool-gray" size="md">
                      {newCode}
                    </Tag>
                  </Stack>
                  <Button renderIcon={ArrowRight} onClick={() => navigate("/login", { replace: true })}>
                    Continue to sign in
                  </Button>
                </Stack>
              ) : (
                <Form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (canSubmit && !recover.isPending) recover.mutate({ code: code.trim(), newPassword: next });
                  }}
                >
                  <Stack gap={5}>
                    <TextInput
                      id="rec-code"
                      labelText="Backup code"
                      placeholder="XXXX-XXXX-XXXX"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                    />
                    <TextInput
                      id="rec-pass"
                      type="password"
                      labelText="New password"
                      helperText="At least 8 characters."
                      autoComplete="new-password"
                      value={next}
                      onChange={(e) => setNext(e.target.value)}
                      required
                    />
                    {recover.error && (
                      <InlineNotification
                        kind="error"
                        lowContrast
                        hideCloseButton
                        title="Recovery failed"
                        subtitle={recover.error.message}
                      />
                    )}
                    <Button
                      type="submit"
                      renderIcon={ArrowRight}
                      disabled={recover.isPending || !canSubmit}
                    >
                      {recover.isPending ? "Resetting…" : "Reset password"}
                    </Button>
                  </Stack>
                </Form>
              )}

              <Button as={RouterLink} to="/login" kind="ghost" size="sm">
                Back to sign in
              </Button>
            </Stack>
          </Tile>
        </div>
      </main>
    </Theme>
  );
}
