import { Box, Skeleton, Stack, Typography } from "@mui/material";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TAG,
  PROJECT_WORK_TYPE_LABEL,
  formatINR,
  type ProjectStatus,
} from "@esti/contracts";
import { RailLayout } from "../components/RailLayout.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { type ReactNode, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ProjectMeasurementPanel } from "../components/measurement/ProjectMeasurementPanel.js";
import { DrawingsApprovalsPanel } from "../components/project/DrawingsApprovalsPanel.js";
import { DocumentsSpecsPanel } from "../components/project/DocumentsSpecsPanel.js";
import { ProjectBriefPanel } from "../components/project/ProjectBriefPanel.js";
import { ProjectDeliveryPanel } from "../components/project/ProjectDeliveryPanel.js";
import { ProjectInvoicesPanel } from "../components/project/ProjectInvoicesPanel.js";
import { ProjectRailNav } from "../components/project/ProjectRailNav.js";
import { ProjectSettings } from "../components/ProjectSettings.js";
import { ProjectTeam } from "../components/ProjectTeam.js";
import { ProjectLessons } from "../components/ProjectLessons.js";
import { ProjectOverview } from "../components/ProjectOverview.js";
import { ProjectRailSignals } from "../components/ProjectRailSignals.js";
import { StatusTag } from "../components/StatusTag.js";
import { useCapabilities } from "../lib/capabilities.js";
import { trpc } from "../lib/trpc.js";

type ProjectTab = { slug: string; label: string; panel: ReactNode };
type ProjectGroup = { slug: string; label: string; tabs: ProjectTab[] };

/** Map legacy deep-link tab slugs onto the collapsed IA. */
const LEGACY_TAB: Record<string, string> = {
  "running-bills": "measurement",
  costing: "measurement",
  pipeline: "brief",
  program: "brief",
  info: "brief",
  cpi: "brief",
  "spec-sheets": "documents",
  "site-visits": "delivery",
  communications: "delivery",
  minutes: "delivery",
  approvals: "drawings",
};

export function ProjectDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canHr, canInvoice } = useCapabilities();
  const project = trpc.projectOffice.byId.useQuery({ id }, { enabled: !!id });
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const phasesQ = trpc.phases.listByProject.useQuery(
    { projectId: id },
    { enabled: !!id },
  );

  const rawTab = searchParams.get("tab") ?? "overview";
  const approvalId = searchParams.get("approvalId");
  const invoiceId = searchParams.get("invoiceId");
  const showTeam = hrEnabled && canHr;
  const isResidential = /residential/i.test(project.data?.projectType ?? "");
  const drawingsInitialSub =
    rawTab === "approvals" || approvalId ? ("approvals" as const) : ("drawings" as const);

  const projectGroups = useMemo((): ProjectGroup[] => {
    // Setup — Overview · Brief (nested) · Settings. Hick/Miller: fewer primaries.
    const setupTabs: ProjectTab[] = [
      { slug: "overview", label: "Overview", panel: <ProjectOverview projectId={id} /> },
      {
        slug: "brief",
        label: "Brief",
        panel: <ProjectBriefPanel projectId={id} showCpi={isResidential} />,
      },
      { slug: "settings", label: "Settings", panel: <ProjectSettings projectId={id} /> },
    ];

    // Workspace — Measurement · Drawings · Documents · Team? · Delivery · Lessons.
    const consultancyTabs: ProjectTab[] = [
      {
        slug: "measurement",
        label: "Measurement",
        panel: <ProjectMeasurementPanel projectId={id} />,
      },
      {
        slug: "drawings",
        label: "Drawings & approvals",
        panel: (
          <DrawingsApprovalsPanel
            projectId={id}
            initialSubTab={drawingsInitialSub}
            focusApprovalId={approvalId}
          />
        ),
      },
      {
        slug: "documents",
        label: "Documents",
        panel: <DocumentsSpecsPanel projectId={id} />,
      },
    ];
    if (canInvoice) {
      consultancyTabs.push({
        slug: "invoices",
        label: "Invoices",
        panel: (
          <ProjectInvoicesPanel
            projectId={id}
            highlightInvoiceId={invoiceId}
            canManage={canInvoice}
          />
        ),
      });
    }
    if (showTeam) {
      consultancyTabs.push({ slug: "team", label: "Team", panel: <ProjectTeam projectId={id} /> });
    }
    consultancyTabs.push(
      {
        slug: "delivery",
        label: "Delivery",
        panel: <ProjectDeliveryPanel projectId={id} />,
      },
      { slug: "lessons", label: "Lessons", panel: <ProjectLessons projectId={id} /> },
    );

    return [
      { slug: "setup", label: "Setup", tabs: setupTabs },
      { slug: "consultancy", label: "Project workspace", tabs: consultancyTabs },
    ];
  }, [id, showTeam, isResidential, canInvoice, approvalId, invoiceId, drawingsInitialSub]);

  const projectTabs = projectGroups.flatMap((g) => g.tabs);

  const tabSlug = LEGACY_TAB[rawTab] ?? rawTab;
  const tabIndex = Math.max(
    0,
    projectTabs.findIndex((t) => t.slug === tabSlug),
  );
  const activeTab = projectTabs[tabIndex]?.slug ?? "overview";
  const activeGroup =
    projectGroups.find((g) => g.tabs.some((t) => t.slug === activeTab)) ?? projectGroups[0]!;
  const activeLabel = projectTabs.find((t) => t.slug === activeTab)?.label ?? activeTab;
  const activePanel = projectTabs.find((t) => t.slug === activeTab)?.panel ?? null;

  const selectTab = (slug: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", slug);
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    if (rawTab === "tasks" && id) {
      navigate(`/tasks?projectId=${id}`, { replace: true });
      return;
    }
    const shouldNormalizeTab =
      tabSlug !== activeTab ||
      (rawTab !== activeTab && rawTab !== "approvals" && rawTab !== "invoices");
    if (shouldNormalizeTab) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", activeTab);
          return next;
        },
        { replace: true },
      );
    }
  }, [tabSlug, activeTab, rawTab, setSearchParams, id, navigate]);

  if (project.isLoading) {
    return (
      <RailLayout title="Loading project…" description="Fetching project details">
        <Stack spacing={1.5} aria-busy="true" aria-label="Loading project">
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={36} />
          <Skeleton variant="rectangular" height={220} />
          <Skeleton variant="rectangular" height={120} />
        </Stack>
      </RailLayout>
    );
  }
  if (!project.data) {
    return (
      <Typography component="p">
        Project not found. <Link to="/projects">Back</Link>
      </Typography>
    );
  }
  const p = project.data;
  const phases = phasesQ.data ?? [];
  const currentPhase =
    phases.find((ph) => ph.id === p.currentPhaseId) ?? phases[phases.length - 1];
  const workTypeLabel =
    PROJECT_WORK_TYPE_LABEL[
      (p as { workType?: keyof typeof PROJECT_WORK_TYPE_LABEL }).workType ??
        "ARCHITECTURE"
    ];
  const contractValuePaise = (p as { contractValuePaise?: number })
    .contractValuePaise;

  const Fact = ({ label, value }: { label: string; value: ReactNode }) => (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, py: 0.5, borderBottom: 1, borderColor: "divider" }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" sx={{ textAlign: "right", fontWeight: 600 }}>{value}</Typography>
    </Box>
  );

  return (
    <RailLayout
      title={`${p.ref} — ${p.title}`}
      description={`${workTypeLabel} · ${p.projectType} · ${p.jurisdiction}`}
      tabs={
        <ProjectRailNav
          groups={projectGroups.map((g) => ({
            slug: g.slug,
            label: g.label,
            tabs: g.tabs.map((t) => ({ slug: t.slug, label: t.label })),
          }))}
          activeSlug={activeTab}
          onSelect={selectTab}
        />
      }
      aside={
        <Stack spacing={1.5}>
          <StatusTag
            value={p.status as ProjectStatus}
            map={PROJECT_STATUS_TAG}
            label={
              PROJECT_STATUS_LABEL[p.status as keyof typeof PROJECT_STATUS_LABEL] ??
              p.status
            }
          />

          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
              Overview
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {currentPhase && (
                <Fact
                  label="Stage"
                  value={
                    <Link to={`/projects/${id}?tab=brief`}>{currentPhase.label}</Link>
                  }
                />
              )}
              <Fact
                label="Status"
                value={
                  PROJECT_STATUS_LABEL[p.status as keyof typeof PROJECT_STATUS_LABEL] ??
                  p.status
                }
              />
              <Fact label="Type" value={p.projectType} />
              <Fact label="Jurisdiction" value={p.jurisdiction} />
              {typeof contractValuePaise === "number" && (
                <Fact
                  label="Contract value"
                  value={formatINR(contractValuePaise, { paise: false })}
                />
              )}
            </Box>
          </Box>

          <ProjectRailSignals projectId={id} />
        </Stack>
      }
    >
      <PageBreadcrumb
        items={[
          { label: "Projects", to: "/projects" },
          { label: p.ref, to: `/projects/${id}?tab=overview` },
          { label: activeGroup.label },
          { label: activeLabel },
        ]}
      />

      <Box sx={{ pt: 0.5 }}>{activePanel}</Box>
    </RailLayout>
  );
}
