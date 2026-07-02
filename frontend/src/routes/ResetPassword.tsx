import { ArrowLeft } from "@carbon/icons-react";
import { Button, Form, InlineNotification, Stack, TextInput, Tile } from "@carbon/react";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

/** Set a new workspace password from a reset link (esti_user). */
export function ResetPassword() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const reset = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setTimeout(() => navigate("/login", { replace: true }), 2000),
  });

  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <main className="esti-login-shell">
      <Stack gap={5} className="esti-login-panel">
        <Tile>
          <Stack gap={5}>
            <h3>Choose a new password</h3>

            {!token ? (
              <InlineNotification
                kind="error"
                title="Missing reset token"
                subtitle="Open the link from your reset email again."
                hideCloseButton
                lowContrast
              />
            ) : reset.isSuccess ? (
              <InlineNotification
                kind="success"
                title="Password updated"
                subtitle="You can now sign in with your new password. Redirecting…"
                hideCloseButton
                lowContrast
              />
            ) : (
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!mismatch) reset.mutate({ token, password });
                }}
              >
                <Stack gap={5}>
                  <TextInput
                    id="password"
                    labelText="New password"
                    type="password"
                    autoComplete="new-password"
                    helperText="At least 8 characters."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <TextInput
                    id="confirm"
                    labelText="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    invalid={mismatch}
                    invalidText="Passwords don't match."
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  {reset.error && (
                    <InlineNotification
                      kind="error"
                      title="Couldn't reset password"
                      subtitle={reset.error.message}
                      hideCloseButton
                      lowContrast
                    />
                  )}
                  <Button type="submit" disabled={reset.isPending || password.length < 8 || mismatch}>
                    {reset.isPending ? "Updating..." : "Set new password"}
                  </Button>
                </Stack>
              </Form>
            )}

            <Button as={RouterLink} to="/login" kind="ghost" size="sm" renderIcon={ArrowLeft}>
              Back to sign in
            </Button>
          </Stack>
        </Tile>
      </Stack>
    </main>
  );
}
