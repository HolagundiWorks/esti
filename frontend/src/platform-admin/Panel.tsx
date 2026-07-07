import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { Box, Button, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import Login from "./Login";
import AdminApp from "./admin/AdminApp";
import { MuiRoot } from "../theme/MuiRoot.js";
import { fetchMe, logout, type Me } from "./lib/auth";

const Companies = lazy(() => import("./Companies"));
const Credentials = lazy(() => import("./Credentials"));
const RequestPlan = lazy(() => import("./RequestPlan"));
const Security = lazy(() => import("./Security"));

function backToSite() {
  window.location.hash = "";
}

function TagChip({ color, label }: { color: string; label: string }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor: `var(--cds-tag-background-${color})`,
        color: `var(--cds-tag-color-${color})`,
      }}
    />
  );
}

const Loading = () => (
  <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
    <CircularProgress />
  </Box>
);

/**
 * Licence / admin console (`/platform-admin`). Any signed-in account — a
 * platform admin or an ordinary member who lands here — can reach its own
 * plan/companies/security/credentials inline via "My account", rather than
 * bouncing to a separate destination; the firm app's own /login is a
 * distinct, workspace-only sign-in with no account-management surface of
 * its own (that lives at Profile → Account once inside a workspace).
 */
export default function Panel() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    fetchMe().then((m) => {
      setMe(m);
      setLoading(false);
    });
  }, []);

  async function refreshMe() {
    setMe(await fetchMe());
  }

  async function handleLogout() {
    await logout();
    setMe(null);
  }

  let body: ReactNode;
  if (loading) {
    body = (
      <Box component="main" sx={{ p: 3 }}>
        <Loading />
      </Box>
    );
  } else if (!me?.account) {
    body = <Login onLogin={setMe} />;
  } else {
    const account = me.account;
    body = (
      <Box component="main" sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="h4" component="h1" className="esti-grow">
              AORMS Licensing Console
            </Typography>
            <TagChip
              color={account.isPlatformAdmin ? "green" : "gray"}
              label={account.isPlatformAdmin ? "Platform admin" : "Member"}
            />
            <Typography component="span">{account.email}</Typography>
            {account.isPlatformAdmin && (
              <Button variant="text" size="small" onClick={() => setShowAccount((s) => !s)}>
                {showAccount ? "Back to console" : "My account (2FA, profile)"}
              </Button>
            )}
            <Button variant="text" size="small" onClick={backToSite}>
              Back to site
            </Button>
            <Button variant="text" size="small" onClick={handleLogout}>
              Sign out
            </Button>
          </Stack>

          {showAccount || !account.isPlatformAdmin ? (
            // Ordinary members land straight on their account page: plan,
            // companies (create / invites / join), security, credentials.
            <Suspense fallback={<Loading />}>
              <Stack spacing={2}>
                {me.activeOrg && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <TagChip color="blue" label={`Working in: ${me.activeOrg.name}`} />
                  </Stack>
                )}
                <RequestPlan />
                <Companies me={me} onChange={setMe} />
                <Security me={me} onChange={refreshMe} />
                <Credentials />
              </Stack>
            </Suspense>
          ) : (
            <AdminApp />
          )}
        </Stack>
      </Box>
    );
  }

  // Paint the console canvas light (Fog Gray) and fill the viewport so no dark
  // body shows through — matching the rest of the app's light shell.
  return (
    <MuiRoot>
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>{body}</Box>
    </MuiRoot>
  );
}
