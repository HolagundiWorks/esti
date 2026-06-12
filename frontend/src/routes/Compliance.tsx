import {
  Button,
  Column,
  Grid,
  Modal,
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
import { trpc } from "../lib/trpc.js";

export function Compliance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const [projectId, setProjectId] = useState(searchParams.get("project") ?? "");
  const rvQ = trpc.ruleVersions.list.useQuery({});
  const meQ = trpc.auth.me.useQuery();
  const canManage = meQ.data?.role === "OWNER" || meQ.data?.role === "SENIOR";

  const publishedRv = (rvQ.data ?? []).filter((r) => r.status === "PUBLISHED");

  return (
    <Stack gap={7}>
      <Stack gap={3}>
        <h1>Compliance</h1>
        <p>
          Versioned development-control knowledge bank, site assessment engines,
          and project-linked feasibility reports.
        </p>
      </Stack>

      <Tabs>
        <TabList aria-label="Compliance sections">
          <Tab>Knowledge Bank</Tab>
          <Tab>Run Assessment</Tab>
        </TabList>
        <TabPanels>

          {/* ── Knowledge Bank ── */}
          <TabPanel>
            <Stack gap={6}>
              <Grid>
                <Column sm={4} md={8} lg={12}>
                  <Stack gap={4}>
                    <Stack orientation="horizontal" gap={4}>
                      <Stack gap={2} className="esti-grow">
                        <h2>Rule versions</h2>
                        <p>
                          Jurisdiction-specific rule sets keyed by state, district,
                          authority, and building use. Only Published versions can
                          be used for assessments.
                        </p>
                      </Stack>
                    </Stack>

                    <DataState
                      loading={rvQ.isLoading}
                      isEmpty={(rvQ.data ?? []).length === 0}
                      columnCount={6}
                      empty={{
                        title: "No rule versions yet",
                        description: "Add a rule set to enable the RIE engines.",
                      }}
                    >
                      <RuleVersionManager
                        versions={rvQ.data ?? []}
                        canManage={canManage}
                        onRefresh={() => rvQ.refetch()}
                      />
                    </DataState>
                  </Stack>
                </Column>
              </Grid>
            </Stack>
          </TabPanel>

          {/* ── Run Assessment ── */}
          <TabPanel>
            <Stack gap={5}>
              <Grid>
                <Column sm={4} md={4} lg={8}>
                  <Select
                    id="compliance-project"
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
                      <SelectItem key={p.id} value={p.id} text={`${p.ref} — ${p.title}`} />
                    ))}
                  </Select>
                </Column>
                <Column sm={4} md={4} lg={8}>
                  <Tile>
                    <Stack gap={2}>
                      <h4>Published rule sets</h4>
                      {publishedRv.length === 0 ? (
                        <p>No published rule sets. Publish a rule version in the Knowledge Bank tab.</p>
                      ) : (
                        publishedRv.map((rv) => (
                          <Stack key={rv.id} orientation="horizontal" gap={3}>
                            <Tag type={RULE_VERSION_STATUS_TAG[rv.status as RuleVersionStatus] ?? "gray"}>
                              {RULE_VERSION_STATUS_LABEL[rv.status as RuleVersionStatus] ?? rv.status}
                            </Tag>
                            <span>{rv.authority} · {rv.district} · {rv.buildingUse} · {rv.effectiveDate}</span>
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
          </TabPanel>

        </TabPanels>
      </Tabs>
    </Stack>
  );
}
