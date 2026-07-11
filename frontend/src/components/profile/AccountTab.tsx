import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
} from "@mui/material";
import { Suspense, lazy, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import { fetchMe, login, logout, type Me } from "../../platform-admin/lib/auth.js";
import { AccountProfilePanel } from "../../platform-admin/AccountProfilePanel.js";
import { StatusDot } from "../StatusTag.js";
import { UpgradeToPro } from "./UpgradeToPro.js";
import { AORMS_PORTALS } from "../../lib/product-nomenclature.js";

const Companies = lazy(() => import("../../platform-admin/Companies.js"));
const Credentials = lazy(() => import("../../platform-admin/Credentials.js"));
const RequestPlan = lazy(() => import("../../platform-admin/RequestPlan.js"));
const Security = lazy(() => import("../../platform-admin/Security.js"));

/**
 * The AORMS licence/account (hlp_account — plan, companies, security,
 * credentials) managed from inside the workspace instead of a separate
 * /login destination. It rides its own session (hlp_session cookie),
 * distinct from the workspace login, so sign in once here to link it for
 * this browser.
 */
export function AccountTab() {
  const [me, setMe] = useState<Me | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMe().then((m) => {
      setMe(m);
      setChecking(false);
    });
  }, []);

  async function refresh() {
    setMe(await fetchMe());
  }

  async function handleSignOut() {
    await logout();
    setMe(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await login(email, password, undefined, needCode ? code : undefined);
    setBusy(false);
    if (res.error === "totp_required") {
      setNeedCode(true);
      return;
    }
    if (res.error) {
      setError(
        res.error === "totp_invalid"
          ? "That authenticator code is incorrect."
          : res.error === "account_suspended"
            ? "This account has been suspended. Contact support to reactivate."
            : "Email or password is incorrect.",
      );
      return;
    }
    await refresh();
  }

  if (checking) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <CircularProgress size={16} />
        <span>Loading</span>
      </Stack>
    );
  }

  if (!me?.account) {
    return (
      <Stack spacing={2}>
        <UpgradeToPro />
        <Box className="esti-fill" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <p>
              Sign in to your {AORMS_PORTALS.account.name} to manage your standard licence, linked
              companies, security and credentials from here.
            </p>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  id="account-email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  id="account-password"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                />
                {needCode && (
                  <TextField
                    id="account-code"
                    label="Authenticator code"
                    placeholder="123456"
                    helperText="6-digit code from your authenticator app."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    slotProps={{
                      htmlInput: { inputMode: "numeric", autoComplete: "one-time-code" },
                    }}
                    fullWidth
                  />
                )}
                {error && (
                  <Alert severity="error">Sign-in failed — {error}</Alert>
                )}
                <Stack direction="row">
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={busy || (needCode && code.length < 6)}
                  >
                    {busy ? "Signing in..." : needCode ? "Verify" : "Sign in"}
                  </Button>
                </Stack>
              </Stack>
            </Box>
            <p className="esti-label esti-label--secondary">
              Don&apos;t have an account? <RouterLink to="/account?mode=create">Create one</RouterLink>.
            </p>
          </Stack>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <UpgradeToPro />
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <span className="esti-grow">{me.account.email}</span>
        {me.account.publicId && (
          <StatusDot color="cool-gray" label={me.account.publicId} />
        )}
        <Button variant="text" size="small" onClick={handleSignOut}>
          Sign out
        </Button>
      </Stack>
      <Suspense
        fallback={
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <CircularProgress size={16} />
            <span>Loading</span>
          </Stack>
        }
      >
        <AccountProfilePanel account={me.account} onSaved={refresh} />
        <RequestPlan />
        <Companies me={me} onChange={setMe} />
        <Security me={me} onChange={refresh} />
        <Credentials />
      </Suspense>
    </Stack>
  );
}
