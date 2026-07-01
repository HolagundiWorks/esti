import { useEffect, useState } from "react";
import { Button, InlineNotification, Loading, Stack, Tag, Theme } from "@carbon/react";
import Login from "./Login";
import AdminApp from "./admin/AdminApp";
import { fetchMe, logout, type Me } from "./lib/auth";

function backToSite() {
  window.location.hash = "";
}

function goToAccount() {
  window.location.pathname = "/login";
}

/**
 * Licence / admin console (`/platform-admin`) — platform admins only. Customer
 * accounts (sign-up, plan requests, companies, credentials, 2FA) are merged into
 * the firm app's own /login page — there is no separate account portal URL.
 */
export default function Panel() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

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

  const account = me?.account ?? null;
  if (!account) return <Login onLogin={setMe} />;

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
              <Button kind="ghost" size="sm" onClick={goToAccount}>
                My account (2FA, profile)
              </Button>
            )}
            <Button kind="ghost" size="sm" onClick={backToSite}>
              Back to site
            </Button>
            <Button kind="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </Stack>

          {account.isPlatformAdmin ? (
            <AdminApp />
          ) : (
            <Stack gap={4}>
              <InlineNotification
                kind="info"
                lowContrast
                hideCloseButton
                title="Admin console"
                subtitle="This account isn't a platform administrator. Manage your account and licences at /login."
              />
              <div>
                <Button kind="tertiary" onClick={goToAccount}>
                  Go to my account
                </Button>
              </div>
            </Stack>
          )}
        </Stack>
      </main>
    </Theme>
  );
}
