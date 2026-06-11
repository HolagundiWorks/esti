import {
  Column,
  Grid,
  Select,
  SelectItem,
  Stack,
  Tag,
  Tile,
} from "@carbon/react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ProjectBylawCalc } from "../components/ProjectBylawCalc.js";
import { trpc } from "../lib/trpc.js";

export function Compliance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const [projectId, setProjectId] = useState(searchParams.get("project") ?? "");
  const projectQ = trpc.projectOffice.byId.useQuery(
    { id: projectId },
    { enabled: !!projectId },
  );

  return (
    <Stack gap={7}>
      <div>
        <h1>Compliance</h1>
        <p>
          Standalone development-control knowledge, calculations, and
          project-linked reports.
        </p>
      </div>
      <Grid>
        <Column sm={4} md={4} lg={8}>
          <Select
            id="compliance-project"
            labelText="Project"
            value={projectId}
            onChange={(event) => {
              const id = event.target.value;
              setProjectId(id);
              setSearchParams(id ? { project: id } : {}, { replace: true });
            }}
          >
            <SelectItem value="" text="Select a project" />
            {(projectsQ.data ?? []).map((project) => (
              <SelectItem
                key={project.id}
                value={project.id}
                text={`${project.ref} - ${project.title}`}
              />
            ))}
          </Select>
        </Column>
        <Column sm={4} md={4} lg={8}>
          <Tile>
            <Stack gap={3}>
              <h3>Knowledge context</h3>
              {projectQ.data ? (
                <>
                  <Tag type="blue">{projectQ.data.jurisdiction}</Tag>
                  <p>
                    {[projectQ.data.district, projectQ.data.state]
                      .filter(Boolean)
                      .join(", ") || "District and state not recorded"}
                  </p>
                  <p>
                    Rule sets must be versioned by state, district, authority,
                    building use, and effective date.
                  </p>
                </>
              ) : (
                <p>Select a project to load its jurisdiction context.</p>
              )}
            </Stack>
          </Tile>
        </Column>
      </Grid>
      {projectId ? (
        <ProjectBylawCalc projectId={projectId} />
      ) : (
        <Tile>
          <p>
            Select a project to calculate ground cover, FAR area, setbacks, and
            restricted building lines.
          </p>
        </Tile>
      )}
    </Stack>
  );
}
