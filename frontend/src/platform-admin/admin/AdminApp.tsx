import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@carbon/react";
import ApiKeysTab from "./ApiKeysTab";
import LicensesTab from "./LicensesTab";
import OrgsTab from "./OrgsTab";
import ProductsTab from "./ProductsTab";

export default function AdminApp() {
  return (
    <Tabs>
      <TabList aria-label="Admin sections" contained>
        <Tab>Licenses</Tab>
        <Tab>Organizations</Tab>
        <Tab>Products &amp; plans</Tab>
        <Tab>API keys</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <LicensesTab />
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
