import ArrowBack from "@mui/icons-material/ArrowBack";
import { Surface } from "@hcw/ui-kit";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { CompanyAdminPanel } from "../components/company/CompanyAdminPanel.js";
import { CompanyProfilePanel } from "../components/company/CompanyProfilePanel.js";
import { PortalLicenceCard } from "../components/portal/PortalLicenceCard.js";
import { PortalPageHeader, PortalTabPanel, PortalTabs } from "../components/portal/PortalChrome.js";
import { PortalShell } from "../components/portal/PortalShell.js";
import { StatusDot } from "../components/StatusTag.js";
import { useAuth } from "../lib/auth.js";
import { useCapabilities } from "../lib/capabilities.js";
import {
  fetchMe,
  fetchMyLicense,
  logout,
  sessionFromWorkspace,
  switchCompany,
  type Me,
  type MyLicense,
} from "../platform-admin/lib/auth.js";

const Companies = lazy(() => import("../platform-admin/Companies.js"));
const PlatformLogin = lazy(() => import("../platform-admin/Login.js"));
const RequestPlan = lazy(() => import("../platform-admin/RequestPlan.js"));
const Users = lazy(() => import("./Users.js").then((m) => ({ default: m.Users })));
const AuditLog = lazy(() => import("./AuditLog.js").then((m) => ({ default: m.AuditLog })));

const TAB_LABELS = ["Firm", "Members", "Administration"] as const;

function tabIndexFromHash(): number {
  const hash = window.location.hash.slice(1);
  if (hash === "members" || hash === "users") return 1;
  if (hash === "administration" || hash === "audit" || hash === "admin") return 2;
  return 0;
}

function hashFromTab(index: number): string {
  switch (index) {
    case 1:
      return "#members";
    case 2:
      return "#administration";
    default:
      return "";
  }
}

function ownedCompanies(me: Me) {
  return me.memberships.filter((m) => m.role === "OWNER");
}

function orgKey(org: { publicId: string | null; slug: string }) {
  return org.publicId ?? org.slug;
}

/**
 * Company account portal — second sign-in destination for company owners.
 * Mirrors the personal `/account` portal but scoped to firm identity, members,
 * and the workspace company profile (GST, address, signatory).
 */
export function CompanyAccountPortal() {
  const { user } = useAuth();
  const { canFirmAdmin } = useCapabilities();
  const [me, setMe] = useState<Me | null>(null);
  const [license, setLicense] = useState<MyLicense | null>(null);
  const [checking, setChecking] = useState(true);
  const [switchBusy, setSwitchBusy] = useState(false);
  const [tab, setTab] = useState(tabIndexFromHash);

  const syncTabFromLocation = useCallback(() => {
    setTab(tabIndexFromHash());
  }, []);

  useEffect(() => {
    syncTabFromLocation();
    window.addEventListener("hashchange", syncTabFromLocation);
    return () => window.removeEventListener("hashchange", syncTabFromLocation);
  }, [syncTabFromLocation]);

  function handleTabChange(_e: React.SyntheticEvent, next: number) {
    setTab(next);
    const hash = hashFromTab(next);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}${hash}`,
    );
  }

  const owned = useMemo(() => (me ? ownedCompanies(me) : []), [me]);
  const activeOwned =
    me?.activeOrg &&
    owned.some((m) => orgKey(m.org) === orgKey(me.activeOrg!));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const m = await fetchMe();
      if (cancelled) return;
      if (m.account) {
        setMe(m);
        setChecking(false);
        if (m.activeOrg) fetchMyLicense().then(setLicense);
        return;
      }
      if (user?.role === "OWNER") {
        const bridged = await sessionFromWorkspace();
        if (cancelled) return;
        if (bridged.account) {
          setMe(bridged);
          setLicense(await fetchMyLicense());
          setChecking(false);
          return;
        }
      }
      setMe(m);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  async function handleSignOut() {
    await logout();
    setMe(null);
    setLicense(null);
  }

  async function handleSwitchCompany(handle: string) {
    setSwitchBusy(true);
    try {
      const next = await switchCompany(handle);
      setMe(next);
      setLicense(await fetchMyLicense());
    } finally {
      setSwitchBusy(false);
    }
  }

  if (checking) {
    return (
      <PortalShell active="company">
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      </PortalShell>
    );
  }

  if (!me?.account) {
    return (
      <Suspense fallback={<CircularProgress />}>
        <PlatformLogin companyPortal portal onLogin={setMe} />
      </Suspense>
    );
  }

  if (owned.length === 0) {
    return (
      <PortalShell
        active="company"
        footer={
          <Button variant="text" size="small" fullWidth onClick={handleSignOut}>
            Sign out
          </Button>
        }
      >
        <Stack spacing={2}>
          <Typography variant="h4" component="h1">
            Company account
          </Typography>
          <Alert severity="info">
            <AlertTitle>No company to manage</AlertTitle>
            You are not an owner of any company yet. Create one from your personal AORMS account, or ask an owner to invite you.
          </Alert>
          <Button component={RouterLink} to="/account" variant="outlined">
            Personal AORMS account
          </Button>
        </Stack>
      </PortalShell>
    );
  }

  const company = me.activeOrg && activeOwned ? me.activeOrg : owned[0]!.org;
  const isPlatformAdmin = me.account.isPlatformAdmin;

  return (
    <PortalShell
      active="company"
      showCompanyNav
      showLicensingNav={isPlatformAdmin}
      footer={
        <Button variant="text" size="small" fullWidth onClick={handleSignOut}>
          Sign out
        </Button>
      }
    >
      <Stack spacing={3}>
        <PortalPageHeader
          title="Company account"
          subtitle="Firm identity, members, and workspace administration."
          meta={
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="body2">{company.name}</Typography>
              {company.publicId && <StatusDot color="cool-gray" label={company.publicId} />}
            </Stack>
          }
          actions={
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              size="small"
              startIcon={<ArrowBack />}
            >
              Workspace sign-in
            </Button>
          }
        />

        {owned.length > 1 && (
          <Surface layer="flat" sx={{ p: 2, maxWidth: 400 }}>
            <TextField
              select
              label="Company"
              size="small"
              fullWidth
              value={orgKey(company)}
              disabled={switchBusy}
              onChange={(e) => void handleSwitchCompany(e.target.value)}
            >
              {owned.map((m) => (
                <MenuItem key={orgKey(m.org)} value={orgKey(m.org)}>
                  {m.org.name}
                </MenuItem>
              ))}
            </TextField>
          </Surface>
        )}

          {!user && (
            <Alert severity="warning">
              <AlertTitle>Workspace sign-in required</AlertTitle>
              Company profile, office administration, workspace users, and audit logs need an active studio session.{" "}
              <RouterLink to="/login">Sign in to your studio</RouterLink> first, then return here.
            </Alert>
          )}

          <PortalTabs
            value={tab}
            onChange={handleTabChange}
            labels={[...TAB_LABELS]}
            ariaLabel="Company account sections"
          />

          <Suspense fallback={<Box sx={{ display: "flex" }}><CircularProgress /></Box>}>
            <PortalTabPanel active={tab === 0}>
              {license && <PortalLicenceCard title="Company licence" license={license} />}
              {!license && <RequestPlan />}
              <CompanyProfilePanel isOwner={canFirmAdmin} />
            </PortalTabPanel>

            <PortalTabPanel active={tab === 1}>
              <Companies me={me} onChange={setMe} showPendingRequests />
            </PortalTabPanel>

            <PortalTabPanel active={tab === 2}>
              {user ? (
                <>
                  <CompanyAdminPanel />
                  <Users embedded />
                  <AuditLog embedded />
                </>
              ) : (
                <Alert severity="info">
                  <AlertTitle>Studio session needed</AlertTitle>
                  Sign in to your workspace to manage office settings, users, and audit logs.
                </Alert>
              )}
            </PortalTabPanel>
          </Suspense>
        </Stack>
    </PortalShell>
  );
}
