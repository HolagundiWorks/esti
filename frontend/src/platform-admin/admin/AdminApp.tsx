import { useEffect, useState } from "react";
import { Box, Chip, Tab, Tabs } from "@mui/material";
import AccountsTab from "./AccountsTab";
import ApiKeysTab from "./ApiKeysTab";
import LicensesTab from "./LicensesTab";
import OrgsTab from "./OrgsTab";
import ProductsTab from "./ProductsTab";
import RequestsTab from "./RequestsTab";
import { trpc } from "../lib/trpc";

export default function AdminApp() {
  const [tab, setTab] = useState(0);
  const [pending, setPending] = useState(0);
  useEffect(() => {
    void trpc.admin.requests.pendingCount.query().then(setPending).catch(() => setPending(0));
  }, []);

  return (
    <>
      <Tabs value={tab} onChange={(_e, v: number) => setTab(v)} variant="scrollable" aria-label="Admin sections">
        <Tab
          label={
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
              Requests
              {pending > 0 && <Chip size="small" color="info" label={pending} />}
            </Box>
          }
        />
        <Tab label="Licenses" />
        <Tab label="Accounts" />
        <Tab label="Organizations" />
        <Tab label="Products & plans" />
        <Tab label="API keys" />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        {tab === 0 && <RequestsTab />}
        {tab === 1 && <LicensesTab />}
        {tab === 2 && <AccountsTab />}
        {tab === 3 && <OrgsTab />}
        {tab === 4 && <ProductsTab />}
        {tab === 5 && <ApiKeysTab />}
      </Box>
    </>
  );
}
