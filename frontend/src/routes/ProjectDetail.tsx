import {
  Button,
  Loading,
  Select,
  SelectItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
} from "@carbon/react";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_WORK_TYPE_LABEL,
  formatINR,
} from "@esti/contracts";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ProjectApprovals } from "../components/ProjectApprovals.js";
import { ProjectClientLog } from "../components/ProjectClientLog.js";
import { ProjectDrawings } from "../components/ProjectDrawings.js";
import { ProjectBbs } from "../components/ProjectBbs.js";
import { ProjectDocuments } from "../components/ProjectDocuments.js";
import { ProjectEstimates } from "../components/ProjectEstimates.js";
import { ProjectPurchaseOrders } from "../components/ProjectPurchaseOrders.js";
import { ProjectSettings } from "../components/ProjectSettings.js";
import { ProjectTransmittals } from "../components/ProjectTransmittals.js";
import { ProjectTeam } from "../components/ProjectTeam.js";
import { ContextualComments } from "../components/ContextualComments.js";
import { ProjectOverview } from "../components/ProjectOverview.js";
import { ProjectBylawData } from "../components/ProjectBylawData.js";
import { trpc } from "../lib/trpc.js";

const PROJECT_STATUS_TAG: Record<
  string,
  "gray" | "blue" | "purple" | "green" | "red" | "teal"
> = {
  ENQUIRY: "gray",
  PROPOSAL: "teal",
  ACTIVE: "blue",
  ON_HOLD: "purple",
  COMPLETED: "green",
  CANCELLED: "red",
};

export function ProjectDetail() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const project = trpc.projectOffice.byId.useQuery({ id }, { enabled: !!id });
  const hrEnabled = trpc.settings.get.useQuery().data?.hrEnabled ?? false;
  const phasesQ = trpc.phases.listByProject.useQuery(
    { projectId: id },
    { enabled: !!id },
  );

  const TAB_SLUGS = [
    "overview",
    "compliance",
    "clientlog",
    "costing",
    "drawings",
    "documents",
    "team",
    "comments",
    "settings",
  ];
  const tabSlug = searchParams.get("tab") ?? "overview";
  const tabIndex = Math.max(0, TAB_SLUGS.indexOf(tabSlug));

  if (project.isLoading)
    return <Loading description="Loading project" withOverlay={false} />;
  if (!project.data)
    return (
      <p>
        Project not found. <Link to="/projects">Back</Link>
      </p>
    );
  const p = project.data;
  const phases = phasesQ.data ?? [];
  // Current stage is stored on the project; fall back to the last stage.
  const currentPhase =
    phases.find((ph) => ph.id === p.currentPhaseId) ?? phases[phases.length - 1];

  return (
    <div>
      {/* Sticky project context banner — persists as user scrolls through tab content */}
      <div
        style={{
          position: "sticky",
          top: 48,
          zIndex: 100,
          paddingBottom: 8,
        }}
      >
        <Link to="/projects">← Projects</Link>
        <h1>
          {p.ref} — {p.title}
        </h1>
        <div
          style={{
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span>
            {
              PROJECT_WORK_TYPE_LABEL[
                (p as { workType?: keyof typeof PROJECT_WORK_TYPE_LABEL })
                  .workType ?? "ARCHITECTURE"
              ]
            }{" "}
            · {p.projectType} · {p.jurisdiction}
          </span>
          <Tag type={PROJECT_STATUS_TAG[p.status] ?? "gray"} size="sm">
            {PROJECT_STATUS_LABEL[
              p.status as keyof typeof PROJECT_STATUS_LABEL
            ] ?? p.status}
          </Tag>
          <span>· {formatINR(p.contractValuePaise, { paise: false })}</span>
        </div>
        {phases.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 12,
              marginTop: 8,
              maxWidth: 520,
            }}
          >
            <Select
              id="project-stage"
              labelText="Current project stage"
              size="sm"
              value={currentPhase?.id ?? ""}
              onChange={() =>
                setSearchParams({ tab: "settings" }, { replace: true })
              }
              style={{ flex: 1 }}
            >
              {phases.map((ph) => (
                <SelectItem
                  key={ph.id}
                  value={ph.id}
                  text={ph.label}
                />
              ))}
            </Select>
            <Button
              kind="ghost"
              size="sm"
              onClick={() =>
                setSearchParams({ tab: "settings" }, { replace: true })
              }
            >
              Update stages
            </Button>
          </div>
        )}
      </div>

      <Tabs
        selectedIndex={tabIndex}
        onChange={({ selectedIndex }) =>
          setSearchParams(
            { tab: TAB_SLUGS[selectedIndex] ?? "clientlog" },
            { replace: true },
          )
        }
      >
        <TabList aria-label="Project sections" contained>
          <Tab>Overview</Tab>
          <Tab>Compliance</Tab>
          <Tab>Client log</Tab>
          <Tab>Costing</Tab>
          <Tab>Drawings</Tab>
          <Tab>Documents</Tab>
          <Tab>Team</Tab>
          <Tab>Comments</Tab>
          <Tab>Settings</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <ProjectOverview projectId={id} />
          </TabPanel>
          <TabPanel>
            <ProjectBylawData projectId={id} />
          </TabPanel>
          <TabPanel>
            <ProjectClientLog projectId={id} />
          </TabPanel>
          <TabPanel>
            <ProjectEstimates projectId={id} />

            <ProjectBbs projectId={id} />

            <ProjectPurchaseOrders projectId={id} />
          </TabPanel>
          <TabPanel>
            <ProjectDrawings projectId={id} />

            <ProjectTransmittals projectId={id} />

            <ProjectApprovals projectId={id} />
          </TabPanel>
          <TabPanel>
            <ProjectDocuments projectId={id} />
          </TabPanel>
          <TabPanel>
            {hrEnabled ? (
              <ProjectTeam projectId={id} />
            ) : (
              <p>
                The Team &amp; HR module is off — enable it in Company settings
                to assign staff.
              </p>
            )}
          </TabPanel>
          <TabPanel>
            <ContextualComments
              projectId={id}
              objectType="projectoffice"
              objectId={id}
              heading="Project comments"
              description="Contextual discussion linked directly to this project."
            />
          </TabPanel>
          <TabPanel>
            <ProjectSettings projectId={id} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
