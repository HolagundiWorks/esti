import { ArrowLeft } from "@carbon/icons-react";
import { Button, Loading, Stack, Tag, Tile } from "@carbon/react";
import { Suspense, lazy, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
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
      <main style={{ padding: "var(--cds-spacing-06)" }}>
        <Loading withOverlay={false} description="Loading" />
      </main>
    );
  }

  // Not signed in → the account sign-in / create-account flow.
  if (!me?.account) {
    return (
      <Suspense fallback={<Loading withOverlay description="Loading" />}>
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
    <main style={{ padding: "var(--cds-spacing-06)" }}>
      <Stack gap={6}>
        <Stack gap={3} orientation="horizontal">
          <h1 className="esti-grow">AORMS Account</h1>
          <span>{account.email}</span>
          {account.publicId && (
            <Tag type="cool-gray" size="md">
              {account.publicId}
            </Tag>
          )}
          <Button as={RouterLink} to="/login" kind="ghost" size="sm" renderIcon={ArrowLeft}>
            Workspace sign-in
          </Button>
          <Button kind="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </Stack>

        {license && (
          <Tile>
            <Stack gap={3}>
              <Stack gap={2} orientation="horizontal">
                <h4 className="esti-grow">Current plan</h4>
                <Tag type={license.status === "ACTIVE" ? "green" : "gray"} size="md">
                  {license.planCode}
                </Tag>
              </Stack>
              <Stack gap={1}>
                <span className="esti-label esti-label--secondary">
                  Seats: {license.seats == null ? "Unlimited" : license.seats}
                  {" · "}
                  Devices: {license.deviceLimit == null ? "Unlimited" : license.deviceLimit}
                </span>
                <span className="esti-label esti-label--secondary">
                  {license.expiresAt
                    ? `Renews / expires ${new Date(license.expiresAt).toLocaleDateString()}`
                    : "Perpetual — no expiry"}
                </span>
              </Stack>
            </Stack>
          </Tile>
        )}

        <Suspense fallback={<Loading withOverlay={false} description="Loading" />}>
          <RequestPlan />
          <Companies me={me} onChange={setMe} />
          <Security me={me} onChange={refresh} />
          <Credentials />
        </Suspense>
      </Stack>
    </main>
  );
}
