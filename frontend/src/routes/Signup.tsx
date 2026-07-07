import ArrowBack from "@mui/icons-material/ArrowBack";
import { Alert, AlertTitle, Button, Paper, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { StatusDot } from "../components/StatusTag.js";
import { setDesktopToken } from "../lib/api-base.js";
import { trpc } from "../lib/trpc.js";

/**
 * First-run onboarding for a fresh AORMS-Lite install: name the firm, create the
 * admin (owner) login, and seed the fixed workspace. Runs once — the backend
 * refuses if the install already has users. Material UI.
 */
export function Signup() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const bootstrap = trpc.auth.bootstrap.useMutation({
    onSuccess: async (data) => {
      setDesktopToken((data as { token?: string }).token);
      await utils.auth.me.invalidate();
      navigate("/", { replace: true });
    },
  });

  return (
    <main className="esti-login-shell">
      <Stack spacing={2} className="esti-login-panel">
        <Paper sx={{ p: 3, borderTop: 3, borderTopColor: "primary.main" }}>
          <Stack spacing={2}>
            <Stack spacing={1}>
              <div className="esti-login-brand">
                <span className="esti-login-mark">
                  <span className="esti-brand esti-brand--esti" role="img" aria-label="ESTI" />
                </span>
                <h3>ESTI AORMS</h3>
              </div>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <p>Set up your workspace</p>
                <StatusDot color="green" label="Lite" />
              </Stack>
              <p>
                Create your firm and admin account. Your Lite workspace comes
                with a fixed set of staff, clients, contractors and projects you
                can activate and fill in — no GST billing.
              </p>
            </Stack>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                bootstrap.mutate({ companyName, adminName, email, password });
              }}
            >
              <Stack spacing={2}>
                <TextField
                  id="companyName"
                  label="Firm name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  id="adminName"
                  label="Your name (admin)"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  id="email"
                  label="Admin email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  id="password"
                  label="Password"
                  type="password"
                  helperText="At least 8 characters."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                />
                {bootstrap.error && (
                  <Alert severity="error">
                    <AlertTitle>Setup failed</AlertTitle>
                    {bootstrap.error.message}
                  </Alert>
                )}
                <Button type="submit" variant="contained" disabled={bootstrap.isPending}>
                  {bootstrap.isPending ? "Setting up..." : "Create workspace"}
                </Button>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="text"
                  size="small"
                  startIcon={<ArrowBack />}
                >
                  Already set up? Sign in
                </Button>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </Stack>
    </main>
  );
}
