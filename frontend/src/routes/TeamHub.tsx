import { Tab, TabList, TabPanel, TabPanels, Tabs, Stack } from "@carbon/react";
import { useSearchParams } from "react-router-dom";
import { can, planAllows, ROLE_RANK } from "@esti/contracts";
import { PageHeader } from "../components/PageHeader.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { Team } from "./Team.js";
import { Hr } from "./Hr.js";
import { Performance } from "./Performance.js";

type TabDef = { slug: string; label: string; panel: React.ReactNode };

/** Internal-office-staff hub: Team roster, HR operations, and performance. */
export function TeamHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const settingsQ = trpc.settings.get.useQuery();
  const licenseQ = trpc.license.status.useQuery();
  const plan = licenseQ.data?.plan ?? settingsQ.data?.plan ?? "LITE";

  const rank = ROLE_RANK[user?.role ?? "VIEWER"] ?? 0;
  const atLeast = (r: number) => rank >= r;

  const allTabs: TabDef[] = [
    { slug: "team", label: "Team", panel: <Team embedded /> },
    ...(can(user?.role, "hr:manage")
      ? [{ slug: "hr", label: "HR", panel: <Hr embedded /> }]
      : []),
    ...(planAllows(plan, "performance") && atLeast(60)
      ? [{ slug: "performance", label: "Performance", panel: <Performance embedded /> }]
      : []),
  ];

  const tab = searchParams.get("tab") ?? "team";
  const tabIndex = Math.max(0, allTabs.findIndex((t) => t.slug === tab));

  return (
    <Stack gap={6}>
      <PageHeader
        title="Team"
        description="Internal office staff — roster, HR operations, and performance."
      />

      <Tabs
        selectedIndex={tabIndex}
        onChange={({ selectedIndex }) =>
          setSearchParams({ tab: allTabs[selectedIndex]?.slug ?? "team" }, { replace: true })
        }
      >
        <TabList aria-label="Team sections" contained>
          {allTabs.map((t) => <Tab key={t.slug}>{t.label}</Tab>)}
        </TabList>
        <TabPanels>
          {allTabs.map((t) => <TabPanel key={t.slug}>{t.panel}</TabPanel>)}
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
