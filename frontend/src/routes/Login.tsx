import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";
import {
  Alert,
  AlertTitle,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { IS_DESKTOP, setDesktopToken } from "../lib/api-base.js";
import { login as platformLogin } from "../platform-admin/lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { AuthBrandBlock } from "../components/AormsLogo.js";
import { AORMS_STUDIO, AORMS_PORTALS } from "../lib/product-nomenclature.js";
import { AuthRailLayout } from "../components/AuthRailLayout.js";
import { PublicAuthStageLayout } from "../components/PublicAuthStageLayout.js";
import { GoogleIconCircle } from "../components/GoogleIconCircle.js";
import { AUTH_PAGE_SEO, applyPublicPageSeo } from "../lib/public-page-seo.js";

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

  useEffect(() => {
    if (PUBLIC_SITE) applyPublicPageSeo(AUTH_PAGE_SEO.login);
  }, []);

  async function afterLogin(data: unknown) {
    setDesktopToken((data as { token?: string }).token);
    if (IS_DESKTOP) {
      await utils.auth.me.invalidate();
      navigate("/", { replace: true });
      return;
    }
    setCompanies((data as { companies?: CompanyOption[] }).companies ?? []);
  }

  const login = trpc.auth.login.useMutation({
    meta: { errorTitle: "Couldn't sign in" },
    onSuccess: afterLogin,
    onError: (err) => {
      if (err.message === "totp_required") setNeedCode(true);
    },
  });

  const fromGoogle = trpc.auth.sessionFromPlatform.useMutation({
    meta: { errorTitle: "Couldn't sign in with Google" },
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

  function selectedCompany(): CompanyOption | null {
    const item = tenant ?? WORKSPACE_ITEM;
    if (item.id === "workspace") return null;
    return companies?.find((c) => (c.publicId ?? c.name) === item.id) ?? null;
  }

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

  async function openCompanyAccount(company: CompanyOption) {
    if (!password) {
      window.location.href = "/company-account";
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
    window.location.href = "/company-account";
  }

  const errorText =
    login.error?.message === "totp_invalid"
      ? "That authenticator code is incorrect."
      : login.error?.message;
  const showError = Boolean(login.error) && login.error?.message !== "totp_required";

  const form = (
    <Stack spacing={2}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <AuthBrandBlock tagline={AORMS_STUDIO.tagline} />
          <h1>{companies ? "Choose where to go" : "Sign in"}</h1>
          {companies ? (
            <p className="esti-label esti-label--secondary">
              Open your workspace, manage your account, or review your company.
            </p>
          ) : (
            <p className="esti-label esti-label--secondary">
              {IS_DESKTOP
                ? `${AORMS_STUDIO.title} · sign in with your studio account.`
                : PUBLIC_SITE
                  ? `${AORMS_STUDIO.title} — your architecture consultancy workspace.`
                  : "Sign in, then choose your workspace, account, or company."}
            </p>
          )}
        </Stack>

        {fromGoogle.isPending && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <CircularProgress size={16} />
            <span className="esti-label esti-label--secondary">Completing Google sign-in…</span>
          </Stack>
        )}

        {googleError && !companies && (
          <Alert severity="warning" onClose={() => setGoogleError(null)}>
            <AlertTitle>Google sign-in</AlertTitle>
            {googleError}
          </Alert>
        )}

        {companies ? (
          (() => {
            const owned = companies.filter((c) => c.role === "OWNER");
            const current = selectedCompany();
            const accountCompany =
              current && current.role === "OWNER"
                ? current
                : owned.length === 1
                  ? owned[0]!
                  : null;
            const showDropdown = companies.length > 1 || owned.length > 1;
            const tenantItems = [WORKSPACE_ITEM, ...companies.map(companyItem)];
            return (
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  endIcon={<ArrowForward />}
                  disabled={companyBusy}
                  onClick={() => void enterWorkspace()}
                >
                  {companyBusy ? "Opening…" : "Open workspace"}
                </Button>
                <Button component={RouterLink} to="/account" variant="outlined" disabled={companyBusy}>
                  {AORMS_PORTALS.account.myAccount}
                </Button>
                {owned.length > 0 && (
                  <Button
                    variant="outlined"
                    disabled={companyBusy || !accountCompany}
                    onClick={() => accountCompany && void openCompanyAccount(accountCompany)}
                  >
                    {accountCompany
                      ? `Company account — ${accountCompany.name}`
                      : "Company account (owner only)"}
                  </Button>
                )}
                <Button component={RouterLink} to="/account#join" variant="text" size="small">
                  Request to join a company
                </Button>
                {showDropdown ? (
                  <TextField
                    id="tenant-select"
                    select
                    label="Workspace context (optional)"
                    size="small"
                    value={(tenant ?? WORKSPACE_ITEM).id}
                    onChange={(e) =>
                      setTenant(tenantItems.find((item) => item.id === e.target.value) ?? null)
                    }
                  >
                    {tenantItems.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : null}
                {companyError && (
                  <Alert severity="error">
                    <AlertTitle>Could not open the company</AlertTitle>
                    {companyError}
                  </Alert>
                )}
                <Button variant="text" size="small" onClick={() => setCompanies(null)}>
                  Sign in as someone else
                </Button>
              </Stack>
            );
          })()
        ) : (
          <>
            {PUBLIC_SITE && (
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  size="large"
                  className="esti-grow"
                  startIcon={<GoogleIconCircle />}
                  disabled={fromGoogle.isPending}
                  onClick={startGoogle}
                >
                  Continue with Google
                </Button>
                <p className="esti-label esti-label--secondary">or sign in with email</p>
              </Stack>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                login.mutate({ email, password, code: needCode ? code : undefined });
              }}
            >
              <Stack spacing={2}>
                <TextField
                  id="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  id="password"
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
                    id="totp-code"
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
                    <AlertTitle>Sign-in failed</AlertTitle>
                    {errorText}
                  </Alert>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  disabled={login.isPending || (needCode && code.length < 6)}
                >
                  {login.isPending ? "Signing in..." : needCode ? "Verify" : "Sign in"}
                </Button>
              </Stack>
            </form>

            <div className="esti-row-between">
              <Button component={RouterLink} to="/forgot-password" variant="text" size="small">
                Forgot password?
              </Button>
              {PUBLIC_SITE ? (
                <Button component={RouterLink} to="/account?mode=create" variant="text" size="small">
                  {AORMS_PORTALS.account.create}
                </Button>
              ) : (
                <Button component={RouterLink} to="/signup" variant="text" size="small">
                  {IS_DESKTOP ? "First time? Set up your studio" : "Create account"}
                </Button>
              )}
            </div>
          </>
        )}
      </Stack>

      {!companies && (
        <Stack spacing={1} sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
          {PUBLIC_SITE && (
            <Button component={RouterLink} to="/account" variant="text" size="small">
              Manage your {AORMS_PORTALS.account.name} &amp; licence →
            </Button>
          )}
          <Button component={RouterLink} to="/access" variant="text" size="small">
            {AORMS_PORTALS.external.loginPageLink}
          </Button>
          <Button component={RouterLink} to="/" variant="text" size="small" startIcon={<ArrowBack />}>
            Back to home
          </Button>
        </Stack>
      )}
    </Stack>
  );

  if (PUBLIC_SITE) {
    return <PublicAuthStageLayout>{form}</PublicAuthStageLayout>;
  }

  return (
    <AuthRailLayout
      variant="workspace"
      showMarketingFooter={false}
      rail={<AuthBrandBlock tagline={AORMS_STUDIO.tagline} />}
      stage={form}
    />
  );
}
