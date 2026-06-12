import {
  Column,
  Grid,
  Select,
  SelectItem,
  Stack,
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
import { SiteAssessmentPanel } from "../components/SiteAssessmentPanel.js";
import { trpc } from "../lib/trpc.js";

export function Compliance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const [projectId, setProjectId] = useState(searchParams.get("project") ?? "");
  const rvQ = trpc.ruleVersions.list.useQuery({});
  const publishedRv = (rvQ.data ?? []).filter((r) => r.status === "PUBLISHED");

  return (
    <Stack gap={7}>
      <Stack gap={3}>
        <h1>Compliance</h1>
        <p>
          Run deterministic site assessment engines from published Knowledge
          Bank rule sets and retain project-linked feasibility results.
        </p>
      </Stack>
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
                  <p>
                    No published rule sets. Publish a rule version in the
                    Knowledge Bank.
                  </p>
                ) : (
                  publishedRv.map((rv) => (
                    <Stack key={rv.id} orientation="horizontal" gap={3}>
                      <Tag
                        type={
                          RULE_VERSION_STATUS_TAG[
                            rv.status as RuleVersionStatus
                          ] ?? "gray"
                        }
                      >
                        {RULE_VERSION_STATUS_LABEL[
                          rv.status as RuleVersionStatus
                        ] ?? rv.status}
                      </Tag>
                      <span>
                        {rv.authority} · {rv.district} · {rv.buildingUse} ·{" "}
                        {rv.effectiveDate}
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
  );
}
