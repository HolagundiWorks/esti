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

/**
 * First-run onboarding for a fresh AORMS-Lite install: name the firm, create the
 * admin (owner) login, and seed the fixed workspace. Runs once — the backend
 * refuses if the install already has users.
 */
export function Signup() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const bootstrap = trpc.auth.bootstrap.useMutation({
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
              <Stack orientation="horizontal" gap={3}>
                <p>Set up your workspace</p>
                <Tag type="green" size="sm">
                  Lite
                </Tag>
              </Stack>
              <p>
                Create your firm and admin account. Your Lite workspace comes
                with a fixed set of staff, clients, contractors and projects you
                can activate and fill in — no GST billing.
              </p>
            </Stack>
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                bootstrap.mutate({ companyName, adminName, email, password });
              }}
            >
              <Stack gap={5}>
                <TextInput
                  id="companyName"
                  labelText="Firm name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
                <TextInput
                  id="adminName"
                  labelText="Your name (admin)"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                />
                <TextInput
                  id="email"
                  labelText="Admin email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <TextInput
                  id="password"
                  labelText="Password"
                  type="password"
                  helperText="At least 8 characters."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {bootstrap.error && (
                  <InlineNotification
                    kind="error"
                    title="Setup failed"
                    subtitle={bootstrap.error.message}
                    hideCloseButton
                    lowContrast
                  />
                )}
                <Button type="submit" disabled={bootstrap.isPending}>
                  {bootstrap.isPending ? "Setting up..." : "Create workspace"}
                </Button>
                <Button
                  as={RouterLink}
                  to="/login"
                  kind="ghost"
                  size="sm"
                  renderIcon={ArrowLeft}
                >
                  Already set up? Sign in
                </Button>
              </Stack>
            </Form>
          </Stack>
        </Tile>
      </Stack>
    </main>
  );
}
