import { Tab, TabList, TabPanel, TabPanels, Tabs, Stack } from "@carbon/react";
import { useSearchParams } from "react-router-dom";
import { can, ROLE_RANK } from "@esti/contracts";
import { PageHeader } from "../components/PageHeader.js";
import { useAuth } from "../lib/auth.js";
import { Clients } from "./Clients.js";
import { Consultants } from "./Consultants.js";
import { Contractors } from "./Contractors.js";

type TabDef = { slug: string; label: string; panel: React.ReactNode };

/**
 * OFFICE › External Network (V2 nav). Outside relationships the office works
 * with: clients, consultants, contractors. (Site Supervisors — V2 — not built.)
 * See docs/esti/NAVIGATION.md for the canonical five-pillar IA.
 */
export function ExternalNetworkHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const rank = ROLE_RANK[user?.role ?? "VIEWER"] ?? 0;
  const atLeast = (r: number) => rank >= r;

  const allTabs: TabDef[] = [
    ...(can(user?.role, "write")
      ? [{ slug: "clients", label: "Clients", panel: <Clients embedded /> }]
      : []),
    ...(atLeast(60)
      ? [{ slug: "consultants", label: "Consultants", panel: <Consultants embedded /> }]
      : []),
    ...(atLeast(60)
      ? [{ slug: "contractors", label: "Contractors", panel: <Contractors embedded /> }]
      : []),
  ];

  const tab = searchParams.get("tab") ?? allTabs[0]?.slug ?? "clients";
  const tabIndex = Math.max(0, allTabs.findIndex((t) => t.slug === tab));

  return (
    <Stack gap={6}>
      <PageHeader
        title="External Network"
        description="Clients, consultants, and contractors the office works with."
      />

      <Tabs
        selectedIndex={tabIndex}
        onChange={({ selectedIndex }) =>
          setSearchParams({ tab: allTabs[selectedIndex]?.slug ?? "clients" }, { replace: true })
        }
      >
        <TabList aria-label="External network sections" contained>
          {allTabs.map((t) => <Tab key={t.slug}>{t.label}</Tab>)}
        </TabList>
        <TabPanels>
          {allTabs.map((t) => <TabPanel key={t.slug}>{t.panel}</TabPanel>)}
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
