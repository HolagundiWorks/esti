import { ArrowLeft } from "@carbon/icons-react";
import {
  Button,
  Form,
  InlineNotification,
  Stack,
  TextInput,
  Tile,
} from "@carbon/react";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { setDesktopToken } from "../lib/api-base.js";
import { trpc } from "../lib/trpc.js";

/**
 * External-party access page (/access).
 * For EX_USER logins: clients, contractors, consultants, and site supervisors.
 * Intentionally minimal — no workspace resolution step, no account portal toggle.
 * Internal staff (IN_USER) use /login instead.
 */
export function ExternalLogin() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);

  const login = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      setDesktopToken((data as { token?: string }).token);
      await utils.auth.me.invalidate();
      navigate("/", { replace: true });
    },
    onError: (err) => {
      if (err.message === "totp_required") setNeedCode(true);
    },
  });

  const errorText =
    login.error?.message === "totp_invalid"
      ? "That code is incorrect — try the current 6-digit code."
      : login.error?.message;
  const showError = Boolean(login.error) && login.error?.message !== "totp_required";

  return (
    <main className="esti-login-shell">
      <Stack gap={5} className="esti-login-panel">
        <Tile>
          <Stack gap={5}>
            <Stack gap={3}>
              <div className="esti-login-brand">
                <span className="esti-login-mark">
                  <img src="/esti-logo.png" alt="" />
                </span>
                <h3>Portal access</h3>
              </div>
              <p>
                Sign in to your client, contractor, or collaborator portal.
                If you are an office team member, use{" "}
                <RouterLink to="/login">workspace login</RouterLink>.
              </p>
            </Stack>

            <Form
              onSubmit={(e) => {
                e.preventDefault();
                login.mutate({ email, password, code: needCode ? code : undefined });
              }}
            >
              <Stack gap={5}>
                <TextInput
                  id="access-email"
                  labelText="Email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <TextInput
                  id="access-password"
                  labelText="Password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {needCode && (
                  <TextInput
                    id="access-totp"
                    labelText="Authenticator code"
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    helperText="6-digit code from your authenticator app."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                )}
                {showError && (
                  <InlineNotification
                    kind="error"
                    title="Access denied"
                    subtitle={errorText}
                    hideCloseButton
                    lowContrast
                  />
                )}
                <Button
                  type="submit"
                  disabled={login.isPending || (needCode && code.length < 6)}
                >
                  {login.isPending ? "Signing in…" : needCode ? "Verify" : "Sign in"}
                </Button>
              </Stack>
            </Form>

            <Button
              as={RouterLink}
              to="/"
              kind="ghost"
              size="sm"
              renderIcon={ArrowLeft}
            >
              Back to home
            </Button>
          </Stack>
        </Tile>
      </Stack>
    </main>
  );
}
