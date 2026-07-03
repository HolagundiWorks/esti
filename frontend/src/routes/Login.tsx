import { ArrowLeft, ArrowRight, Building, Home } from "@carbon/icons-react";
import {
  Button,
  ClickableTile,
  Form,
  InlineNotification,
  Stack,
  TextInput,
  Tile,
} from "@carbon/react";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { setDesktopToken } from "../lib/api-base.js";
import { login as platformLogin } from "../platform-admin/lib/auth.js";
import { trpc } from "../lib/trpc.js";

// On a public-site build (the hub, e.g. aorms.in) the AORMS account + licence
// portal is its own destination at /account — NOT embedded here. This page is
// the firm WORKSPACE sign-in (esti_user). On unified installs one identity
// spans several company workspaces (architects freelance alongside firm work),
// so a successful sign-in is followed by a tenant-select step: pick this
// studio's workspace, or one of your companies.
const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE !== "false";

interface CompanyOption {
  publicId: string | null;
  name: string;
  role: string;
}

export function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[] | null>(null);
  const [companyBusy, setCompanyBusy] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const login = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      // Desktop returns a session token (cookies don't cross the loopback origin).
      setDesktopToken((data as { token?: string }).token);
      const list = (data as { companies?: CompanyOption[] }).companies ?? [];
      if (list.length > 0) {
        // Tenant-select: this studio's workspace or one of the companies.
        setCompanies(list);
        return;
      }
      await utils.auth.me.invalidate();
      navigate("/", { replace: true });
    },
    onError: (err) => {
      // Password accepted — now collect the authenticator code.
      if (err.message === "totp_required") setNeedCode(true);
    },
  });

  async function enterWorkspace() {
    await utils.auth.me.invalidate();
    navigate("/", { replace: true });
  }

  async function enterCompany(c: CompanyOption) {
    const handle = c.publicId ?? c.name;
    setCompanyBusy(handle);
    setCompanyError(null);
    // Company workspaces ride the platform session — sign into it with the
    // same credentials, scoped to the chosen company, then land on its page.
    const res = await platformLogin(email, password, handle, needCode ? code : undefined);
    setCompanyBusy(null);
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
              <p>{companies ? "Where are you working today?" : "Sign in to your workspace"}</p>
            </Stack>

            {companies ? (
              <Stack gap={4}>
                <ClickableTile onClick={() => void enterWorkspace()}>
                  <Stack gap={2} orientation="horizontal">
                    <Home size={20} />
                    <span className="esti-grow">This studio&apos;s workspace</span>
                    <ArrowRight size={16} />
                  </Stack>
                </ClickableTile>
                {companies.map((c) => {
                  const handle = c.publicId ?? c.name;
                  return (
                    <ClickableTile key={handle} onClick={() => void enterCompany(c)}>
                      <Stack gap={2} orientation="horizontal">
                        <Building size={20} />
                        <span className="esti-grow">
                          {c.name}
                          {companyBusy === handle ? " — opening..." : ""}
                        </span>
                        <span className="esti-label esti-label--secondary">{c.role}</span>
                        <ArrowRight size={16} />
                      </Stack>
                    </ClickableTile>
                  );
                })}
                {companyError && (
                  <InlineNotification
                    kind="error"
                    title="Could not open the company"
                    subtitle={companyError}
                    hideCloseButton
                    lowContrast
                  />
                )}
                <Button kind="ghost" size="sm" onClick={() => setCompanies(null)}>
                  Sign in as someone else
                </Button>
              </Stack>
            ) : (
              <>
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
                      disabled={login.isPending || (needCode && code.length < 6)}
                    >
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
              </>
            )}
          </Stack>
        </Tile>
      </Stack>
    </main>
  );
}
