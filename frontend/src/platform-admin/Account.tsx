import { useEffect, useState } from "react";
import { Button, Loading, Stack, Tag, Theme } from "@carbon/react";
import Login from "./Login";
import Companies from "./Companies";
import Credentials from "./Credentials";
import RequestPlan from "./RequestPlan";
import Security from "./Security";
import { fetchMe, logout, type Me } from "./lib/auth";

function backToSite() {
  window.location.hash = "";
  window.location.pathname = "/";
}

/**
 * Customer account portal (`/account`) — deliberately separate from the
 * licence/admin console at /platform-admin. Create an account, request a
 * workspace, manage companies, credentials and 2FA. No admin surface here.
 */
export default function Account() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe().then((m) => {
      setMe(m);
      setLoading(false);
    });
  }, []);

  async function refreshMe() {
    setMe(await fetchMe());
  }

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
  if (!account) return <Login portal onLogin={setMe} />;

  async function handleLogout() {
    await logout();
    setMe(null);
  }

  return (
    <Theme theme="g100">
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
            <Button kind="ghost" size="sm" onClick={backToSite}>
              Home
            </Button>
            <Button kind="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </Stack>

          <RequestPlan />
          {me && <Companies me={me} onChange={setMe} />}
          {me && <Security me={me} onChange={refreshMe} />}
          <Credentials />
        </Stack>
      </main>
    </Theme>
  );
}
