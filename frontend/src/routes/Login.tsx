import { ArrowLeft } from "@carbon/icons-react";
import {
  Button,
  Form,
  InlineNotification,
  Stack,
  Tag,
  TextInput,
  Tile,
} from "@carbon/react";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc.js";

const DEMO_PASSWORD = "demo1234";
const DEMO_PERSONAS: { label: string; role: string; email: string }[] = [
  {
    label: "Principal (owner)",
    role: "Full access",
    email: "principal@demo.aorms.in",
  },
  { label: "Project Lead", role: "Partner", email: "lead@demo.aorms.in" },
  { label: "Site Supervisor", role: "Associate", email: "site@demo.aorms.in" },
  { label: "Jr Architect", role: "Viewer", email: "junior@demo.aorms.in" },
  { label: "Client", role: "Portal", email: "client@demo.aorms.in" },
];

export function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/", { replace: true });
    },
  });

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
                login.mutate({ email, password });
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
                {login.error && (
                  <InlineNotification
                    kind="error"
                    title="Sign-in failed"
                    subtitle={login.error.message}
                    hideCloseButton
                    lowContrast
                  />
                )}
                <Button type="submit" disabled={login.isPending}>
                  {login.isPending ? "Signing in..." : "Sign in"}
                </Button>
                <Button
                  as={RouterLink}
                  to="/signup"
                  kind="ghost"
                  size="sm"
                >
                  First time? Set up your workspace
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
            </Form>
          </Stack>
        </Tile>

        <Tile>
          <Stack gap={4}>
            <Stack orientation="horizontal" gap={3}>
              <h4>Try a demo role</h4>
              <Tag type="blue" size="sm">
                No sign-up
              </Tag>
            </Stack>
            <p>
              Explore the office from a different seat. Demo accounts can't
              upload files or change credentials.
            </p>
            <Stack gap={3}>
              {DEMO_PERSONAS.map((p) => (
                <Button
                  key={p.email}
                  kind="tertiary"
                  size="sm"
                  disabled={login.isPending}
                  onClick={() =>
                    login.mutate({ email: p.email, password: DEMO_PASSWORD })
                  }
                >
                  {p.label} - {p.role}
                </Button>
              ))}
            </Stack>
          </Stack>
        </Tile>
      </Stack>
    </main>
  );
}
