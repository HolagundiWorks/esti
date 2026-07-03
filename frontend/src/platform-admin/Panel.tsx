import { Suspense, lazy, useEffect, useState } from "react";
import { Button, Loading, Stack, Tag, Theme } from "@carbon/react";
import Login from "./Login";
import AdminApp from "./admin/AdminApp";
import { fetchMe, logout, type Me } from "./lib/auth";

const Companies = lazy(() => import("./Companies"));
const Credentials = lazy(() => import("./Credentials"));
const RequestPlan = lazy(() => import("./RequestPlan"));
const Security = lazy(() => import("./Security"));

function backToSite() {
  window.location.hash = "";
}

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

  if (loading) {
    return (
      <Theme theme="g100">
        <main style={{ padding: "var(--cds-spacing-06)" }}>
          <Loading withOverlay={false} description="Loading" />
        </main>
      </Theme>
    );
  }

  if (!me?.account) return <Login onLogin={setMe} />;
  const account = me.account;

  async function refreshMe() {
    setMe(await fetchMe());
  }

  async function handleLogout() {
    await logout();
    setMe(null);
  }

  return (
    <Theme theme="g100">
      <main style={{ padding: "var(--cds-spacing-06)" }}>
        <Stack gap={6}>
          <Stack gap={3} orientation="horizontal">
            <h1 className="esti-grow">AORMS Licensing Console</h1>
            <Tag type={account.isPlatformAdmin ? "green" : "gray"} size="md">
              {account.isPlatformAdmin ? "Platform admin" : "Member"}
            </Tag>
            <span>{account.email}</span>
            {account.isPlatformAdmin && (
              <Button kind="ghost" size="sm" onClick={() => setShowAccount((s) => !s)}>
                {showAccount ? "Back to console" : "My account (2FA, profile)"}
              </Button>
            )}
            <Button kind="ghost" size="sm" onClick={backToSite}>
              Back to site
            </Button>
            <Button kind="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </Stack>

          {showAccount || !account.isPlatformAdmin ? (
            // Ordinary members land straight on their account page: plan,
            // companies (create / invites / join), security, credentials.
            <Suspense fallback={<Loading withOverlay={false} description="Loading" />}>
              <Stack gap={5}>
                {me.activeOrg && (
                  <Stack gap={2} orientation="horizontal">
                    <Tag type="blue" size="md">
                      Working in: {me.activeOrg.name}
                    </Tag>
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
      </main>
    </Theme>
  );
}
