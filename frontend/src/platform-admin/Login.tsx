import { useEffect, useState } from "react";
import {
  Button,
  Column,
  Form,
  Grid,
  InlineNotification,
  Stack,
  Tag,
  TextInput,
  Theme,
  Tile,
} from "@carbon/react";
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
}: {
  onLogin: (me: Me) => void;
  /** Customer user-portal: skip the tenant company step + always allow sign-up. */
  portal?: boolean;
}) {
  const product = onboardProduct();
  // Onboarding + the customer portal are account-level — skip the company step.
  const skipCompany = Boolean(product) || portal;
  const [mode, setMode] = useState<"signin" | "register">(product ? "register" : "signin");
  const [step, setStep] = useState<"company" | "credentials">(skipCompany ? "credentials" : "company");
  const [company, setCompany] = useState("");
  const [resolved, setResolved] = useState<CompanyResolution | null>(null);
  const [name, setName] = useState("");
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
  const registrationOpen = portal || !adminExists || Boolean(product);

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
    const res =
      mode === "register"
        ? await register({ email, password, name: name || undefined, portal })
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
    <Theme theme="g100">
      <main style={{ padding: "var(--cds-spacing-06)" }}>
        <Grid>
          <Column sm={4} md={5} lg={6}>
            <Tile>
              <Stack gap={6}>
                <Stack gap={2}>
                  <h2>{portal ? "AORMS Account" : "Holagundi License Cloud"}</h2>
                  <p>
                    {product
                      ? `Create your account to activate ${product}.`
                      : mode === "register"
                        ? portal
                          ? "Create your AORMS account and request a workspace."
                          : "Create an account to manage your products and licences."
                        : showCompanyStep
                          ? "Sign in — start with your company."
                          : portal
                            ? "Sign in to your AORMS account."
                            : `Signing in to ${companyLabel(resolved)}.`}
                  </p>
                </Stack>

                {showCompanyStep ? (
                  <Form onSubmit={handleCompany}>
                    <Stack gap={5}>
                      <TextInput
                        id="auth-company"
                        labelText="Company"
                        placeholder="acme.in · you@acme.in · AORMS-C-2K4P"
                        helperText="Platform admins: enter aorms.in (or your admin email)."
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                      <Button type="submit" kind="primary" size="lg" disabled={busy || !company}>
                        Continue
                      </Button>
                    </Stack>
                  </Form>
                ) : (
                  <Form onSubmit={handleSubmit}>
                    <Stack gap={5}>
                      {mode === "signin" && !product && resolved && (
                        <Stack gap={2} orientation="horizontal">
                          <Tag type="cool-gray" size="md">
                            {companyLabel(resolved)}
                          </Tag>
                          <Button
                            kind="ghost"
                            size="sm"
                            onClick={() => {
                              setStep("company");
                              setError(null);
                            }}
                          >
                            Change
                          </Button>
                        </Stack>
                      )}
                      {mode === "register" && (
                        <TextInput
                          id="auth-name"
                          labelText="Name (optional)"
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      )}
                      <TextInput
                        id="auth-email"
                        type="email"
                        labelText="Email"
                        autoComplete="email"
                        placeholder="you@firm.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <TextInput
                        id="auth-password"
                        type="password"
                        labelText="Password"
                        autoComplete={mode === "register" ? "new-password" : "current-password"}
                        helperText={mode === "register" ? "At least 8 characters." : undefined}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      {mode === "signin" && needCode && (
                        <TextInput
                          id="auth-code"
                          labelText="Authenticator code"
                          placeholder="123456"
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          helperText="6-digit code from your authenticator app."
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                        />
                      )}
                      <Button
                        type="submit"
                        kind="primary"
                        size="lg"
                        disabled={busy || !email || !password || (needCode && code.length < 6)}
                      >
                        {mode === "register" ? "Create account" : needCode ? "Verify" : "Sign in"}
                      </Button>
                    </Stack>
                  </Form>
                )}

                {registrationOpen && (
                  <Button
                    kind="ghost"
                    size="sm"
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

                {error && (
                  <InlineNotification
                    kind="error"
                    title="Sign-in failed"
                    subtitle={error}
                    lowContrast
                    onCloseButtonClick={() => setError(null)}
                  />
                )}

                {import.meta.env.DEV && (
                  <Form onSubmit={handleDev}>
                    <Stack gap={4}>
                      <TextInput
                        id="dev-email"
                        labelText="Developer sign-in (local only)"
                        placeholder="you@example.com"
                        value={devEmail}
                        onChange={(e) => setDevEmail(e.target.value)}
                      />
                      <Button type="submit" kind="tertiary" disabled={busy || !devEmail}>
                        Dev sign-in
                      </Button>
                    </Stack>
                  </Form>
                )}
              </Stack>
            </Tile>
          </Column>
        </Grid>
      </main>
    </Theme>
  );
}
