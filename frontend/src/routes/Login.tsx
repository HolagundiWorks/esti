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

// On a public-site build (the hub, e.g. aorms.in) the AORMS account + licence
// portal is its own destination at /account — NOT embedded here. This page is
// only ever the firm WORKSPACE sign-in (esti_user): one email + password step,
// one session. A private/self-hosted firm install has no hub to reach, so its
// "Create account" is the first-run /signup bootstrap instead.
const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE !== "false";

export function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);

  const login = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      // Desktop returns a session token (cookies don't cross the loopback origin).
      setDesktopToken((data as { token?: string }).token);
      await utils.auth.me.invalidate();
      navigate("/", { replace: true });
    },
    onError: (err) => {
      // Password accepted — now collect the authenticator code.
      if (err.message === "totp_required") setNeedCode(true);
    },
  });

  const errorText =
    login.error?.message === "totp_invalid"
      ? "That authenticator code is incorrect."
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
                <h3>AORMS</h3>
              </div>
              <p>Sign in to your workspace</p>
            </Stack>

            <Form
              onSubmit={(e) => {
                e.preventDefault();
                login.mutate({ email, password, code: needCode ? code : undefined });
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
                <TextInput
                  id="password"
                  labelText="Password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {needCode && (
                  <TextInput
                    id="totp-code"
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
                    title="Sign-in failed"
                    subtitle={errorText}
                    hideCloseButton
                    lowContrast
                  />
                )}
                <Button type="submit" disabled={login.isPending || (needCode && code.length < 6)}>
                  {login.isPending ? "Signing in..." : needCode ? "Verify" : "Sign in"}
                </Button>
              </Stack>
            </Form>

            <Button as={RouterLink} to="/forgot-password" kind="ghost" size="sm">
              Forgot password?
            </Button>

            <Stack gap={2}>
              {PUBLIC_SITE ? (
                <Button as={RouterLink} to="/account?mode=create" kind="tertiary">
                  Create an AORMS account
                </Button>
              ) : (
                <Button as={RouterLink} to="/signup" kind="tertiary">
                  Create account
                </Button>
              )}
              {PUBLIC_SITE && (
                <Button as={RouterLink} to="/account" kind="ghost" size="sm">
                  Manage your AORMS account & licence →
                </Button>
              )}
              <Button as={RouterLink} to="/access" kind="ghost" size="sm">
                Client / consultant / contractor portal
              </Button>
            </Stack>

            <Button as={RouterLink} to="/" kind="ghost" size="sm" renderIcon={ArrowLeft}>
              Back to home
            </Button>
          </Stack>
        </Tile>
      </Stack>
    </main>
  );
}
