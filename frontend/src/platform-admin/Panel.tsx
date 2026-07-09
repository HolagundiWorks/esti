import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { Box, Button, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import Login from "./Login";
import AdminApp from "./admin/AdminApp";
import { PortalShell } from "../components/portal/PortalShell.js";
import { fetchMe, logout, type Me } from "./lib/auth";

const Companies = lazy(() => import("./Companies"));
const Credentials = lazy(() => import("./Credentials"));
const RequestPlan = lazy(() => import("./RequestPlan"));
const Security = lazy(() => import("./Security"));

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

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!me?.account) {
    return <Login onLogin={setMe} />;
  }

  const account = me.account;
  const ownsCompany = me.memberships.some((m) => m.role === "OWNER");
  const isAdmin = account.isPlatformAdmin;
  const memberView = showAccount || !isAdmin;

  let content: ReactNode;
  if (memberView) {
    content = (
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
        >
          <Box>
            <Typography variant="h4" component="h1">
              My AORMS account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Plan, companies, security, and API credentials for your portable identity.
            </Typography>
          </Box>
          {isAdmin && (
            <Button variant="outlined" size="small" onClick={() => setShowAccount(false)}>
              Back to licensing console
            </Button>
          )}
        </Stack>
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
      </Stack>
    );
  } else {
    content = (
      <AdminApp email={account.email} isPlatformAdmin={isAdmin} />
    );
  }

  return (
    <PortalShell
      active="licensing"
      showCompanyNav={ownsCompany}
      showLicensingNav={isAdmin}
      footer={
        <Stack spacing={1}>
          {isAdmin && !memberView && (
            <Button variant="text" size="small" fullWidth onClick={() => setShowAccount(true)}>
              My account (2FA, profile)
            </Button>
          )}
          <Button variant="text" size="small" fullWidth onClick={handleLogout}>
            Sign out
          </Button>
        </Stack>
      }
    >
      {content}
    </PortalShell>
  );
}
