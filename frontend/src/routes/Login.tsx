import { ArrowLeft, ArrowRight } from "@carbon/icons-react";
import {
  Button,
  Form,
  InlineNotification,
  Loading,
  Select,
  SelectItem,
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

// Account/licence signup (hlp_account) is heavier Carbon UI only reached via
// the explicit "Create account" action — code-split so the default sign-in
// (the common case) stays light.
const Companies = lazy(() => import("../platform-admin/Companies.js"));
const Credentials = lazy(() => import("../platform-admin/Credentials.js"));
const PlatformLogin = lazy(() => import("../platform-admin/Login.js"));
const RequestPlan = lazy(() => import("../platform-admin/RequestPlan.js"));
const Security = lazy(() => import("../platform-admin/Security.js"));

// Public marketing build: /login also hosts customer account/licence signup
// ("Create account", backed by hlp_account) as a distinct, explicit flow —
// there is no separate /account URL, only /platform-admin (the licence/admin
// console) stays distinct. A private/self-hosted firm install has no such
// platform to reach, so it keeps the plain first-run /signup bootstrap
// instead. Managing an already-created account (companies, plan, security,
// credentials) is a workspace feature (Profile → Account), not a /login one —
// signing in here always means the firm workspace.
const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE !== "false";

export function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  // ── Two-step login state ──────────────────────────────────────────────────
  // Step 1: email entry + workspace resolution.
  // Step 2: workspace/account picker + password.
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  // "local" = this firm's workspace; "" = account portal (no workspace selected)
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("local");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);

  const resolveEmail = trpc.auth.resolveEmail.useQuery(
    { email },
    { enabled: false },
  );

  async function handleEmailNext(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    const result = await resolveEmail.refetch();
    const ws = result.data?.workspaces ?? [];
    setWorkspaces(ws);
    // Default selection: first workspace if found, else account portal
    setSelectedWorkspace(ws.length > 0 ? ws[0]!.id : "");
    setStep(2);
  }

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
      ? "That authenticator code is incorrect."
      : login.error?.message;
  const showError = Boolean(login.error) && login.error?.message !== "totp_required";


  // --- Merged customer account portal (hlp_account) — public-site builds only ---
  const wantsCreate =
    PUBLIC_SITE && new URLSearchParams(window.location.search).get("mode") === "create";
  const [portalMode, setPortalMode] = useState<"workspace" | "account">(
    PUBLIC_SITE ? (wantsCreate ? "account" : "workspace") : "workspace",
  );
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
    setPortalMode("workspace");
  }

  if (PUBLIC_SITE && checkingPlatform) {
    return (
      <main style={{ padding: "var(--cds-spacing-06)" }}>
        <Loading withOverlay={false} description="Loading" />
      </main>
    );
  }

  const accountPortalActive = PUBLIC_SITE && portalMode === "account";
  const workspacePortalActive = portalMode === "workspace";
  const hasPlatformAccount = Boolean(platformMe?.account);

  if (accountPortalActive && hasPlatformAccount) {
    const account = platformMe.account;
    return (
      <main style={{ padding: "var(--cds-spacing-06)" }}>
        <Stack gap={6}>
          <Stack gap={2} orientation="horizontal">
            <Button
              kind={workspacePortalActive ? "primary" : "secondary"}
              size="sm"
              onClick={() => setPortalMode("workspace")}
            >
              Workspace login
            </Button>
            <Button
              kind={accountPortalActive ? "primary" : "secondary"}
              size="sm"
              onClick={() => setPortalMode("account")}
            >
              Account portal
            </Button>
          </Stack>
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

  if (accountPortalActive && !hasPlatformAccount) {
    return (
      <main style={{ padding: "var(--cds-spacing-06)" }}>
        <Stack gap={6}>
          <Stack gap={2} orientation="horizontal">
            <Button
              kind={workspacePortalActive ? "primary" : "secondary"}
              size="sm"
              onClick={() => setPortalMode("workspace")}
            >
              Workspace login
            </Button>
            <Button
              kind={accountPortalActive ? "primary" : "secondary"}
              size="sm"
              onClick={() => setPortalMode("account")}
            >
              Account portal
            </Button>
          </Stack>
          <Suspense fallback={<Loading withOverlay description="Loading" />}>
            <PlatformLogin portal onLogin={setPlatformMe} onBack={() => setPortalMode("workspace")} />
          </Suspense>
        </Stack>
      </main>

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

            {/* ── Step 1: Email ───────────────────────────────────────────── */}
            {step === 1 && (
              <Form onSubmit={handleEmailNext}>
                <Stack gap={5}>
                  <TextInput
                    id="email"
                    labelText="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    helperText="Enter your email to see your workspaces."
                    autoComplete="email"
                    required
                  />
                  <Button
                    type="submit"
                    renderIcon={ArrowRight}
                    disabled={resolveEmail.isFetching}
                  >
                    {resolveEmail.isFetching ? "Looking up…" : "Next"}
                  </Button>
                </Stack>
              </Form>
            )}

            {/* ── Step 2: Workspace + password ────────────────────────────── */}
            {step === 2 && (
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (selectedWorkspace === "") {
                    // No workspace selected → go to account portal
                    setPortalMode("account");
                    return;
                  }
                  login.mutate({ email, password, code: needCode ? code : undefined });
                }}
              >
                <Stack gap={5}>
                  <p className="esti-label--secondary">{email}</p>

                  <Select
                    id="workspace"
                    labelText="Sign in to"
                    value={selectedWorkspace}
                    onChange={(e) => setSelectedWorkspace(e.target.value)}
                  >
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id} text={ws.name} />
                    ))}
                    {PUBLIC_SITE && (
                      <SelectItem value="" text="My AORMS account (no workspace)" />
                    )}
                  </Select>

                  {selectedWorkspace !== "" && (
                    <>
                      <TextInput
                        id="password"
                        labelText="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
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
                    </>
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

                  <Button
                    type="submit"
                    disabled={
                      login.isPending ||
                      (needCode && code.length < 6) ||
                      (selectedWorkspace !== "" && !password)
                    }
                  >
                    {login.isPending
                      ? "Signing in…"
                      : needCode
                        ? "Verify"
                        : selectedWorkspace === ""
                          ? "Go to account"
                          : "Sign in"}
                  </Button>

                  <Button
                    kind="ghost"
                    size="sm"
                    onClick={() => { setStep(1); setNeedCode(false); login.reset(); }}
                  >
                    ← Change email
                  </Button>
                </Stack>
              </Form>
            )}

            {!PUBLIC_SITE && step === 1 && (
              <Button as={RouterLink} to="/signup" kind="tertiary">
                Create account
              </Button>
            )}

            <Button as={RouterLink} to="/access" kind="ghost" size="sm">
              Client / contractor portal login
            </Button>

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
