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
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataState } from "../components/DataState.js";
import { PageHeader } from "../components/PageHeader.js";
import { ProjectBylawCalc } from "../components/ProjectBylawCalc.js";
import { ProjectBylaws } from "../components/ProjectBylaws.js";
import { ProjectPermits } from "../components/ProjectPermits.js";
import { RuleVersionManager } from "../components/RuleVersionManager.js";
import { BbmpFarRuleTable } from "../components/knowledge/BbmpFarRuleTable.js";
import { SiteAssessmentPanel } from "../components/SiteAssessmentPanel.js";
import { SpecCatalogManager } from "../components/knowledge/SpecCatalogManager.js";
import { MasterDsr } from "../components/knowledge/MasterDsr.js";
import { SteelArranger } from "../components/knowledge/SteelArranger.js";
import { trpc } from "../lib/trpc.js";

const KB_TAB_SLUGS = ["dsr", "compliance", "specification", "steelflow"] as const;

export function KnowledgeBank() {
  const rvQ = trpc.ruleVersions.list.useQuery({});
  const bbmpRulesQ = trpc.bbmpRules.activeCatalog.useQuery();
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const meQ = trpc.auth.me.useQuery();
  const canManage = meQ.data?.role === "OWNER" || meQ.data?.role === "SENIOR";

  const [searchParams, setSearchParams] = useSearchParams();
  const [projectId, setProjectId] = useState(searchParams.get("project") ?? "");

  useEffect(() => {
    setProjectId(searchParams.get("project") ?? "");
  }, [searchParams]);

  const tabIndex = Math.max(0, KB_TAB_SLUGS.indexOf(
    (searchParams.get("tab") ?? "dsr") as (typeof KB_TAB_SLUGS)[number],
  ));
  const selectTab = (index: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", KB_TAB_SLUGS[index] ?? "dsr");
      return next;
    }, { replace: true });
  };

  const publishedRv = (rvQ.data ?? []).filter((r) => r.status === "PUBLISHED");

  return (
    <Stack gap={7}>
      <PageHeader
        title="Knowledge Bank"
        description="Governed office standards used by compliance, estimation, specifications, procurement, and reinforcement detailing workflows."
      />

      <Tabs selectedIndex={tabIndex} onChange={({ selectedIndex }) => selectTab(selectedIndex)}>
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

              <Stack gap={3}>
                <Stack gap={2}>
                  <h3>BBMP FAR &amp; ground cover</h3>
                  <p>
                    Modular rule table from the active published BBMP rule set. When
                    site area qualifies for a higher band but the governing road width
                    is lower, the lesser road-width band applies for FAR and coverage.
                  </p>
                </Stack>
                {bbmpRulesQ.data?.catalog ? (
                  <BbmpFarRuleTable
                    catalog={bbmpRulesQ.data.catalog}
                    title={bbmpRulesQ.data.ruleSet.label}
                    description={`Effective ${bbmpRulesQ.data.ruleSet.effectiveDate} · ${bbmpRulesQ.data.ruleSet.sourceCitation ?? "BBMP bye-laws"}`}
                  />
                ) : (
                  <Tile>
                    <p>No active BBMP rule set in the database — using code defaults after migration.</p>
                  </Tile>
                )}
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
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev);
                          if (id) next.set("project", id);
                          else next.delete("project");
                          return next;
                        }, { replace: true });
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
                  <Stack gap={7}>
                    <SiteAssessmentPanel
                      projectId={projectId}
                      publishedVersions={publishedRv}
                    />
                    <Stack gap={5}>
                      <Stack gap={2}>
                        <h2>Permits &amp; development control</h2>
                        <p>
                          Envelope calculator, bylaw parameters, and statutory
                          permits for the selected project.
                        </p>
                      </Stack>
                      <ProjectBylawCalc projectId={projectId} />
                      <ProjectBylaws projectId={projectId} />
                      <ProjectPermits projectId={projectId} />
                    </Stack>
                  </Stack>
                ) : (
                  <Tile>
                    <p>Select a project above to run an assessment.</p>
                  </Tile>
                )}
              </Stack>
            </Stack>
          </TabPanel>

          <TabPanel>
            <SpecCatalogManager embedded />
          </TabPanel>

          <TabPanel>
            <SteelArranger embedded />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
