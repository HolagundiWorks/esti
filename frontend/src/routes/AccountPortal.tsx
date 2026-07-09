import ArrowBack from "@mui/icons-material/ArrowBack";
import { Alert, AlertTitle, Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { PortalLicenceCard } from "../components/portal/PortalLicenceCard.js";
import { PortalPageHeader, PortalTabPanel, PortalTabs } from "../components/portal/PortalChrome.js";
import { StatusDot } from "../components/StatusTag.js";
import { useAuth } from "../lib/auth.js";
import { fetchMe, fetchMyLicense, logout, type Me, type MyLicense } from "../platform-admin/lib/auth.js";

const Credentials = lazy(() => import("../platform-admin/Credentials.js"));
const PlatformLogin = lazy(() => import("../platform-admin/Login.js"));
const AccountProfilePanel = lazy(() =>
  import("../platform-admin/AccountProfilePanel.js").then((m) => ({ default: m.AccountProfilePanel })),
);
const RequestPlan = lazy(() => import("../platform-admin/RequestPlan.js"));
const Security = lazy(() => import("../platform-admin/Security.js"));
const UserProfilePanel = lazy(() =>
  import("../components/profile/UserProfilePanel.js").then((m) => ({ default: m.UserProfilePanel })),
);
const WorkspaceSettingsPanel = lazy(() =>
  import("../components/profile/WorkspaceSettingsPanel.js").then((m) => ({
    default: m.WorkspaceSettingsPanel,
  })),
);
const AccountHub = lazy(() =>
  import("../platform-admin/AccountHub.js").then((m) => ({ default: m.AccountHub })),
);
const Companies = lazy(() => import("../platform-admin/Companies.js"));

const TAB_LABELS = ["Overview", "Companies", "Profile", "Security", "Workspace"] as const;

function tabIndexFromHash(): number {
  const hash = window.location.hash.slice(1);
  if (hash === "join" || hash === "companies") return 1;
  if (hash === "profile") return 2;
  if (hash === "security") return 3;
  if (hash === "settings" || hash === "workspace") return 4;
  return 0;
}

function hashFromTab(index: number): string {
  switch (index) {
    case 1:
      return "#companies";
    case 2:
      return "#profile";
    case 3:
      return "#security";
    case 4:
      return "#settings";
    default:
      return "";
  }
}

function scrollToHashAnchor(hash: string) {
  if (!hash || hash === "companies" || hash === "profile" || hash === "security" || hash === "workspace") {
    return;
  }
  requestAnimationFrame(() => {
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export function AccountPortal() {
  const { user } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [license, setLicense] = useState<MyLicense | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState(tabIndexFromHash);

  const wantsCreate = new URLSearchParams(window.location.search).get("mode") === "create";

  useEffect(() => {
    fetchMe().then((m) => {
      setMe(m);
      setChecking(false);
      if (m.account) fetchMyLicense().then(setLicense);
    });
  }, []);

  const syncTabFromLocation = useCallback(() => {
    const next = tabIndexFromHash();
    setTab(next);
    scrollToHashAnchor(window.location.hash.slice(1));
  }, []);

  useEffect(() => {
    syncTabFromLocation();
    window.addEventListener("hashchange", syncTabFromLocation);
    return () => window.removeEventListener("hashchange", syncTabFromLocation);
  }, [syncTabFromLocation]);

  async function refresh() {
    setMe(await fetchMe());
    setLicense(await fetchMyLicense());
  }

  async function handleSignOut() {
    await logout();
    setMe(null);
  }

  function handleTabChange(_e: React.SyntheticEvent, next: number) {
    setTab(next);
    const hash = hashFromTab(next);
    const path = `${window.location.pathname}${window.location.search}${hash}`;
    window.history.replaceState(null, "", path);
    if (hash === "#settings") {
      scrollToHashAnchor("settings");
    } else if (hash === "#companies") {
      scrollToHashAnchor("join");
    }
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

  const account = me.account;
  const ownsCompany = me.memberships.some((m) => m.role === "OWNER");

  return (
    <div className="cds--g100">
      <main className="esti-portal-shell">
        <Stack spacing={3}>
          <PortalPageHeader
            title="AORMS Account"
            subtitle="Your portable identity, companies, and security — separate from the studio workspace."
            meta={
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="body2">{account.email}</Typography>
                {account.publicId && <StatusDot color="cool-gray" label={account.publicId} />}
              </Stack>
            }
            actions={
              <>
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
                {ownsCompany && (
                  <Button
                    component={RouterLink}
                    to="/company-account"
                    variant="text"
                    size="small"
                    color="inherit"
                  >
                    Company account
                  </Button>
                )}
                <Button variant="text" size="small" color="inherit" onClick={handleSignOut}>
                  Sign out
                </Button>
              </>
            }
          />

          <PortalTabs
            value={tab}
            onChange={handleTabChange}
            labels={[...TAB_LABELS]}
            ariaLabel="Account sections"
          />

          <Suspense fallback={<Box sx={{ display: "flex" }}><CircularProgress /></Box>}>
            <PortalTabPanel active={tab === 0}>
              <AccountHub me={me} />
              {license ? <PortalLicenceCard license={license} /> : <RequestPlan />}
              <Paper sx={{ p: 2.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {ownsCompany ? (
                    <>
                      Company owners manage GST, members, workspace users, and audit logs in the{" "}
                      <RouterLink to="/company-account">Company account</RouterLink>.
                    </>
                  ) : (
                    <>
                      After you create or join a company, owners can manage firm settings in the{" "}
                      <RouterLink to="/company-account">Company account</RouterLink>.
                    </>
                  )}
                </Typography>
              </Paper>
            </PortalTabPanel>

            <PortalTabPanel active={tab === 1}>
              <Companies me={me} onChange={setMe} />
            </PortalTabPanel>

            <PortalTabPanel active={tab === 2}>
              <AccountProfilePanel account={account} onSaved={refresh} />
            </PortalTabPanel>

            <PortalTabPanel active={tab === 3}>
              <Security me={me} onChange={refresh} />
              <Credentials />
            </PortalTabPanel>

            <PortalTabPanel active={tab === 4}>
              {!user ? (
                <Alert severity="warning">
                  <AlertTitle>Workspace sign-in required</AlertTitle>
                  Work profile and workspace settings need an active studio session.{" "}
                  <RouterLink to="/login">Sign in to your studio</RouterLink> first, then return here.
                </Alert>
              ) : (
                <>
                  <Paper sx={{ overflow: "hidden" }}>
                    <WorkspaceSettingsPanel />
                  </Paper>
                  <Paper sx={{ overflow: "hidden" }}>
                    <UserProfilePanel />
                  </Paper>
                </>
              )}
            </PortalTabPanel>
          </Suspense>
        </Stack>
      </main>
    </div>
  );
}
