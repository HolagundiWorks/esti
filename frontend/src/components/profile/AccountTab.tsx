import {
  Button,
  Form,
  InlineNotification,
  Loading,
  Stack,
  Tag,
  TextInput,
  Tile,
} from "@carbon/react";
import { Suspense, lazy, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import { fetchMe, login, logout, type Me } from "../../platform-admin/lib/auth.js";
import { useEdition } from "../../lib/edition.js";
import { UpgradeToPro } from "./UpgradeToPro.js";

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
  const { community } = useEdition();
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
          : "Email or password is incorrect.",
      );
      return;
    }
    await refresh();
  }

  // Community edition has no online account — show only the offline upgrade path.
  if (community) return <UpgradeToPro />;

  if (checking) return <Loading withOverlay={false} description="Loading" />;

  if (!me?.account) {
    return (
      <Stack gap={5}>
        <UpgradeToPro />
        <Tile className="esti-fill">
          <Stack gap={5}>
            <p>
              Sign in to your AORMS account to manage your plan, companies, security and
              credentials from here.
            </p>
          <Form onSubmit={handleSubmit}>
            <Stack gap={5}>
              <TextInput
                id="account-email"
                labelText="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <TextInput
                id="account-password"
                labelText="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {needCode && (
                <TextInput
                  id="account-code"
                  labelText="Authenticator code"
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  helperText="6-digit code from your authenticator app."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              )}
              {error && (
                <InlineNotification
                  kind="error"
                  title="Sign-in failed"
                  subtitle={error}
                  hideCloseButton
                  lowContrast
                />
              )}
              <Button type="submit" disabled={busy || (needCode && code.length < 6)}>
                {busy ? "Signing in..." : needCode ? "Verify" : "Sign in"}
              </Button>
            </Stack>
          </Form>
            <p className="esti-label esti-label--secondary">
              Don&apos;t have an account? <RouterLink to="/account?mode=create">Create one</RouterLink>.
            </p>
          </Stack>
        </Tile>
      </Stack>
    );
  }

  return (
    <Stack gap={5}>
      <UpgradeToPro />
      <Stack gap={3} orientation="horizontal">
        <span className="esti-grow">{me.account.email}</span>
        {me.account.publicId && (
          <Tag type="cool-gray" size="md">
            {me.account.publicId}
          </Tag>
        )}
        <Button kind="ghost" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </Stack>
      <Suspense fallback={<Loading withOverlay={false} description="Loading" />}>
        <RequestPlan />
        <Companies me={me} onChange={setMe} />
        <Security me={me} onChange={refresh} />
        <Credentials />
      </Suspense>
    </Stack>
  );
}
