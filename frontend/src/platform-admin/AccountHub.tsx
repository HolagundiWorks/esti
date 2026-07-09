import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUnchecked from "@mui/icons-material/RadioButtonUnchecked";
import { Alert, AlertTitle, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import type { Me } from "./lib/auth.js";

function Step({
  done,
  label,
  detail,
}: {
  done: boolean;
  label: string;
  detail: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
      {done ? (
        <CheckCircleOutline color="success" fontSize="small" sx={{ mt: 0.25 }} />
      ) : (
        <RadioButtonUnchecked color="disabled" fontSize="small" sx={{ mt: 0.25 }} />
      )}
      <Stack spacing={0.25}>
        <Typography variant="subtitle2" component="span">
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {detail}
        </Typography>
      </Stack>
    </Stack>
  );
}

/** Post-signup hub: account → company → workspace. */
export function AccountHub({ me }: { me: Me }) {
  const ownsCompany = me.memberships.some((m) => m.role === "OWNER");
  const hasCompany = me.memberships.length > 0;

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6" component="h2">
          Get started
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your account, set up a company, then open your workspace. You can also request to join an
          existing company by its contact email.
        </Typography>

        <Stack spacing={1.5}>
          <Step
            done
            label="AORMS account"
            detail={`Signed in as ${me.account?.email ?? "—"}`}
          />
          <Step
            done={hasCompany}
            label="Company"
            detail={
              ownsCompany
                ? "You own a company — manage it in Company account."
                : hasCompany
                  ? "You belong to a company."
                  : "Create a company below, or request to join one."
            }
          />
          <Step
            done={false}
            label="Workspace"
            detail="Sign in to your studio to activate the workspace and start working."
          />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          <Button component={RouterLink} to="/login" variant="contained" size="small">
            Open workspace
          </Button>
          {ownsCompany && (
            <Button component={RouterLink} to="/company-account" variant="outlined" size="small">
              Company account
            </Button>
          )}
          <Button component={RouterLink} to="/account#companies" variant="text" size="small">
            Join a company
          </Button>
        </Stack>

        {ownsCompany && !me.account?.publicId && (
          <Alert severity="info">
            <AlertTitle>Your AORMS ID</AlertTitle>
            After 100 hours of active use in the workspace, request your personal AORMS ID from My profile.
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
