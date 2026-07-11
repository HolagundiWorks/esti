import ArrowBack from "@mui/icons-material/ArrowBack";
import { Alert, AlertTitle, Button, Link, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";
import { AuthBrandBlock } from "../components/AormsLogo.js";
import { AuthRailLayout } from "../components/AuthRailLayout.js";
import { setDesktopToken } from "../lib/api-base.js";
import { trpc } from "../lib/trpc.js";

/**
 * External-party access page (/access).
 * For EX_USER logins: clients, contractors, consultants, and site supervisors.
 * Intentionally minimal — no workspace resolution step, no account portal toggle.
 * Internal staff (IN_USER) use /login instead. Material UI.
 */
export function ExternalLogin() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);

  const login = trpc.auth.login.useMutation({
    meta: { errorTitle: "Couldn't sign in" },
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
    <AuthRailLayout
      variant="external"
      rail={
        <Stack spacing={2}>
          <Stack spacing={1}>
            <AuthBrandBlock tagline={AORMS_PORTALS.external.authTagline} />
            <p>
              {AORMS_PORTALS.external.signInIntro}
              If you are an office team member, use{" "}
              <Link component={RouterLink} to="/login">
                {AORMS_PORTALS.studio.signInTitle}
              </Link>
              .
            </p>
          </Stack>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              login.mutate({ email, password, code: needCode ? code : undefined });
            }}
          >
            <Stack spacing={2}>
              <TextField
                id="access-email"
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />
              <TextField
                id="access-password"
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
              />
              {needCode && (
                <TextField
                  id="access-totp"
                  label="Authenticator code"
                  placeholder="123456"
                  autoComplete="one-time-code"
                  helperText="6-digit code from your authenticator app."
                  slotProps={{ htmlInput: { inputMode: "numeric" } }}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  fullWidth
                />
              )}
              {showError && (
                <Alert severity="error">
                  <AlertTitle>Access denied</AlertTitle>
                  {errorText}
                </Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={login.isPending || (needCode && code.length < 6)}
              >
                {login.isPending ? "Signing in…" : needCode ? "Verify" : "Sign in"}
              </Button>
            </Stack>
          </form>

          <Button
            component={RouterLink}
            to="/"
            variant="text"
            size="small"
            startIcon={<ArrowBack />}
          >
            Back to home
          </Button>
        </Stack>
      }
    />
  );
}
