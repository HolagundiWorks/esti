import { useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  type CompanyResolution,
  type Me,
  devLogin,
  fetchMe,
  fetchRegistrationStatus,
  login,
  register,
  resolveCompany,
} from "./lib/auth";
import { Link as RouterLink } from "react-router-dom";
import { AuthBrandBlock } from "../components/AormsLogo.js";
import { AuthRailLayout } from "../components/AuthRailLayout.js";
import { StatusDot } from "../components/StatusTag.js";
import { GoogleIconCircle } from "../components/GoogleIconCircle.js";
import { AORMS_PORTALS, AORMS_STUDIO } from "../lib/product-nomenclature.js";
import { AccountSignupFields, EMPTY_PROFILE, type ProfileDraft } from "./AccountSignupFields.js";
import { AccountSignupProfile } from "@esti/contracts";

const ERRORS: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  weak_password: "Password must be at least 8 characters.",
  email_taken: "An account with that email already exists — sign in instead.",
  invalid_credentials: "Email or password is incorrect.",
  totp_invalid: "That authenticator code is incorrect.",
  registration_closed: "Account creation is closed — please sign in.",
  company_not_found: "We couldn't find that company. Check the domain or AORMS-C id.",
  not_a_member: "This account isn't a member of that company.",
  register_failed: "Could not create the account. Please try again.",
  profile_invalid: "Complete all required practice details before continuing.",
  account_suspended: "This account has been suspended. Contact support to reactivate.",
  request_failed: "Something went wrong. Please try again.",
};

/** A product "Create account" redirect adds ?onboard=<PRODUCT> to the panel URL. */
function onboardProduct(): string | null {
  const p = new URLSearchParams(window.location.search).get("onboard");
  return p && p.trim() ? p.trim().toUpperCase() : null;
}

function companyLabel(r: CompanyResolution | null): string {
  if (!r) return "";
  if (r.mode === "admin") return "AORMS platform admin";
  if (r.mode === "company") return r.org.name;
  return "";
}

export default function Login({
  onLogin,
  portal = false,
  companyPortal = false,
  onBack,
  initialMode,
}: {
  onLogin: (me: Me) => void;
  /** Customer user-portal: skip the tenant company step + always allow sign-up. */
  portal?: boolean;
  /** Company-owner portal (`/company-account`) — sign-in only, company-scoped. */
  companyPortal?: boolean;
  /** Optional: renders a link back to the caller's own view (e.g. the firm's
   *  own workspace sign-in), for when this component is embedded rather than
   *  the whole page. */
  onBack?: () => void;
  /** Force the starting mode (e.g. a caller's own "Create account" button
   *  landing straight on the register form) instead of the default inference. */
  initialMode?: "signin" | "register";
}) {
  // Onboarding (?onboard=PRODUCT) only ever applies to the customer portal.
  const product = portal && !companyPortal ? onboardProduct() : null;
  // Admin console: no company step, ever — it's a single admin realm.
  // Customer portal + company portal: credentials only (no company step).
  const skipCompany = !portal || Boolean(product) || companyPortal;
  const [mode, setMode] = useState<"signin" | "register">(
    initialMode ?? (product ? "register" : "signin"),
  );
  const [step, setStep] = useState<"company" | "credentials">(skipCompany ? "credentials" : "company");
  const [company, setCompany] = useState("");
  const [resolved, setResolved] = useState<CompanyResolution | null>(null);
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<ProfileDraft>(EMPTY_PROFILE);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [devEmail, setDevEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminExists, setAdminExists] = useState(false);

  // Admin-console self-signup is a one-time bootstrap: hide "Create account" once
  // a platform admin exists. Product onboarding (?onboard=…) keeps registration.
  useEffect(() => {
    void fetchRegistrationStatus().then((s) => setAdminExists(s.adminExists));
  }, []);
  const registrationOpen = (portal && !companyPortal) || !adminExists || Boolean(product);

  async function handleCompany(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await resolveCompany(company);
    setBusy(false);
    if (res.mode === "not_found") {
      setError(
        "We couldn't find that company. Check the domain / AORMS-C id — or ask an admin to add it.",
      );
      return;
    }
    setResolved(res);
    setStep("credentials");
  }

  async function finishAuthed() {
    const me = await fetchMe();
    if (me.account) onLogin(me);
    else setError(ERRORS.request_failed ?? "Something went wrong.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    let registerProfile: AccountSignupProfile | undefined;
    if (mode === "register" && portal) {
      const parsed = AccountSignupProfile.safeParse({
        ...profile,
        namePrefix: profile.namePrefix?.trim() || undefined,
        coaRegistrationNo: profile.coaRegistrationNo?.trim() || undefined,
        gstin: profile.gstin?.trim() || undefined,
        website: profile.website?.trim() || undefined,
      });
      if (!parsed.success) {
        setBusy(false);
        setError(parsed.error.issues[0]?.message ?? ERRORS.profile_invalid ?? "Check required fields.");
        return;
      }
      registerProfile = parsed.data;
    }
    const res =
      mode === "register"
        ? await register({
            email,
            password,
            name: (registerProfile?.fullName ?? name) || undefined,
            profile: registerProfile,
            portal: portal || companyPortal,
          })
        : await login(email, password, skipCompany ? undefined : company, needCode ? code : undefined);
    if (res.error) {
      setBusy(false);
      if (res.error === "totp_required") {
        // Password was accepted — now ask for the authenticator code.
        setNeedCode(true);
        setError(null);
        return;
      }
      setError(ERRORS[res.error] ?? res.error);
      return;
    }
    if (res.redirect) {
      window.location.href = res.redirect; // back to the product with the licence
      return;
    }
    await finishAuthed();
    setBusy(false);
  }

  async function handleDev(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const account = await devLogin(devEmail);
    if (account) await finishAuthed();
    else setError("Dev login failed (it is disabled outside local development).");
    setBusy(false);
  }

  const showCompanyStep = mode === "signin" && step === "company" && !skipCompany;

  return (
    <AuthRailLayout
      variant={companyPortal ? "portal" : portal ? "portal" : "admin"}
      rail={
        <Stack spacing={3}>
          <Stack spacing={1}>
            <AuthBrandBlock
              tagline={
                companyPortal
                  ? "Company account"
                  : portal
                    ? "Account & licence portal"
                    : undefined
              }
            />
            <Typography variant="h5" component="h2">
              {companyPortal
                ? "AORMS Company"
                : portal
                  ? "AORMS Account"
                  : "Holagundi License Cloud"}
            </Typography>
            <Typography variant="body2">
              {companyPortal
                ? "Sign in as the company owner to manage profile, members, and licence."
                : product
                ? `Create your account to activate ${product}.`
                : mode === "register"
                  ? portal
                    ? `Create your ${AORMS_PORTALS.account.name} and request ${AORMS_STUDIO.title}.`
                    : "Create the platform admin account."
                  : portal
                    ? showCompanyStep
                      ? "Sign in — start with your company."
                      : resolved
                        ? `Signing in to ${companyLabel(resolved)}.`
                        : `Sign in to your ${AORMS_PORTALS.account.name}.`
                    : "Sign in to manage licences."}
            </Typography>
          </Stack>

          {showCompanyStep ? (
            <Box component="form" onSubmit={handleCompany}>
              <Stack spacing={2}>
                <TextField
                  id="auth-company"
                  label="Company name, email, or ID"
                  placeholder="acme.in · you@acme.in · AORMS-C-2K4P"
                  helperText="Your company's domain, an email at that company, or its AORMS-C ID."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large" disabled={busy || !company}>
                  Continue
                </Button>
                <Button
                  type="button"
                  variant="text"
                  size="small"
                  onClick={() => {
                    setCompany("");
                    setResolved(null);
                    setError(null);
                    setStep("credentials");
                  }}
                >
                  No company yet? Sign in with just your email
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <Stack spacing={1}>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<GoogleIconCircle />}
                    onClick={() => {
                      window.location.href =
                        "/platform/auth/google/start?return=" + encodeURIComponent("/account");
                    }}
                  >
                    Continue with Google
                  </Button>
                  <Typography
                    variant="body2"
                    component="p"
                    className="esti-label esti-label--secondary"
                  >
                    or use email
                  </Typography>
                </Stack>
                {mode === "signin" && !product && resolved && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <StatusDot color="cool-gray" label={companyLabel(resolved)} />
                    <Button
                      type="button"
                      variant="text"
                      size="small"
                      onClick={() => {
                        setStep("company");
                        setError(null);
                      }}
                    >
                      Change
                    </Button>
                  </Stack>
                )}
                {mode === "register" && portal && (
                  <AccountSignupFields value={profile} onChange={setProfile} />
                )}
                {mode === "register" && !portal && (
                  <TextField
                    id="auth-name"
                    label="Name (optional)"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                  />
                )}
                <TextField
                  id="auth-email"
                  type="email"
                  label="Email"
                  autoComplete="email"
                  placeholder="you@firm.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                />
                <TextField
                  id="auth-password"
                  type="password"
                  label="Password"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  helperText={mode === "register" ? "At least 8 characters." : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                />
                {mode === "signin" && needCode && (
                  <TextField
                    id="auth-code"
                    label="Authenticator code"
                    placeholder="123456"
                    autoComplete="one-time-code"
                    slotProps={{ htmlInput: { inputMode: "numeric" } }}
                    helperText="6-digit code from your authenticator app."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    fullWidth
                  />
                )}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={busy || !email || !password || (needCode && code.length < 6)}
                >
                  {mode === "register" ? "Create account" : needCode ? "Verify" : "Sign in"}
                </Button>
              </Stack>
            </Box>
          )}

          {registrationOpen && (
            <Button
              type="button"
              variant="text"
              size="small"
              onClick={() => {
                const next = mode === "register" ? "signin" : "register";
                setMode(next);
                setStep(next === "register" ? "credentials" : "company");
                setError(null);
              }}
            >
              {mode === "register"
                ? "Already have an account? Sign in"
                : "Need an account? Create one"}
            </Button>
          )}

          {companyPortal && (
            <Button component={RouterLink} to="/account" variant="text" size="small">
              Personal {AORMS_PORTALS.account.name} instead
            </Button>
          )}

          {onBack && (
            <Button type="button" variant="text" size="small" onClick={onBack}>
              Looking for your AORMS workspace sign-in instead?
            </Button>
          )}

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              <AlertTitle>Sign-in failed</AlertTitle>
              {error}
            </Alert>
          )}

          {import.meta.env.DEV && (
            <Box component="form" onSubmit={handleDev}>
              <Stack spacing={2}>
                <TextField
                  id="dev-email"
                  label="Developer sign-in (local only)"
                  placeholder="you@example.com"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  fullWidth
                />
                <Button type="submit" variant="outlined" disabled={busy || !devEmail}>
                  Dev sign-in
                </Button>
              </Stack>
            </Box>
          )}
        </Stack>
      }
    />
  );
}
