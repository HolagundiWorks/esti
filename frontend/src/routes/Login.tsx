import { ArrowLeft, ArrowRight, Download, Login as LoginIcon } from "@carbon/icons-react";
import {
  Button,
  Dropdown,
  Form,
  InlineLoading,
  InlineNotification,
  Stack,
  TextInput,
  Theme,
  Tile,
} from "@carbon/react";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { setDesktopToken } from "../lib/api-base.js";
import { login as platformLogin } from "../platform-admin/lib/auth.js";
import { trpc } from "../lib/trpc.js";

// The firm WORKSPACE sign-in (esti_user). On unified installs one identity
// spans several company workspaces (architects freelance alongside firm work),
// so a successful sign-in is followed by a tenant-select step: pick this
// studio's workspace, or one of your companies. Google sign-in rides the
// platform OAuth flow (/platform/auth/google/*) and is exchanged for a
// workspace session on return (auth.sessionFromPlatform).
const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE !== "false";

interface CompanyOption {
  publicId: string | null;
  name: string;
  role: string;
}

interface TenantItem {
  id: string;
  label: string;
}

const WORKSPACE_ITEM: TenantItem = { id: "workspace", label: "Personal workspace" };

// Edition-matched desktop installer for the tenant step: company members get
// the Pro installer; individuals get the generic /download page (Lite).
const PRO_DOWNLOAD_URL = (import.meta.env.VITE_PRO_DOWNLOAD_URL as string | undefined) ?? "";

const GOOGLE_ERRORS: Record<string, string> = {
  not_configured: "Google sign-in isn't configured on this server yet — use email and password.",
  denied: "Google sign-in was cancelled.",
  state_mismatch: "The sign-in attempt expired — please try again.",
  exchange_failed: "Google could not complete the sign-in — please try again.",
  userinfo_failed: "Google did not confirm your email — please try again.",
};

function companyItem(c: CompanyOption): TenantItem {
  return { id: c.publicId ?? c.name, label: `${c.name} — ${c.role}` };
}

export function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [params, setParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[] | null>(null);
  const [companyBusy, setCompanyBusy] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantItem | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(
    GOOGLE_ERRORS[params.get("google_error") ?? ""] ?? null,
  );

  async function afterLogin(data: unknown) {
    // Desktop returns a session token (cookies don't cross the loopback origin).
    setDesktopToken((data as { token?: string }).token);
    // Always land on the guide step: company workspace(s) when memberships
    // exist, otherwise the personal workspace — plus the personal AORMS
    // account, so every sign-in sees where it can go.
    setCompanies((data as { companies?: CompanyOption[] }).companies ?? []);
  }

  const login = trpc.auth.login.useMutation({
    onSuccess: afterLogin,
    onError: (err) => {
      // Password accepted — now collect the authenticator code.
      if (err.message === "totp_required") setNeedCode(true);
    },
  });

  // Returning from Google (?google=1): exchange the platform session that the
  // OAuth callback just created for a workspace session.
  const fromGoogle = trpc.auth.sessionFromPlatform.useMutation({
    onSuccess: afterLogin,
    onError: () => setGoogleError("Google sign-in could not open the workspace — try email and password."),
  });
  const googleStarted = useRef(false);
  useEffect(() => {
    if (params.get("google") === "1" && !googleStarted.current) {
      googleStarted.current = true;
      setParams({}, { replace: true });
      fromGoogle.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startGoogle() {
    window.location.href = `/platform/auth/google/start?return=${encodeURIComponent("/login?google=1")}`;
  }

  // The dropdown's current selection resolved back to its company (null when
  // "This studio's workspace" is selected).
  function selectedCompany(): CompanyOption | null {
    const item = tenant ?? WORKSPACE_ITEM;
    if (item.id === "workspace") return null;
    return companies?.find((c) => (c.publicId ?? c.name) === item.id) ?? null;
  }

  // Login always opens the WORKSPACE. Selecting a company additionally scopes
  // the platform session to it (best-effort) so /account later opens on it.
  async function enterWorkspace() {
    const company = selectedCompany();
    if (company && password) {
      setCompanyBusy(true);
      await platformLogin(email, password, company.publicId ?? company.name, needCode ? code : undefined);
      setCompanyBusy(false);
    }
    await utils.auth.me.invalidate();
    navigate("/", { replace: true });
  }

  // Owners only: open the company's account page (members, invites, licence,
  // company AORMS ID) in the portal, scoped to that company.
  async function openCompanyAccount(company: CompanyOption) {
    if (!password) {
      // Google path — the platform session already exists; just open the portal.
      window.location.href = "/account";
      return;
    }
    setCompanyBusy(true);
    setCompanyError(null);
    const res = await platformLogin(email, password, company.publicId ?? company.name, needCode ? code : undefined);
    setCompanyBusy(false);
    if (!res.account) {
      setCompanyError("Could not open that company right now — try again.");
      return;
    }
    window.location.href = "/account";
  }

  const errorText =
    login.error?.message === "totp_invalid"
      ? "That authenticator code is incorrect."
      : login.error?.message;
  const showError = Boolean(login.error) && login.error?.message !== "totp_required";

  return (
    <Theme theme="g100">
    <main className="esti-login-shell">
      <Stack gap={5} className="esti-login-panel">
        <Tile>
          <Stack gap={6}>
            <Stack gap={3}>
              <div className="esti-login-brand">
                <span className="esti-login-mark">
                  <img src="/esti-logo.png" alt="" />
                </span>
                <Stack gap={1}>
                  <h3>AORMS</h3>
                  <p className="esti-label esti-label--secondary">Architecture Office OS</p>
                </Stack>
              </div>
              <h2>{companies ? "Where are you working today?" : "Welcome back"}</h2>
              {!companies && (
                <p className="esti-label esti-label--secondary">
                  One account for your studio, your companies, and your AORMS identity.
                </p>
              )}
            </Stack>

            {fromGoogle.isPending && <InlineLoading description="Completing Google sign-in…" />}

            {googleError && !companies && (
              <InlineNotification
                kind="warning"
                title="Google sign-in"
                subtitle={googleError}
                lowContrast
                onCloseButtonClick={() => setGoogleError(null)}
              />
            )}

            {companies ? (
              (() => {
                const owned = companies.filter((c) => c.role === "OWNER");
                const current = selectedCompany();
                // Target for the company-account button: the dropdown's
                // selection when it's a company they own; with exactly one
                // owned company it always targets that one.
                const accountCompany =
                  current && current.role === "OWNER"
                    ? current
                    : owned.length === 1
                      ? owned[0]!
                      : null;
                const showDropdown = companies.length > 1 || owned.length > 1;
                return (
                  <Stack gap={4}>
                    {showDropdown ? (
                      <div className="esti-row">
                        <Dropdown
                          id="tenant-select"
                          className="esti-grow"
                          titleText="Active company"
                          label="Select where to work"
                          items={[WORKSPACE_ITEM, ...companies.map(companyItem)]}
                          itemToString={(item) => item?.label ?? ""}
                          selectedItem={tenant ?? WORKSPACE_ITEM}
                          onChange={({ selectedItem }) => setTenant(selectedItem ?? null)}
                        />
                        <Button
                          renderIcon={ArrowRight}
                          disabled={companyBusy}
                          onClick={() => void enterWorkspace()}
                        >
                          {companyBusy ? "Opening..." : "Login"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        renderIcon={ArrowRight}
                        disabled={companyBusy}
                        onClick={() => void enterWorkspace()}
                      >
                        {companyBusy
                          ? "Opening..."
                          : companies.length === 1
                            ? `Login — ${companies[0]!.name}`
                            : "Login — Personal workspace"}
                      </Button>
                    )}
                    {companyError && (
                      <InlineNotification
                        kind="error"
                        title="Could not open the company"
                        subtitle={companyError}
                        hideCloseButton
                        lowContrast
                      />
                    )}
                    {owned.length > 0 && (
                      <Button
                        kind="tertiary"
                        disabled={companyBusy || !accountCompany}
                        onClick={() => accountCompany && void openCompanyAccount(accountCompany)}
                      >
                        {accountCompany
                          ? `Company account — ${accountCompany.name}`
                          : "Company account (select a company above)"}
                      </Button>
                    )}
                    <Button as={RouterLink} to="/account" kind="ghost" size="sm">
                      Personal AORMS account
                    </Button>
                    {companies.length > 0 && PRO_DOWNLOAD_URL ? (
                      <Button kind="ghost" size="sm" renderIcon={Download} href={PRO_DOWNLOAD_URL}>
                        Download AORMS Pro desktop
                      </Button>
                    ) : (
                      <Button as={RouterLink} to="/download" kind="ghost" size="sm" renderIcon={Download}>
                        {companies.length > 0 ? "Download AORMS Pro desktop" : "Download AORMS desktop"}
                      </Button>
                    )}
                    <Button kind="ghost" size="sm" onClick={() => setCompanies(null)}>
                      Sign in as someone else
                    </Button>
                  </Stack>
                );
              })()
            ) : (
              <>
                {PUBLIC_SITE && (
                  <Stack gap={3}>
                    <Button
                      kind="tertiary"
                      size="lg"
                      className="esti-grow"
                      renderIcon={LoginIcon}
                      disabled={fromGoogle.isPending}
                      onClick={startGoogle}
                    >
                      Continue with Google
                    </Button>
                    <p className="esti-label esti-label--secondary">or sign in with email</p>
                  </Stack>
                )}

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
                    <Button
                      type="submit"
                      size="lg"
                      renderIcon={ArrowRight}
                      disabled={login.isPending || (needCode && code.length < 6)}
                    >
                      {login.isPending ? "Signing in..." : needCode ? "Verify" : "Sign in"}
                    </Button>
                  </Stack>
                </Form>

                <div className="esti-row-between">
                  <Button as={RouterLink} to="/forgot-password" kind="ghost" size="sm">
                    Forgot password?
                  </Button>
                  {PUBLIC_SITE ? (
                    <Button as={RouterLink} to="/account?mode=create" kind="ghost" size="sm">
                      Create free account
                    </Button>
                  ) : (
                    <Button as={RouterLink} to="/signup" kind="ghost" size="sm">
                      Create account
                    </Button>
                  )}
                </div>
              </>
            )}
          </Stack>
        </Tile>

        {!companies && (
          <Tile>
            <Stack gap={2}>
              {PUBLIC_SITE && (
                <Button as={RouterLink} to="/account" kind="ghost" size="sm">
                  Manage your AORMS account &amp; licence →
                </Button>
              )}
              {PUBLIC_SITE && (
                <Button as={RouterLink} to="/download" kind="ghost" size="sm" renderIcon={Download}>
                  Download AORMS desktop
                </Button>
              )}
              <Button as={RouterLink} to="/access" kind="ghost" size="sm">
                Client / consultant / contractor portal
              </Button>
              <Button as={RouterLink} to="/" kind="ghost" size="sm" renderIcon={ArrowLeft}>
                Back to home
              </Button>
            </Stack>
          </Tile>
        )}
      </Stack>
    </main>
    </Theme>
  );
}
