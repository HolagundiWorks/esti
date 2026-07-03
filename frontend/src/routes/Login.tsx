import { ArrowLeft, ArrowRight, Download } from "@carbon/icons-react";
import {
  Button,
  Dropdown,
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

interface TenantItem {
  id: string;
  label: string;
}

const WORKSPACE_ITEM: TenantItem = { id: "workspace", label: "This studio's workspace" };

function companyItem(c: CompanyOption): TenantItem {
  return { id: c.publicId ?? c.name, label: `${c.name} — ${c.role}` };
}

export function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[] | null>(null);
  const [companyBusy, setCompanyBusy] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantItem | null>(null);

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
    if (company) {
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
                        {companyBusy ? "Opening..." : `Login — ${companies[0]!.name}`}
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
                      AORMS account login
                    </Button>
                    <Button kind="ghost" size="sm" onClick={() => setCompanies(null)}>
                      Sign in as someone else
                    </Button>
                  </Stack>
                );
              })()
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
                  {PUBLIC_SITE && (
                    <Button as={RouterLink} to="/download" kind="ghost" size="sm" renderIcon={Download}>
                      Download AORMS desktop
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
