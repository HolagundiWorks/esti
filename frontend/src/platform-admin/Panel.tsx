import { useEffect, useState } from "react";
import {
  Button,
  Dropdown,
  InlineNotification,
  Loading,
  Stack,
  Tag,
  Theme,
} from "@carbon/react";
import Login from "./Login";
import AdminApp from "./admin/AdminApp";
import { fetchMe, logout, switchCompany, type Me, type Membership } from "./lib/auth";

function backToSite() {
  window.location.hash = "";
}

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

  async function handleSwitch(company: string) {
    const next = await switchCompany(company);
    if (next.account) setMe(next);
  }

  const memberships = me?.memberships ?? [];

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

          {memberships.length > 0 && (
            <div style={{ maxWidth: "20rem" }}>
              <Dropdown
                id="active-company"
                titleText="Active company"
                label="Select a company"
                size="sm"
                items={memberships}
                selectedItem={
                  memberships.find((m) => m.org.publicId === me?.activeOrg?.publicId) ?? null
                }
                itemToString={(m: Membership | null) =>
                  m ? `${m.org.name}${m.org.publicId ? ` (${m.org.publicId})` : ""}` : ""
                }
                onChange={({ selectedItem }: { selectedItem: Membership | null }) => {
                  const handle = selectedItem?.org.publicId ?? selectedItem?.org.slug;
                  if (handle) void handleSwitch(handle);
                }}
              />
            </div>
          )}

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
