import { Stack, Tab, TabList, TabPanel, TabPanels, Tabs } from "@carbon/react";
import { DataState } from "../components/DataState.js";
import { RuleVersionManager } from "../components/RuleVersionManager.js";
import { SpecificationManager } from "../components/KnowledgeCatalogManagers.js";
import { trpc } from "../lib/trpc.js";
import { MasterDsr } from "./MasterDsr.js";
import { SteelArranger } from "./SteelArranger.js";

export function KnowledgeBank() {
  const rvQ = trpc.ruleVersions.list.useQuery({});
  const meQ = trpc.auth.me.useQuery();
  const canManage = meQ.data?.role === "OWNER" || meQ.data?.role === "SENIOR";
  const canManageCatalogs =
    !!meQ.data && !["VIEWER", "CLIENT"].includes(meQ.data.role);

  return (
    <Stack gap={7}>
      <Stack gap={3}>
        <h1>Knowledge Bank</h1>
        <p>
          Governed office standards used by compliance, estimation,
          specifications, procurement, and reinforcement detailing workflows.
        </p>
      </Stack>

      <Tabs>
        <TabList aria-label="Knowledge Bank sections">
          <Tab>Master DSR</Tab>
          <Tab>Compliance</Tab>
          <Tab>Specification</Tab>
          <Tab>SteelFlow</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <MasterDsr embedded />
          </TabPanel>
          <TabPanel>
            <Stack gap={5}>
              <Stack gap={2}>
                <h2>Compliance rule sets</h2>
                <p>
                  Jurisdiction-specific versions keyed by state, district,
                  authority, building use, source, and effective date. Only
                  published versions can be used for assessments.
                </p>
              </Stack>
              <DataState
                loading={rvQ.isLoading}
                isEmpty={(rvQ.data ?? []).length === 0}
                columnCount={6}
                empty={{
                  title: "No rule versions yet",
                  description:
                    "Add a rule set to enable compliance assessments.",
                }}
              >
                <RuleVersionManager
                  versions={rvQ.data ?? []}
                  canManage={canManage}
                  onRefresh={() => rvQ.refetch()}
                />
              </DataState>
            </Stack>
          </TabPanel>
          <TabPanel>
            <SpecificationManager canManage={canManageCatalogs} />
          </TabPanel>
          <TabPanel>
            <SteelArranger />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
