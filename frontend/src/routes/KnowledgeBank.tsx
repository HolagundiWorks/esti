import {
  Column,
  Grid,
  Select,
  SelectItem,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Tile,
} from "@carbon/react";
import {
  RULE_VERSION_STATUS_LABEL,
  RULE_VERSION_STATUS_TAG,
  type RuleVersionStatus,
} from "@esti/contracts";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { RuleVersionManager } from "../components/RuleVersionManager.js";
import { SiteAssessmentPanel } from "../components/SiteAssessmentPanel.js";
import { SpecificationManager } from "../components/KnowledgeCatalogManagers.js";
import { trpc } from "../lib/trpc.js";
import { MasterDsr } from "./MasterDsr.js";

export function KnowledgeBank() {
  const rvQ = trpc.ruleVersions.list.useQuery({});
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const meQ = trpc.auth.me.useQuery();
  const canManage = meQ.data?.role === "OWNER" || meQ.data?.role === "SENIOR";
  const canManageCatalogs =
    !!meQ.data && !["VIEWER", "CLIENT"].includes(meQ.data.role);

  const [searchParams, setSearchParams] = useSearchParams();
  const [projectId, setProjectId] = useState(searchParams.get("project") ?? "");

  const publishedRv = (rvQ.data ?? []).filter((r) => r.status === "PUBLISHED");

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
        </TabList>
        <TabPanels>
          <TabPanel>
            <MasterDsr embedded />
          </TabPanel>

          {/* Compliance: rule-set authoring + project assessments in one place */}
          <TabPanel>
            <Stack gap={7}>
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
                    description: "Add a rule set to enable compliance assessments.",
                  }}
                >
                  <RuleVersionManager
                    versions={rvQ.data ?? []}
                    canManage={canManage}
                    onRefresh={() => rvQ.refetch()}
                  />
                </DataState>
              </Stack>

              <Stack gap={5}>
                <Stack gap={2}>
                  <h2>Site assessments</h2>
                  <p>
                    Run deterministic site assessment engines from published rule sets
                    and retain project-linked feasibility results.
                  </p>
                </Stack>
                <Grid>
                  <Column sm={4} md={4} lg={8}>
                    <Select
                      id="kb-compliance-project"
                      labelText="Project"
                      value={projectId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setProjectId(id);
                        setSearchParams(id ? { project: id } : {}, { replace: true });
                      }}
                    >
                      <SelectItem value="" text="Select a project" />
                      {(projectsQ.data ?? []).map((p) => (
                        <SelectItem
                          key={p.id}
                          value={p.id}
                          text={`${p.ref} — ${p.title}`}
                        />
                      ))}
                    </Select>
                  </Column>
                  <Column sm={4} md={4} lg={8}>
                    <Tile>
                      <Stack gap={2}>
                        <h4>Published rule sets</h4>
                        {publishedRv.length === 0 ? (
                          <p>No published rule sets yet.</p>
                        ) : (
                          publishedRv.map((rv) => (
                            <Stack key={rv.id} orientation="horizontal" gap={3}>
                              <Tag
                                type={
                                  RULE_VERSION_STATUS_TAG[rv.status as RuleVersionStatus] ?? "gray"
                                }
                              >
                                {RULE_VERSION_STATUS_LABEL[rv.status as RuleVersionStatus] ?? rv.status}
                              </Tag>
                              <span>
                                {rv.authority} · {rv.district} · {rv.buildingUse} · {rv.effectiveDate}
                              </span>
                            </Stack>
                          ))
                        )}
                      </Stack>
                    </Tile>
                  </Column>
                </Grid>
                {projectId ? (
                  <SiteAssessmentPanel
                    projectId={projectId}
                    publishedVersions={publishedRv}
                  />
                ) : (
                  <Tile>
                    <p>Select a project above to run an assessment.</p>
                  </Tile>
                )}
              </Stack>
            </Stack>
          </TabPanel>

          <TabPanel>
            <SpecificationManager canManage={canManageCatalogs} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
