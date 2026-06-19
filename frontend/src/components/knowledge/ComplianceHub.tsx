import {
  Button,
  Column,
  Grid,
  Select,
  SelectItem,
  Stack,
  Tile,
} from "@carbon/react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DataState } from "../DataState.js";
import { RuleVersionManager } from "../RuleVersionManager.js";
import { SiteAssessmentPanel } from "../SiteAssessmentPanel.js";
import { trpc } from "../../lib/trpc.js";

/** Office compliance: jurisdiction rule library + site feasibility (project calc lives on Project Info §9). */
export function ComplianceHub() {
  const rvQ = trpc.ruleVersions.list.useQuery({});
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const meQ = trpc.auth.me.useQuery();
  const canManage = meQ.data?.role === "OWNER" || meQ.data?.role === "SENIOR";

  const [searchParams, setSearchParams] = useSearchParams();
  const [projectId, setProjectId] = useState(searchParams.get("project") ?? "");

  useEffect(() => {
    setProjectId(searchParams.get("project") ?? "");
  }, [searchParams]);

  const publishedRv = (rvQ.data ?? []).filter((r) => r.status === "PUBLISHED");

  function setProjectInUrl(id: string) {
    setProjectId(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "compliance");
      if (id) next.set("project", id);
      else next.delete("project");
      return next;
    }, { replace: true });
  }

  return (
    <Stack gap={7}>
      <Stack gap={2}>
        <h2>Compliance</h2>
        <p style={{ margin: 0, maxWidth: 720 }}>
          Governed jurisdiction rules for development-control calculations. Rules are authored here;
          envelope and audit results are calculated and stored on each project under{" "}
          <strong>Project Info → §9 Compliance</strong>.
        </p>
      </Stack>

      <Stack gap={5}>
        <Stack gap={2}>
          <h3>Rule library</h3>
          <p style={{ margin: 0 }}>
            Versioned rule sets keyed by state, district, authority, building use, and effective date.
            Only published sets can be used in project calculations and site feasibility runs.
          </p>
        </Stack>
        <DataState
          loading={rvQ.isLoading}
          isEmpty={(rvQ.data ?? []).length === 0}
          columnCount={6}
          empty={{
            title: "No rule sets yet",
            description: "Add a jurisdiction rule set to enable compliance calculations.",
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
          <h3>Site feasibility</h3>
          <p style={{ margin: 0 }}>
            Run a multi-engine site assessment from a published rule set. Development envelope and
            violation audits for a live project are saved on{" "}
            <strong>Project Info → §9 Compliance</strong> — not here.
          </p>
        </Stack>
        <Grid>
          <Column sm={4} md={4} lg={8}>
            <Select
              id="kb-compliance-project"
              labelText="Project (for site assessment)"
              value={projectId}
              onChange={(e) => setProjectInUrl(e.target.value)}
            >
              <SelectItem value="" text="Select a project" />
              {(projectsQ.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id} text={`${p.ref} — ${p.title}`} />
              ))}
            </Select>
          </Column>
          {projectId ? (
            <Column sm={4} md={4} lg={8}>
              <Tile>
                <Stack gap={3}>
                  <p style={{ margin: 0 }}>
                    Open this project&apos;s compliance calculator, permits, and saved envelope.
                  </p>
                  <Button
                    kind="tertiary"
                    as={Link}
                    to={`/projects/${projectId}?tab=info#compliance`}
                  >
                    Open project compliance
                  </Button>
                </Stack>
              </Tile>
            </Column>
          ) : null}
        </Grid>
        {projectId ? (
          <SiteAssessmentPanel projectId={projectId} publishedVersions={publishedRv} />
        ) : (
          <Tile>
            <p style={{ margin: 0 }}>
              Select a project to run a site feasibility assessment, or open a project directly to
              calculate and save the development envelope.
            </p>
          </Tile>
        )}
      </Stack>
    </Stack>
  );
}
