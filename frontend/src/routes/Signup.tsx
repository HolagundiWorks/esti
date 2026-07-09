import ArrowBack from "@mui/icons-material/ArrowBack";
import { Alert, AlertTitle, Button, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { AuthBrandBlock } from "../components/AormsLogo.js";
import { AuthRailLayout } from "../components/AuthRailLayout.js";
import { setDesktopToken } from "../lib/api-base.js";
import { trpc } from "../lib/trpc.js";

/**
 * First-run onboarding for a fresh self-hosted install: name the firm, create the
 * admin (owner) login, and seed the workspace. Runs once — the backend refuses if
 * the install already has users.
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
    <AuthRailLayout
      variant="workspace"
      rail={
        <Stack spacing={2}>
          <Stack spacing={1}>
            <AuthBrandBlock tagline="Architecture Office OS" />
            <p>Set up your workspace</p>
            <p>
              Create your firm and admin account. Your standard AORMS licence includes
              the full workspace and 5 GB storage.
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
      }
    />
  );
}
