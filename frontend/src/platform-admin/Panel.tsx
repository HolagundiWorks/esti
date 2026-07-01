import { useEffect, useState } from "react";
import { Button, InlineNotification, Loading, Stack, Tag, Theme } from "@carbon/react";
import Login from "./Login";
import AdminApp from "./admin/AdminApp";
import { fetchMe, logout, type Account } from "./lib/auth";

function backToSite() {
  window.location.hash = "";
}

export default function Panel() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe().then((a) => {
      setAccount(a);
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

  if (!account) return <Login onLogin={setAccount} />;

  async function handleLogout() {
    await logout();
    setAccount(null);
  }

  return (
    <Theme theme="g100">
      <main style={{ padding: "var(--cds-spacing-06)" }}>
        <Stack gap={6}>
          <Stack gap={3} orientation="horizontal">
            <h1 className="esti-grow">License Cloud</h1>
            <Tag type={account.isPlatformAdmin ? "green" : "gray"} size="md">
              {account.isPlatformAdmin ? "Platform admin" : "Member"}
            </Tag>
            <span>{account.email}</span>
            {account.publicId && (
              <Tag type="cool-gray" size="md">
                {account.publicId}
              </Tag>
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
            <InlineNotification
              kind="info"
              lowContrast
              hideCloseButton
              title="No access"
              subtitle="This account is not a platform administrator."
            />
          )}
        </Stack>
      </main>
    </Theme>
  );
}
