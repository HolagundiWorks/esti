import {
  Breadcrumb,
  BreadcrumbItem,
  Loading,
  Stack,
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
import { type ReactNode, useEffect, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ProjectApprovals } from "../components/ProjectApprovals.js";
import { ProjectClientLog } from "../components/ProjectClientLog.js";
import { ProjectDrawings } from "../components/ProjectDrawings.js";
import { ProjectBbs } from "../components/ProjectBbs.js";
import { ProjectDocuments, ProjectSpecSheets } from "../components/ProjectDocuments.js";
import { ProjectEstimates } from "../components/ProjectEstimates.js";
import { ProjectExpenses } from "../components/ProjectExpenses.js";
import { ProjectRunningBills } from "../components/ProjectRunningBills.js";
import { ProjectPurchaseOrders } from "../components/ProjectPurchaseOrders.js";
import { ProjectSettings } from "../components/ProjectSettings.js";
import { ProjectTransmittals } from "../components/ProjectTransmittals.js";
import { ProjectTeam } from "../components/ProjectTeam.js";
import { ContextualComments } from "../components/ContextualComments.js";
import { ProjectLessons } from "../components/ProjectLessons.js";
import { ProjectOverview } from "../components/ProjectOverview.js";
import { ProjectInfo } from "../components/ProjectInfo.js";
import { ProjectProgramme } from "../components/ProjectProgramme.js";
import { ProjectPmc } from "../components/ProjectPmc.js";
import { useCapabilities } from "../lib/capabilities.js";
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

type ProjectTab = { slug: string; label: string; panel: ReactNode };
type ProjectGroup = { slug: string; label: string; tabs: ProjectTab[] };

export function ProjectDetail() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canInvoice, canHr } = useCapabilities();
  const project = trpc.projectOffice.byId.useQuery({ id }, { enabled: !!id });
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const firmPmcEnabled = settingsQ.data?.pmcEnabled ?? false;
  const phasesQ = trpc.phases.listByProject.useQuery(
    { projectId: id },
    { enabled: !!id },
  );

  const showPmc =
    firmPmcEnabled &&
    ((project.data as { pmcEnabled?: boolean } | undefined)?.pmcEnabled ?? false);
  const showCosting = canInvoice;
  const showTeam = hrEnabled && canHr;

  const projectGroups = useMemo((): ProjectGroup[] => {
    const infoTabs: ProjectTab[] = [
      { slug: "overview", label: "Overview", panel: <ProjectOverview projectId={id} /> },
      { slug: "info", label: "Project Info", panel: <ProjectInfo projectId={id} /> },
      { slug: "programme", label: "Programme", panel: <ProjectProgramme projectId={id} /> },
      { slug: "settings", label: "Settings", panel: <ProjectSettings projectId={id} /> },
    ];

    const consultancyTabs: ProjectTab[] = [{
      slug: "clientlog",
      label: "Client log",
      panel: <ProjectClientLog projectId={id} />,
    }, {
      slug: "drawings",
      label: "Drawings",
      panel: (
        <>
          <ProjectDrawings projectId={id} />
          <ProjectTransmittals projectId={id} />
          <ProjectApprovals projectId={id} />
        </>
      ),
    }, {
      slug: "documents",
      label: "Documents",
      panel: <ProjectDocuments projectId={id} includeSpecs={false} />,
    }];
    if (showTeam) {
      consultancyTabs.push({ slug: "team", label: "Team", panel: <ProjectTeam projectId={id} /> });
    }
    consultancyTabs.push(
      {
        slug: "comments",
        label: "Comments",
        panel: (
          <ContextualComments
            projectId={id}
            objectType="projectoffice"
            objectId={id}
            heading="Project comments"
            description="Contextual discussion linked directly to this project."
          />
        ),
      },
      { slug: "lessons", label: "Lessons", panel: <ProjectLessons projectId={id} /> },
    );

    const pmcTabs: ProjectTab[] = [];
    if (showPmc) {
      pmcTabs.push({ slug: "pmc", label: "PMC control", panel: <ProjectPmc projectId={id} /> });
    }
    if (showCosting) {
      pmcTabs.push({
        slug: "costing",
        label: "Costing",
        panel: (
          <>
            <ProjectEstimates projectId={id} />
            <ProjectBbs projectId={id} />
            <ProjectExpenses projectId={id} />
          </>
        ),
      });
      pmcTabs.push({ slug: "running-bills", label: "Running bills", panel: <ProjectRunningBills projectId={id} /> });
      pmcTabs.push({ slug: "purchase-orders", label: "Purchase orders", panel: <ProjectPurchaseOrders projectId={id} /> });
      pmcTabs.push({ slug: "spec-sheets", label: "Specification sheets", panel: <ProjectSpecSheets projectId={id} /> });
    }

    return [
      { slug: "info", label: "Info", tabs: infoTabs },
      { slug: "consultancy", label: "Consultancy", tabs: consultancyTabs },
      ...(pmcTabs.length > 0 ? [{ slug: "pmc", label: "PMC", tabs: pmcTabs }] : []),
    ];
  }, [id, showPmc, showCosting, showTeam]);

  const projectTabs = projectGroups.flatMap((g) => g.tabs);

  const rawTab = searchParams.get("tab") ?? "overview";
  const tabSlug = rawTab === "compliance" ? "info" : rawTab;
  const tabIndex = Math.max(
    0,
    projectTabs.findIndex((t) => t.slug === tabSlug),
  );
  const activeTab = projectTabs[tabIndex]?.slug ?? "overview";
  const groupIndex = Math.max(
    0,
    projectGroups.findIndex((g) => g.tabs.some((t) => t.slug === activeTab)),
  );
  const activeGroup = projectGroups[groupIndex] ?? projectGroups[0]!;
  const innerIndex = Math.max(0, activeGroup.tabs.findIndex((t) => t.slug === activeTab));

  useEffect(() => {
    if (rawTab === "compliance") {
      setSearchParams({ tab: "info" }, { replace: true });
      window.location.hash = "compliance";
      return;
    }
    if (tabSlug !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [rawTab, tabSlug, activeTab, setSearchParams]);

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
  const currentPhase =
    phases.find((ph) => ph.id === p.currentPhaseId) ?? phases[phases.length - 1];

  return (
    <div>
      <div
        style={{
          position: "sticky",
          top: "var(--esti-sticky-top, 48px)",
          zIndex: 100,
          paddingBottom: "var(--cds-spacing-03)",
          background: "var(--cds-background)",
        }}
      >
        <Breadcrumb noTrailingSlash>
          <BreadcrumbItem>
            <Link to="/projects">Projects</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>{p.ref}</BreadcrumbItem>
        </Breadcrumb>
        <h1>
          {p.ref} — {p.title}
        </h1>
        <Stack orientation="horizontal" gap={2} style={{ flexWrap: "wrap" }}>
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
        </Stack>
        {phases.length > 0 && currentPhase && (
          <div style={{ marginTop: "var(--cds-spacing-03)" }}>
            <Link to={`/projects/${id}?tab=info`}>
              <Tag type="blue" size="md">
                Stage: {currentPhase.label}
              </Tag>
            </Link>
          </div>
        )}
      </div>

      <Tabs
        selectedIndex={groupIndex}
        onChange={({ selectedIndex }) =>
          setSearchParams(
            { tab: projectGroups[selectedIndex]?.tabs[0]?.slug ?? "overview" },
            { replace: true },
          )
        }
      >
        <TabList aria-label="Project sections" contained>
          {projectGroups.map((group) => (
            <Tab key={group.slug}>{group.label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {projectGroups.map((group) => (
            <TabPanel key={group.slug}>
              <Tabs
                selectedIndex={group.slug === activeGroup.slug ? innerIndex : 0}
                onChange={({ selectedIndex }) =>
                  setSearchParams(
                    { tab: group.tabs[selectedIndex]?.slug ?? group.tabs[0]?.slug ?? "overview" },
                    { replace: true },
                  )
                }
              >
                <TabList aria-label={`${group.label} project sections`}>
                  {group.tabs.map((t) => (
                    <Tab key={t.slug}>{t.label}</Tab>
                  ))}
                </TabList>
                <TabPanels>
                  {group.tabs.map((t) => (
                    <TabPanel key={t.slug}>{t.panel}</TabPanel>
                  ))}
                </TabPanels>
              </Tabs>
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </div>
  );
}
