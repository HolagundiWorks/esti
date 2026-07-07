import ArrowBack from "@mui/icons-material/ArrowBack";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { Suspense, lazy, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { StatusDot } from "../components/StatusTag.js";
import { fetchMe, fetchMyLicense, logout, type Me, type MyLicense } from "../platform-admin/lib/auth.js";

// The AORMS account + licence portal (hlp_account) — its own destination on the
// hub (aorms.in), NOT embedded in the firm workspace /login. Sign in / create an
// account here, then manage plan, companies, 2FA and credentials.
const Companies = lazy(() => import("../platform-admin/Companies.js"));
const Credentials = lazy(() => import("../platform-admin/Credentials.js"));
const PlatformLogin = lazy(() => import("../platform-admin/Login.js"));
const RequestPlan = lazy(() => import("../platform-admin/RequestPlan.js"));
const Security = lazy(() => import("../platform-admin/Security.js"));

export function AccountPortal() {
  const [me, setMe] = useState<Me | null>(null);
  const [license, setLicense] = useState<MyLicense | null>(null);
  const [checking, setChecking] = useState(true);

  const wantsCreate = new URLSearchParams(window.location.search).get("mode") === "create";

  useEffect(() => {
    fetchMe().then((m) => {
      setMe(m);
      setChecking(false);
      if (m.account) fetchMyLicense().then(setLicense);
    });
  }, []);

  async function refresh() {
    setMe(await fetchMe());
    setLicense(await fetchMyLicense());
  }

  async function handleSignOut() {
    await logout();
    setMe(null);
  }

  if (checking) {
    return (
      <div className="cds--g100">
        <main className="esti-portal-shell">
          <CircularProgress />
        </main>
      </div>
    );
  }

  // Not signed in → the account sign-in / create-account flow.
  if (!me?.account) {
    return (
      <Suspense fallback={<CircularProgress />}>
        <PlatformLogin
          portal
          initialMode={wantsCreate ? "register" : "signin"}
          onLogin={setMe}
        />
      </Suspense>
    );
  }

  // Signed in → the account dashboard.
  const account = me.account;
  return (
    <div className="cds--g100">
      <main className="esti-portal-shell">
        <Stack spacing={3}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Typography variant="h4" component="h1" className="esti-grow">
              AORMS Account
            </Typography>
            <Typography variant="body2">{account.email}</Typography>
            {account.publicId && (
              <StatusDot color="cool-gray" label={account.publicId} />
            )}
            <Button
              component={RouterLink}
              to="/login"
              variant="text"
              size="small"
              color="inherit"
              startIcon={<ArrowBack />}
            >
              Workspace sign-in
            </Button>
            <Button variant="text" size="small" color="inherit" onClick={handleSignOut}>
              Sign out
            </Button>
          </Stack>

          {license && (
            <Box sx={{ p: 3 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography variant="h6" component="h4" className="esti-grow">
                    Current plan
                  </Typography>
                  <StatusDot
                    color={license.status === "ACTIVE" ? "green" : "gray"}
                    label={license.planCode}
                  />
                </Stack>
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Seats: {license.seats == null ? "Unlimited" : license.seats}
                    {" · "}
                    Devices: {license.deviceLimit == null ? "Unlimited" : license.deviceLimit}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {license.expiresAt
                      ? `Renews / expires ${new Date(license.expiresAt).toLocaleDateString()}`
                      : "Perpetual — no expiry"}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          )}

          <Suspense fallback={<Box sx={{ display: "flex" }}><CircularProgress /></Box>}>
            <RequestPlan />
            <Companies me={me} onChange={setMe} />
            <Security me={me} onChange={refresh} />
            <Credentials />
          </Suspense>
        </Stack>
      </main>
    </div>
  );
}
