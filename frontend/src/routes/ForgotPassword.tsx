import { ArrowLeft } from "@carbon/icons-react";
import { Button, Form, InlineNotification, Stack, TextInput, Tile } from "@carbon/react";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

/** Request a workspace password-reset link (esti_user). */
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const request = trpc.auth.requestPasswordReset.useMutation();

  return (
    <main className="esti-login-shell">
      <Stack gap={5} className="esti-login-panel">
        <Tile>
          <Stack gap={5}>
            <Stack gap={3}>
              <h3>Reset your password</h3>
              <p>Enter your email and we'll send a reset link if an account exists.</p>
            </Stack>

            {request.isSuccess ? (
              <InlineNotification
                kind="success"
                title="Check your email"
                subtitle="If that email has an account, a reset link is on its way. The link is valid for 1 hour."
                hideCloseButton
                lowContrast
              />
            ) : (
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  request.mutate({ email });
                }}
              >
                <Stack gap={5}>
                  <TextInput
                    id="email"
                    labelText="Email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  {request.error && (
                    <InlineNotification
                      kind="error"
                      title="Something went wrong"
                      subtitle={request.error.message}
                      hideCloseButton
                      lowContrast
                    />
                  )}
                  <Button type="submit" disabled={request.isPending || !email}>
                    {request.isPending ? "Sending..." : "Send reset link"}
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
