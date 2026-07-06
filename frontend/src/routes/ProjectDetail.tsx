import {
  Box,
  Breadcrumbs,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TAG,
  PROJECT_WORK_TYPE_LABEL,
  type ProjectStatus,
} from "@esti/contracts";
import { type ReactNode, useEffect, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ProjectApprovals } from "../components/ProjectApprovals.js";
import { ProjectCommunicationsLog } from "../components/ProjectCommunicationsLog.js";
import { ProjectDrawings } from "../components/ProjectDrawings.js";
import { ProjectDocuments, ProjectSpecSheets } from "../components/ProjectDocuments.js";
import { ProjectPermits } from "../components/ProjectPermits.js";
import { ProjectSettings } from "../components/ProjectSettings.js";
import { ProjectTransmittals } from "../components/ProjectTransmittals.js";
import { ProjectTeam } from "../components/ProjectTeam.js";
import { ProjectLessons } from "../components/ProjectLessons.js";
import { ProjectOverview } from "../components/ProjectOverview.js";
import { ProjectPipeline } from "../components/ProjectPipeline.js";
import { ProjectProgram } from "../components/ProjectProgram.js";
import { ProjectCpi } from "../components/ProjectCpi.js";
import { ProjectInfo } from "../components/ProjectInfo.js";
import { ProjectMinutes } from "../components/ProjectMinutes.js";
import { ProjectSiteVisits } from "../components/ProjectSiteVisits.js";
import { ProjectEstimation } from "../components/cms/ProjectEstimation.js";
import { ProjectEstimateBoq } from "../components/cms/ProjectEstimateBoq.js";
import { ProjectBbs } from "../components/cms/ProjectBbs.js";
import { ProjectSiteMeasurement } from "../components/cms/ProjectSiteMeasurement.js";
import { ProjectWorkOrders } from "../components/cms/ProjectWorkOrders.js";
import { ProjectContractorBills } from "../components/cms/ProjectContractorBills.js";
import { ProjectCostIntelligence } from "../components/cms/ProjectCostIntelligence.js";
import { StatusTag } from "../components/StatusTag.js";
import { useCapabilities } from "../lib/capabilities.js";
import { trpc } from "../lib/trpc.js";

type ProjectTab = { slug: string; label: string; panel: ReactNode };
type ProjectGroup = { slug: string; label: string; tabs: ProjectTab[] };

export function ProjectDetail() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canHr } = useCapabilities();
  const project = trpc.projectOffice.byId.useQuery({ id }, { enabled: !!id });
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const phasesQ = trpc.phases.listByProject.useQuery(
    { projectId: id },
    { enabled: !!id },
  );

  const showTeam = hrEnabled && canHr;
  const isResidential = /residential/i.test(project.data?.projectType ?? "");

  const projectGroups = useMemo((): ProjectGroup[] => {
    // ── Setup (shared) — identity, info, schedule and admin live above the heads.
    const setupTabs: ProjectTab[] = [
      { slug: "overview", label: "Overview", panel: <ProjectOverview projectId={id} /> },
      { slug: "pipeline", label: "Pipeline", panel: <ProjectPipeline projectId={id} /> },
      { slug: "program", label: "Program", panel: <ProjectProgram projectId={id} /> },
      { slug: "info", label: "Project Info", panel: <ProjectInfo projectId={id} /> },
      // CPI — residential onboarding questionnaire (only for residential projects).
      ...(isResidential
        ? [{ slug: "cpi", label: "CPI", panel: <ProjectCpi projectId={id} /> } satisfies ProjectTab]
        : []),
      { slug: "permits", label: "Permits", panel: <ProjectPermits projectId={id} /> },
      { slug: "settings", label: "Settings", panel: <ProjectSettings projectId={id} /> },
    ];

    // ── Consultancy — design delivery.
    const consultancyTabs: ProjectTab[] = [
      {
        slug: "drawings",
        label: "Drawings & approvals",
        panel: (
          <>
            <ProjectDrawings projectId={id} />
            <ProjectTransmittals projectId={id} />
            <ProjectApprovals projectId={id} />
          </>
        ),
      },
      {
        slug: "documents",
        label: "Documents",
        panel: <ProjectDocuments projectId={id} includeSpecs={false} />,
      },
      { slug: "spec-sheets", label: "Specifications", panel: <ProjectSpecSheets projectId={id} /> },
    ];
    if (showTeam) {
      consultancyTabs.push({ slug: "team", label: "Team", panel: <ProjectTeam projectId={id} /> });
    }
    consultancyTabs.push(
      { slug: "site-visits", label: "Site Progress", panel: <ProjectSiteVisits projectId={id} /> },
      {
        slug: "communications",
        label: "Communications",
        panel: <ProjectCommunicationsLog projectId={id} />,
      },
      { slug: "minutes", label: "Minutes", panel: <ProjectMinutes projectId={id} /> },
      { slug: "lessons", label: "Lessons", panel: <ProjectLessons projectId={id} /> },
    );

    // ── Cost Management — estimate import/re-cost + element cost control.
    const cmsTabs: ProjectTab[] = [
      { slug: "estimation", label: "Estimation", panel: <ProjectEstimation projectId={id} /> },
      { slug: "boq", label: "BOQ", panel: <ProjectEstimateBoq projectId={id} /> },
      { slug: "bbs", label: "BBS", panel: <ProjectBbs projectId={id} /> },
      { slug: "site-measurement", label: "Site Measurement", panel: <ProjectSiteMeasurement projectId={id} /> },
      { slug: "work-orders", label: "Work Orders", panel: <ProjectWorkOrders projectId={id} /> },
      { slug: "contractor-bills", label: "Contractor Bills", panel: <ProjectContractorBills projectId={id} /> },
      { slug: "cost-intelligence", label: "Cost Intelligence", panel: <ProjectCostIntelligence projectId={id} /> },
    ];

    return [
      { slug: "setup", label: "Setup", tabs: setupTabs },
      { slug: "consultancy", label: "Project workspace", tabs: consultancyTabs },
      { slug: "cost", label: "Cost Management", tabs: cmsTabs },
    ];
  }, [id, showTeam, isResidential]);

  const projectTabs = projectGroups.flatMap((g) => g.tabs);

  const rawTab = searchParams.get("tab") ?? "overview";
  const tabSlug = rawTab === "running-bills" ? "costing" : rawTab;
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
    if (tabSlug !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [tabSlug, activeTab, setSearchParams]);

  if (project.isLoading)
    return <CircularProgress aria-label="Loading project" />;
  if (!project.data)
    return (
      <Typography component="p">
        Project not found. <Link to="/projects">Back</Link>
      </Typography>
    );
  const p = project.data;
  const phases = phasesQ.data ?? [];
  const currentPhase =
    phases.find((ph) => ph.id === p.currentPhaseId) ?? phases[phases.length - 1];

  return (
    <div>
      <Box
        sx={{
          position: "sticky",
          top: "var(--esti-sticky-top, 48px)",
          zIndex: 100,
          paddingBottom: "var(--cds-spacing-03)",
          background: "var(--cds-background)",
        }}
      >
        <Breadcrumbs aria-label="Breadcrumb">
          <Link to="/projects">Projects</Link>
          <Typography>{p.ref}</Typography>
        </Breadcrumbs>
        <Typography variant="h4" component="h1">
          {p.ref} — {p.title}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
          <Typography variant="body2" component="span">
            {
              PROJECT_WORK_TYPE_LABEL[
                (p as { workType?: keyof typeof PROJECT_WORK_TYPE_LABEL })
                  .workType ?? "ARCHITECTURE"
              ]
            }{" "}
            · {p.projectType} · {p.jurisdiction}
          </Typography>
          <StatusTag
            value={p.status as ProjectStatus}
            map={PROJECT_STATUS_TAG}
            label={
              PROJECT_STATUS_LABEL[
                p.status as keyof typeof PROJECT_STATUS_LABEL
              ] ?? p.status
            }
          />
        </Stack>
        {phases.length > 0 && currentPhase && (
          <Box sx={{ marginTop: "var(--cds-spacing-03)" }}>
            <Link to={`/projects/${id}?tab=info`}>
              <Chip
                size="medium"
                clickable
                label={`Stage: ${currentPhase.label}`}
                sx={{
                  backgroundColor: "var(--cds-tag-background-blue)",
                  color: "var(--cds-tag-color-blue)",
                }}
              />
            </Link>
          </Box>
        )}
      </Box>

      <Tabs
        value={groupIndex}
        onChange={(_e, selectedIndex: number) =>
          setSearchParams(
            { tab: projectGroups[selectedIndex]?.tabs[0]?.slug ?? "overview" },
            { replace: true },
          )
        }
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Project sections"
      >
        {projectGroups.map((group) => (
          <Tab key={group.slug} label={group.label} />
        ))}
      </Tabs>
      {projectGroups.map(
        (group, gi) =>
          gi === groupIndex && (
            <Box key={group.slug}>
              <Tabs
                value={innerIndex}
                onChange={(_e, selectedIndex: number) =>
                  setSearchParams(
                    { tab: group.tabs[selectedIndex]?.slug ?? group.tabs[0]?.slug ?? "overview" },
                    { replace: true },
                  )
                }
                variant="scrollable"
                scrollButtons="auto"
                aria-label={`${group.label} project sections`}
              >
                {group.tabs.map((t) => (
                  <Tab key={t.slug} label={t.label} />
                ))}
              </Tabs>
              {group.tabs.map(
                (t, ti) =>
                  ti === innerIndex && (
                    <Box key={t.slug} sx={{ pt: 2 }}>
                      {t.panel}
                    </Box>
                  ),
              )}
            </Box>
          ),
      )}
    </div>
  );
}
