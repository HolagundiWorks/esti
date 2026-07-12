import ArrowBack from "@mui/icons-material/ArrowBack";
import { Alert, Button, Stack, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { AuthBrandBlock } from "../components/AormsLogo.js";
import { AuthRailLayout } from "../components/AuthRailLayout.js";
import { PublicAuthStageLayout } from "../components/PublicAuthStageLayout.js";
import { AUTH_PAGE_SEO, applyPublicPageSeo } from "../lib/public-page-seo.js";
import { trpc } from "../lib/trpc.js";

const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE !== "false";

/** Set a new workspace password from a reset link (esti_user). */
export function ResetPassword() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const reset = trpc.auth.resetPassword.useMutation({
    meta: { errorTitle: "Couldn't reset the password" },
    onSuccess: () => setTimeout(() => navigate("/login", { replace: true }), 2000),
  });

  const mismatch = confirm.length > 0 && password !== confirm;

  useEffect(() => {
    applyPublicPageSeo(AUTH_PAGE_SEO.resetPassword);
  }, []);

  const form = (
    <Stack spacing={2}>
      <AuthBrandBlock />
      <h1 className="esti-label">Choose a new password</h1>

      {!token ? (
        <Alert severity="error">Open the link from your reset email again.</Alert>
      ) : reset.isSuccess ? (
        <Alert severity="success">You can now sign in with your new password. Redirecting…</Alert>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!mismatch) reset.mutate({ token, password });
          }}
        >
          <Stack spacing={2}>
            <TextField
              id="password"
              label="New password"
              type="password"
              autoComplete="new-password"
              helperText="At least 8 characters."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            <TextField
              id="confirm"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              error={mismatch}
              helperText={mismatch ? "Passwords don't match." : undefined}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              fullWidth
            />
            {reset.error && <Alert severity="error">{reset.error.message}</Alert>}
            <Button
              type="submit"
              variant="contained"
              disabled={reset.isPending || password.length < 8 || mismatch}
            >
              {reset.isPending ? "Updating..." : "Set new password"}
            </Button>
          </Stack>
        </form>
      )}

      <Button
        component={RouterLink}
        to="/login"
        variant="text"
        size="small"
        color="inherit"
        startIcon={<ArrowBack />}
      >
        Back to sign in
      </Button>
    </Stack>
  );

  if (PUBLIC_SITE) {
    return <PublicAuthStageLayout>{form}</PublicAuthStageLayout>;
  }

  return (
    <AuthRailLayout variant="workspace" showMarketingFooter={false} rail={<AuthBrandBlock />} stage={form} />
  );
}
