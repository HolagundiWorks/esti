import { useEffect, useState } from "react";
import AccountsTab from "./AccountsTab";
import ApiKeysTab from "./ApiKeysTab";
import DashboardTab from "./DashboardTab";
import LicensesTab from "./LicensesTab";
import OrgsTab from "./OrgsTab";
import ProductsTab from "./ProductsTab";
import RequestsTab from "./RequestsTab";
import {
  AdminConsoleShell,
  type AdminSectionKey,
} from "../../components/portal/AdminConsoleShell.js";
import { AdminSection } from "../../components/portal/AdminSection.js";
import { trpc } from "../lib/trpc";

const SECTION_COPY: Record<
  AdminSectionKey,
  { title: string; description: string }
> = {
  dashboard: {
    title: "Dashboard",
    description: "License-manager overview — status, expiries, and recent activity across every organization.",
  },
  requests: {
    title: "Licence requests",
    description: "Review and fulfil plan requests from customers.",
  },
  licenses: {
    title: "Licences",
    description: "Issue, extend, suspend, and revoke product licences.",
  },
  accounts: {
    title: "Accounts",
    description: "Search accounts, reset passwords, suspend, or delete.",
  },
  orgs: {
    title: "Organizations",
    description: "Browse companies registered on the licensing platform.",
  },
  products: {
    title: "Products & plans",
    description: "Catalogue of licensable products and plan tiers.",
  },
  apikeys: {
    title: "API keys",
    description: "Platform integration keys for external services.",
  },
};

export default function AdminApp({
  email,
  isPlatformAdmin,
}: {
  email: string;
  isPlatformAdmin: boolean;
}) {
  const [section, setSection] = useState<AdminSectionKey>("dashboard");
  const [pending, setPending] = useState(0);

  useEffect(() => {
    void trpc.admin.requests.pendingCount.query().then(setPending).catch(() => setPending(0));
  }, []);

  const copy = SECTION_COPY[section];

  return (
    <AdminConsoleShell
      section={section}
      onSectionChange={setSection}
      pendingRequests={pending}
      email={email}
      isPlatformAdmin={isPlatformAdmin}
    >
      <AdminSection title={copy.title} description={copy.description}>
        {section === "dashboard" && <DashboardTab onGoTo={setSection} />}
        {section === "requests" && <RequestsTab />}
        {section === "licenses" && <LicensesTab />}
        {section === "accounts" && <AccountsTab />}
        {section === "orgs" && <OrgsTab />}
        {section === "products" && <ProductsTab />}
        {section === "apikeys" && <ApiKeysTab />}
      </AdminSection>
    </AdminConsoleShell>
  );
}
