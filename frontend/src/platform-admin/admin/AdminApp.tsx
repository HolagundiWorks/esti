import { useEffect, useState } from "react";
import { Tab, TabList, TabPanel, TabPanels, Tabs, Tag } from "@carbon/react";
import AccountsTab from "./AccountsTab";
import ApiKeysTab from "./ApiKeysTab";
import LicensesTab from "./LicensesTab";
import OrgsTab from "./OrgsTab";
import ProductsTab from "./ProductsTab";
import RequestsTab from "./RequestsTab";
import { trpc } from "../lib/trpc";

export default function AdminApp() {
  const [pending, setPending] = useState(0);
  useEffect(() => {
    void trpc.admin.requests.pendingCount.query().then(setPending).catch(() => setPending(0));
  }, []);

  return (
    <Tabs>
      <TabList aria-label="Admin sections" contained>
        <Tab>
          Requests{pending > 0 ? <> <Tag type="teal" size="sm">{pending}</Tag></> : null}
        </Tab>
        <Tab>Licenses</Tab>
        <Tab>Accounts</Tab>
        <Tab>Organizations</Tab>
        <Tab>Products &amp; plans</Tab>
        <Tab>API keys</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <RequestsTab />
        </TabPanel>
        <TabPanel>
          <LicensesTab />
        </TabPanel>
        <TabPanel>
          <AccountsTab />
        </TabPanel>
        <TabPanel>
          <OrgsTab />
        </TabPanel>
        <TabPanel>
          <ProductsTab />
        </TabPanel>
        <TabPanel>
          <ApiKeysTab />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
