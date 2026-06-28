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
import { devLogin, googleStartUrl, type Account } from "./lib/auth";

export default function Login({ onLogin }: { onLogin: (a: Account) => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDev(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const account = await devLogin(email);
    setBusy(false);
    if (account) onLogin(account);
    else setError("Dev login failed (it is disabled outside local development).");
  }

  return (
    <Theme theme="g100">
      <main style={{padding:"1.5rem"}}>
        <Grid>
          <Column sm={4} md={5} lg={6}>
            <Tile>
              <Stack gap={6}>
                <Stack gap={2}>
                  <h2>Holagundi License Cloud</h2>
                  <p>Sign in to manage products, plans and licenses.</p>
                </Stack>

                <Button href={googleStartUrl} kind="primary" size="lg">
                  Sign in with Google
                </Button>

                {import.meta.env.DEV && (
                  <Form onSubmit={handleDev}>
                    <Stack gap={4}>
                      <TextInput
                        id="dev-email"
                        labelText="Developer sign-in (local only)"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <Button type="submit" kind="tertiary" disabled={busy || !email}>
                        Dev sign-in
                      </Button>
                    </Stack>
                  </Form>
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
              </Stack>
            </Tile>
          </Column>
        </Grid>
      </main>
    </Theme>
  );
}
