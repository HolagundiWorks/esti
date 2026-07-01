import { ArrowLeft } from "@carbon/icons-react";
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
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { setDesktopToken } from "../lib/api-base.js";
import { trpc } from "../lib/trpc.js";
import { fetchMe, logout, type Me } from "../platform-admin/lib/auth.js";

// The merged account-portal pieces (registration, plan requests, companies,
// 2FA, credentials) are heavier Carbon UI that most /login visits never touch
// (a plain workspace sign-in) — code-split so the default sign-in stays light.
const Companies = lazy(() => import("../platform-admin/Companies.js"));
const Credentials = lazy(() => import("../platform-admin/Credentials.js"));
const PlatformLogin = lazy(() => import("../platform-admin/Login.js"));
const RequestPlan = lazy(() => import("../platform-admin/RequestPlan.js"));
const Security = lazy(() => import("../platform-admin/Security.js"));

// Public marketing build: this page also hosts the merged customer account
// portal — create an account / request a plan — as a "Create account" flow,
// backed by the central licensing platform (hlp_account). There is no separate
// /account URL; only /platform-admin (the licence/admin console) stays distinct.
// A private/self-hosted firm install has no such platform to reach, so it keeps
// the plain first-run /signup bootstrap instead.
const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE !== "false";

export function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  // --- Firm workspace sign-in (esti_user) — unchanged ---
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

  // --- Merged customer account portal (hlp_account) — public-site builds only ---
  const wantsCreate =
    PUBLIC_SITE && new URLSearchParams(window.location.search).get("mode") === "create";
  const [showPlatform, setShowPlatform] = useState(wantsCreate);
  const [platformMe, setPlatformMe] = useState<Me | null>(null);
  const [checkingPlatform, setCheckingPlatform] = useState(PUBLIC_SITE);

  useEffect(() => {
    if (!PUBLIC_SITE) return;
    fetchMe().then((m) => {
      setPlatformMe(m);
      setCheckingPlatform(false);
    });
  }, []);

  async function refreshPlatformMe() {
    setPlatformMe(await fetchMe());
  }

  async function handlePlatformSignOut() {
    await logout();
    setPlatformMe(null);
    setShowPlatform(false);
  }

  if (PUBLIC_SITE && checkingPlatform) {
    return (
      <main style={{ padding: "var(--cds-spacing-06)" }}>
        <Loading withOverlay={false} description="Loading" />
      </main>
    );
  }

  // A signed-in platform (licence/account) session with no firm session yet —
  // show the account dashboard instead of any sign-in form.
  if (PUBLIC_SITE && platformMe?.account) {
    const account = platformMe.account;
    return (
      <main style={{ padding: "var(--cds-spacing-06)" }}>
        <Stack gap={6}>
          <Stack gap={3} orientation="horizontal">
            <h1 className="esti-grow">AORMS Account</h1>
            <span>{account.email}</span>
            {account.publicId && (
              <Tag type="cool-gray" size="md">
                {account.publicId}
              </Tag>
            )}
            <Button as={RouterLink} to="/" kind="ghost" size="sm">
              Home
            </Button>
            <Button kind="ghost" size="sm" onClick={handlePlatformSignOut}>
              Sign out
            </Button>
          </Stack>

          <Suspense fallback={<Loading withOverlay={false} description="Loading" />}>
            <RequestPlan />
            <Companies me={platformMe} onChange={setPlatformMe} />
            <Security me={platformMe} onChange={refreshPlatformMe} />
            <Credentials />
          </Suspense>
        </Stack>
      </main>
    );
  }

  // Create-account / platform sign-in — a full self-contained view (its own
  // page shell), reached via the "Create account" button or a ?mode=create link.
  if (PUBLIC_SITE && showPlatform) {
    return (
      <Suspense fallback={<Loading withOverlay description="Loading" />}>
        <PlatformLogin portal onLogin={setPlatformMe} onBack={() => setShowPlatform(false)} />
      </Suspense>
    );
  }

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
                <h3>ESTI AORMS</h3>
              </div>
              <p>Architectural Office Resource Management System</p>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <TextInput
                  id="password"
                  labelText="Password"
                  type="password"
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
                {PUBLIC_SITE ? (
                  <Button type="button" kind="tertiary" onClick={() => setShowPlatform(true)}>
                    Create account
                  </Button>
                ) : (
                  <Button as={RouterLink} to="/signup" kind="tertiary">
                    Create account
                  </Button>
                )}
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
