import { ArrowRight } from "@carbon/icons-react";
import { Button, Form, InlineNotification, Stack, TextInput, Theme, Tile } from "@carbon/react";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

/**
 * Forced first-login password rotation. Preloaded/community accounts ship with a
 * default password and `mustChangePassword`; the backend blocks every mutation
 * until it's cleared, and App renders this gate instead of the workspace until
 * the account sets its own password.
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
    <Theme theme="g100">
      <main className="esti-login-shell">
        <div className="esti-login-panel">
          <Tile>
            <Stack gap={6}>
              <Stack gap={2}>
                <h2>Set a new password</h2>
                <p className="esti-label esti-label--secondary">
                  This account was preloaded with a default password. Choose your own before
                  continuing — it can&apos;t be skipped.
                </p>
              </Stack>
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canSubmit && !change.isPending) {
                    change.mutate({ currentPassword: current, newPassword: next });
                  }
                }}
              >
                <Stack gap={5}>
                  <TextInput
                    id="fpc-current"
                    type="password"
                    labelText="Current (default) password"
                    autoComplete="current-password"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    required
                  />
                  <TextInput
                    id="fpc-new"
                    type="password"
                    labelText="New password"
                    helperText="At least 8 characters."
                    autoComplete="new-password"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    invalid={tooShort}
                    invalidText="At least 8 characters."
                    required
                  />
                  <TextInput
                    id="fpc-confirm"
                    type="password"
                    labelText="Confirm new password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    invalid={mismatch}
                    invalidText="Passwords do not match."
                    required
                  />
                  {change.error && (
                    <InlineNotification
                      kind="error"
                      lowContrast
                      hideCloseButton
                      title="Could not update password"
                      subtitle={change.error.message}
                    />
                  )}
                  <Button
                    type="submit"
                    size="lg"
                    renderIcon={ArrowRight}
                    disabled={change.isPending || !canSubmit}
                  >
                    {change.isPending ? "Saving…" : "Set password & continue"}
                  </Button>
                </Stack>
              </Form>
            </Stack>
          </Tile>
        </div>
      </main>
    </Theme>
  );
}
