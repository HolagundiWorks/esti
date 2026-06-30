import { useState } from "react";
import {
  Button,
  Column,
  Form,
  Grid,
  InlineNotification,
  Stack,
  TextInput,
  Theme,
  Tile,
} from "@carbon/react";
import { devLogin, login, register, type Account } from "./lib/auth";

const ERRORS: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  weak_password: "Password must be at least 8 characters.",
  email_taken: "An account with that email already exists — sign in instead.",
  invalid_credentials: "Email or password is incorrect.",
  register_failed: "Could not create the account. Please try again.",
  request_failed: "Something went wrong. Please try again.",
};

/** A product "Create account" redirect adds ?onboard=<PRODUCT> to the panel URL. */
function onboardProduct(): string | null {
  const p = new URLSearchParams(window.location.search).get("onboard");
  return p && p.trim() ? p.trim().toUpperCase() : null;
}

export default function Login({ onLogin }: { onLogin: (a: Account) => void }) {
  const product = onboardProduct();
  const [mode, setMode] = useState<"signin" | "register">(product ? "register" : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [devEmail, setDevEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res =
      mode === "register"
        ? await register({ email, password, name: name || undefined })
        : await login(email, password);
    setBusy(false);
    if (res.error) {
      setError(ERRORS[res.error] ?? res.error);
      return;
    }
    if (res.redirect) {
      window.location.href = res.redirect; // back to the product with the licence
      return;
    }
    if (res.account) onLogin(res.account);
  }

  async function handleDev(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const account = await devLogin(devEmail);
    setBusy(false);
    if (account) onLogin(account);
    else setError("Dev login failed (it is disabled outside local development).");
  }

  return (
    <Theme theme="g100">
      <main style={{ padding: "1.5rem" }}>
        <Grid>
          <Column sm={4} md={5} lg={6}>
            <Tile>
              <Stack gap={6}>
                <Stack gap={2}>
                  <h2>Holagundi License Cloud</h2>
                  <p>
                    {product
                      ? `Create your account to activate ${product}.`
                      : mode === "register"
                        ? "Create an account to manage your products and licences."
                        : "Sign in to manage products, plans and licences."}
                  </p>
                </Stack>

                <Form onSubmit={handleSubmit}>
                  <Stack gap={5}>
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
                    <Button
                      type="submit"
                      kind="primary"
                      size="lg"
                      disabled={busy || !email || !password}
                    >
                      {mode === "register" ? "Create account" : "Sign in"}
                    </Button>
                  </Stack>
                </Form>

                <Button
                  kind="ghost"
                  size="sm"
                  onClick={() => {
                    setMode(mode === "register" ? "signin" : "register");
                    setError(null);
                  }}
                >
                  {mode === "register"
                    ? "Already have an account? Sign in"
                    : "Need an account? Create one"}
                </Button>

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
